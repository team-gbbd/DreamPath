import os
from openai import OpenAI
from typing import List, Dict, Any


class RagAnswerService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def generate_answer(self, question: str, matches: List[Dict[str, Any]]) -> str:
        """FAQ 전용 답변 생성 메서드"""

        # FAQ 형식으로 context 생성
        context = []

        for match in matches:
            metadata = match.get("metadata", {})

            if "question" in metadata and "answer" in metadata:
                faq_q = metadata["question"]
                faq_a = metadata["answer"]
                context.append(f"Q: {faq_q}\nA: {faq_a}\n")
            elif "text" in metadata:
                context.append(f"- {metadata['text']}\n")

        # FAQ가 없으면 무조건 범위 외 메시지 반환
        if not context or len(context) == 0:
            return "죄송하지만, DreamPath 서비스 관련 질문 외에는 답변할 수 없습니다. DreamPath와 관련된 질문이나 도움이 필요하시면 언제든지 말씀해 주세요!"

        context_str = "\n".join(context)

        # FAQ가 있으면 GPT로 자연스러운 답변 생성
        prompt = f"""You are DreamPath AI Assistant for FAQ.

SCOPE:
- ONLY answer questions related to DreamPath services (service introduction, sign-up, pricing, FAQ, inquiries)
- For unrelated questions, respond EXACTLY: "죄송하지만, DreamPath 서비스 관련 질문 외에는 답변할 수 없습니다. DreamPath와 관련된 질문이나 도움이 필요하시면 언제든지 말씀해 주세요!😊"

INSTRUCTIONS:
- Use the FAQ context below to answer user's question
- Be friendly and helpful
- Answer in Korean with markdown format

FAQ Context:
{context_str}

User Question: {question}

Answer:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content

        except Exception as e:
            raise RuntimeError(f"GPT 답변 생성 실패: {str(e)}")
