import os

from openai import OpenAI

from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository


class HybridRecommendService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        # PineconeVectorService 내부의 index를 재사용
        self.index = self.vector.index if self.vector._initialized else None
        self._initialized = self.vector._initialized
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def recommend(self, user_vector_id, top_k=20):
        """
        1) Pinecone에서 Top20 후보 검색
        2) LLM이 최종 Top5 재정렬 + 이유 생성
        """
        if not self._initialized:
            print("[HybridRecommendService] Pinecone이 초기화되지 않아 recommend를 건너뜁니다.")
            return []

        user_vector = self.repo.get_vector_by_id(user_vector_id)
        if user_vector is None:
            return []

        # 1) 벡터 기반 Top20 후보
        pinecone_res = self.index.query(
            vector=user_vector,
            top_k=top_k,
            include_metadata=True
        )

        candidates = []
        for m in pinecone_res.matches:
            candidates.append({
                "job_id": m.id,
                "score": float(m.score),
                "metadata": m.metadata
            })

        prompt = f"""
당신은 사용자 성향 분석 기반 진로 추천 전문 AI입니다.

아래는 벡터 유사도가 높은 직업 Top20 후보입니다.
이중에서 가장 적합한 Top5 직업을 선택하고,
각 직업마다 이유를 3줄로 설명해 주세요.

후보 리스트:
{candidates}

출력 포맷(JSON Array):
[
  {{
    "job_id": "",
    "title": "",
    "reason": ""
  }}
]
"""

        result = self.client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}]
        )

        content = result.choices[0].message.content
        return content
