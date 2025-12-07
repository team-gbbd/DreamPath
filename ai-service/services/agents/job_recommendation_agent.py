"""
자동 채용 공고 추천 AI 에이전트
사용자의 커리어 분석 결과와 프로필을 기반으로 최적의 채용 공고를 추천합니다.

매칭 점수 (규칙 기반 100점):
- 직무명 일치: 40점
- 스킬 매칭률: 60점
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

    # ==================== AI 기반 매칭 점수 (100점 만점) ====================

    async def _calculate_ai_score(
        self,
        career_analysis: Dict,
        user_profile: Optional[Dict],
        user_skills: List[str],
        job: Dict
    ) -> Dict:
        """
        AI 기반 점수 계산 (100점 만점)

        OpenAI에게 사용자 정보와 채용 공고를 분석하여 적합도 점수를 판단하게 합니다.
        """
        import json
        import re

        # 사용자 정보 요약
        user_info_parts = []

        # 추천 직업
        if career_analysis.get("recommendedCareers"):
            careers = [c.get("careerName", "") for c in career_analysis["recommendedCareers"][:3]]
            user_info_parts.append(f"추천 직업: {', '.join(careers)}")

        # 강점
        if career_analysis.get("strengths"):
            user_info_parts.append(f"강점: {', '.join(career_analysis['strengths'][:5])}")

        # 가치관
        if career_analysis.get("values"):
            user_info_parts.append(f"가치관: {', '.join(career_analysis['values'][:3])}")

        # 관심사
        if career_analysis.get("interests"):
            user_info_parts.append(f"관심사: {', '.join(career_analysis['interests'][:5])}")

        # 보유 스킬
        if user_skills:
            user_info_parts.append(f"보유 스킬: {', '.join(user_skills[:10])}")

        # 사용자 프로필
        if user_profile:
            if user_profile.get("experience"):
                user_info_parts.append(f"경력: {user_profile['experience']}")
            if user_profile.get("education"):
                user_info_parts.append(f"학력: {user_profile['education']}")

        user_summary = "\n".join(user_info_parts) if user_info_parts else "정보 없음"

        # 채용 공고 정보
        job_tech = job.get("tech_stack") or []
        job_skills = job.get("required_skills") or []

        # 스킬 매칭 정보 계산
        user_skills_lower = set([s.lower() for s in user_skills if s])
        job_all_skills = set([s.lower() for s in (job_tech + job_skills) if s])
        matched_skills = user_skills_lower & job_all_skills
        missing_skills = job_all_skills - user_skills_lower

        skill_match_info = f"""
- 매칭된 스킬: {', '.join(matched_skills) if matched_skills else '없음'} ({len(matched_skills)}개)
- 부족한 스킬: {', '.join(list(missing_skills)[:5]) if missing_skills else '없음'} ({len(missing_skills)}개)
- 스킬 매칭률: {round(len(matched_skills) / len(job_all_skills) * 100) if job_all_skills else 0}%"""

        prompt = f"""사용자와 채용 공고의 적합도를 **정밀하게** 분석하고 점수를 매겨주세요.

【사용자 정보】
{user_summary}

【채용 공고】
- 제목: {job.get('title', '')}
- 회사: {job.get('company', '')}
- 위치: {job.get('location', '')}
- 기술스택: {', '.join(job_tech[:10]) if job_tech else '명시되지 않음'}
- 요구스킬: {', '.join(job_skills[:10]) if job_skills else '명시되지 않음'}
- 설명: {(job.get('description') or '')[:400]}

【스킬 매칭 분석】{skill_match_info}

다음 JSON 형식으로만 응답하세요:
{{
  "matchScore": 73,
  "reasons": ["구체적인 적합 이유 1", "구체적인 적합 이유 2"],
  "strengths": ["이 포지션에서 발휘할 수 있는 강점"],
  "concerns": ["고려해야 할 사항 (없으면 빈 배열)"]
}}

**점수 산정 기준 (1점 단위로 세밀하게 평가):**

1. 직무 일치도 (40점)
   - 추천 직업과 정확히 일치: 36-40점
   - 관련 직무: 25-35점
   - 유사 분야: 15-24점
   - 약간의 연관성: 5-14점
   - 무관: 0-4점

