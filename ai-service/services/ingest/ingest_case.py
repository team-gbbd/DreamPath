import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class CaseIngestService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def ingest(self, case):
        doc = DocumentBuilder.build_case_document(case)
        vector_id = f"case_{case['caseId']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'case'})

        self.repo.save_vector(
            'case_vector',
            {
                'original_id': case['caseId'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
