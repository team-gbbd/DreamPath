"""
문제 생성 서비스
GPT를 사용하여 학습 문제 자동 생성
"""
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI
import os


class QuestionGeneratorService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

        self.client = AsyncOpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate_questions(
        self,
        domain: str,
        week_number: int,
        count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        주차별 학습 문제 생성

        Args:
            domain: 학습 분야
            week_number: 주차 (1-4)
            count: 생성할 문제 개수

        Returns:
            문제 리스트
        """
        type_guidelines = self._get_type_guidelines(domain)
        week_theme = self._get_week_theme(week_number)
        difficulty = self._get_difficulty(week_number)

        prompt = f"""당신은 {domain} 분야의 교육 전문가입니다.
{week_number}주차({week_theme}) 학습 문제를 {count}개 생성해주세요.

## 문제 유형 가이드라인
{type_guidelines}

## 난이도
{difficulty}

## 요구사항
1. 각 문제는 실제 {domain} 업무/학습에서 중요한 내용
2. MCQ는 4지선다
3. SCENARIO는 실무 상황 기반
4. 모든 문제에 명확한 정답과 해설 포함

## 점수 기준
- EASY: 10점
- MEDIUM: 20점
- HARD: 30점

## JSON 형식으로 출력
{{
  "questions": [
    {{
      "type": "MCQ" | "SCENARIO" | "CODING" | "DESIGN",
      "difficulty": "{difficulty}",
      "question": "문제 텍스트",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": "정답",
      "explanation": "해설",
      "maxScore": (EASY=10, MEDIUM=20, HARD=30)
    }}
  ]
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "교육 콘텐츠 전문가"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            data = json.loads(content)

            questions = data.get("questions", [])
            return questions[:count]

        except Exception as e:
            print(f"문제 생성 실패: {e}")
            raise

    def _get_type_guidelines(self, domain: str) -> str:
        """도메인별 문제 유형"""
        domain_lower = domain.lower()

        if any(kw in domain_lower for kw in ["프로그래밍", "개발", "코딩"]):
            return "MCQ, SCENARIO, CODING, DESIGN 모두 사용"

        if any(kw in domain_lower for kw in ["디자인", "ux", "ui"]):
            return "MCQ, SCENARIO, DESIGN (CODING 제외)"

        if any(kw in domain_lower for kw in ["금융", "경제", "정치", "사회"]):
            return "MCQ, SCENARIO만 (CODING, DESIGN 제외)"

        return "MCQ, SCENARIO 중심"

    def _get_week_theme(self, week_number: int) -> str:
        """주차별 주제"""
        return {
            1: "기초 개념",
            2: "핵심 이해",
            3: "응용 실습",
            4: "종합 심화"
        }.get(week_number, "학습")

    def _get_difficulty(self, week_number: int) -> str:
        """주차별 난이도"""
        return {
            1: "EASY",
            2: "MEDIUM",
            3: "MEDIUM",
            4: "HARD"
        }.get(week_number, "MEDIUM")
