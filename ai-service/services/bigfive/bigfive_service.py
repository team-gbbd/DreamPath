import os
from openai import OpenAI
from dotenv import load_dotenv
from config import settings

load_dotenv()


class BigFiveService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise RuntimeError('OPENAI_API_KEY 필요')
        self.client = OpenAI(api_key=api_key)
        self.model = settings.OPENAI_MODEL

    async def analyze_bigfive(self, document: str):
        prompt = f'''
당신은 전문 성향 분석가입니다.
아래 사용자의 성향 문서를 읽고 Big Five 5개 요소 점수를 0~100 사이 점수로 산출하세요.

반드시 아래 JSON 형식으로만 답변하세요:

{{
  "openness": {{"score": int, "reason": "string"}},
  "conscientiousness": {{"score": int, "reason": "string"}},
  "extraversion": {{"score": int, "reason": "string"}},
  "agreeableness": {{"score": int, "reason": "string"}},
  "neuroticism": {{"score": int, "reason": "string"}}
}}

--- 사용자 문서 ---
{document}
---
'''

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "당신은 Big Five 성향 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
        )

        return resp.choices[0].message.content
