"""
문제 생성 서비스
GPT를 사용하여 학습 문제 자동 생성
"""
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI
from config import settings


class QuestionGeneratorService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

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
        week_theme = self._get_week_theme(week_number)
        difficulty = self._get_difficulty(week_number)

        prompt = f"""당신은 "{domain}" 분야의 교육 전문가입니다.
{week_number}주차({week_theme}) 학습 문제를 {count}개 생성해주세요.

## 문제 유형 선택
"{domain}" 분야에 가장 적합한 문제 유형을 자동으로 선택해서 출제하세요.
- 개발/프로그래밍 분야: MCQ(객관식), SCENARIO(시나리오), CODING(코딩), DESIGN(설계)
- 디자인/UX 분야: MCQ, SCENARIO, DESIGN (코딩 제외)
- 금융/경제/분석 분야: MCQ, SCENARIO (케이스 분석 중심)
- 요리/셰프 분야: MCQ(조리 이론), SCENARIO(상황 판단, 레시피 응용)
- 의료/상담 분야: MCQ(이론), SCENARIO(케이스 분석)
- 기타 분야: 해당 분야에 적합한 MCQ, SCENARIO 중심

## 난이도: {difficulty}

### 난이도별 기준 (반드시 준수!)
- **EASY**: 기본 개념, 용어 정의, 단순 암기 수준. 정답이 명확하고 고민 없이 풀 수 있는 문제.
- **MEDIUM**: 2가지 이상 개념 연결, 간단한 상황 판단 필요. 약간의 사고가 필요하지만 기초가 있으면 풀 수 있는 문제.
- **HARD**: 복합 상황 분석, 여러 조건 고려, 실무 적용 수준. 깊은 이해와 종합적 사고가 필요한 문제.

현재 주차 난이도는 **{difficulty}**이므로 위 기준에 맞게 출제하세요.

## 요구사항
1. 각 문제는 실제 {domain} 업무/학습에서 중요한 내용
2. MCQ는 4지선다 (options 필드 필수)
3. SCENARIO는 실무 상황 기반 (options 없이 서술형)
4. 모든 문제에 명확한 정답과 해설 포함
5. 문제 내용은 {domain} 분야의 실제 지식과 기술을 평가
6. **난이도 기준을 정확히 반영하여 출제**

## 점수 기준
- EASY: 10점
- MEDIUM: 20점
- HARD: 30점

## JSON 형식으로 출력
{{
  "questions": [
    {{
      "type": "MCQ" | "SCENARIO",
      "difficulty": "{difficulty}",
      "question": "문제 텍스트 ({domain} 분야에 맞는 내용)",
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
                temperature=1,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            data = json.loads(content)

            questions = data.get("questions", [])
            return questions[:count]

        except Exception as e:
            print(f"문제 생성 실패: {e}")
            raise

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
