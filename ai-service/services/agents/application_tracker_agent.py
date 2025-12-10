"""
지원 현황 자동 추적 AI 에이전트
사용자의 채용 지원 현황을 분석하고 다음 액션을 제안합니다.
"""
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from openai import OpenAI
from services.database_service import DatabaseService


class ApplicationTrackerAgent:
    """지원 현황 자동 추적 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()

    async def analyze_applications(self, user_id: int) -> Dict:
        """
        사용자의 전체 지원 현황 분석

        Args:
            user_id: 사용자 ID

        Returns:
            지원 현황 통계 및 인사이트
        """
        # 1. DB에서 지원 내역 가져오기 (실제로는 백엔드에서 전달받음)
        applications = self._get_mock_applications(user_id)

        if not applications:
            return {
                "totalApplications": 0,
                "statistics": {},
                "insights": [],
                "nextActions": []
            }

        # 2. 통계 계산
        statistics = self._calculate_statistics(applications)

        # 3. AI로 인사이트 생성
        insights = await self._generate_insights(applications, statistics)

        # 4. 다음 액션 제안
        next_actions = await self._suggest_next_actions(applications)

        return {
            "totalApplications": len(applications),
            "statistics": statistics,
            "insights": insights,
            "nextActions": next_actions,
            "applications": applications[:10]  # 최근 10개만
        }

    def _get_mock_applications(self, user_id: int) -> List[Dict]:
        """
        Mock 지원 내역 (실제로는 백엔드 DB에서 가져옴)
        여기서는 구조만 정의
        """
        # 실제로는 백엔드에서 전달받아야 함
        return []

    def _calculate_statistics(self, applications: List[Dict]) -> Dict:
        """
        지원 현황 통계 계산
        """
        total = len(applications)
        status_counts = {}

        for app in applications:
            status = app.get("status", "UNKNOWN")
            status_counts[status] = status_counts.get(status, 0) + 1

        # 합격률 계산
        applied = status_counts.get("APPLIED", 0)
        screening = status_counts.get("SCREENING", 0)
        interview = status_counts.get("INTERVIEW", 0)
        offer = status_counts.get("OFFER", 0)
        rejected = status_counts.get("REJECTED", 0)

        screening_rate = (screening / applied * 100) if applied > 0 else 0
        interview_rate = (interview / applied * 100) if applied > 0 else 0
        offer_rate = (offer / applied * 100) if applied > 0 else 0

        return {
            "total": total,
            "byStatus": status_counts,
            "screeningRate": round(screening_rate, 1),
            "interviewRate": round(interview_rate, 1),
            "offerRate": round(offer_rate, 1),
            "rejectionRate": round((rejected / applied * 100) if applied > 0 else 0, 1)
        }

    async def _generate_insights(
        self,
        applications: List[Dict],
        statistics: Dict
    ) -> List[str]:
        """
        AI를 사용하여 지원 현황에 대한 인사이트 생성
        """
        # 지원 현황 요약
        summary = f"""
전체 지원: {statistics['total']}개
서류 통과율: {statistics['screeningRate']}%
면접 진행률: {statistics['interviewRate']}%
최종 합격률: {statistics['offerRate']}%
불합격률: {statistics['rejectionRate']}%

최근 지원 기업: {', '.join([app.get('company', '') for app in applications[:5]])}
"""

        prompt = f"""다음 취업 지원 현황을 분석하고 인사이트를 제공해주세요.

【지원 현황】
{summary}

3-5개의 구체적인 인사이트를 JSON 배열로 제공해주세요:
["인사이트1", "인사이트2", "인사이트3"]

