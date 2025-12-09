import os
import json
from openai import OpenAI

from services.bigfive.bigfive_service import BigFiveService
from services.mbti.mbti_service import MBTIService
from services.rag.rag_service import RAGService
from config import settings


class PersonalityProfileService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY 필요")
        self.client = OpenAI(api_key=api_key)
        self.model = settings.OPENAI_MODEL
        self.bigfive = BigFiveService()
        self.mbti = MBTIService()
        self.rag = RAGService()

    async def generate_profile(self, document: str, top_k: int = 10):
        # 1) Big Five 점수 생성
        bigfive_raw = await self.bigfive.analyze_bigfive(document)

        bigfive = json.loads(bigfive_raw)

        # 2) MBTI 생성 (규칙 기반 변환 사용)
        mbti = await self.mbti.convert_bigfive_to_mbti(
            bigfive["openness"]["score"],
            bigfive["conscientiousness"]["score"],
            bigfive["extraversion"]["score"],
            bigfive["agreeableness"]["score"],
            bigfive["neuroticism"]["score"],
        )

        # 3) RAG 기반 유사 항목 검색 (추후 실제 user vector ID 연동 필요)
        user_vector_id = "temp-user-vector"
        similar = await self.rag.search_by_user_vector(user_vector_id, top_k)

        prompt = f"""
당신은 전문 심리 분석가입니다.
아래 Big Five, MBTI, 유사 항목들을 기반으로 사용자의 성향 분석을 작성하세요.

### Big Five:
{bigfive}

### MBTI:
{mbti}

### 유사 항목:
{similar}

아래 JSON 형식으로 답변하세요:

{{
  "summary": "요약 설명",
  "strengths": ["강점1", "강점2"],
  "risks": ["주의점1", "주의점2"],
  "recommendation": ["추천1", "추천2"]
}}
"""

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "당신은 성향 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
        )

        final_profile = completion.choices[0].message.content

        return {
            "bigfive": bigfive,
            "mbti": mbti,
            "similarItems": similar,
            "profile": final_profile
        }
