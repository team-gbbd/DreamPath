# RAG Service (LangChain 기반)
from typing import List
import os

from services.rag.pinecone_vector_service import PineconeVectorService


class RAGService:
    def __init__(self):
        self.index_name = os.getenv("PINECONE_INDEX")
        self.vector_service = PineconeVectorService()
        self.index = self.vector_service.index

    # ① RAG 검색 함수
    async def search(self, query_embedding: List[float], top_k: int = 5):
        if self.index is None:
            return []

        result = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        return result.matches

    def sort_results(self, matches):
        return sorted(matches, key=lambda x: x.score, reverse=True)

    def filter_results(self, matches, min_score: float = 0.5):
        return [match for match in matches if getattr(match, "score", 0) >= min_score]
