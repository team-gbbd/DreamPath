"""
이력서 자동 최적화 AI 에이전트
채용 공고에 맞춰 이력서를 최적화하고 ATS(지원자 추적 시스템) 통과율을 높입니다.
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI


class ResumeOptimizerAgent:
    """이력서 자동 최적화 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def optimize_for_job(
        self,
        resume: Dict,
        job_posting: Dict
    ) -> Dict:
        """
        특정 채용 공고에 맞춰 이력서 최적화

        Args:
            resume: 사용자 이력서 (제목, 경력, 스킬, 프로젝트 등)
            job_posting: 채용 공고 (제목, 회사, 요구사항 등)

        Returns:
            최적화된 이력서 및 개선 제안
        """
        # 이력서 요약
        resume_summary = self._create_resume_summary(resume)

        # 채용 공고 요약
        job_summary = f"""
제목: {job_posting.get('title', '')}
회사: {job_posting.get('company', '')}
설명: {job_posting.get('description', '')[:500]}
"""

        prompt = f"""다음 이력서를 채용 공고에 맞춰 최적화해주세요.

【현재 이력서】
{resume_summary}

【지원할 채용 공고】
{job_summary}

다음 형식의 JSON으로 응답해주세요:
{{
  "atsScore": 75,
  "keywordMatches": [
    {{
      "keyword": "키워드",
      "inResume": true,
      "importance": "HIGH"
    }}
  ],
  "optimizationSuggestions": [
    {{
      "section": "SUMMARY/EXPERIENCE/SKILLS/PROJECTS",
      "current": "현재 내용",
      "suggested": "개선된 내용",
      "reason": "왜 바꿔야 하는지"
    }}
  ],
  "missingKeywords": ["추가해야 할 키워드1", "키워드2"],
  "strengthsToHighlight": ["강조할 강점1", "강점2"],
  "overallFeedback": "전체적인 피드백"
}}

- atsScore: 0-100 점수 (ATS 통과 가능성)
- importance: HIGH, MEDIUM, LOW
- section: SUMMARY, EXPERIENCE, SKILLS, PROJECTS 중 하나
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 이력서 작성 전문가이자 ATS 시스템 전문가입니다. 채용 공고와 이력서의 매칭도를 높이는 구체적인 조언을 제공합니다."
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

            return self._get_default_optimization()

        except Exception as e:
            print(f"이력서 최적화 실패: {str(e)}")
            return self._get_default_optimization()

    async def analyze_resume_quality(
        self,
        resume: Dict
    ) -> Dict:
        """
        이력서 품질 전반적으로 분석

        Args:
            resume: 사용자 이력서

        Returns:
            품질 분석 결과
        """
        resume_summary = self._create_resume_summary(resume)

        prompt = f"""다음 이력서의 품질을 분석해주세요.

【이력서】
{resume_summary}

다음 형식의 JSON으로 응답해주세요:
{{
  "overallScore": 75,
  "categoryScores": {{
    "formatting": 80,
    "content": 70,
    "clarity": 85,
    "keywords": 65,
    "achievements": 75
  }},
  "strengths": ["강점1", "강점2", "강점3"],
  "weaknesses": ["약점1", "약점2"],
  "improvementPriorities": [
    {{
      "priority": 1,
      "category": "카테고리",
      "suggestion": "개선 방법",
      "impact": "HIGH/MEDIUM/LOW"
    }}
  ],
  "generalAdvice": "전체적인 조언"
}}

