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
        data = CareerNetClient.call('JOB')
        rows = data.get('dataSearch', {}).get('content', [])

        for item in rows:
            dto = {
                'jobCd': item.get('job_cd', ''),
                'jobName': item.get('job_nm', ''),
                'jobDesc': item.get('job_summary', ''),
                'jobEnv': item.get('job_env', ''),
                'jobValues': item.get('job_values', ''),
                'jobAbilities': item.get('job_ability', ''),
                'majorRequired': item.get('major', ''),
                'employmentPath': item.get('job_path', '')
            }

            doc = DocumentBuilder.build_job_document(dto)
            vector_id = f"job_{dto['jobCd']}_{uuid.uuid4()}"

            self.vector.process(vector_id, doc, metadata={'type': 'job'})
            self.repo.save_vector('job_vector', {
                'original_id': dto['jobCd'],
                'document_text': doc,
                'vector_id': vector_id
            })
