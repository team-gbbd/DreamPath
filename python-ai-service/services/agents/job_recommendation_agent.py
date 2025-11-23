"""
자동 채용 공고 추천 AI 에이전트
사용자의 커리어 분석 결과와 프로필을 기반으로 최적의 채용 공고를 추천합니다.
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI
from services.database_service import DatabaseService


class JobRecommendationAgent:
    """채용 공고 자동 추천 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()

    async def get_recommendations(
        self,
        user_id: int,
        career_analysis: Dict,
        user_profile: Optional[Dict] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        사용자에게 맞는 채용 공고 추천

        Args:
            user_id: 사용자 ID
            career_analysis: 커리어 분석 결과 (추천 직업, 강점, 가치관 등)
            user_profile: 사용자 프로필 (경력, 스킬, 관심사 등)
            limit: 최대 추천 개수

        Returns:
            추천 채용 공고 목록 (매칭 점수 포함)
        """
        # 1. DB에서 최신 채용 공고 가져오기
        job_listings = self._get_job_listings_from_db(limit=100)

        if not job_listings:
            return []

        # 2. 사용자 정보 요약
        user_summary = self._create_user_summary(career_analysis, user_profile)

        # 3. AI로 각 공고 매칭 점수 계산
        recommendations = []

        for job in job_listings:
            match_result = await self._calculate_match_score(user_summary, job)

            if match_result["matchScore"] >= 50:  # 50점 이상만 추천
                recommendations.append({
                    "jobId": job.get("id"),
                    "title": job.get("title"),
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "url": job.get("url"),
                    "description": job.get("description"),
                    "siteName": job.get("site_name"),
                    "matchScore": match_result["matchScore"],
                    "reasons": match_result["reasons"],
                    "strengths": match_result.get("strengths", []),
                    "concerns": match_result.get("concerns", [])
                })

        # 4. 매칭 점수 순으로 정렬
        recommendations.sort(key=lambda x: x["matchScore"], reverse=True)

        return recommendations[:limit]

    def _get_job_listings_from_db(self, limit: int = 100) -> List[Dict]:
        """
        DB에서 최신 채용 공고 가져오기
        """
        try:
            # DatabaseService를 통해 최신 공고 조회
            query = """
                SELECT
                    id, title, company, location, url, description,
                    site_name, crawled_at
                FROM job_listings
                WHERE crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """

            results = self.db_service.execute_query(query, (limit,))

            job_listings = []
            for row in results:
                job_listings.append({
                    "id": row[0],
                    "title": row[1],
                    "company": row[2],
                    "location": row[3],
                    "url": row[4],
                    "description": row[5] or "",
                    "site_name": row[6],
                    "crawled_at": row[7]
                })

            return job_listings

        except Exception as e:
            print(f"DB에서 채용 공고 가져오기 실패: {str(e)}")
            return []

    def _create_user_summary(
        self,
        career_analysis: Dict,
        user_profile: Optional[Dict]
    ) -> str:
        """
        사용자 정보를 AI가 이해하기 쉬운 텍스트로 요약
        """
        summary_parts = []

        # 추천 직업
        if career_analysis.get("recommendedCareers"):
            careers = [c.get("careerName", "") for c in career_analysis["recommendedCareers"][:3]]
            summary_parts.append(f"추천 직업: {', '.join(careers)}")

        # 강점
        if career_analysis.get("strengths"):
            strengths = career_analysis["strengths"][:5]
            summary_parts.append(f"강점: {', '.join(strengths)}")

        # 가치관
        if career_analysis.get("values"):
            values = career_analysis["values"][:3]
            summary_parts.append(f"가치관: {', '.join(values)}")

        # 관심사
        if career_analysis.get("interests"):
            interests = career_analysis["interests"][:5]
            summary_parts.append(f"관심사: {', '.join(interests)}")

        # 사용자 프로필 (선택적)
        if user_profile:
            if user_profile.get("experience"):
                summary_parts.append(f"경력: {user_profile['experience']}")
            if user_profile.get("skills"):
                summary_parts.append(f"스킬: {', '.join(user_profile['skills'][:5])}")

        return "\n".join(summary_parts)

    async def _calculate_match_score(
        self,
        user_summary: str,
        job: Dict
    ) -> Dict:
        """
        AI를 사용하여 사용자와 채용 공고 간 매칭 점수 계산
        """
        prompt = f"""다음 사용자와 채용 공고의 적합도를 분석해주세요.

【사용자 정보】
{user_summary}

【채용 공고】
- 제목: {job.get('title', '')}
- 회사: {job.get('company', '')}
- 위치: {job.get('location', '')}
- 설명: {job.get('description', '')[:200]}

다음 형식의 JSON으로 응답해주세요:
{{
  "matchScore": 85,
  "reasons": ["이유1", "이유2", "이유3"],
  "strengths": ["강점1", "강점2"],
  "concerns": ["우려사항1"]
}}

- matchScore: 0-100 점수 (높을수록 적합)
- reasons: 왜 이 공고가 적합한지 2-3가지 이유
- strengths: 사용자가 이 포지션에서 발휘할 수 있는 강점 1-2개
- concerns: 고려해야 할 사항 (있으면 1개, 없으면 빈 배열)
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 커리어 매칭 전문가입니다. 사용자의 특성과 채용 공고를 분석하여 적합도를 평가합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                result = json.loads(json_match.group())
                return {
                    "matchScore": result.get("matchScore", 50),
                    "reasons": result.get("reasons", []),
                    "strengths": result.get("strengths", []),
                    "concerns": result.get("concerns", [])
                }

            # JSON 파싱 실패 시 기본값
            return {
                "matchScore": 50,
                "reasons": ["적합도 분석 중 오류가 발생했습니다."],
                "strengths": [],
                "concerns": []
            }

        except Exception as e:
            print(f"매칭 점수 계산 실패: {str(e)}")
            return {
                "matchScore": 50,
                "reasons": ["적합도 분석 중 오류가 발생했습니다."],
                "strengths": [],
                "concerns": []
            }

    async def get_real_time_recommendations(
        self,
        user_id: int,
        career_keywords: List[str],
        limit: int = 5
    ) -> List[Dict]:
        """
        실시간 채용 공고 추천 (키워드 기반)

        Args:
            user_id: 사용자 ID
            career_keywords: 직업 키워드 (예: ["개발자", "백엔드"])
            limit: 최대 추천 개수

        Returns:
            추천 채용 공고 목록
        """
        try:
            # 키워드 기반 DB 검색
            keyword_pattern = "%{}%".format("%".join(career_keywords))

            query = """
                SELECT
                    id, title, company, location, url, description,
                    site_name, crawled_at
                FROM job_listings
                WHERE
                    (title ILIKE %s OR description ILIKE %s)
                    AND crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """

            results = self.db_service.execute_query(
                query,
                (keyword_pattern, keyword_pattern, limit)
            )

            recommendations = []
            for row in results:
                recommendations.append({
                    "jobId": row[0],
                    "title": row[1],
                    "company": row[2],
                    "location": row[3],
                    "url": row[4],
                    "description": row[5] or "",
                    "siteName": row[6],
                    "matchScore": 70,  # 키워드 매칭은 기본 70점
                    "reasons": [f"'{kw}' 관련 포지션입니다." for kw in career_keywords[:2]]
                })

            return recommendations

        except Exception as e:
            print(f"실시간 추천 실패: {str(e)}")
            return []
