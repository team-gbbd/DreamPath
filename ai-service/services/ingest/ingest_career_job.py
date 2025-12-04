import uuid
import requests
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

class CareerJobIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        # 직업백과 API 전용 키
        self.api_key = "6cb0f6894242191036656369ada53be0"

    def ingest_all(self, page_size=100):
        """
        전체 직업 데이터 수집 및 임베딩
        """
        print("Fetching Job Encyclopedia data...")
        
        page = 1
        total_ingested = 0
        
        while True:
            print(f"Fetching page {page}...")
            url = "https://www.career.go.kr/cnet/front/openapi/jobs.json"
            params = {
                "apiKey": self.api_key,
                "pageSize": page_size,
                "pageIndex": page
            }
            
            try:
                response = requests.get(url, params=params, timeout=30)
                if response.status_code != 200:
                    print(f"Error: API returned status {response.status_code}")
                    break

                data = response.json()
                jobs = data.get('jobs', [])
                
                if not jobs:
                    print("No more jobs found.")
                    break
                
                print(f"Found {len(jobs)} jobs on page {page}.")
                
                for item in jobs:
                    # 직업백과 API 필드 매핑
                    dto = {
                        'jobCd': item.get('job_cd', ''),
                        'jobName': item.get('job_nm', ''),
                        'jobDesc': item.get('work', ''),  # 하는 일
                        'aptitude': item.get('aptit_name', ''),  # 적성
                        'ability': item.get('ability_name', ''), # 핵심 능력
                        'wlb': item.get('wlb', ''),  # 일-생활 균형
                        'wage': item.get('wage', ''),  # 연봉
                        'relatedJob': item.get('rel_job_nm', ''), # 관련 직업
                        'views': item.get('views', 0),
                        'likes': item.get('likes', 0)
                    }

                    # Document 생성
                    doc = DocumentBuilder.build_job_document(dto)
                    vector_id = f"job_{dto['jobCd']}"

                    # Pinecone 저장 (메타데이터 강화)
                    metadata = {
                        'type': 'job',
                        'original_id': dto['jobCd'],
                        'job_code': dto['jobCd'],
                        'jobName': dto['jobName'],
                        'wage': dto['wage'],
                        'wlb': dto['wlb'],
                        'aptitude': dto['aptitude'],
                        'summary': dto['jobDesc'],
                        'relatedJob': dto['relatedJob']
                    }
                    self.vector.process(vector_id, doc, metadata=metadata)
                    
                    # Supabase 저장
                    self.repo.save_vector('job_vector', {
                        'original_id': dto['jobCd'],
                        'document_text': doc,
                        'vector_id': vector_id
                    })
                    
                total_ingested += len(jobs)
                page += 1
                
            except Exception as e:
                print(f"Error during job ingestion: {e}")
                break
                
        print(f"Successfully ingested total {total_ingested} jobs.")