2. 스킬 매칭률 (40점)
   - 80% 이상 매칭: 36-40점
   - 60-79% 매칭: 28-35점
   - 40-59% 매칭: 20-27점
   - 20-39% 매칭: 10-19점
   - 20% 미만: 0-9점

3. 성장 가능성/적합성 (20점)
   - 강점과 가치관이 잘 맞음: 16-20점
   - 대체로 맞음: 10-15점
   - 보통: 5-9점
   - 맞지 않음: 0-4점

**중요:** 모든 공고에 같은 점수를 주지 마세요. 각 공고의 특성을 면밀히 분석하여 차별화된 점수를 부여하세요.
예: 스킬 매칭률이 50%면 72점, 80%면 88점처럼 구체적으로 계산하세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 매칭 전문가입니다. 사용자의 커리어 분석 결과와 채용 공고를 비교하여 적합도를 정확하게 평가합니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "matchScore": min(100, max(0, result.get("matchScore", 50))),
                    "reasons": result.get("reasons", []),
                    "strengths": result.get("strengths", []),
                    "concerns": result.get("concerns", [])
                }

            # 파싱 실패시 기본값
            return {
                "matchScore": 50,
                "reasons": ["적합도 분석 중"],
                "strengths": [],
                "concerns": []
            }

        except Exception as e:
            print(f"AI 점수 계산 실패: {str(e)}")
            return {
                "matchScore": 50,
                "reasons": ["적합도 분석 중"],
                "strengths": [],
                "concerns": []
            }

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
        # 1. DB에서 최신 채용 공고 가져오기 (성능을 위해 20개로 제한)
        job_listings = self._get_job_listings_from_db(limit=20)

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
                    "jobId": str(job.get("id")),  # ID를 문자열로 변환
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
                WHERE crawled_at >= NOW() - INTERVAL '30 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """

            results = self.db_service.execute_query(query, (limit,))

            job_listings = []
            for row in results:
                job_listings.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "url": row.get("url"),
                    "description": row.get("description") or "",
                    "site_name": row.get("site_name"),
                    "crawled_at": row.get("crawled_at")
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
                    "jobId": str(row.get("id")),  # ID를 문자열로 변환
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "url": row.get("url"),
                    "description": row.get("description") or "",
                    "siteName": row.get("site_name"),
                    "matchScore": 70,  # 키워드 매칭은 기본 70점
                    "reasons": [f"'{kw}' 관련 포지션입니다." for kw in career_keywords[:2]]
                })

            return recommendations

        except Exception as e:
            print(f"실시간 추천 실패: {str(e)}")
            return []

    async def get_recommendations_with_requirements(
        self,
        user_id: int,
        career_analysis: Dict,
        user_profile: Optional[Dict] = None,
        user_skills: List[str] = None,
        limit: int = 15
    ) -> Dict:
        """
        채용 공고 추천 + 필요 기술/자격증 분석 (하이브리드 점수)

        Args:
            user_id: 사용자 ID
            career_analysis: 커리어 분석 결과
            user_profile: 사용자 프로필
            user_skills: 사용자 보유 스킬
            limit: 최대 추천 개수

        Returns:
            추천 채용 공고 + 기술/자격증 분석 결과
        """
        user_skills = user_skills or []

        # 1. 추천 직업에서 키워드 추출
        keywords = []
        if career_analysis.get("recommendedCareers"):
            for career in career_analysis["recommendedCareers"][:3]:
                name = career.get("careerName", "")
                if name:
                    keywords.append(name)

        # 키워드가 없으면 기본 검색
        if not keywords:
            keywords = ["개발자"]

        # 2. DB에서 채용 공고 검색 (추천 직업 + 다양한 공고 혼합)
        # 추천 직업 관련 공고
        related_jobs = self._get_job_listings_with_tech(keywords, limit=limit)

        # 다양한 공고도 함께 가져오기 (점수 비교를 위해)
        diverse_keywords = ["프론트엔드", "데이터", "DevOps", "디자이너", "PM", "AI"]
        diverse_jobs = self._get_job_listings_with_tech(diverse_keywords, limit=limit // 2)

        # 중복 제거하면서 합치기
        seen_ids = set()
        job_listings = []
        for job in related_jobs + diverse_jobs:
            job_id = job.get("id")
            if job_id not in seen_ids:
                seen_ids.add(job_id)
                job_listings.append(job)

        if not job_listings:
            return {
                "recommendations": [],
                "totalCount": 0,
                "commonRequiredTechnologies": [],
                "commonRequiredCertifications": [],
                "overallLearningPath": []
            }

        # 3. 각 공고에 규칙 기반 점수 계산 + 기술/자격증 분석
        recommendations = []
        all_technologies = {}
        all_certifications = {}

        for job in job_listings:
            # AI 기반 점수 계산 (100점 만점)
            score_result = await self._calculate_ai_score(
                career_analysis, user_profile, user_skills, job
            )

            match_score = score_result["matchScore"]

            if match_score >= 30:  # 30점 이상만 포함
                # 기술/자격증 정보 추출
                tech_info = self._extract_tech_info(job, user_skills)

                recommendations.append({
                    "jobId": str(job.get("id")),
                    "title": job.get("title"),
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "url": job.get("url"),
                    "description": (job.get("description") or "")[:300],
                    "siteName": job.get("site_name"),
                    "matchScore": match_score,
                    "reasons": score_result.get("reasons", []),
                    "strengths": score_result.get("strengths", []) + tech_info.get("matchedSkills", []),
                    "concerns": score_result.get("concerns", []),
                    "requiredTechnologies": tech_info.get("technologies", []),
                    "requiredCertifications": tech_info.get("certifications", []),
                    "learningResources": [],
                    "skillGap": tech_info.get("skillGap", [])
                })

                # 기술/자격증 집계
                for tech in tech_info.get("technologies", []):
                    name = tech.get("name")
                    if name and name not in all_technologies:
                        all_technologies[name] = tech

                for cert in tech_info.get("certifications", []):
                    name = cert.get("name")
                    if name and name not in all_certifications:
                        all_certifications[name] = cert

        # 5. 매칭 점수 순 정렬
        recommendations.sort(key=lambda x: x["matchScore"], reverse=True)

        # 6. 공통 기술/자격증 정리
        common_technologies = list(all_technologies.values())[:10]
        common_certifications = list(all_certifications.values())[:5]

        # 7. 학습 경로 생성
        learning_path = self._generate_learning_path(
            user_skills, common_technologies, common_certifications
        )

        return {
            "recommendations": recommendations[:limit],
            "totalCount": len(recommendations),
            "commonRequiredTechnologies": common_technologies,
            "commonRequiredCertifications": common_certifications,
            "overallLearningPath": learning_path
        }

    def _extract_tech_info(self, job: Dict, user_skills: List[str]) -> Dict:
        """채용 공고에서 기술/자격증 정보 추출 (규칙 기반 + 설명 파싱)"""
        tech_stack = job.get("tech_stack") or []
        required_skills = job.get("required_skills") or []
        description = (job.get("description") or "").lower()
        title = (job.get("title") or "").lower()

        user_skills_lower = set([s.lower() for s in user_skills if s])

        # 기술 스택 분류
        technologies = []
        matched_skills = []
        skill_gap = []

        # 카테고리 매핑 (더 많은 기술 추가)
        tech_categories = {
            # 프로그래밍 언어
            "python": "프로그래밍 언어", "java": "프로그래밍 언어", "javascript": "프로그래밍 언어",
            "typescript": "프로그래밍 언어", "go": "프로그래밍 언어", "golang": "프로그래밍 언어",
            "kotlin": "프로그래밍 언어", "swift": "프로그래밍 언어", "c++": "프로그래밍 언어",
            "c#": "프로그래밍 언어", "rust": "프로그래밍 언어", "scala": "프로그래밍 언어",
            "ruby": "프로그래밍 언어", "php": "프로그래밍 언어",
            # 프레임워크
            "react": "프레임워크", "vue": "프레임워크", "angular": "프레임워크",
            "spring": "프레임워크", "springboot": "프레임워크", "django": "프레임워크",
            "fastapi": "프레임워크", "flask": "프레임워크", "node.js": "프레임워크",
            "nodejs": "프레임워크", "express": "프레임워크", "nestjs": "프레임워크",
            "next.js": "프레임워크", "nextjs": "프레임워크", "nuxt": "프레임워크",
            # 데이터베이스
            "mysql": "데이터베이스", "postgresql": "데이터베이스", "postgres": "데이터베이스",
            "mongodb": "데이터베이스", "redis": "데이터베이스", "elasticsearch": "데이터베이스",
            "oracle": "데이터베이스", "mssql": "데이터베이스", "mariadb": "데이터베이스",
            # 인프라/DevOps
            "docker": "인프라/DevOps", "kubernetes": "인프라/DevOps", "k8s": "인프라/DevOps",
            "aws": "인프라/DevOps", "gcp": "인프라/DevOps", "azure": "인프라/DevOps",
            "jenkins": "인프라/DevOps", "terraform": "인프라/DevOps", "ansible": "인프라/DevOps",
            "ci/cd": "인프라/DevOps", "github actions": "인프라/DevOps",
            # 도구
            "git": "도구", "jira": "도구", "figma": "도구", "slack": "도구",
            # AI/ML
            "tensorflow": "AI/ML", "pytorch": "AI/ML", "keras": "AI/ML",
            "pandas": "데이터 분석", "numpy": "데이터 분석", "scikit-learn": "AI/ML",
        }

        # 1. tech_stack, required_skills에서 추출
        all_techs = set()
        for tech in tech_stack + required_skills:
            if tech:
                all_techs.add(tech.lower())

        # 2. 설명과 제목에서 기술 키워드 추출 (항상 실행)
        import re
        for tech_name in tech_categories.keys():
            if tech_name in all_techs:
                continue
            pattern = r'' + re.escape(tech_name) + r''
            if re.search(pattern, description, re.IGNORECASE) or re.search(pattern, title, re.IGNORECASE):
                all_techs.add(tech_name)

        # 3. 한글 기술명도 추출
        korean_tech_map = {
            "스프링": "spring", "리액트": "react", "뷰": "vue",
            "자바": "java", "파이썬": "python", "노드": "node.js",
            "도커": "docker", "쿠버네티스": "kubernetes"
        }
        for kor_name, eng_name in korean_tech_map.items():
            if kor_name in description or kor_name in title:
                all_techs.add(eng_name)

        # 4. 기술 정보 구성
        for tech in all_techs:
            tech_lower = tech.lower()
            category = tech_categories.get(tech_lower, "기타")

            # 필수/우대 판단
            importance = "우대"
            # "필수" 키워드 근처에 있으면 필수로 판단
            if "필수" in description or "required" in description:
                # 기술명 앞뒤 50자 내에 "필수"가 있는지 확인
                tech_pos = description.find(tech_lower)
                if tech_pos >= 0:
                    context = description[max(0, tech_pos-50):tech_pos+50]
                    if "필수" in context or "required" in context:
                        importance = "필수"

            # 대문자로 표시명 생성
            display_name = tech.upper() if len(tech) <= 4 else tech.capitalize()
            if tech_lower in ["javascript", "typescript", "python", "java", "kotlin", "swift"]:
                display_name = tech.capitalize()
            elif tech_lower in ["react", "vue", "angular", "django", "flask", "spring"]:
                display_name = tech.capitalize()
            elif tech_lower in ["aws", "gcp", "ci/cd", "k8s"]:
                display_name = tech.upper()

            technologies.append({
                "name": display_name,
                "category": category,
                "importance": importance
            })

            # 매칭 여부 확인
            if tech_lower in user_skills_lower:
                matched_skills.append(display_name)
            else:
                skill_gap.append(display_name)

        # 자격증 추출 (설명에서 키워드 검색)
        certifications = []
        cert_keywords = {
            "정보처리기사": {"issuer": "한국산업인력공단", "difficulty": "중급"},
            "정보처리산업기사": {"issuer": "한국산업인력공단", "difficulty": "초급"},
            "정보보안기사": {"issuer": "한국인터넷진흥원", "difficulty": "고급"},
            "빅데이터분석기사": {"issuer": "한국데이터산업진흥원", "difficulty": "중급"},
            "데이터분석준전문가": {"issuer": "한국데이터산업진흥원", "difficulty": "초급"},
            "sqld": {"issuer": "한국데이터산업진흥원", "difficulty": "초급"},
            "sqlp": {"issuer": "한국데이터산업진흥원", "difficulty": "중급"},
            "adsp": {"issuer": "한국데이터산업진흥원", "difficulty": "초급"},
            "aws 자격증": {"issuer": "Amazon", "difficulty": "중급"},
            "aws certified": {"issuer": "Amazon", "difficulty": "중급"},
            "azure 자격증": {"issuer": "Microsoft", "difficulty": "중급"},
            "리눅스마스터": {"issuer": "한국정보통신진흥협회", "difficulty": "중급"},
            "네트워크관리사": {"issuer": "한국정보통신자격협회", "difficulty": "중급"},
        }

        for cert_name, cert_info in cert_keywords.items():
            if cert_name in description:
                certifications.append({
                    "name": cert_name.upper() if len(cert_name) <= 5 else cert_name,
                    "issuer": cert_info["issuer"],
                    "importance": "우대",
                    "difficulty": cert_info["difficulty"]
                })

        return {
            "technologies": technologies[:10],
            "certifications": certifications[:5],
            "matchedSkills": matched_skills[:5],
            "skillGap": skill_gap[:5]
        }

    def _generate_match_reasons(self, score_result: Dict, job: Dict) -> List[str]:
        """점수 기반 추천 이유 생성"""
        reasons = []
        breakdown = score_result.get("breakdown", {})

        # 직무명 일치 (30점 만점)
        title_score = breakdown.get("jobTitleMatch", 0)
        if title_score >= 28:
            reasons.append("추천 직업과 정확히 일치하는 포지션입니다")
        elif title_score >= 20:
            reasons.append("추천 직업과 관련된 포지션입니다")
        elif title_score >= 10:
            reasons.append("관련 직무 분야의 포지션입니다")

        # 스킬 매칭 (40점 만점)
        skill_score = breakdown.get("skillMatch", 0)
        matched_count = breakdown.get("matchedSkillCount", 0)
        if skill_score >= 30:
            reasons.append(f"보유 스킬 {matched_count}개가 요구 스킬과 일치합니다")
        elif skill_score >= 20:
            reasons.append(f"보유 스킬 중 {matched_count}개가 활용됩니다")
        elif matched_count > 0:
            reasons.append("일부 보유 스킬이 활용됩니다")

        # 경력 수준 (20점 만점)
        exp_score = breakdown.get("experienceMatch", 0)
        if exp_score >= 18:
            reasons.append("경력 수준이 잘 맞습니다")

        # 지역 (10점 만점)
        loc_score = breakdown.get("locationMatch", 0)
        if loc_score >= 9:
            reasons.append("근무 지역이 적합합니다")

        # 기본 이유
        if not reasons:
            company = job.get('company', '회사')
            title = job.get('title', '포지션')
            reasons.append(f"{company}의 {title} 포지션입니다")

        return reasons[:3]

    def _get_job_listings_with_tech(self, keywords: List[str], limit: int = 30) -> List[Dict]:
        """키워드로 채용 공고 검색 (기술스택 포함)"""
        try:
            # 키워드 OR 조건 생성
            conditions = []
            params = []
            for kw in keywords:
                conditions.append("(title ILIKE %s OR description ILIKE %s)")
                pattern = f"%{kw}%"
                params.extend([pattern, pattern])

            where_clause = " OR ".join(conditions)
            params.append(limit)

            query = f"""
                SELECT
                    id, title, company, location, url, description,
                    site_name, tech_stack, required_skills, crawled_at
                FROM job_listings
                WHERE ({where_clause})
                AND crawled_at >= NOW() - INTERVAL '30 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """

            results = self.db_service.execute_query(query, tuple(params))

            job_listings = []
            for row in results:
                tech_stack = row.get("tech_stack")
                if tech_stack and isinstance(tech_stack, str):
                    try:
                        import json
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack] if tech_stack else []

                required_skills = row.get("required_skills")
                if required_skills and isinstance(required_skills, str):
                    try:
                        import json
                        required_skills = json.loads(required_skills)
                    except:
                        required_skills = [required_skills] if required_skills else []

                job_listings.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "url": row.get("url"),
                    "description": row.get("description") or "",
                    "site_name": row.get("site_name"),
                    "tech_stack": tech_stack or [],
                    "required_skills": required_skills or [],
                    "crawled_at": row.get("crawled_at")
                })

            return job_listings

        except Exception as e:
            print(f"채용 공고 검색 실패: {str(e)}")
            return []

    async def _analyze_job_with_requirements(
        self,
        user_summary: str,
        user_skills: List[str],
        job: Dict
    ) -> Dict:
        """채용 공고 분석 (기술/자격증 포함)"""
        import json
        import re

        tech_stack = job.get("tech_stack", [])
        required_skills = job.get("required_skills", [])

        prompt = f"""다음 사용자와 채용 공고를 분석해주세요.

【사용자 정보】
{user_summary}
보유 스킬: {', '.join(user_skills) if user_skills else '없음'}

【채용 공고】
- 제목: {job.get('title', '')}
- 회사: {job.get('company', '')}
- 위치: {job.get('location', '')}
- 설명: {job.get('description', '')[:400]}
- 기술스택: {', '.join(tech_stack[:10]) if tech_stack else '없음'}
- 요구스킬: {', '.join(required_skills[:10]) if required_skills else '없음'}

다음 JSON 형식으로 응답해주세요:
{{
  "matchScore": 75,
  "reasons": ["추천 이유1", "추천 이유2"],
  "strengths": ["사용자 강점1"],
  "concerns": ["고려사항1"],
  "requiredTechnologies": [
    {{"name": "Python", "category": "프로그래밍 언어", "importance": "필수"}},
    {{"name": "Django", "category": "프레임워크", "importance": "우대"}}
  ],
  "requiredCertifications": [
    {{"name": "정보처리기사", "issuer": "한국산업인력공단", "importance": "우대", "difficulty": "중급"}}
  ],
  "learningResources": [
    {{"name": "Python 기초 강좌", "type": "강의"}}
  ],
  "skillGap": ["부족한 스킬1", "부족한 스킬2"]
}}

- matchScore: 0-100 (사용자와 공고의 적합도)
- requiredTechnologies: 공고에서 요구하는 기술 (importance: 필수/우대)
- requiredCertifications: 관련 자격증 (difficulty: 초급/중급/고급)
- skillGap: 사용자가 보완해야 할 스킬
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 커리어 컨설턴트입니다. 채용 공고를 분석하여 필요한 기술과 자격증을 추출합니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "matchScore": result.get("matchScore", 50),
                    "reasons": result.get("reasons", []),
                    "strengths": result.get("strengths", []),
                    "concerns": result.get("concerns", []),
                    "requiredTechnologies": result.get("requiredTechnologies", []),
                    "requiredCertifications": result.get("requiredCertifications", []),
                    "learningResources": result.get("learningResources", []),
                    "skillGap": result.get("skillGap", [])
                }

            return self._default_analysis()

        except Exception as e:
            print(f"채용 공고 분석 실패: {str(e)}")
            return self._default_analysis()

    def _default_analysis(self) -> Dict:
        """기본 분석 결과"""
        return {
            "matchScore": 50,
            "reasons": [],
            "strengths": [],
            "concerns": [],
            "requiredTechnologies": [],
            "requiredCertifications": [],
            "learningResources": [],
            "skillGap": []
        }

    def _generate_learning_path(
        self,
        user_skills: List[str],
        technologies: List[Dict],
        certifications: List[Dict]
    ) -> List[str]:
        """학습 경로 생성"""
        path = []

        # 필수 기술 우선 학습
        essential_techs = [t for t in technologies if t.get("importance") == "필수"]
        for tech in essential_techs[:3]:
            name = tech.get("name")
            if name and name not in user_skills:
                path.append(f"필수 기술 학습: {name}")

        # 자격증 준비
        for cert in certifications[:2]:
            name = cert.get("name")
            if name:
                path.append(f"자격증 준비: {name}")

        # 우대 기술 학습
        preferred_techs = [t for t in technologies if t.get("importance") == "우대"]
        for tech in preferred_techs[:2]:
            name = tech.get("name")
            if name and name not in user_skills:
                path.append(f"우대 기술 학습: {name}")

        if not path:
            path = ["현재 스킬을 유지하고 프로젝트 경험을 쌓으세요"]

        return path
