import os
from openai import OpenAI
from dotenv import load_dotenv
from config import settings

load_dotenv()


class MBTIService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise RuntimeError('OPENAI_API_KEY 필요')
        self.client = OpenAI(api_key=api_key)
        self.model = settings.OPENAI_MODEL

    async def analyze_mbti(self, document: str):
        prompt = f'''
당신은 전문 MBTI 성향 분석가입니다.
아래 사용자의 성향 문서를 읽고 MBTI 4글자를 생성하세요.

반드시 아래 JSON 형식으로만 답변하세요:

{{
  "mbti": "INTJ",
  "reason": "string"
}}

--- 사용자 문서 ---
{document}
---
'''
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {'role': 'system', 'content': '당신은 MBTI 분석 전문가입니다.'},
                {'role': 'user', 'content': prompt}
            ]
        )
        return resp.choices[0].message.content

    async def convert_bigfive_to_mbti(self, openness, conscientiousness, extraversion, agreeableness, neuroticism):
        # Big Five → MBTI 규칙 기반 매핑

        I_E = "E" if extraversion >= 50 else "I"
        S_N = "N" if openness >= 50 else "S"
        T_F = "F" if agreeableness >= 50 else "T"
        J_P = "J" if conscientiousness >= 50 else "P"

        mbti = I_E + S_N + T_F + J_P

        return {
            "mbti": mbti,
            "logic": {
                "I/E": f"extraversion={extraversion} → {I_E}",
                "S/N": f"openness={openness} → {S_N}",
                "T/F": f"agreeableness={agreeableness} → {T_F}",
                "J/P": f"conscientiousness={conscientiousness} → {J_P}"
            }
        }
