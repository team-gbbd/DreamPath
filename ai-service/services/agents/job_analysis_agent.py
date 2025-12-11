"""
채용 공고 분석 AI 에이전트
DB에 저장된 채용 공고를 분석하여 트렌드, 요구사항, 인사이트를 제공합니다.
"""
import os
from typing import List, Dict, Optional
from collections import Counter
from datetime import datetime, timedelta
from openai import OpenAI
from services.database_service import DatabaseService


class JobAnalysisAgent:
    """채용 공고 분석 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()

    async def analyze_market_trends(
        self,
        career_field: Optional[str] = None,
        days: int = 30
    ) -> Dict:
        """
        채용 시장 트렌드 분석

        Args:
            career_field: 특정 직무 분야 (예: "개발자", "디자이너")
            days: 분석 기간 (기본 30일)

        Returns:
            트렌드 분석 결과
        """
        job_listings = self._get_recent_job_listings(career_field, days)

        if not job_listings:
            return {
                "success": False,
                "message": "분석할 채용 공고가 없습니다.",
                "trend": {}
            }

        # 기본 통계 수집
        total_jobs = len(job_listings)
        companies = [job["company"] for job in job_listings if job.get("company")]
        locations = [job["location"] for job in job_listings if job.get("location")]

        # AI로 상세 트렌드 분석
        analysis = await self._analyze_trends_with_ai(job_listings, career_field)

        return {
            "success": True,
            "period": f"최근 {days}일",
            "careerField": career_field or "전체",
            "totalJobs": total_jobs,
            "topCompanies": self._get_top_items(companies, 10),
            "topLocations": self._get_top_items(locations, 10),
            "insights": analysis.get("insights", []),
            "trendingSills": analysis.get("trendingSkills", []),
            "growingFields": analysis.get("growingFields", []),
            "summary": analysis.get("summary", "")
        }

    async def analyze_skill_requirements(
        self,
        career_field: str,
        days: int = 30
    ) -> Dict:
        """
        직무별 필요 스킬 분석

        Args:
            career_field: 직무 분야 (예: "백엔드 개발자")
            days: 분석 기간

        Returns:
            스킬 요구사항 분석 결과
        """
        job_listings = self._get_recent_job_listings(career_field, days)

        if not job_listings:
            return {
                "success": False,
                "message": f"'{career_field}' 관련 채용 공고가 없습니다."
            }

        # 공고 설명에서 스킬 추출
        descriptions = [job.get("description", "") for job in job_listings]
        combined_text = "\n\n".join(descriptions[:50])  # 최대 50개 공고 분석

        # AI로 스킬 분석
        skill_analysis = await self._extract_skills_with_ai(combined_text, career_field)

        return {
            "success": True,
            "careerField": career_field,
            "analyzedJobs": len(job_listings),
            "requiredSkills": skill_analysis.get("requiredSkills", []),
            "preferredSkills": skill_analysis.get("preferredSkills", []),
            "emergingSkills": skill_analysis.get("emergingSkills", []),
            "experienceLevel": skill_analysis.get("experienceLevel", {}),
            "recommendations": skill_analysis.get("recommendations", [])
        }

    async def analyze_salary_trends(
        self,
        career_field: Optional[str] = None,
        days: int = 30
    ) -> Dict:
        """
        연봉 및 보상 트렌드 분석

        Args:
            career_field: 직무 분야
            days: 분석 기간

        Returns:
            연봉 트렌드 분석 결과
        """
        job_listings = self._get_recent_job_listings(career_field, days)

        if not job_listings:
            return {
                "success": False,
                "message": "분석할 채용 공고가 없습니다."
            }

        # AI로 연봉 및 보상 정보 추출
        salary_analysis = await self._analyze_salary_with_ai(job_listings, career_field)

        return {
            "success": True,
            "careerField": career_field or "전체",
            "analyzedJobs": len(job_listings),
            "salaryRange": salary_analysis.get("salaryRange", {}),
            "benefits": salary_analysis.get("benefits", []),
            "insights": salary_analysis.get("insights", [])
        }

    async def get_personalized_insights(
        self,
        user_profile: Dict,
        career_analysis: Dict
    ) -> Dict:
        """
        사용자 맞춤형 채용 시장 인사이트

        Args:
            user_profile: 사용자 프로필 (스킬, 경력 등)
            career_analysis: 커리어 분석 결과

        Returns:
            맞춤형 인사이트
        """
        # 추천 직업 추출
        recommended_careers = career_analysis.get("recommendedCareers", [])
        if not recommended_careers:
            return {
                "success": False,
                "message": "추천 직업 정보가 없습니다."
            }

        # 각 추천 직업에 대한 시장 분석
        insights = []

        for career in recommended_careers[:3]:  # 상위 3개 직업만 분석
            career_name = career.get("careerName", "")

            # 해당 직업 채용 공고 가져오기
            job_listings = self._get_recent_job_listings(career_name, 30)

            if not job_listings:
                continue

            # AI로 개인화된 분석
            career_insight = await self._get_personalized_career_insight(
                career_name,
                job_listings,
                user_profile
            )

            insights.append({
                "careerName": career_name,
                "jobCount": len(job_listings),
                "gapAnalysis": career_insight.get("gapAnalysis", []),
                "learningPath": career_insight.get("learningPath", []),
                "competitiveness": career_insight.get("competitiveness", ""),
                "recommendations": career_insight.get("recommendations", [])
            })

        return {
            "success": True,
            "insights": insights,
            "overallRecommendation": await self._generate_overall_recommendation(insights)
        }

    async def compare_job_postings(
        self,
        job_ids: List[int]
    ) -> Dict:
        """
        여러 채용 공고 비교 분석

        Args:
            job_ids: 비교할 채용 공고 ID 리스트

        Returns:
            비교 분석 결과
        """
        if len(job_ids) < 2:
            return {
                "success": False,
                "message": "최소 2개 이상의 공고가 필요합니다."
            }

        # DB에서 공고 가져오기
        jobs = self._get_jobs_by_ids(job_ids)

        if len(jobs) < 2:
            return {
                "success": False,
                "message": "일부 공고를 찾을 수 없습니다."
            }

        # AI로 비교 분석
        comparison = await self._compare_jobs_with_ai(jobs)

        return {
            "success": True,
            "jobs": [
                {
                    "id": job["id"],
                    "title": job["title"],
                    "company": job["company"]
                }
                for job in jobs
            ],
            "comparison": comparison.get("comparison", {}),
            "recommendation": comparison.get("recommendation", "")
        }

    # ===== Helper Methods =====

    def _get_recent_job_listings(
        self,
        career_field: Optional[str],
        days: int
    ) -> List[Dict]:
        """DB에서 최근 채용 공고 가져오기"""
        try:
            if career_field:
                query = """
                    SELECT id, title, company, location, description, url, site_name, crawled_at
                    FROM job_listings
                    WHERE crawled_at >= NOW() - INTERVAL '%s days'
                    AND (title ILIKE %s OR description ILIKE %s)
                    ORDER BY crawled_at DESC
                    LIMIT 200
                """
                pattern = f"%{career_field}%"
                results = self.db_service.execute_query(query, (days, pattern, pattern))
            else:
                query = """
                    SELECT id, title, company, location, description, url, site_name, crawled_at
                    FROM job_listings
                    WHERE crawled_at >= NOW() - INTERVAL '%s days'
                    ORDER BY crawled_at DESC
                    LIMIT 200
                """
                results = self.db_service.execute_query(query, (days,))

            return [
                {
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "description": row.get("description") or "",
                    "url": row.get("url"),
                    "site_name": row.get("site_name"),
                    "crawled_at": row.get("crawled_at")
                }
                for row in results
            ]
        except Exception as e:
            print(f"채용 공고 조회 실패: {str(e)}")
            return []

    def _get_jobs_by_ids(self, job_ids: List[int]) -> List[Dict]:
        """ID로 채용 공고 가져오기"""
        try:
            placeholders = ",".join(["%s"] * len(job_ids))
            query = f"""
                SELECT id, title, company, location, description, url, site_name
                FROM job_listings
                WHERE id IN ({placeholders})
            """
            results = self.db_service.execute_query(query, tuple(job_ids))

            return [
                {
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "description": row.get("description") or "",
                    "url": row.get("url"),
                    "site_name": row.get("site_name")
                }
                for row in results
            ]
        except Exception as e:
            print(f"채용 공고 조회 실패: {str(e)}")
            return []

    def _get_top_items(self, items: List[str], top_n: int = 10) -> List[Dict]:
        """상위 N개 항목과 빈도 반환"""
        if not items:
            return []

        counter = Counter(items)
        return [
            {"name": item, "count": count}
            for item, count in counter.most_common(top_n)
        ]

    async def _analyze_trends_with_ai(
        self,
        job_listings: List[Dict],
        career_field: Optional[str]
    ) -> Dict:
        """AI로 트렌드 분석"""
        # 제목과 설명 샘플링
        sample_jobs = job_listings[:30]
        job_info = "\n".join([
            f"- {job['title']} ({job.get('company', '미상')})"
            for job in sample_jobs
        ])

        prompt = f"""다음은 최근 채용 공고 목록입니다.
{career_field or '전체'} 분야의 채용 트렌드를 분석해주세요.