- overallScore: 0-100 전체 점수
- categoryScores: 각 항목별 0-100 점수
- impact: 개선했을 때의 영향도
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 경력 20년의 인사 담당자입니다. 이력서를 객관적이고 건설적으로 평가합니다."
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

            return self._get_default_quality_analysis()

        except Exception as e:
            print(f"이력서 품질 분석 실패: {str(e)}")
            return self._get_default_quality_analysis()

    async def generate_cover_letter(
        self,
        resume: Dict,
        job_posting: Dict,
        user_motivation: Optional[str] = None
    ) -> Dict:
        """
        채용 공고에 맞춘 자기소개서 생성

        Args:
            resume: 사용자 이력서
            job_posting: 채용 공고
            user_motivation: 사용자 지원 동기 (선택)

        Returns:
            생성된 자기소개서
        """
        resume_summary = self._create_resume_summary(resume)

        job_info = f"""
회사: {job_posting.get('company', '')}
포지션: {job_posting.get('title', '')}
설명: {job_posting.get('description', '')[:300]}
"""

        motivation_text = f"\n지원 동기: {user_motivation}" if user_motivation else ""

        prompt = f"""다음 정보를 바탕으로 자기소개서를 작성해주세요.

【이력서】
{resume_summary}

【지원 공고】
{job_info}
{motivation_text}

다음 형식의 JSON으로 응답해주세요:
{{
  "coverLetter": "자기소개서 전문 (3-4 문단, 500-700자)",
  "structure": {{
    "opening": "도입부",
    "body1": "본문 1 - 관련 경험",
    "body2": "본문 2 - 강점과 기여",
    "closing": "마무리"
  }},
  "keyMessages": ["강조할 메시지1", "메시지2", "메시지3"],
  "tips": ["작성 팁1", "팁2"]
}}

자기소개서는:
- 진정성 있고 구체적으로
- 회사와 포지션에 맞춤
- 성과 중심으로
- 열정과 적합성 강조
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 자기소개서 작성 전문가입니다. 지원자의 강점을 효과적으로 전달하는 글을 작성합니다."
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

            return {
                "coverLetter": "자기소개서 생성 중 오류가 발생했습니다.",
                "structure": {},
                "keyMessages": [],
                "tips": []
            }

        except Exception as e:
            print(f"자기소개서 생성 실패: {str(e)}")
            return {
                "coverLetter": "자기소개서 생성 중 오류가 발생했습니다.",
                "structure": {},
                "keyMessages": [],
                "tips": []
            }

    async def suggest_keywords(
        self,
        target_position: str,
        industry: Optional[str] = None
    ) -> List[str]:
        """
        포지션에 맞는 키워드 추천

        Args:
            target_position: 목표 포지션
            industry: 산업 분야 (선택)

        Returns:
            추천 키워드 목록
        """
        industry_text = f" ({industry} 분야)" if industry else ""

        prompt = f"""다음 포지션의 이력서에 포함해야 할 중요 키워드를 추천해주세요.

포지션: {target_position}{industry_text}

JSON 배열로 15-20개의 키워드를 제공해주세요:
["키워드1", "키워드2", "키워드3", ...]

키워드는:
- 기술 스택
- 도구/프레임워크
- 소프트 스킬
- 산업 용어
- 자격증/인증
등을 포함해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 시장 전문가입니다. 각 포지션에 필요한 키워드를 정확히 알고 있습니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=500
            )

            result_text = response.choices[0].message.content

            # JSON 배열 추출
            import re
            import json
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return []

        except Exception as e:
            print(f"키워드 추천 실패: {str(e)}")
            return []

    def _create_resume_summary(self, resume: Dict) -> str:
        """이력서를 텍스트로 요약"""
        parts = []

        if resume.get("summary"):
            parts.append(f"요약: {resume['summary']}")

        if resume.get("experience"):
            exp_list = resume["experience"]
            parts.append(f"경력: {len(exp_list)}건")
            for exp in exp_list[:3]:
                parts.append(f"- {exp.get('title', '')} @ {exp.get('company', '')}")

        if resume.get("skills"):
            parts.append(f"스킬: {', '.join(resume['skills'][:10])}")

        if resume.get("education"):
            edu = resume["education"][0] if isinstance(resume["education"], list) else resume["education"]
            parts.append(f"학력: {edu.get('degree', '')} - {edu.get('school', '')}")

        return "\n".join(parts)

    def _get_default_optimization(self) -> Dict:
        """기본 최적화 결과"""
        return {
            "atsScore": 50,
            "keywordMatches": [],
            "optimizationSuggestions": [],
            "missingKeywords": [],
            "strengthsToHighlight": [],
            "overallFeedback": "이력서 분석 중 오류가 발생했습니다."
        }

    def _get_default_quality_analysis(self) -> Dict:
        """기본 품질 분석 결과"""
        return {
            "overallScore": 50,
            "categoryScores": {
                "formatting": 50,
                "content": 50,
                "clarity": 50,
                "keywords": 50,
                "achievements": 50
            },
            "strengths": [],
            "weaknesses": [],
            "improvementPriorities": [],
            "generalAdvice": "이력서 분석 중 오류가 발생했습니다."
        }
