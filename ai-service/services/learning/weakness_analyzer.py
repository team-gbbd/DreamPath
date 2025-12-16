"""
약점 분석 서비스
GPT를 사용하여 오답 패턴 분석 및 약점 태그 생성
"""
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI
from config import settings


class WeaknessAnalyzerService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    async def analyze_weaknesses(
        self,
        domain: str,
        wrong_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        오답 패턴 분석 및 약점 태그 생성

        Args:
            domain: 학습 분야 (예: "백엔드 개발", "데이터 분석")
            wrong_answers: 오답 리스트
                [
                    {
                        "questionType": "MCQ",
                        "questionText": "문제 내용",
                        "correctAnswer": "정답",
                        "userAnswer": "사용자 답변",
                        "feedback": "AI 피드백",
                        "score": 0,
                        "maxScore": 10
                    }
                ]

        Returns:
            {
                "weaknessTags": [
                    {"tag": "태그명", "count": 3, "severity": "high", "description": "설명"}
                ],
                "recommendations": ["추천 학습 내용"],
                "overallAnalysis": "종합 분석",
                "radarData": [
                    {"category": "카테고리명", "score": 70, "fullMark": 100}
                ]
            }
        """
        if not wrong_answers:
            return self._empty_result()

        # 오답 데이터 정리
        wrong_summary = self._summarize_wrong_answers(wrong_answers)

        prompt = f"""당신은 {domain} 분야 교육 전문가입니다.
학습자의 오답 패턴을 분석하여 약점을 파악하고 쉽고 친절한 조언을 제공해주세요.

## 중요: 모든 설명은 고등학생도 이해할 수 있는 쉬운 말로 작성하세요!
- 전문 용어는 최소화하고, 꼭 필요하면 괄호 안에 쉬운 설명 추가
- 문장은 짧고 간결하게
- 실천하기 쉬운 구체적인 조언 제시

## 학습 분야
{domain}

## 오답 데이터 ({len(wrong_answers)}개)
{wrong_summary}

## 분석 요청
1. 오답 패턴에서 공통적인 약점 영역을 찾아 짧은 태그로 분류 (10자 이내)
2. 각 약점의 심각도 평가 (high/medium/low)
3. 쉽게 따라할 수 있는 학습 권장사항 제시 (각 2문장 이내)
4. 역량 영역별 점수 산출 (레이더 차트용)

## 역량 영역
"{domain}" 분야에 가장 적합한 5가지 핵심 역량을 **한글 4-6자**로 간결하게 선정하세요.
예시:
- 백엔드 개발: 코딩 기초, API 설계, DB 이해, 보안, 시스템 설계
- 사회복지사: 상담 기술, 사례 관리, 윤리 이해, 자원 연계, 기록 작성
- 셰프: 조리 기초, 식재료, 위생 관리, 메뉴 구성, 원가 관리

## JSON 형식으로 출력
{{
  "weaknessTags": [
    {{
      "tag": "짧은 약점명 (10자 이내)",
      "count": 해당_약점_오답_개수,
      "severity": "high" | "medium" | "low",
      "description": "쉬운 한 문장 설명"
    }}
  ],
  "recommendations": [
    "쉽게 따라할 수 있는 조언 1 (2문장 이내)",
    "쉽게 따라할 수 있는 조언 2 (2문장 이내)",
    "쉽게 따라할 수 있는 조언 3 (2문장 이내)"
  ],
  "overallAnalysis": "친절하고 격려하는 톤의 종합 분석 (2문장)",
  "radarData": [
    {{"category": "한글 4-6자 역량명", "score": 0-100, "fullMark": 100}},
    {{"category": "한글 4-6자 역량명", "score": 0-100, "fullMark": 100}},
    {{"category": "한글 4-6자 역량명", "score": 0-100, "fullMark": 100}},
    {{"category": "한글 4-6자 역량명", "score": 0-100, "fullMark": 100}},
    {{"category": "한글 4-6자 역량명", "score": 0-100, "fullMark": 100}}
  ]
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "교육 분석 전문가. 학습자의 약점을 정확히 파악하고 건설적인 피드백을 제공합니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            # 결과 검증 및 정규화
            return self._normalize_result(result, len(wrong_answers))

        except Exception as e:
            print(f"약점 분석 실패: {e}")
            return self._fallback_result(wrong_answers)

    def _summarize_wrong_answers(self, wrong_answers: List[Dict[str, Any]]) -> str:
        """오답 데이터를 요약 문자열로 변환"""
        lines = []
        for i, wa in enumerate(wrong_answers, 1):
            lines.append(f"""
### 오답 {i}
- 유형: {wa.get('questionType', 'N/A')}
- 문제: {wa.get('questionText', 'N/A')[:100]}...
- 정답: {wa.get('correctAnswer', 'N/A')[:50]}
- 내 답: {wa.get('userAnswer', 'N/A')[:50]}
- 피드백: {wa.get('feedback', 'N/A')[:100]}
- 점수: {wa.get('score', 0)}/{wa.get('maxScore', 10)}
""")
        return "\n".join(lines)

    def _empty_result(self) -> Dict[str, Any]:
        """오답이 없을 때 빈 결과"""
        return {
            "weaknessTags": [],
            "recommendations": ["현재 분석할 오답 데이터가 없습니다. 학습을 계속 진행해주세요!"],
            "overallAnalysis": "아직 분석할 오답이 충분하지 않습니다.",
            "radarData": [
                {"category": "기초 이론", "score": 80, "fullMark": 100},
                {"category": "실무 적용", "score": 80, "fullMark": 100},
                {"category": "문제 해결", "score": 80, "fullMark": 100},
                {"category": "최신 트렌드", "score": 80, "fullMark": 100},
                {"category": "종합 사고", "score": 80, "fullMark": 100}
            ]
        }

    def _normalize_result(self, result: Dict[str, Any], total_wrong: int) -> Dict[str, Any]:
        """결과 정규화"""
        # weaknessTags 검증
        tags = result.get("weaknessTags", [])
        normalized_tags = []
        for tag in tags[:5]:  # 최대 5개
            normalized_tags.append({
                "tag": tag.get("tag", "기타")[:30],
                "count": min(tag.get("count", 1), total_wrong),
                "severity": tag.get("severity", "medium") if tag.get("severity") in ["high", "medium", "low"] else "medium",
                "description": tag.get("description", "")[:100]
            })

        # recommendations 검증
        recommendations = result.get("recommendations", [])[:5]

        # radarData 검증 - GPT가 반환한 카테고리를 그대로 사용
        radar = result.get("radarData", [])
        normalized_radar = []

        for item in radar[:5]:  # 최대 5개
            category = item.get("category", "역량")[:15]
            score = item.get("score", 50)
            score = max(0, min(100, score))  # 0-100 범위
            normalized_radar.append({
                "category": category,
                "score": score,
                "fullMark": 100
            })

        # 5개 미만이면 기본값으로 채움
        while len(normalized_radar) < 5:
            normalized_radar.append({
                "category": f"역량{len(normalized_radar)+1}",
                "score": 50,
                "fullMark": 100
            })

        return {
            "weaknessTags": normalized_tags,
            "recommendations": recommendations,
            "overallAnalysis": result.get("overallAnalysis", "분석 결과를 확인해주세요.")[:300],
            "radarData": normalized_radar
        }

    def _fallback_result(self, wrong_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """AI 분석 실패 시 기본 분석"""
        # 문제 유형별 오답 카운트
        type_count = {}
        for wa in wrong_answers:
            q_type = wa.get("questionType", "기타")
            type_count[q_type] = type_count.get(q_type, 0) + 1

        tags = []
        for q_type, count in type_count.items():
            type_name = {
                "MCQ": "객관식 문제",
                "SCENARIO": "시나리오 분석",
                "CODING": "코딩 구현",
                "DESIGN": "설계 문제"
            }.get(q_type, q_type)

            severity = "high" if count >= 3 else "medium" if count >= 2 else "low"
            tags.append({
                "tag": f"{type_name} 취약",
                "count": count,
                "severity": severity,
                "description": f"{type_name} 유형에서 {count}개 오답 발생"
            })

        return {
            "weaknessTags": tags,
            "recommendations": [
                "틀린 문제의 해설을 다시 읽어보세요",
                "관련 개념을 복습해보세요",
                "비슷한 유형의 문제를 더 풀어보세요"
            ],
            "overallAnalysis": f"총 {len(wrong_answers)}개의 오답이 분석되었습니다. 위 약점 영역을 집중적으로 학습하시기 바랍니다.",
            "radarData": [
                {"category": "기초 이론", "score": 60, "fullMark": 100},
                {"category": "실무 적용", "score": 50, "fullMark": 100},
                {"category": "문제 해결", "score": 55, "fullMark": 100},
                {"category": "최신 트렌드", "score": 65, "fullMark": 100},
                {"category": "종합 사고", "score": 55, "fullMark": 100}
            ]
        }
