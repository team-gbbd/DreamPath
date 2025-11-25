import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class SchoolIngestService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest(self, school):
        doc = DocumentBuilder.build_school_document(school)
        vector_id = f"school_{school['schoolCd']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'school'})

        self.repo.save_vector(
            'school_vector',
            {
                'original_id': school['schoolCd'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
