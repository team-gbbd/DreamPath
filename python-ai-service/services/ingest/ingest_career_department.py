import uuid
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CareerDepartmentIngest:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest_all(self):
        data = CareerNetClient.call('major')
        rows = data.get('dataSearch', {}).get('content', [])

        for item in rows:
            dto = {
                'deptCd': item.get('major_seq', ''),
                'deptName': item.get('major_nm', ''),
                'intro': item.get('summary', ''),
                'curriculum': item.get('job_course', ''),
                'relatedJobs': item.get('rel_job', '')
            }

            doc = DocumentBuilder.build_department_document(dto)
            vector_id = f"dept_{dto['deptCd']}_{uuid.uuid4()}"

            self.vector.process(vector_id, doc, metadata={'type': 'department'})
            self.repo.save_vector('department_vector', {
                'original_id': dto['deptCd'],
                'document_text': doc,
                'vector_id': vector_id
            })
