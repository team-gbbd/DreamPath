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
        prompt = f"""당신은 DreamPath의 비회원 전용 AI 챗봇입니다.

## DreamPath 서비스 범위 (비회원)
다음 주제에 **ONLY** 답변합니다:
- 서비스 소개 및 이용 방법
- 회원가입 안내
- 요금제 및 가격
- FAQ
- 문의하기 방법

## 절대 답변하지 않는 주제
- 일반 상식 (역사, 과학, 수학, 영어 등)
- 일상 대화 (날씨, 음식, 취미 등)
- 코딩/프로그래밍
- 의료/법률 상담
- 뉴스/시사
- 번역
- 기타 DreamPath 서비스 외 모든 질문

## 응답 규칙
1. **참고 정보와 관련된 질문 → 참고 정보 기반 답변**
   아래 참고 정보를 바탕으로 친절하게 답변하세요.

2. **서비스 외 질문 → 무조건 거절**
   반드시 다음 형식으로만 답변:
   "죄송하지만, DreamPath 서비스 관련 질문 외에는 답변할 수 없습니다. DreamPath와 관련된 질문이나 도움이 필요하시면 언제든지 말씀해 주세요!😊"

3. **응답 형식 → 마크다운**

참고 정보:
{context_str}

User Question: {question}

Answer (FAQ 정보를 기반으로 자연스럽게 답변):"""

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