【채용 공고 샘플 (총 {len(job_listings)}개 중 30개)】
{job_info}

다음 JSON 형식으로 응답해주세요:
{{
  "insights": ["인사이트 1", "인사이트 2", "인사이트 3"],
  "trendingSkills": ["기술1", "기술2", "기술3"],
  "growingFields": ["분야1", "분야2"],
  "summary": "전반적인 트렌드 요약"
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 시장 트렌드 분석 전문가입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=800
            )

            import re
            import json
            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "insights": [],
                "trendingSkills": [],
                "growingFields": [],
                "summary": ""
            }
        except Exception as e:
            print(f"트렌드 분석 실패: {str(e)}")
            return {
                "insights": [],
                "trendingSkills": [],
                "growingFields": [],
                "summary": ""
            }

    async def _extract_skills_with_ai(
        self,
        combined_descriptions: str,
        career_field: str
    ) -> Dict:
        """AI로 스킬 추출 및 분석"""
        prompt = f"""다음은 '{career_field}' 직무의 채용 공고 설명입니다.
필요 스킬과 우대 스킬을 분석해주세요.

【채용 공고 설명】
{combined_descriptions[:3000]}

다음 JSON 형식으로 응답해주세요:
{{
  "requiredSkills": [
    {{"skill": "스킬명", "frequency": "높음/중간/낮음", "importance": "필수/우대"}}
  ],
  "preferredSkills": ["스킬1", "스킬2"],
  "emergingSkills": ["떠오르는 스킬1", "떠오르는 스킬2"],
  "experienceLevel": {{"entry": "0-2년", "mid": "3-5년", "senior": "5년+"}},
  "recommendations": ["학습 추천1", "학습 추천2"]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 공고 분석 및 스킬 추출 전문가입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1000
            )

            import re
            import json
            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "requiredSkills": [],
                "preferredSkills": [],
                "emergingSkills": [],
                "experienceLevel": {},
                "recommendations": []
            }
        except Exception as e:
            print(f"스킬 분석 실패: {str(e)}")
            return {
                "requiredSkills": [],
                "preferredSkills": [],
                "emergingSkills": [],
                "experienceLevel": {},
                "recommendations": []
            }

    async def _analyze_salary_with_ai(
        self,
        job_listings: List[Dict],
        career_field: Optional[str]
    ) -> Dict:
        """AI로 연봉 및 보상 분석"""
        # 설명에서 연봉 관련 정보 추출
        descriptions = "\n\n".join([
            f"{job['title']}: {job.get('description', '')[:200]}"
            for job in job_listings[:20]
        ])

        prompt = f"""다음 채용 공고에서 연봉 및 복리후생 정보를 분석해주세요.

