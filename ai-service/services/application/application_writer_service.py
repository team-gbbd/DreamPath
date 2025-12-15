"""
AI Application Writer Service
Generates personalized cover letters and application tips based on user profile and job posting
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from openai import OpenAI

logger = logging.getLogger(__name__)


class ApplicationWriterService:
    """AI-powered application writing assistant"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate_cover_letter(
        self,
        user_profile: Dict[str, Any],
        job_info: Dict[str, Any],
        style: str = "professional"
    ) -> Dict[str, Any]:
        """
        Generate a personalized cover letter draft

        Args:
            user_profile: User's profile analysis data (MBTI, strengths, experiences, etc.)
            job_info: Job posting information (title, company, requirements, etc.)
            style: Writing style - "professional", "passionate", "creative"

        Returns:
            Generated cover letter and tips
        """

        style_instructions = {
            "professional": "전문적이고 격식 있는 톤으로 작성하세요. 구체적인 성과와 역량을 강조하세요.",
            "passionate": "열정적이고 진정성 있는 톤으로 작성하세요. 회사에 대한 관심과 동기를 강조하세요.",
            "creative": "창의적이고 개성 있는 톤으로 작성하세요. 독특한 경험과 관점을 부각하세요."
        }

        system_prompt = """당신은 취업 컨설턴트입니다.
사용자의 프로필 분석 결과와 채용 공고를 바탕으로 맞춤형 자기소개서 초안을 작성합니다.

작성 원칙:
1. 사용자의 강점과 채용공고의 요구사항을 연결하세요
2. 구체적인 경험과 성과를 포함하세요
3. 회사의 가치와 문화에 맞는 내용을 작성하세요
4. 진정성 있고 차별화된 내용을 작성하세요
5. 한국어로 작성하세요

응답 형식 (JSON):
{
    "coverLetter": {
        "opening": "도입부 (회사에 지원하게 된 동기, 1-2문단)",
        "body": "본론 (강점, 경험, 역량을 채용 요구사항과 연결, 2-3문단)",
        "closing": "마무리 (포부와 기여 의지, 1문단)"
    },
    "highlights": ["강조할 포인트1", "강조할 포인트2", "강조할 포인트3"],
    "tips": [
        {
            "category": "카테고리명",
            "tip": "구체적인 팁 내용",
            "example": "예시 문장"
        }
    ],
    "warnings": ["주의할 점1", "주의할 점2"],
    "improvementSuggestions": [
        {
            "area": "개선 영역",
            "suggestion": "구체적인 제안"
        }
    ]
}"""

        user_prompt = f"""
## 사용자 프로필
{json.dumps(user_profile, ensure_ascii=False, indent=2)}

## 채용 공고 정보
- 회사: {job_info.get('company', '미상')}
- 직무: {job_info.get('title', '미상')}
- 설명: {job_info.get('description', '정보 없음')}
- 위치: {job_info.get('location', '미상')}

## 작성 스타일
{style_instructions.get(style, style_instructions['professional'])}

위 정보를 바탕으로 맞춤형 자기소개서 초안을 작성해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_completion_tokens=3000
            )

            result = json.loads(response.choices[0].message.content)

            return {
                "success": True,
                "data": result,
                "jobInfo": {
                    "company": job_info.get('company'),
                    "title": job_info.get('title')
                }
            }

        except Exception as e:
            logger.error(f"Cover letter generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_application_tips(
        self,
        user_profile: Dict[str, Any],
        job_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Get personalized application tips for a specific job

        Args:
            user_profile: User's profile data
            job_info: Job posting information

        Returns:
            Personalized tips for application
        """

        system_prompt = """당신은 취업 컨설턴트입니다.
사용자 프로필과 채용 공고를 분석하여 합격률을 높이는 맞춤형 지원 팁을 제공합니다.

응답 형식 (JSON):
{
    "overallStrategy": "전체적인 지원 전략 요약",
    "documentTips": [
        {
            "title": "팁 제목",
            "description": "상세 설명",
            "priority": "high/medium/low"
        }
    ],
    "interviewPrep": [
        {
            "question": "예상 면접 질문",
            "suggestedAnswer": "답변 방향 제안",
            "yourStrength": "활용할 수 있는 당신의 강점"
        }
    ],
    "dosDonts": {
        "dos": ["해야 할 것들"],
        "donts": ["하지 말아야 할 것들"]
    },
    "keyMessages": ["핵심 어필 메시지1", "핵심 어필 메시지2"]
}"""

        user_prompt = f"""
## 사용자 프로필
{json.dumps(user_profile, ensure_ascii=False, indent=2)}

## 채용 공고 정보
- 회사: {job_info.get('company', '미상')}
- 직무: {job_info.get('title', '미상')}
- 설명: {job_info.get('description', '정보 없음')}

이 공고에 지원할 때 합격률을 높일 수 있는 맞춤형 팁을 제공해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_completion_tokens=2000
            )

            result = json.loads(response.choices[0].message.content)

            return {
                "success": True,
                "data": result
            }

        except Exception as e:
            logger.error(f"Application tips generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def review_cover_letter(
        self,
        cover_letter: str,
        job_info: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Review and provide feedback on a user-written cover letter

        Args:
            cover_letter: The cover letter text to review
            job_info: Job posting information
            user_profile: Optional user profile for personalized feedback

        Returns:
            Review feedback and suggestions
        """

        system_prompt = """당신은 경험 많은 채용 담당자이자 취업 컨설턴트입니다.
제출된 자기소개서를 분석하고 구체적인 피드백을 제공합니다.

평가 기준:
1. 직무 관련성: 채용 공고 요구사항과의 연관성
2. 구체성: 추상적인 표현 vs 구체적인 경험/성과
3. 차별화: 다른 지원자와 구별되는 내용
4. 진정성: 진솔하고 신뢰가 가는 내용
5. 구조/가독성: 논리적 흐름과 읽기 편함

응답 형식 (JSON):
{
    "overallScore": 85,
    "overallFeedback": "전체적인 평가 요약",
    "scores": {
        "relevance": {"score": 80, "feedback": "직무 관련성 피드백"},
        "specificity": {"score": 75, "feedback": "구체성 피드백"},
        "differentiation": {"score": 70, "feedback": "차별화 피드백"},
        "authenticity": {"score": 90, "feedback": "진정성 피드백"},
        "structure": {"score": 85, "feedback": "구조/가독성 피드백"}
    },
    "strengths": ["잘한 점1", "잘한 점2"],
    "improvements": [
        {
            "issue": "개선이 필요한 부분",
            "suggestion": "구체적인 개선 제안",
            "example": "수정 예시"
        }
    ],
    "rewriteSuggestions": [
        {
            "original": "원본 문장",
            "improved": "개선된 문장",
            "reason": "수정 이유"
        }
    ]
}"""

        profile_info = ""
        if user_profile:
            profile_info = f"\n## 지원자 프로필\n{json.dumps(user_profile, ensure_ascii=False, indent=2)}"

        user_prompt = f"""
## 채용 공고 정보
- 회사: {job_info.get('company', '미상')}
- 직무: {job_info.get('title', '미상')}
- 설명: {job_info.get('description', '정보 없음')}
{profile_info}

## 검토할 자기소개서
{cover_letter}

위 자기소개서를 분석하고 구체적인 피드백을 제공해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.5,
                max_completion_tokens=2500
            )

            result = json.loads(response.choices[0].message.content)

            return {
                "success": True,
                "data": result
            }

        except Exception as e:
            logger.error(f"Cover letter review failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
_application_writer_service: Optional[ApplicationWriterService] = None


def get_application_writer_service() -> ApplicationWriterService:
    """Get singleton instance of ApplicationWriterService"""
    global _application_writer_service
    if _application_writer_service is None:
        _application_writer_service = ApplicationWriterService()
    return _application_writer_service
