import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class DepartmentIngestService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest(self, dept):
        doc = DocumentBuilder.build_department_document(dept)
        vector_id = f"dept_{dept['deptCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'department'})

        self.repo.save_vector(
            'department_vector',
            {
                'original_id': dept['deptCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
