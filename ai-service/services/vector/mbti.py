import os
from openai import OpenAI

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

def analyze_mbti(bigfive: dict, text: str):
    if client is None:
        raise RuntimeError("OPENAI_API_KEY 환경 변수가 필요합니다.")

    prompt = f"""
    Big Five 데이터와 텍스트를 기반으로 MBTI를 결정해줘.
    E/I, S/N, T/F, J/P 각각에 대한 근거를 포함해야 한다.

    Big Five:
    {bigfive}

    텍스트:
    {text}
    """

    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return res.choices[0].message.content
