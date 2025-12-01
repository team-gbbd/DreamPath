import os

from openai import OpenAI

from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

class HybridRecommendService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.index = self.vector.index
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def recommend(self, user_vector_id, top_k=20):
        """
        1) Pinecone에서 Top20 후보 검색
        2) LLM이 최종 Top5 재정렬 + 이유 생성
        """
        # 1) 사용자 벡터 가져오기 (Pinecone에서)
        user_result = self.index.fetch(ids=[user_vector_id])
        if not user_result or not user_result.vectors or user_vector_id not in user_result.vectors:
            print(f"User vector not found in Pinecone: {user_vector_id}")
            return []
        
        user_vector = user_result.vectors[user_vector_id].values

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
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )

        content = result.choices[0].message.content
        return content
