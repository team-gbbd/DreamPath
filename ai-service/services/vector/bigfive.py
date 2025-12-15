import os
from openai import OpenAI

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

def analyze_bigfive(text: str):
    if client is None:
        raise RuntimeError("OPENAI_API_KEY 환경 변수가 필요합니다.")

    prompt = f"""
    아래 텍스트를 기반으로 Big Five 점수를 0~1.0으로 계산하고,
    각 점수의 근거 문장을 포함해서 JSON 형식으로 정리해줘.

    텍스트:
    {text}
    """

    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return res.choices[0].message.content
