import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerJobIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        page = 1
        display = 100  # 한 번에 가져올 개수
        
        while True:
            print(f"Fetching JOB page {page}...")
            data = CareerNetClient.call('JOB', start=page, display=display)
            rows = data.get('dataSearch', {}).get('content', [])
            
            if not rows:
                break
                
            for item in rows:
                dto = {
                    'jobCd': item.get('job_code', ''),  # API 실제 필드명: job_code
                    'jobName': item.get('job', ''),  # API 실제 필드명: job
                    'jobDesc': item.get('summary', ''),  # API 실제 필드명: summary
                    'jobEnv': item.get('work_env', ''),  # 추정 필드명
                    'jobValues': item.get('job_values', ''),  # 추정 필드명
                    'jobAbilities': item.get('job_ability', ''),  # 추정 필드명
                    'majorRequired': item.get('major', ''),  # 추정 필드명
                    'employmentPath': item.get('job_path', '')  # 추정 필드명
                }

                doc = DocumentBuilder.build_job_document(dto)
                vector_id = f"job_{dto['jobCd']}_{uuid.uuid4()}"

                self.vector.process(vector_id, doc, metadata={'type': 'job'})
                self.repo.save_vector('job_vector', {
                    'original_id': dto['jobCd'],
                    'document_text': doc,
                    'vector_id': vector_id
                })
            
            page += 1
