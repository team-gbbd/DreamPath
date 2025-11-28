import os
from typing import List
from openai import OpenAI
from services.vector.pinecone_service import PineconeVectorService


class EmbeddingService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되어야 합니다.")

        # 🔥 인스턴스 변수로 client 생성 (중요)
        self.client = OpenAI(api_key=api_key)
        self.model = "text-embedding-3-large"
        self.vector = PineconeVectorService()
        self.dimension = 3072  # text-embedding-3-large 차원

    def create_embedding(self, document: str) -> List[float]:
        """OpenAI 임베딩 생성"""
        response = self.client.embeddings.create(
            model="text-embedding-3-large",
            input=document
        )
        return response.data[0].embedding

    def save_to_pinecone(self, vector_id: str, embedding: List[float], metadata: dict):
        """Pinecone 저장"""
        service = PineconeVectorService()
        service.upsert_vector(vector_id, embedding, metadata)

    def create_user_embedding(self, user_id: str, document: str) -> str:
        """전체 프로세스: 임베딩 생성 → Pinecone 저장 → vector_id 반환"""

        vector_id = f"user-{user_id}"

        embedding = self.create_embedding(document)

        metadata = {
            "type": "user_profile",
            "userId": user_id
        }

        self.save_to_pinecone(vector_id, embedding, metadata)

        return vector_id
