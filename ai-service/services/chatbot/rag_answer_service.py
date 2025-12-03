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

        context_str = "\n".join(context)

        prompt = f"""당신은 DreamPath 진로 상담 서비스의 친절한 AI 어시스턴트입니다.
아래 정보를 참고하여 사용자의 질문에 답변해주세요.
친절하고 자연스럽게 한국어로 답변하세요.

⚠️ 중요 규칙:

1. 먼저 참고 정보를 확인하세요:
   - 참고 정보가 비어있거나 사용자 질문과 전혀 관련 없음 → "정보 없음 답변" 사용
   - 참고 정보에 관련된 FAQ가 있음 → "FAQ 기반 답변" 제공

2. 정보 없음 답변 (관련 FAQ가 없을 때):
   반드시 정확히 이렇게만 답변:
   "죄송하지만 해당 질문에 대한 정보가 없습니다. DreamPath팀에 문의를 남기시겠습니까?"

3. FAQ 기반 답변 (관련 FAQ가 있을 때):
   - FAQ 정보를 바탕으로 공감과 이해를 담아 대화하듯이 답변
   - 사용자의 상황을 이해하고 있다는 느낌을 주세요
   - 필요하다면 추가 팁이나 관련 정보를 덧붙이세요

예시:
- 좋은 예: "아이디 변경에 대해 문의주셨군요! 안타깝게도 DreamPath에서는 보안상의 이유로 한 번 설정된 아이디는 변경이 불가능해요."

참고 정보:
{context_str}

사용자 질문: {question}
"""

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
