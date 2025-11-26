"""
자동 채용 공고 추천 AI 에이전트
사용자의 커리어 분석 결과와 프로필을 기반으로 최적의 채용 공고를 추천합니다.
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI
from services.database_service import DatabaseService
from services.qnet_api_service import QnetApiService


class JobRecommendationAgent:
    """채용 공고 자동 추천 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()
        self.qnet_service = QnetApiService()

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
                    "jobId": str(row[0]),  # ID를 문자열로 변환
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

    async def get_recommendations_with_requirements(
        self,
        user_id: int,
        career_analysis: Dict,
        user_profile: Optional[Dict] = None,
        user_skills: Optional[List[str]] = None,
        limit: int = 10
    ) -> Dict:
        """
        채용 공고 추천 + 필요 기술/자격증 통합 분석

        Args:
            user_id: 사용자 ID
            career_analysis: 커리어 분석 결과
            user_profile: 사용자 프로필
            user_skills: 사용자 보유 스킬 목록
            limit: 최대 추천 개수

        Returns:
            추천 채용 공고 목록 (필요 기술/자격증 포함)
        """
        user_skills = user_skills or []

        # 1. 기본 채용 공고 가져오기
        job_listings = self._get_job_listings_from_db(limit=100)

        if not job_listings:
            return {
                "recommendations": [],
                "totalCount": 0,
                "commonRequiredTechnologies": [],
                "commonRequiredCertifications": [],
                "overallLearningPath": []
            }

        # 2. 사용자 정보 요약
        user_summary = self._create_user_summary(career_analysis, user_profile)

        # 3. 각 공고에 대해 매칭 + 기술/자격증 분석
        recommendations = []
        all_technologies = []
        all_certifications = []

        for job in job_listings[:30]:  # 최대 30개 공고 분석 (API 비용 고려)
            result = await self._analyze_job_with_requirements(
                user_summary, job, user_skills
            )

            if result["matchScore"] >= 50:
                recommendations.append(result)
                all_technologies.extend(result.get("requiredTechnologies", []))
                all_certifications.extend(result.get("requiredCertifications", []))

        # 4. 매칭 점수 순 정렬
        recommendations.sort(key=lambda x: x["matchScore"], reverse=True)
        recommendations = recommendations[:limit]

        # 5. 공통 필요 기술/자격증 추출
        common_technologies = self._extract_common_items(all_technologies, "name")
        common_certifications = self._extract_common_items(all_certifications, "name")

        # 6. Q-net API에서 실제 자격증 정보 보강
        enriched_certifications = await self._enrich_certifications_with_qnet(
            common_certifications, career_analysis
        )

        # 7. 전체 학습 경로 생성
        learning_path = await self._generate_learning_path(
            user_skills, common_technologies, enriched_certifications
        )

        return {
            "recommendations": recommendations,
            "totalCount": len(recommendations),
            "commonRequiredTechnologies": common_technologies[:10],
            "commonRequiredCertifications": enriched_certifications[:10],
            "overallLearningPath": learning_path
        }

    async def _analyze_job_with_requirements(
        self,
        user_summary: str,
        job: Dict,
        user_skills: List[str]
    ) -> Dict:
        """
        채용 공고 분석 + 필요 기술/자격증 추출
        """
        user_skills_str = ", ".join(user_skills) if user_skills else "없음"

        prompt = f"""다음 사용자와 채용 공고를 분석하고, 필요한 기술과 자격증을 추출해주세요.

【사용자 정보】
{user_summary}

【사용자 보유 스킬】
{user_skills_str}

【채용 공고】
- 제목: {job.get('title', '')}
- 회사: {job.get('company', '')}
- 위치: {job.get('location', '')}
- 설명: {job.get('description', '')[:500]}

다음 JSON 형식으로 응답해주세요:
{{
  "matchScore": 85,
  "reasons": ["이유1", "이유2"],
  "strengths": ["강점1"],
  "concerns": ["우려사항1"],
  "requiredTechnologies": [
    {{
      "name": "Python",
      "category": "프로그래밍 언어",
      "importance": "필수",
      "description": "백엔드 개발에 사용"
    }}
  ],
  "requiredCertifications": [
    {{
      "name": "정보처리기사",
      "issuer": "한국산업인력공단",
      "importance": "우대",
      "difficulty": "중급",
      "estimatedPrepTime": "3-6개월",
      "description": "IT 직군 기본 자격증"
    }}
  ],
  "learningResources": [
    {{
      "name": "Python 기초 강의",
      "type": "온라인 강의",
      "url": null,
      "description": "Python 입문자용"
    }}
  ],
  "skillGap": ["부족한 스킬1", "부족한 스킬2"]
}}

- matchScore: 0-100 적합도 점수
- requiredTechnologies: 이 공고에서 요구하는 기술 (프로그래밍 언어, 프레임워크, 도구 등)
- requiredCertifications: 필요하거나 우대하는 자격증
- learningResources: 추천 학습 자료
- skillGap: 사용자가 보유하지 않은 필요 스킬
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 전문가이자 커리어 코치입니다. 채용 공고를 분석하여 필요한 기술과 자격증을 정확히 추출합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )

            result_text = response.choices[0].message.content

            import re
            import json
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                result = json.loads(json_match.group())
                return {
                    "jobId": str(job.get("id")),
                    "title": job.get("title"),
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "url": job.get("url"),
                    "description": job.get("description"),
                    "siteName": job.get("site_name"),
                    "matchScore": result.get("matchScore", 50),
                    "reasons": result.get("reasons", []),
                    "strengths": result.get("strengths", []),
                    "concerns": result.get("concerns", []),
                    "requiredTechnologies": result.get("requiredTechnologies", []),
                    "requiredCertifications": result.get("requiredCertifications", []),
                    "learningResources": result.get("learningResources", []),
                    "skillGap": result.get("skillGap", [])
                }

        except Exception as e:
            print(f"채용 공고 분석 실패: {str(e)}")

        # 기본값 반환
        return {
            "jobId": str(job.get("id")),
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "url": job.get("url"),
            "description": job.get("description"),
            "siteName": job.get("site_name"),
            "matchScore": 50,
            "reasons": [],
            "strengths": [],
            "concerns": [],
            "requiredTechnologies": [],
            "requiredCertifications": [],
            "learningResources": [],
            "skillGap": []
        }

    def _extract_common_items(
        self,
        items: List[Dict],
        key: str,
        min_count: int = 2
    ) -> List[Dict]:
        """공통 항목 추출 (빈도 기반)"""
        from collections import Counter

        if not items:
            return []

        # 이름별 빈도 계산
        name_counts = Counter(item.get(key, "") for item in items if item.get(key))

        # 빈도순 정렬 후 상세 정보 포함
        common_items = []
        seen_names = set()

        for name, count in name_counts.most_common():
            if count >= min_count and name not in seen_names:
                # 해당 이름의 첫 번째 항목 찾기
                for item in items:
                    if item.get(key) == name:
                        common_items.append(item)
                        seen_names.add(name)
                        break

        return common_items

    async def _generate_learning_path(
        self,
        user_skills: List[str],
        common_technologies: List[Dict],
        common_certifications: List[Dict]
    ) -> List[str]:
        """전체 학습 경로 생성"""
        if not common_technologies and not common_certifications:
            return []

        tech_names = [t.get("name", "") for t in common_technologies[:5]]
        cert_names = [c.get("name", "") for c in common_certifications[:3]]
        user_skills_str = ", ".join(user_skills) if user_skills else "없음"

        prompt = f"""사용자가 취업을 위해 학습해야 할 경로를 추천해주세요.

