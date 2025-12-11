"""
답안 채점 서비스
GPT를 사용하여 답안 자동 채점 및 피드백 생성
"""
import json
from typing import Dict, Any
from openai import AsyncOpenAI
import os


class AnswerEvaluatorService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

        self.client = AsyncOpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def evaluate_answer(
        self,
        question_type: str,
        question_text: str,
        user_answer: str,
        correct_answer: str,
        max_score: int
    ) -> Dict[str, Any]:
        """
        답안 채점

        Args:
            question_type: 문제 유형
            question_text: 문제 텍스트
            user_answer: 사용자 답안
            correct_answer: 정답
            max_score: 만점

        Returns:
            {"score": int, "feedback": str}
        """
        # MCQ는 직접 비교
        if question_type == "MCQ":
            return self._evaluate_mcq(user_answer, correct_answer, max_score)

        # 나머지는 AI 채점
        return await self._evaluate_with_ai(
            question_text,
            user_answer,
            correct_answer,
            max_score
        )

    def _evaluate_mcq(
        self,
        user_answer: str,
        correct_answer: str,
        max_score: int
    ) -> Dict[str, Any]:
        """MCQ 직접 비교 채점"""
        is_correct = user_answer.strip().lower() == correct_answer.strip().lower()

        return {
            "score": max_score if is_correct else 0,
            "feedback": (
                "정답입니다! 잘하셨습니다." if is_correct
                else f"아쉽게도 정답이 아닙니다. 정답은 '{correct_answer}'입니다."
            )
        }

    async def _evaluate_with_ai(
        self,
        question_text: str,
        user_answer: str,
        correct_answer: str,
        max_score: int
    ) -> Dict[str, Any]:
        """AI 기반 채점"""
        prompt = f"""답안을 채점해주세요.

## 문제
{question_text}

## 모범답안
{correct_answer}

## 학생 답안
{user_answer}

## 채점 기준
- 정확성: 모범답안과의 일치도
- 완성도: 답변의 상세함
- 실용성: 실제 적용 가능성

만점: {max_score}점

## JSON 형식 출력
{{
  "score": 0-{max_score},
  "feedback": "상세한 피드백 (장점, 개선점)"
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "공정하고 친절한 교육 평가자"},
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            return {
                "score": min(result.get("score", 0), max_score),
                "feedback": result.get("feedback", "채점 완료")
            }

        except Exception as e:
            print(f"AI 채점 실패: {e}")
            return {
                "score": 0,
                "feedback": "채점 중 오류가 발생했습니다."
            }
