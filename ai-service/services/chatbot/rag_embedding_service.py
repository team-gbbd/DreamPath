import os
from openai import OpenAI
from typing import List


class RagEmbeddingService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def embed(self, text: str) -> List[float]:
        """텍스트를 임베딩 벡터로 변환"""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            raise RuntimeError(f"임베딩 생성 실패: {str(e)}")