예시:
- "서류 통과율이 업계 평균(30%)보다 높습니다. 이력서가 잘 작성되었습니다."
- "면접 전환율이 낮습니다. 지원 포지션의 요구사항을 더 정확히 확인하세요."
- "최근 2주간 지원이 없습니다. 꾸준한 지원이 중요합니다."
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 취업 코치입니다. 지원 현황을 분석하고 실용적인 조언을 제공합니다."
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
                insights = json.loads(json_match.group())
                return insights

            return ["지원 현황 분석 중입니다."]

        except Exception as e:
            print(f"인사이트 생성 실패: {str(e)}")
            return ["지원 현황 분석 중 오류가 발생했습니다."]

    async def _suggest_next_actions(
        self,
        applications: List[Dict]
    ) -> List[Dict]:
        """
        다음 액션 제안
        """
        actions = []

        for app in applications:
            status = app.get("status")
            applied_at = app.get("appliedAt")
            company = app.get("company", "회사")
            job_title = app.get("jobTitle", "포지션")

            # 날짜 계산 (문자열을 datetime으로 변환)
            if isinstance(applied_at, str):
                try:
                    applied_date = datetime.fromisoformat(applied_at.replace('Z', '+00:00'))
                except:
                    continue
            else:
                applied_date = applied_at

            days_passed = (datetime.now() - applied_date).days

            # 상태별 액션 제안
            if status == "APPLIED" and days_passed >= 7:
                actions.append({
                    "type": "FOLLOW_UP",
                    "priority": "HIGH",
                    "company": company,
                    "jobTitle": job_title,
                    "message": f"{company} {job_title} 지원 후 {days_passed}일 경과. 진행 상황을 문의해보세요.",
                    "suggestedAction": "이메일로 진행 상황 문의"
                })

            elif status == "SCREENING" and days_passed >= 14:
                actions.append({
                    "type": "FOLLOW_UP",
                    "priority": "MEDIUM",
                    "company": company,
                    "jobTitle": job_title,
                    "message": f"{company} 서류 심사 중 {days_passed}일 경과. 결과를 확인해보세요.",
                    "suggestedAction": "채용 담당자에게 연락"
                })

            elif status == "INTERVIEW":
                actions.append({
                    "type": "PREPARE",
                    "priority": "HIGH",
                    "company": company,
                    "jobTitle": job_title,
                    "message": f"{company} {job_title} 면접 준비가 필요합니다.",
                    "suggestedAction": "면접 질문 준비 및 회사 리서치"
                })

        # 우선순위 순으로 정렬
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        actions.sort(key=lambda x: priority_order.get(x["priority"], 3))

        return actions[:5]  # 상위 5개만

    async def track_application_status(
        self,
        user_id: int,
        application_id: int,
        current_status: str
    ) -> Dict:
        """
        특정 지원 건의 상태 추적 및 조언

        Args:
            user_id: 사용자 ID
            application_id: 지원 ID
            current_status: 현재 상태

        Returns:
            다음 단계 조언
        """
        status_advice = {
            "APPLIED": {
                "nextStep": "서류 심사 결과 대기",
                "timeline": "보통 1-2주 소요",
                "tip": "이 기간 동안 면접 준비를 시작하세요."
            },
            "SCREENING": {
                "nextStep": "면접 일정 조율",
                "timeline": "보통 1주일 이내",
                "tip": "회사와 포지션에 대한 리서치를 진행하세요."
            },
            "INTERVIEW": {
                "nextStep": "면접 준비 및 참여",
                "timeline": "면접 일정에 따라 다름",
                "tip": "예상 질문을 준비하고 모의 면접을 연습하세요."
            },
            "OFFER": {
                "nextStep": "처우 협상 및 입사 결정",
                "timeline": "보통 1-2주",
                "tip": "다른 지원 건과 비교하여 신중히 결정하세요."
            },
            "REJECTED": {
                "nextStep": "피드백 요청 및 개선",
                "timeline": "즉시",
                "tip": "불합격 이유를 분석하고 다음 기회를 준비하세요."
            }
        }

        return status_advice.get(current_status, {
            "nextStep": "상태 확인",
            "timeline": "알 수 없음",
            "tip": "채용 담당자에게 문의하세요."
        })