【채용 공고】
{descriptions}

다음 JSON 형식으로 응답해주세요:
{{
  "salaryRange": {{"min": "최소", "max": "최대", "average": "평균"}},
  "benefits": ["복리후생1", "복리후생2"],
  "insights": ["인사이트1", "인사이트2"]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 공고의 연봉 및 보상 정보 분석 전문가입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=600
            )

            import re
            import json
            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "salaryRange": {},
                "benefits": [],
                "insights": []
            }
        except Exception as e:
            print(f"연봉 분석 실패: {str(e)}")
            return {
                "salaryRange": {},
                "benefits": [],
                "insights": []
            }

    async def _get_personalized_career_insight(
        self,
        career_name: str,
        job_listings: List[Dict],
        user_profile: Dict
    ) -> Dict:
        """사용자 프로필 기반 개인화된 인사이트"""
        # 사용자 스킬 정보
        user_skills = user_profile.get("skills", [])
        user_experience = user_profile.get("experience", "")

        # 채용 공고 샘플
        job_sample = "\n".join([
            f"- {job['title']}: {job.get('description', '')[:100]}"
            for job in job_listings[:10]
        ])

        prompt = f"""사용자가 '{career_name}' 직무에 지원하려고 합니다.

【사용자 프로필】
- 보유 스킬: {', '.join(user_skills[:10])}
- 경력: {user_experience}

【채용 공고 샘플】
{job_sample}

다음 JSON 형식으로 개인화된 분석을 제공해주세요:
{{
  "gapAnalysis": ["부족한 스킬1", "부족한 스킬2"],
  "learningPath": ["학습 단계1", "학습 단계2", "학습 단계3"],
  "competitiveness": "경쟁력 평가 (상/중/하)",
  "recommendations": ["추천사항1", "추천사항2"]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 개인 맞춤형 커리어 코치입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=700
            )

            import re
            import json
            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "gapAnalysis": [],
                "learningPath": [],
                "competitiveness": "",
                "recommendations": []
            }
        except Exception as e:
            print(f"개인화된 인사이트 생성 실패: {str(e)}")
            return {
                "gapAnalysis": [],
                "learningPath": [],
                "competitiveness": "",
                "recommendations": []
            }

    async def _generate_overall_recommendation(
        self,
        insights: List[Dict]
    ) -> str:
        """전반적인 추천사항 생성"""
        if not insights:
            return "분석할 데이터가 부족합니다."

        summary = "\n".join([
            f"- {insight['careerName']}: 공고 {insight['jobCount']}개"
            for insight in insights
        ])

        prompt = f"""다음은 사용자의 추천 직업별 시장 분석 결과입니다.

