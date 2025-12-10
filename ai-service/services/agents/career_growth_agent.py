"""
커리어 성장 제안 AI 에이전트
사용자의 현재 위치에서 목표 포지션까지의 성장 경로를 분석하고 제안합니다.
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI


class CareerGrowthAgent:
    """커리어 성장 제안 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def analyze_career_gap(
        self,
        current_position: str,
        target_position: str,
        current_skills: List[str],
        career_analysis: Optional[Dict] = None
    ) -> Dict:
        """
        현재 위치와 목표 포지션 간의 갭 분석

        Args:
            current_position: 현재 포지션 (예: "주니어 백엔드 개발자")
            target_position: 목표 포지션 (예: "시니어 풀스택 개발자")
            current_skills: 현재 보유 스킬 목록
            career_analysis: 커리어 분석 결과 (선택)

        Returns:
            갭 분석 결과 및 성장 경로
        """
        # 사용자 정보 요약
        user_context = f"""
현재 포지션: {current_position}
목표 포지션: {target_position}
현재 스킬: {', '.join(current_skills[:10])}
"""

        if career_analysis:
            strengths = career_analysis.get("strengths", [])
            if strengths:
                user_context += f"\n강점: {', '.join(strengths[:5])}"

        prompt = f"""다음 사용자의 커리어 성장 경로를 분석해주세요.

【사용자 정보】
{user_context}

다음 형식의 JSON으로 응답해주세요:
{{
  "gapAnalysis": {{
    "missingSkills": ["스킬1", "스킬2", "스킬3"],
    "missingExperience": ["경험1", "경험2"],
    "estimatedTimeYears": 2.5,
    "difficultyLevel": "MEDIUM"
  }},
  "growthPath": [
    {{
      "step": 1,
      "title": "단계 제목",
      "description": "무엇을 해야 하는지",
      "duration": "6개월",
      "milestones": ["마일스톤1", "마일스톤2"]
    }}
  ],
  "recommendedResources": [
    {{
      "type": "COURSE",
      "title": "추천 강의/자격증",
      "description": "왜 필요한지",
      "priority": "HIGH"
    }}
  ],
  "nextSteps": ["즉시 시작할 수 있는 액션1", "액션2", "액션3"]
}}

- difficultyLevel: EASY, MEDIUM, HARD 중 하나
- type: COURSE, CERTIFICATION, PROJECT, BOOK 중 하나
- priority: HIGH, MEDIUM, LOW 중 하나
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 경력 20년의 커리어 코치입니다. 구체적이고 실행 가능한 성장 경로를 제시합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                result = json.loads(json_match.group())
                return result

            # 기본값 반환
            return self._get_default_gap_analysis()

        except Exception as e:
            print(f"커리어 갭 분석 실패: {str(e)}")
            return self._get_default_gap_analysis()

    async def suggest_skill_development(
        self,
        target_position: str,
        current_skills: List[str]
    ) -> Dict:
        """
        목표 포지션에 필요한 스킬 개발 제안

        Args:
            target_position: 목표 포지션
            current_skills: 현재 보유 스킬

        Returns:
            스킬 개발 로드맵
        """
        prompt = f"""다음 포지션에 필요한 스킬 개발 계획을 세워주세요.

목표 포지션: {target_position}
현재 스킬: {', '.join(current_skills)}

다음 형식의 JSON으로 응답해주세요:
{{
  "requiredSkills": [
    {{
      "skill": "스킬명",
      "currentLevel": "NONE/BASIC/INTERMEDIATE/ADVANCED",
      "targetLevel": "INTERMEDIATE/ADVANCED/EXPERT",
      "priority": "HIGH/MEDIUM/LOW",
      "learningPath": [
        "학습 단계1",
        "학습 단계2"
      ],
      "estimatedTime": "3개월"
    }}
  ],
  "learningPriority": [
    "먼저 배워야 할 스킬1",
    "그 다음 스킬2",
    "마지막으로 스킬3"
  ]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 기술 교육 전문가입니다. 효율적인 학습 경로를 제시합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1000
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {"requiredSkills": [], "learningPriority": []}

        except Exception as e:
            print(f"스킬 개발 제안 실패: {str(e)}")
            return {"requiredSkills": [], "learningPriority": []}

    async def create_growth_timeline(
        self,
        target_position: str,
        timeline_years: int = 3
    ) -> Dict:
        """
        커리어 성장 타임라인 생성

        Args:
            target_position: 목표 포지션
            timeline_years: 목표 달성 기간 (년)

        Returns:
            단계별 타임라인
        """
        prompt = f"""다음 포지션에 도달하기 위한 {timeline_years}년 계획을 세워주세요.

목표 포지션: {target_position}
기간: {timeline_years}년

분기별 목표를 JSON 형식으로 제공해주세요:
{{
  "timeline": [
    {{
      "period": "1분기 (1-3개월)",
      "goals": ["목표1", "목표2"],
      "keyActivities": ["활동1", "활동2"],
      "expectedOutcomes": ["기대 성과1"]
    }}
  ],
  "milestones": [
    {{
      "month": 6,
      "title": "중요 마일스톤",
      "description": "달성해야 할 것"
    }}
  ]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 목표 달성 전문 코치입니다. 실현 가능한 단계별 계획을 만듭니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1200
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {"timeline": [], "milestones": []}

        except Exception as e:
            print(f"타임라인 생성 실패: {str(e)}")
            return {"timeline": [], "milestones": []}

    async def analyze_market_trends(
        self,
        target_career: str
    ) -> Dict:
        """
        목표 직업의 시장 트렌드 분석

        Args:
            target_career: 목표 직업

        Returns:
            시장 트렌드 분석 결과
        """
        prompt = f"""다음 직업의 현재 시장 트렌드를 분석해주세요.

직업: {target_career}

다음 형식의 JSON으로 응답해주세요:
{{
  "demandLevel": "HIGH/MEDIUM/LOW",
  "salaryRange": "평균 연봉 범위",
  "growingSkills": ["최근 주목받는 스킬1", "스킬2", "스킬3"],
  "marketInsights": [
    "시장 인사이트1",
    "시장 인사이트2"
  ],
  "futureOutlook": "향후 3-5년 전망",
  "recommendedCertifications": ["추천 자격증1", "자격증2"]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 노동 시장 분석 전문가입니다. 최신 트렌드와 데이터를 기반으로 분석합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=800
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "demandLevel": "MEDIUM",
                "salaryRange": "정보 없음",
                "growingSkills": [],
                "marketInsights": [],
                "futureOutlook": "분석 중입니다.",
                "recommendedCertifications": []
            }

        except Exception as e:
            print(f"시장 트렌드 분석 실패: {str(e)}")
            return {
                "demandLevel": "MEDIUM",
                "salaryRange": "정보 없음",
                "growingSkills": [],
                "marketInsights": [],
                "futureOutlook": "분석 중 오류가 발생했습니다.",
                "recommendedCertifications": []
            }

    def _get_default_gap_analysis(self) -> Dict:
        """기본 갭 분석 결과"""
        return {
            "gapAnalysis": {
                "missingSkills": ["분석 중입니다."],
                "missingExperience": ["분석 중입니다."],
                "estimatedTimeYears": 0,
                "difficultyLevel": "MEDIUM"
            },
            "growthPath": [],
            "recommendedResources": [],
            "nextSteps": ["커리어 상담을 통해 구체적인 계획을 수립하세요."]
        }
