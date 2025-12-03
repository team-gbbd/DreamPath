import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class JobIngestService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest(self, job_record):
        '''
        job_record 예시:
        {
            'jobCd': '0243',
            'jobName': '',
            'jobDesc': '',
            'jobEnv': '',
            'jobValues': '',
            'jobAbilities': '',
            'majorRequired': '',
            'employmentPath': ''
        }
        '''
        doc = DocumentBuilder.build_job_document(job_record)
        vector_id = f"job_{job_record['jobCd']}_{uuid.uuid4()}"

        # pinecone 저장
        self.vector.process(vector_id, doc, metadata={'type': 'job', 'jobCd': job_record['jobCd']})

        # supabase 저장
        self.repo.save_vector(
            'job_vector',
            {
                'original_id': job_record['jobCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
