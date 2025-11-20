from openai import OpenAI
client = OpenAI()

def analyze_bigfive(text: str):
    prompt = f"""
    아래 텍스트를 기반으로 Big Five 점수를 0~1.0으로 계산하고,
    각 점수의 근거 문장을 포함해서 JSON 형식으로 정리해줘.

    텍스트:
    {text}
    """

    res = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": prompt}]
    )
    return res.choices[0].message.content
