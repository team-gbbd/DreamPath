from typing import List
import os
from openai import OpenAI

from services.rag.pinecone_vector_service import PineconeVectorService

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None


def create_embedding(document: str) -> List[float]:
    if _client is None:
        raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되어야 합니다.")
    response = _client.embeddings.create(
        model="text-embedding-3-large",
        input=document
    )
    return response.data[0].embedding


async def upload_vector_to_pinecone(vector_id: str, embedding: List[float], metadata: dict):
    service = PineconeVectorService()
    if service.index is None:
        raise RuntimeError("Pinecone index가 초기화되지 않았습니다.")

    service.upsert_vector(vector_id, embedding, metadata)
    return True
