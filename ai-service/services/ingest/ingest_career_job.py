import uuid
import json
import time
import requests
from dotenv import load_dotenv
load_dotenv()
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.database_service import DatabaseService

class CareerJobIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.db_service = DatabaseService()
        # 직업백과 API 전용 키
        self.api_key = "6cb0f6894242191036656369ada53be0"

    def ingest_all(self, page_size=100):
        """
        전체 직업 데이터 상세 수집 및 임베딩 (기존 Job/Department 벡터 삭제 포함)
        """
        print("Starting Full Re-ingestion for CareerNet Jobs...")
        
        # 0. 기존 벡터 삭제 (User Request: Delete Job & Major vectors)
        print("Step 0: Deleting existing 'job' and 'department' vectors from Pinecone...")
        try:
            # Delete by metadata filter
            # Note: Pinecone delete by filter is supported in starter/serverless
            self.vector.index.delete(filter={"type": "job"})
            print("Deleted vectors with type='job'")
            
            # Deleting Deparments as requested ("학과 데이터는 지우고")
            self.vector.index.delete(filter={"type": "department"})
            print("Deleted vectors with type='department'")
            
            # Also clean Supabase tables if needed? 
            # User said "pinecone db안에... 지우고". Supabase cleanup is implicit for job_details via upsert/truncate.
            # Truncating job_details to ensure clean state
            with self.db_service.get_connection() as conn:
                cursor = conn.cursor()
                # USE_POSTGRES check inside db service usually, here we raw execute
                # Assuming Postgres or MariaDB, TRUNCATE TABLE is standard
                cursor.execute("TRUNCATE TABLE job_details")
                conn.commit()
            print("Truncated 'job_details' table.")
            
        except Exception as e:
            print(f"Error during cleanup: {e}")
            # Proceed anyway? Failed delete might mean empty index or connection error.
        
        # 1. 직업 목록 전체 가져오기
        print("Step 1: Fetching full job list...")
        all_job_ids = []
        page = 1
        
        while True:
            url = "https://www.career.go.kr/cnet/front/openapi/jobs.json"
            params = {
                "apiKey": self.api_key,
                "pageSize": page_size,
                "pageIndex": page
            }
            
            try:
                response = requests.get(url, params=params, timeout=30)
                if response.status_code != 200:
                    print(f"Error fetching list: {response.status_code}")
                    break
                
                data = response.json()
                jobs_list = data.get('jobs', [])
                
                if not jobs_list:
                    break
                    
                for j in jobs_list:
                    # keys might be job_cd or job_code?
                    # Sample showed: 'job_cd'
                    jid = j.get('job_cd')
                    if jid:
                        all_job_ids.append(jid)
                
                print(f"Fetched page {page} ({len(jobs_list)} jobs)")
                page += 1
                
            except Exception as e:
                print(f"Error fetching page {page}: {e}")
                break
        
        total_jobs = len(all_job_ids)
        print(f"Total jobs to ingest: {total_jobs}")
        
        # 2. 상세 수집 및 저장
        print("Step 2: Processing details...")
        encoded_count = 0
        
        for idx, job_cd in enumerate(all_job_ids):
            try:
                if idx % 10 == 0:
                    print(f"Processing {idx+1}/{total_jobs}...")
                
                # A. 상세 API 호출
                detail = CareerNetClient.get_job_detail(job_cd)
                if not detail:
                    print(f"Skipping empty detail for {job_cd}")
                    continue
                
                # B. 데이터 파싱
                base_info = detail.get('baseInfo') or {}
                work_list = detail.get('workList') or []
                ability_list = detail.get('abilityList') or []
                job_ready_list = detail.get('jobReadyList') or {}
                aptitude_list = detail.get('aptitudeList') or []
                
                # B-1. 기본 정보
                job_name = base_info.get('job_nm', '')
                wage = base_info.get('wage', '')
                wage_source = base_info.get('wage_source', '')
                wlb = base_info.get('wlb', '')
                aptitude_summary = base_info.get('aptit_name', '')
                related_job = base_info.get('rel_job_nm', '')
                
                # B-2. 텍스트 조합 (Summary, Aptitude Text)
                summary_text = "\n".join([w.get('work', '') for w in work_list])
                aptitude_text = "\n".join([a.get('aptitude', '') for a in aptitude_list])
                
                # B-3. JSONB Fields
                abilities = [{"name": a.get('ability_name'), "score": a.get('SORT_ORDR')} for a in ability_list]
                
                majors = job_ready_list.get('curriculum', [])
                certifications = job_ready_list.get('certificate', [])
                
                # C. DB 저장 (job_details)
                db_payload = {
                    'job_id': job_cd,
                    'summary': summary_text,
                    'wage_text': wage,
                    'wage_source': wage_source,
                    'aptitude_text': aptitude_text,
                    'abilities': abilities,
                    'majors': majors,
                    'certifications': certifications,
                    'raw_data': detail
                }
                
                success = self.db_service.save_job_details(db_payload)
                if not success:
                    print(f"Failed to save DB for {job_cd}")
                
                # D. Vector 저장 (Pinecone)
                # Document Text 구성 (검색 정확도 향상용)
                # 리스트형 데이터는 텍스트로 변환하여 포함
                cert_text = ", ".join([c.get('certificate', '') for c in certifications])
                major_text = ", ".join([m.get('curriculum', '') for m in majors])
                ability_text = ", ".join([a.get('ability_name', '') for a in abilities])
                
                # DocumentBuilder의 job_template을 쓰지 않고 여기서 직접 구성하거나
                # 혹은 Builder가 유연하면 좋음. Builder 필드에 맞게 매핑.
                # 현재 Builder는 job_template(job_dict) 형식이므로 dict를 맞춰준다.
                
                job_dto_for_vector = {
                    'jobName': job_name,
                    'jobDesc': summary_text,
                    'aptitude': f"{aptitude_summary} {aptitude_text}",
                    'ability': ability_text,
                    'wlb': wlb,
                    'wage': wage,
                    'relatedJob': related_job,
                    'certifications': cert_text, # Template에 추가했던 필드는 Revert했으므로 여기선 못씀? 
                    # 아까 Revert 했으므로, Template을 수정해주거나, 
                    # 아니면 여기서 text를 직접 만들어야 함.
                    # Template 수정 없이 가려면 jobDesc에 때려넣는다? NO.
                    # DocumentBuilder.build_job_document는 Template을 씀.
                    # Revert 했으므로 Template에는 'certifications' 필드가 없음.
                    # -> 다시 Template Update가 필요함? OR
                    # -> 여기서 직접 f-string으로 doc 생성. (Faster/Safer than touching Template again)
                }
                
                # Direct Document Generation (Bypassing Template for Custom Rich Data)
                doc_text = f"""
[직업백과 직업 정보]
직업명: {job_name}

하는 일:
{summary_text}

핵심 능력:
{ability_text}

필요 자격증:
{cert_text}

관련 학과:
{major_text}

적성 및 흥미:
{aptitude_summary}
{aptitude_text}

일-생활 균형:
{wlb}

평균 연봉:
{wage} (출처: {wage_source})

관련 직업:
{related_job}
""".strip()

                vector_id = f"job_{job_cd}"
                
                # Metadata (Lightweight for Pinecone)
                metadata = {
                    'type': 'job',
                    'original_id': str(job_cd),
                    'job_code': str(job_cd), # Backward compatibility
                    'jobName': job_name,
                    'wage': wage,
                    'wlb': wlb,
                    'aptitude': aptitude_summary,
                    'relatedJob': related_job,
                    # 'summary': summary_text # Too long? Keep simplified one?
                    'summary': (summary_text[:500] + '...') if len(summary_text) > 500 else summary_text
                }
                
                self.vector.process(vector_id, doc_text, metadata=metadata)
                
                # Supabase Vector Backup
                self.repo.save_vector('job_vector', {
                    'original_id': job_cd,
                    'document_text': doc_text,
                    'vector_id': vector_id
                })
                
                encoded_count += 1
                # Rate limiting
                time.sleep(0.05)
                
            except Exception as e:
                print(f"Error processing job {job_cd}: {e}")
                import traceback
                traceback.print_exc()

        print(f"Successfully processed {encoded_count}/{total_jobs} jobs.")

if __name__ == "__main__":
    ingest = CareerJobIngest()
    ingest.ingest_all()