{summary}

사용자에게 전반적인 커리어 추천을 200자 이내로 작성해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 커리어 코치입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=300
            )

            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"전반적인 추천 생성 실패: {str(e)}")
            return "추천사항을 생성할 수 없습니다."

    async def _compare_jobs_with_ai(self, jobs: List[Dict]) -> Dict:
        """AI로 채용 공고 비교"""
        job_info = "\n\n".join([
            f"【공고 {i+1}】\n제목: {job['title']}\n회사: {job['company']}\n설명: {job.get('description', '')[:200]}"
            for i, job in enumerate(jobs)
        ])

        prompt = f"""다음 채용 공고들을 비교 분석해주세요.

{job_info}

다음 JSON 형식으로 응답해주세요:
{{
  "comparison": {{
    "similarities": ["유사점1", "유사점2"],
    "differences": ["차이점1", "차이점2"],
    "pros_cons": [
      {{"job": "공고1", "pros": ["장점1"], "cons": ["단점1"]}},
      {{"job": "공고2", "pros": ["장점1"], "cons": ["단점1"]}}
    ]
  }},
  "recommendation": "어떤 공고가 더 적합한지 추천"
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 공고 비교 분석 전문가입니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1000
            )

            import re
            import json
            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

            return {
                "comparison": {},
                "recommendation": ""
            }
        except Exception as e:
            print(f"공고 비교 실패: {str(e)}")
            return {
                "comparison": {},
                "recommendation": ""
            }
