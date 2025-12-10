import json
from typing import List

from services.common.openai_client import OpenAIService
from config import settings


class ProfileRAGService:

    def __init__(self, openai: OpenAIService):
        self.openai = openai
        self.model = settings.OPENAI_MODEL

    async def enrich_with_rag(self, job_matches: List[dict], user_document: str):

        enriched = []

        for match in job_matches:

            job_name = match.get('jobName')
            score = match.get('score')

            # 🔧 RAG 문서 (나중에 WorkNet API로 실제 문서 연결)
            job_doc = f"""
            직업명: {job_name}
            이 직업의 핵심 업무는 문제 해결, 협업, 기술 이해입니다.
            """

            prompt = f"""
            당신은 진로 추천 전문가입니다.

            사용자 성향 설명:
            {user_document}

            직업 정보(RAG 문서):
            {job_doc}

            사용자에게 이 직업이 왜 맞는지, 핵심 이유 3개를 JSON 형태로 생성하세요.

            JSON 형식:
            {{
                "jobName": "{job_name}",
                "reasons": ["이유1", "이유2", "이유3"]
            }}
            """

            resp = self.openai.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}]
            )

            raw = resp.choices[0].message.content

            try:
                # JSON만 추출
                if "```json" in raw:
                    raw = raw.split("```json")[1].split("```")[0].strip()
                enriched_data = json.loads(raw)
            except:
                enriched_data = {"jobName": job_name, "reasons": ["추출 실패"]}

            enriched.append({
                "jobName": enriched_data.get("jobName", job_name),
                "score": score,
                "reasons": enriched_data.get("reasons", [])
            })

        return enriched
