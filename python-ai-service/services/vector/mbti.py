from openai import OpenAI
client = OpenAI()

def analyze_mbti(bigfive: dict, text: str):
    prompt = f"""
    Big Five 데이터와 텍스트를 기반으로 MBTI를 결정해줘.
    E/I, S/N, T/F, J/P 각각에 대한 근거를 포함해야 한다.

    Big Five:
    {bigfive}

    텍스트:
    {text}
    """

    res = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": prompt}]
    )
    return res.choices[0].message.content
