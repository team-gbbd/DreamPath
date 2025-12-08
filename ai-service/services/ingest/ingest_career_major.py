import uuid
import json
import time
import requests
import os
from dotenv import load_dotenv

# Load environment variables (Must be first)
load_dotenv()

from services.ingest.careernet_client import CareerNetClient
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.database_service import DatabaseService

class CareerMajorIngest:
    
    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.db_service = DatabaseService()
        self.api_key = os.getenv("CAREERNET_API_KEY", "6cb0f6894242191036656369ada53be0")

    def ingest_all(self):
        """
        전체 학과 데이터(대학교) 상세 수집 및 임베딩
        """
        print("Starting Full Re-ingestion for CareerNet Majors (University)...")
        
        # 0. Cleanup (Delete 'major' vectors and truncate table)
        print("Step 0: Cleanup existing data...")
        try:
            # Pinecone: Delete type='major' (Using 'major' instead of 'department' as per new design)
            # CAUTION: Old data used 'department'. We should delete 'department' too if we are replacing it.
            # But we already deleted 'department' in Job Ingestion step.
            # So just ensure 'major' is clean.
            self.vector.index.delete(filter={"type": "major"})
            print("Deleted Pinecone vectors with type='major'")
            
            # Truncate major_details table
            with self.db_service.get_connection() as conn:
                cursor = conn.cursor()
                # Determine DB type for correct syntax if needed, but TRUNCATE is standard
                cursor.execute("TRUNCATE TABLE major_details")
                conn.commit()
            print("Truncated 'major_details' table.")
            
        except Exception as e:
            print(f"Error during cleanup: {e}")

        # 1. Fetch Major List (University + College)
        all_majors = []
        client = CareerNetClient()
        target_gubuns = ['univ_list', 'col_list']
        
        for gubun in target_gubuns:
            print(f"Step 1: Fetching major list ({gubun})...")
            page = 1
            while True:
                try:
                    majors_chunk = client.get_major_list(page_index=page, page_size=200, gubun=gubun)
                    
                    if not majors_chunk:
                        break
                        
                    # Tag with gubun for detail fetching
                    for m in majors_chunk:
                        m['gubun'] = gubun
                        all_majors.append(m)
                        
                    print(f"[{gubun}] Fetched page {page} ({len(majors_chunk)} majors)")
                    
                    if len(majors_chunk) < 200:
                        break
                        
                    page += 1
                    
                except Exception as e:
                    print(f"Error fetching page {page} for {gubun}: {e}")
                    break
                
        total_majors = len(all_majors)
        print(f"Total majors to ingest: {total_majors}")
        
        # 2. Process Details
        print("Step 2: Processing details...")
        encoded_count = 0
        
        for idx, m in enumerate(all_majors):
            try:
                if idx % 10 == 0:
                    print(f"Processing {idx+1}/{total_majors}...")
                
                # Identify ID
                seq = m.get('majorSeq')
                l_class = m.get('lClass') # Save classification from list
                m_class = m.get('mClass') # Name from list
                current_gubun = m.get('gubun', 'univ_list')
                
                if not seq:
                    continue
                    
                # A. Fetch Detail
                detail = client.get_major_view(seq, gubun=current_gubun)
                if not detail:
                    print(f"Skipping empty detail for {seq} ({m_class})")
                    continue
                
                # B. Parse Data
                # Detail structure is flat: { "major": "name", "summary": "...", ... }
                major_name = detail.get('major') or m_class # Use Detail name or List name
                summary = detail.get('summary', '') or detail.get('major_summary', '')
                interest = detail.get('interest', '')
                prop = detail.get('property', '')
                job_text = detail.get('job', '')
                
                # Stats (chartData) - flattened for simple text display if needed, but mainly for DB
                salary_info = detail.get('salary', '') # Often in chartData, but sometimes standalone?
                emp_info = detail.get('employment', '')
                
                # If salary/emp is empty, check chartData
                if not salary_info and 'chartData' in detail:
                    # Logic to extract if needed, but for now keep simple as per analysis
                    pass

                # Exclude department (university list) from raw_data if requested?
                # User said: "department(개설대학) 필드는 저장하지 마세요." -> Do not save to DB structured, 
                # AND maybe remove from raw_data? 
                # User said: "Supabase에는 구조화된 필드 + raw_data.json 전체를 저장하세요."
                # But also "department 필드는 저장하지 마세요". This usually means don't make a structured column OR don't clutter Pinecone.
                # Given "raw_data.json 전체를 저장하세요", I will KEEP it in raw_data but NOT vector.
                # Wait, User said "department(개설대학) 필드는 저장하지 마세요" as a top level instruction.
                # Checking Context: "Pinecone에는 검색용 텍스트와 최소한의 metadata만 저장하세요."
                # I will interpret "Standard: Raw data should contain everything." but "Structured: No department column."
                # AND "Pinecone: No department data."
                
                # C. Save to DB (major_details)
                db_payload = {
                    'major_id': seq,
                    'major_name': major_name,
                    'summary': summary,
                    'interest': interest,
                    'property': prop,
                    'job': job_text,
                    'salary': salary_info,
                    'employment': emp_info,
                    'raw_data': detail # Full JSON including department list (User said save "raw_data.json 전체")
                    # If user meant "exclude department from raw_data too", it conflicts with "raw_data.json 전체".
                    # I'll stick to saving it in raw_data (useful context) but omitting from columns/vector.
                }
                
                success = self.db_service.save_major_details(db_payload)
                if not success:
                    print(f"Failed to save DB for {seq}")

                # D. Vector Storage (Pinecone)
                # Text for Search: Name + Summary + Interest + Property + Job
                doc_text = f"""
[학과 정보]
학과명: {major_name} ({l_class if l_class else '분류없음'})

학과 개요:
{summary}

적성 및 흥미:
{interest}

학과 특성:
{prop}

관련 직업:
{job_text}
""".strip()
                
                vector_id = f"major_{seq}"
                
                metadata = {
                    'type': 'major',
                    'original_id': str(seq),
                    'majorSeq': str(seq),
                    'majorName': major_name,
                    'lClass': l_class or '',
                    # Minimal metadata
                    'summary': (summary[:200] + '...') if len(summary) > 200 else summary
                }
                
                self.vector.process(vector_id, doc_text, metadata=metadata)
                
                # Supabase Vector Backup
                # self.repo.save_vector('major_vector', {
                #     'original_id': seq,
                #     'document_text': doc_text,
                #     'vector_id': vector_id
                # }) 
                # Wait, `repo.save_vector` usually takes table name. I'll use `job_vector` table for now as it's the generic vector store?
                # Actually, `ingest_career_job.py` used `job_vector`. `department` was mapped to `department_vector`?
                # I'll try `major_vector` if it fails fallback or create.
                # Given strict instructions "Storage: Supabase... raw_data", vectors are for Pinecone primarily.
                
                encoded_count += 1
                time.sleep(0.05)
                
            except Exception as e:
                print(f"Error processing major {idx}: {e}")
                # traceback.print_exc()

        print(f"Successfully processed {encoded_count}/{total_majors} majors.")

if __name__ == "__main__":
    ingest = CareerMajorIngest()
    ingest.ingest_all()
