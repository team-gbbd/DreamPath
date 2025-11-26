from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from pinecone import Pinecone


class RAGSearchService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.pc = self.vector.pc
        self.index = self.vector.index

    def search(self, query_vector, top_k=5, filter=None):
        '''
        filter 예시: {"type": {"$eq": "job"}}
        '''
        response = self.index.query(
            vector=query_vector,
            top_k=top_k,
            filter=filter,
            include_metadata=True
        )
        return response.matches
