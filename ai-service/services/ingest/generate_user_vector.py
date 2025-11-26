import uuid
from services.rag.document_builder import DocumentBuilder
from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class UserVectorGenerator:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()

    def generate(self, user_profile):
        doc = DocumentBuilder.build_profile_document(user_profile)
        vector_id = f"user_{user_profile['userId']}_{uuid.uuid4()}"

        self.vector.process(vector_id, doc, metadata={'type': 'user'})

        self.repo.save_vector(
            'profile_vector',
            {
                'original_id': user_profile['userId'],
                'document_text': doc,
                'vector_id': vector_id
            }
        )
        return vector_id
