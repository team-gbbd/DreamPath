"""
채용공고 조회 및 포맷팅 서비스

DB 조회, 기본 템플릿 생성, 추천 포맷팅을 담당
"""
import hashlib
import json
from typing import List, Dict, Optional
from services.database_service import DatabaseService


class JobListingService:
    """채용공고 DB 조회 및 포맷팅 서비스"""

    def __init__(self):
        self.db = DatabaseService()

    # ==================== 기본 템플릿 생성 ====================

    @staticmethod
    def generate_default_analysis(job: Dict) -> Dict:
        """AI 분석 미사용 시 기본 템플릿 생성"""
        title = job.get("title") or job.get("title", "채용공고")
        company = job.get("company") or job.get("company", "기업")
        match_score = job.get("matchScore") or job.get("match_score", 50)
        experience = job.get("experience", "경력 무관")
        required_skills = job.get("requiredSkills") or job.get("required_skills") or []
        matched_careers = job.get("matchedCareers") or []
        matched_career = matched_careers[0] if matched_careers else ""
        match_reason = job.get("matchReason") or job.get("match_reason", "")
        skill_match = job.get("skillMatch") or []

        # 일관된 랜덤 값 생성
        job_id = job.get("id") or 0
        hash_input = f"{job_id}_{company}_{title}"
        h = int(hashlib.md5(hash_input.encode()).hexdigest()[:8], 16)

        return {
            "idealTalent": {
                "summary": f"{company}에서 {title} 포지션에 적합한 인재를 찾고 있습니다. {match_reason}".strip(),
                "coreValues": ["성장", "협업", "도전", "혁신"][:3 + (h % 2)],
                "keyTraits": required_skills[:5] if required_skills else ["문제 해결 능력", "커뮤니케이션", "자기주도성"],
                "fitWithUser": f"추천 직업 '{matched_career}'과(와) 관련된 포지션입니다." if matched_career else "프로필 기반 매칭이 필요합니다."
            },
            "hiringProcess": {
                "processType": ["수시채용", "공개채용", "상시채용"][h % 3],
                "expectedSteps": [
                    {"step": 1, "name": "서류전형", "description": "이력서 및 포트폴리오 검토", "tips": "직무 관련 경험을 구체적으로 기술하세요"},
                    {"step": 2, "name": "1차 면접", "description": "실무진 면접 (기술/직무)", "tips": "프로젝트 경험과 문제 해결 사례를 준비하세요"},
                    {"step": 3, "name": "2차 면접", "description": "임원 면접 (인성/컬처핏)", "tips": "회사 비전과 본인의 가치관을 연결해 설명하세요"},
                    {"step": 4, "name": "최종합격", "description": "처우 협의 및 입사일 조율", "tips": "희망 연봉과 입사 가능일을 미리 정리하세요"}
                ][:3 + (h % 2)],
                "estimatedDuration": ["2-3주", "3-4주", "4-6주"][h % 3],
                "userPreparationAdvice": f"이 포지션은 {matched_career} 역량이 중요합니다." if matched_career else "이력서와 포트폴리오를 꼼꼼히 준비하세요."
            },
            "verificationCriteria": {
                "academicCriteria": {
                    "preferredMajors": ["관련 전공", "유사 전공"],
                    "minimumGPA": ["무관", "3.0/4.5 이상", "3.5/4.5 이상"][h % 3],
                    "userGPAAssessment": "프로필 정보로 확인이 필요합니다"
                },
                "skillCriteria": {
                    "essential": required_skills[:3] if required_skills else ["직무 관련 기본 역량"],
                    "preferred": required_skills[3:6] if len(required_skills) > 3 else ["추가 우대 역량"],
                    "userSkillMatch": f"매칭 스킬: {', '.join(skill_match)}" if skill_match else "프로필 기반 스킬 매칭 필요"
                },
                "experienceCriteria": {
                    "minimumYears": experience or "경력 무관",
                    "preferredBackground": f"{matched_career} 관련 실무 경험" if matched_career else "관련 분야 경험",
                    "userExperienceAssessment": "프로필 정보로 확인이 필요합니다"
                }
            },
            "hiringStatus": {
                "estimatedPhase": ["서류접수 중", "면접 진행 중", "채용 진행 중"][h % 3],
                "competitionLevel": ["보통", "높음", "매우 높음", "낮음"][h % 4],
                "competitionRatio": f"{5 + (h % 46)}:1",
                "estimatedApplicants": None,
                "estimatedHires": 1 + (h % 5),
                "bestApplyTiming": "빠른 지원이 유리합니다",
                "marketDemand": ["수요 증가 중", "수요 안정", "수요 높음"][h % 3]
            },
            "userVerificationResult": {
                "overallScore": match_score,
                "strengths": [
                    {"area": "직무 적합도", "detail": match_reason or "해당 분야에 관심이 있습니다", "score": match_score},
                    {"area": "관심 분야", "detail": f"{matched_career} 관련 포지션입니다" if matched_career else "관심 분야와 연관됩니다", "score": 70 + (h % 20)}
                ],
                "weaknesses": [{"area": "경험 확인", "detail": "실무 경험에 대한 추가 확인이 필요합니다", "priority": "MEDIUM"}] if match_score < 80 else [],
                "valueAlignment": "추천 직업과 연관된 포지션으로 가치관이 부합할 가능성이 높습니다" if matched_career else "확인 필요",
                "cultureAlignment": "기업 문화 적합도는 면접에서 확인이 필요합니다",
                "growthPotential": "해당 분야에서의 성장 가능성이 있습니다"
            }
        }

    # ==================== DB 조회 ====================

    def get_latest_jobs(self, limit: int = 20) -> List[Dict]:
        """최신 채용공고 조회"""
        query = '''
            SELECT id, title, company, location, url, description,
                   site_name, experience, crawled_at
            FROM job_listings
            ORDER BY crawled_at DESC
            LIMIT %s
        '''
        return self.db.execute_query(query, (limit,)) or []

    def search_jobs_by_keywords(self, keywords: List[str], limit: int = 20) -> List[Dict]:
        """키워드로 채용공고 검색"""
        if not keywords:
            return self.get_latest_jobs(limit)

        conditions = []
        params = []
        for kw in keywords:
            conditions.append("(title ILIKE %s OR description ILIKE %s)")
            params.extend([f"%{kw}%", f"%{kw}%"])

        query = f'''
            SELECT id, title, company, location, url, description,
                   site_name, experience, crawled_at
            FROM job_listings
            WHERE {" OR ".join(conditions)}
            ORDER BY crawled_at DESC
            LIMIT %s
        '''
        params.append(limit)

        results = self.db.execute_query(query, tuple(params))
        return results if results else self.get_latest_jobs(limit)

    def get_cached_recommendations(self, user_id: int, limit: int = 20, min_score: float = 0) -> Optional[List[Dict]]:
        """캐시된 추천 조회"""
        query = '''
            SELECT
                ujr.id, ujr.user_id, ujr.job_listing_id,
                ujr.match_score, ujr.match_reason, ujr.recommendation_data, ujr.calculated_at,
                jl.title, jl.company, jl.location, jl.url, jl.description,
                jl.site_name, jl.tech_stack, jl.required_skills
            FROM user_job_recommendations ujr
            INNER JOIN job_listings jl ON ujr.job_listing_id = jl.id
            WHERE ujr.user_id = %s AND ujr.match_score >= %s
            ORDER BY ujr.match_score DESC
            LIMIT %s
        '''
        try:
            return self.db.execute_query(query, (user_id, min_score, limit))
        except Exception:
            return None

    # ==================== 추천 직업 조회 ====================

    def get_user_career_names(self, user_id: int) -> tuple[List[str], str, Dict]:
        """
        사용자의 추천 직업 목록 조회

        Returns:
            (career_names, data_source, career_analysis_data)
        """
        career_names = []
        data_source = None
        career_analysis_data = {}

        # 1. job_recommendations 테이블 우선 조회
        job_rec_query = '''
            SELECT job_name, job_code, match_score
            FROM job_recommendations
            WHERE user_id = %s
            ORDER BY match_score DESC
            LIMIT 5
        '''
        results = self.db.execute_query(job_rec_query, (user_id,))

        if results:
            career_names = [r.get("job_name") for r in results if r.get("job_name")]
            data_source = "job_recommendations"
            career_analysis_data["recommendedCareers"] = [{"careerName": name} for name in career_names]
            return career_names, data_source, career_analysis_data

        # 2. career_analyses 테이블 조회
        career_query = '''
            SELECT ca.recommended_careers, ca.interest_areas, ca.personality_type
            FROM career_analyses ca
            INNER JOIN career_sessions cs ON ca.session_id = cs.id
            WHERE cs.user_id = %s
            ORDER BY ca.analyzed_at DESC
            LIMIT 1
        '''
        results = self.db.execute_query(career_query, (str(user_id),))

        if results:
            row = results[0]
            recommended_careers = row.get("recommended_careers")
            if isinstance(recommended_careers, str):
                try:
                    recommended_careers = json.loads(recommended_careers)
                except:
                    recommended_careers = []

            for career in recommended_careers or []:
                if isinstance(career, dict):
                    name = career.get("careerName") or career.get("name") or career.get("career_name")
                    if name:
                        career_names.append(name)
                elif isinstance(career, str):
                    career_names.append(career)

            if career_names:
                data_source = "career_analyses"
                interest_areas = row.get("interest_areas") or []
                if isinstance(interest_areas, str):
                    try:
                        interest_areas = json.loads(interest_areas)
                    except:
                        interest_areas = []

                career_analysis_data = {
                    "recommendedCareers": [{"careerName": name} for name in career_names],
                    "interests": interest_areas,
                    "personalityType": row.get("personality_type") or ""
                }

        return career_names, data_source, career_analysis_data

    # ==================== 포맷팅 ====================

    def format_job_to_recommendation(self, job: Dict, ai_result: Optional[Dict] = None) -> Dict:
        """DB row를 추천 응답 형식으로 변환"""
        if ai_result:
            match_score = ai_result.get("match_score", 50)
            if not ai_result.get("is_relevant", False):
                match_score = min(match_score, 30)

            return {
                "id": job.get("id"),
                "title": job.get("title") or "",
                "company": job.get("company") or "기업",
                "location": job.get("location"),
                "url": job.get("url"),
                "description": (job.get("description") or "")[:300],
                "siteName": job.get("site_name"),
                "experience": job.get("experience"),
                "matchScore": match_score,
                "matchReason": ai_result.get("reason", "키워드 기반 추천"),
                "matchedCareers": [ai_result.get("matched_career")] if ai_result.get("matched_career") else [],
                "requiredSkills": ai_result.get("required_skills", []),
                "skillMatch": ai_result.get("skill_match", []),
                "crawledAt": str(job.get("crawled_at")) if job.get("crawled_at") else None,
            }
        else:
            # AI 평가 없이 기본값
            h = int(hashlib.md5(f"{job.get('id')}".encode()).hexdigest()[:8], 16)
            return {
                "id": job.get("id"),
                "title": job.get("title") or "",
                "company": job.get("company") or "기업",
                "location": job.get("location"),
                "url": job.get("url"),
                "description": (job.get("description") or "")[:300],
                "siteName": job.get("site_name"),
                "experience": job.get("experience"),
                "matchScore": 60 + (h % 36),
                "matchReason": "최신 채용공고입니다.",
                "matchedCareers": [],
                "requiredSkills": [],
                "skillMatch": [],
                "crawledAt": str(job.get("crawled_at")) if job.get("crawled_at") else None,
            }


# 싱글톤 인스턴스
_service = None


def get_job_listing_service() -> JobListingService:
    """서비스 인스턴스 반환"""
    global _service
    if _service is None:
        _service = JobListingService()
    return _service