【사용자 보유 스킬】
{user_skills_str}

【채용 시장에서 요구하는 주요 기술】
{', '.join(tech_names)}

【채용 시장에서 요구하는 주요 자격증】
{', '.join(cert_names)}

5단계 이내의 학습 경로를 JSON 배열로 응답해주세요.
예시: ["1. Python 기초 학습 (1개월)", "2. Django 프레임워크 학습 (2개월)", ...]
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 커리어 코치입니다. 실용적인 학습 경로를 추천합니다."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            result_text = response.choices[0].message.content

            import re
            import json
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)

            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            print(f"학습 경로 생성 실패: {str(e)}")

        return []

    async def _enrich_certifications_with_qnet(
        self,
        ai_certifications: List[Dict],
        career_analysis: Dict
    ) -> List[Dict]:
        """
        Q-net API를 사용하여 AI가 추천한 자격증 정보를 보강
        실제 자격증 데이터(시험일정, 상세정보)를 추가합니다.
        """
        enriched = []

        # 1. AI가 추천한 자격증에서 Q-net 데이터 조회
        for cert in ai_certifications[:5]:  # 상위 5개만
            cert_name = cert.get("name", "")
            if not cert_name:
                continue

            try:
                # Q-net API에서 자격증 정보 + 시험 일정 조회
                qnet_result = await self.qnet_service.get_certification_with_schedule(
                    qualification_name=cert_name
                )

                if qnet_result.get("success") and qnet_result.get("certification"):
                    qnet_cert = qnet_result["certification"]
                    exam_schedules = qnet_result.get("examSchedules", [])

                    # 다음 시험 일정 찾기
                    next_exam = None
                    if exam_schedules:
                        next_exam = exam_schedules[0]  # 가장 가까운 시험

                    enriched.append({
                        "name": qnet_cert.get("name") or cert_name,
                        "code": qnet_cert.get("code"),
                        "issuer": "한국산업인력공단",
                        "importance": cert.get("importance", "우대"),
                        "difficulty": cert.get("difficulty", "중급"),
                        "seriesName": qnet_cert.get("seriesName"),  # 계열 (정보통신, 기계 등)
                        "obligFldName": qnet_cert.get("obligFldName"),  # 직무분야
                        "qualTypeName": qnet_cert.get("qualTypeName"),  # 등급 (기사, 산업기사 등)
                        "summary": qnet_cert.get("summary"),
                        "career": qnet_cert.get("career"),  # 관련 진로
                        "trend": qnet_cert.get("trend"),  # 동향
                        # 시험 일정 정보
                        "nextExam": {
                            "year": next_exam.get("implYear") if next_exam else None,
                            "round": next_exam.get("implSeq") if next_exam else None,
                            "docRegStart": next_exam.get("docRegStartDt") if next_exam else None,
                            "docRegEnd": next_exam.get("docRegEndDt") if next_exam else None,
                            "docExamStart": next_exam.get("docExamStartDt") if next_exam else None,
                            "docPassDt": next_exam.get("docPassDt") if next_exam else None,
                            "pracRegStart": next_exam.get("pracRegStartDt") if next_exam else None,
                            "pracExamStart": next_exam.get("pracExamStartDt") if next_exam else None,
                            "pracPassDt": next_exam.get("pracPassDt") if next_exam else None,
                        } if next_exam else None,
                        "isFromQnet": True  # Q-net 데이터 여부
                    })
                else:
                    # Q-net에서 찾지 못한 경우 AI 추천 데이터 그대로 사용
                    cert["isFromQnet"] = False
                    enriched.append(cert)

            except Exception as e:
                print(f"Q-net 자격증 조회 실패 ({cert_name}): {str(e)}")
                cert["isFromQnet"] = False
                enriched.append(cert)

        # 2. 추천 직업 키워드로 추가 자격증 검색
        if len(enriched) < 5:
            try:
                job_keywords = []
                recommended_careers = career_analysis.get("recommendedCareers", [])
                for career in recommended_careers[:2]:
                    career_name = career.get("careerName", "")
                    if career_name:
                        job_keywords.extend(career_name.split())

                if job_keywords:
                    additional_result = await self.qnet_service.search_certifications_for_job(
                        job_keywords=job_keywords
                    )

                    if additional_result.get("success"):
                        for add_cert in additional_result.get("certifications", [])[:3]:
                            # 중복 체크
                            if not any(e.get("name") == add_cert.get("name") for e in enriched):
                                enriched.append({
                                    "name": add_cert.get("name"),
                                    "code": add_cert.get("code"),
                                    "issuer": "한국산업인력공단",
                                    "importance": "추천",
                                    "difficulty": "중급",
                                    "seriesName": add_cert.get("seriesName"),
                                    "obligFldName": add_cert.get("obligFldName"),
                                    "qualTypeName": add_cert.get("qualTypeName"),
                                    "summary": add_cert.get("summary"),
                                    "career": add_cert.get("career"),
                                    "isFromQnet": True
                                })

            except Exception as e:
                print(f"추가 자격증 검색 실패: {str(e)}")

        return enriched
