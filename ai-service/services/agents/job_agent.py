
import os
import json
from typing import Optional, List, Dict
from agents import Agent, Runner, function_tool
from services.database_service import DatabaseService
from services.qnet_api_service import QnetApiService


# 서비스 인스턴스 (도구에서 사용)
_db_service: Optional[DatabaseService] = None
_qnet_service: Optional[QnetApiService] = None


def _get_db_service() -> DatabaseService:
    """DatabaseService 싱글톤"""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service


def _get_qnet_service() -> QnetApiService:
    """QnetApiService 싱글톤"""
    global _qnet_service
    if _qnet_service is None:
        _qnet_service = QnetApiService()
    return _qnet_service


# ==================== 도구 정의 ====================

@function_tool
def get_user_profile(user_id: int) -> str:
    """
    사용자의 프로필과 커리어 분석 결과를 조회합니다.
    추천 직업, 강점, 가치관, 관심사, 스킬 정보를 포함합니다.

    Args:
        user_id: 사용자 ID

    Returns:
        사용자 프로필 JSON 문자열
    """
    try:
        db = _get_db_service()
        query = """
            SELECT analysis_data
            FROM career_analysis
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        results = db.execute_query(query, (user_id,))

        if results and results[0][0]:
            analysis_data = results[0][0]
            if isinstance(analysis_data, str):
                return analysis_data
            return json.dumps(analysis_data, ensure_ascii=False)

        return json.dumps({
            "found": False,
            "message": "프로필이 없습니다. 키워드 기반으로 검색하세요."
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def search_jobs(keyword: str, limit: int = 10) -> str:
    """
    키워드로 채용공고를 검색합니다.
    제목이나 설명에 키워드가 포함된 공고를 찾습니다.

    Args:
        keyword: 검색 키워드 (예: 백엔드, 프론트엔드, 데이터)
        limit: 가져올 공고 수 (기본값: 10)

    Returns:
        채용공고 목록 JSON 문자열
    """
    try:
        db = _get_db_service()
        query = """
            SELECT id, title, company, location, url, description,
                   site_name, tech_stack, required_skills
            FROM job_listings
            WHERE (title ILIKE %s OR description ILIKE %s)
            AND crawled_at >= NOW() - INTERVAL '7 days'
            ORDER BY crawled_at DESC
            LIMIT %s
        """
        pattern = f"%{keyword}%"
        results = db.execute_query(query, (pattern, pattern, limit))

        jobs = []
        for row in results:
            tech_stack = row[7]
            if tech_stack and isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            required_skills = row[8]
            if required_skills and isinstance(required_skills, str):
                try:
                    required_skills = json.loads(required_skills)
                except:
                    required_skills = [required_skills]

            jobs.append({
                "id": row[0],
                "title": row[1],
                "company": row[2],
                "location": row[3],
                "url": row[4],
                "description": (row[5] or "")[:300],
                "site_name": row[6],
                "tech_stack": tech_stack,
                "required_skills": required_skills
            })

        return json.dumps({
            "keyword": keyword,
            "total_count": len(jobs),
            "jobs": jobs
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def get_recent_jobs(limit: int = 20) -> str:
    """
    최신 채용공고를 가져옵니다.
    최근 7일 이내 공고를 최신순으로 반환합니다.

    Args:
        limit: 가져올 공고 수 (기본값: 20)

    Returns:
        채용공고 목록 JSON 문자열
    """
    try:
        db = _get_db_service()
        query = """
            SELECT id, title, company, location, url, description,
                   site_name, tech_stack, required_skills
            FROM job_listings
            WHERE crawled_at >= NOW() - INTERVAL '7 days'
            ORDER BY crawled_at DESC
            LIMIT %s
        """
        results = db.execute_query(query, (limit,))

        jobs = []
        for row in results:
            tech_stack = row[7]
            if tech_stack and isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            jobs.append({
                "id": row[0],
                "title": row[1],
                "company": row[2],
                "location": row[3],
                "url": row[4],
                "description": (row[5] or "")[:300],
                "site_name": row[6],
                "tech_stack": tech_stack
            })

        return json.dumps({
            "total_count": len(jobs),
            "jobs": jobs
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def get_certifications(keyword: str, limit: int = 5) -> str:
    """
    직업이나 키워드에 관련된 자격증 정보를 조회합니다.

    Args:
        keyword: 자격증 검색 키워드 (예: 정보처리, 전기, 회계)
        limit: 가져올 자격증 수 (기본값: 5)

    Returns:
        자격증 목록 JSON 문자열
    """
    try:
        db = _get_db_service()
        certs = db.get_certifications(keyword=keyword, limit=limit)

        return json.dumps({
            "keyword": keyword,
            "total_count": len(certs),
            "certifications": certs
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def get_company_info(company_name: str) -> str:
    """
    회사명으로 기업 상세 정보를 조회합니다.
    업종, 규모, 연봉, 복지, 문화 등의 정보를 포함합니다.

    Args:
        company_name: 검색할 회사명 (일부만 입력해도 검색됨)

    Returns:
        기업 상세 정보 JSON 문자열
    """
    try:
        db = _get_db_service()
        query = """
            SELECT company_name, industry, established_year, employee_count,
                   address, description, vision, benefits, culture, average_salary,
                   company_type, revenue, ceo_name, capital, homepage_url
            FROM company_info
            WHERE company_name ILIKE %s
            ORDER BY updated_at DESC
            LIMIT 5
        """
        pattern = f"%{company_name}%"
        results = db.execute_query(query, (pattern,))

        companies = []
        for row in results:
            companies.append({
                "company_name": row[0],
                "industry": row[1],
                "established_year": row[2],
                "employee_count": row[3],
                "address": row[4],
                "description": (row[5] or "")[:500],
                "vision": row[6],
                "benefits": row[7],
                "culture": row[8],
                "average_salary": row[9],
                "company_type": row[10],
                "revenue": row[11],
                "ceo_name": row[12],
                "capital": row[13],
                "homepage_url": row[14]
            })

        return json.dumps({
            "search_keyword": company_name,
            "total_count": len(companies),
            "companies": companies
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def get_career_path_info(target_position: str) -> str:
    """
    목표 직무에 필요한 커리어 경로와 성장 전략을 분석합니다.
    채용공고 데이터를 기반으로 요구 기술, 경력 조건 등을 분석합니다.

    Args:
        target_position: 목표 직무 (예: 백엔드 개발자, 데이터 분석가)

    Returns:
        커리어 경로 정보 JSON 문자열
    """
    try:
        db = _get_db_service()

        # 해당 직무의 채용공고에서 요구사항 분석
        query = """
            SELECT title, company, description, tech_stack, required_skills
            FROM job_listings
            WHERE (title ILIKE %s OR description ILIKE %s)
            AND crawled_at >= NOW() - INTERVAL '30 days'
            ORDER BY crawled_at DESC
            LIMIT 30
        """
        pattern = f"%{target_position}%"
        results = db.execute_query(query, (pattern, pattern))

        # 기술 스택 집계
        tech_count = {}
        skill_count = {}
        experience_levels = {"신입": 0, "1-3년": 0, "3-5년": 0, "5년 이상": 0}

        for row in results:
            description = row[2] or ""

            # 경력 분석
            if "신입" in description or "경력무관" in description:
                experience_levels["신입"] += 1
            elif "1년" in description or "2년" in description or "3년" in description:
                experience_levels["1-3년"] += 1
            elif "4년" in description or "5년" in description:
                experience_levels["3-5년"] += 1
            elif "6년" in description or "7년" in description or "시니어" in description:
                experience_levels["5년 이상"] += 1

            # 기술 스택
            tech_stack = row[3]
            if tech_stack:
                if isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack]
                for tech in tech_stack:
                    if tech:
                        tech_count[tech] = tech_count.get(tech, 0) + 1

            # 요구 스킬
            skills = row[4]
            if skills:
                if isinstance(skills, str):
                    try:
                        skills = json.loads(skills)
                    except:
                        skills = [skills]
                for skill in skills:
                    if skill:
                        skill_count[skill] = skill_count.get(skill, 0) + 1

        # 상위 기술/스킬 추출
        top_tech = sorted(tech_count.items(), key=lambda x: x[1], reverse=True)[:10]
        top_skills = sorted(skill_count.items(), key=lambda x: x[1], reverse=True)[:10]

        return json.dumps({
            "target_position": target_position,
            "analyzed_jobs": len(results),
            "required_technologies": [{"name": t, "count": c} for t, c in top_tech],
            "required_skills": [{"name": s, "count": c} for s, c in top_skills],
            "experience_distribution": experience_levels
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def search_certification_by_career(career_keyword: str, limit: int = 10) -> str:
    """
    직업/직무와 관련된 자격증을 검색합니다.
    에이전트가 자격증 정보를 바탕으로 준비 팁과 직무 연관성을 직접 분석하여 제공합니다.

    Args:
        career_keyword: 직업/직무 키워드 (예: 개발, 데이터, 회계)
        limit: 가져올 자격증 수 (기본값: 10)

    Returns:
        자격증 목록 JSON 문자열
    """
    try:
        db = _get_db_service()
        certs = db.get_certifications(keyword=career_keyword, limit=limit)

        return json.dumps({
            "career_keyword": career_keyword,
            "total_count": len(certs),
            "certifications": certs
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


@function_tool
def analyze_tech_stack(jobs_json: str) -> str:
    """
    채용공고 목록에서 자주 요구되는 기술 스택을 분석합니다.

    Args:
        jobs_json: search_jobs나 get_recent_jobs의 결과 JSON 문자열

    Returns:
        기술 스택 분석 결과 JSON 문자열
    """
    try:
        data = json.loads(jobs_json)
        jobs = data.get("jobs", [])

        tech_count = {}
        skill_count = {}

        for job in jobs:
            # tech_stack 집계
            tech_stack = job.get("tech_stack") or []
            if isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            for tech in tech_stack:
                if tech:
                    tech_count[tech] = tech_count.get(tech, 0) + 1

            # required_skills 집계
            required_skills = job.get("required_skills") or []
            if isinstance(required_skills, str):
                try:
                    required_skills = json.loads(required_skills)
                except:
                    required_skills = [required_skills]

            for skill in required_skills:
                if skill:
                    skill_count[skill] = skill_count.get(skill, 0) + 1

        # 빈도순 정렬
        top_tech = sorted(tech_count.items(), key=lambda x: x[1], reverse=True)[:15]
        top_skills = sorted(skill_count.items(), key=lambda x: x[1], reverse=True)[:10]

        return json.dumps({
            "analyzed_jobs": len(jobs),
            "top_technologies": [{"name": t, "count": c} for t, c in top_tech],
            "top_skills": [{"name": s, "count": c} for s, c in top_skills]
        }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


# ==================== 에이전트 정의 ====================

def create_job_recommendation_agent() -> Agent:
    """채용공고 추천 에이전트 생성 (자연어 응답)"""

    return Agent(
        name="JobRecommendationAgent",
        instructions="""당신은 채용공고 추천 전문가입니다.
사용자의 요청을 분석하고 맞춤 채용공고를 추천합니다.

## 작업 가이드

1. **프로필 기반 추천 요청 시:**
   - get_user_profile로 사용자 프로필 확인
   - 프로필의 추천 직업(recommendedCareers)을 키워드로 search_jobs 호출
   - 결과가 적으면 관련 키워드로 추가 검색

2. **키워드 기반 검색 요청 시:**
   - 사용자 요청에서 직무 키워드 추출
   - search_jobs로 해당 키워드 검색
   - 필요시 여러 키워드로 여러 번 검색

3. **자격증 추천 요청 시:**
   - get_certifications로 관련 자격증 조회
   - 채용공고의 요구사항과 연계하여 설명

4. **기술 트렌드 분석 요청 시:**
   - search_jobs 또는 get_recent_jobs로 공고 수집
   - analyze_tech_stack으로 기술 스택 분석

## 응답 형식

- 항상 친절하고 구체적으로 답변하세요
- 채용공고 추천 시 회사명, 포지션, 주요 요구사항을 명시하세요
- URL을 포함하여 사용자가 바로 지원할 수 있게 하세요
- 기술 스택이나 자격증 추천 시 이유를 설명하세요

## 주의사항

- 프로필이 없는 사용자에게는 커리어 분석을 권유하세요
- 검색 결과가 없으면 유사한 키워드로 재검색을 시도하세요
- 항상 최신 정보(7일 이내)를 기반으로 답변하세요
""",
        tools=[
            get_user_profile,
            search_jobs,
            get_recent_jobs,
            get_certifications,
            analyze_tech_stack
        ]
    )


def create_job_recommendation_json_agent() -> Agent:
    """채용공고 추천 에이전트 생성 (JSON 응답 - 프론트엔드 카드 UI용)"""

    return Agent(
        name="JobRecommendationJSONAgent",
        instructions="""당신은 채용공고 추천 전문가입니다.
사용자 프로필과 요청을 분석하여 맞춤 채용공고를 JSON 형식으로 반환합니다.

## 작업 순서

1. 사용자 ID가 있으면 get_user_profile로 프로필 조회
2. 프로필이 있으면 추천 직업(recommendedCareers)에서 키워드 추출
3. 프로필이 없거나 careerAnalysis가 제공되면 해당 정보 사용
4. search_jobs로 채용공고 검색 (여러 키워드로 검색 가능)
5. 검색된 공고를 분석하여 매칭 점수와 추천 이유 생성

## 중요: 응답 형식

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

```json
{
  "recommendations": [
    {
      "jobId": "공고ID (숫자를 문자열로)",
      "title": "채용 포지션명",
      "company": "회사명",
      "location": "근무지 (없으면 null)",
      "url": "공고 URL",
      "description": "공고 설명 (200자 이내)",
      "siteName": "채용사이트명",
      "matchScore": 85,
      "reasons": ["추천 이유 1", "추천 이유 2"],
      "strengths": ["사용자 강점 1", "사용자 강점 2"],
      "concerns": ["고려사항 1"]
    }
  ],
  "totalCount": 10
}
```

## 매칭 점수 기준 (matchScore: 0-100)

- 90-100: 프로필과 완벽하게 일치
- 80-89: 대부분의 요구사항 충족
- 70-79: 주요 요구사항 충족
- 60-69: 일부 요구사항 충족
- 50-59: 관련성은 있으나 추가 학습 필요

## 추천 이유 작성 가이드

- 사용자의 강점과 공고 요구사항을 연결
- 구체적인 기술이나 경험 언급
- 성장 가능성이나 문화 적합성 포함

## 주의사항

- 검색 결과가 없으면 빈 배열과 totalCount: 0 반환
- 프로필 정보가 없어도 키워드 기반으로 검색하여 추천
- JSON 형식 외의 텍스트는 절대 출력하지 마세요
""",
        tools=[
            get_user_profile,
            search_jobs,
            get_recent_jobs,
            get_certifications,
            analyze_tech_stack
        ]
    )


def create_job_analysis_agent() -> Agent:
    """채용 시장 분석 에이전트 생성"""

    return Agent(
        name="JobAnalysisAgent",
        instructions="""당신은 채용 시장 분석 전문가입니다.
채용공고 데이터를 분석하여 시장 트렌드, 요구 기술, 인사이트를 제공합니다.

## 분석 가이드

1. **특정 직무 분석 요청 시:**
   - search_jobs로 해당 직무 공고 수집
   - analyze_tech_stack으로 기술 요구사항 분석
   - get_certifications로 관련 자격증 조회

2. **전체 시장 트렌드 요청 시:**
   - get_recent_jobs로 최신 공고 수집
   - analyze_tech_stack으로 전반적인 기술 트렌드 분석

3. **기술 스택 비교 요청 시:**
   - 여러 직무별로 search_jobs 호출
   - 각각 analyze_tech_stack으로 분석 후 비교

## 응답 형식

- 데이터 기반의 객관적인 분석을 제공하세요
- 수치와 통계를 포함하세요 (예: "백엔드 공고 중 70%가 Python 요구")
- 트렌드와 인사이트를 제공하세요
- 학습 방향이나 커리어 조언을 포함하세요
""",
        tools=[
            search_jobs,
            get_recent_jobs,
            get_certifications,
            analyze_tech_stack
        ]
    )


def create_certification_agent() -> Agent:
    """자격증 추천 에이전트 생성"""

    return Agent(
        name="CertificationAgent",
        instructions="""당신은 자격증 추천 전문가입니다.
사용자의 목표 직무와 현재 수준에 맞는 자격증을 추천하고,
취득 전략과 준비 방법을 안내합니다.

## 작업 가이드

1. **자격증 추천 요청 시:**
   - search_certification_by_career로 관련 자격증 검색
   - 사용자의 경력 수준에 맞게 난이도별로 분류
   - 취득 우선순위와 이유 설명

2. **특정 자격증 정보 요청 시:**
   - get_certifications로 상세 정보 조회
   - 시험 일정, 응시 자격, 합격률 등 안내
   - 효과적인 준비 방법 제시

3. **커리어 연계 자격증 요청 시:**
   - get_career_path_info로 해당 직무 요구사항 분석
   - 채용공고에서 많이 언급되는 자격증 우선 추천
   - 실제 취업 시 가산점/우대사항 설명

## 응답 시 직접 분석하여 제공할 내용

각 자격증에 대해 당신의 지식을 활용하여 다음을 분석하고 제공하세요:
- **준비 팁**: 해당 자격증의 시험 유형, 난이도, 출제 경향에 맞는 구체적인 학습 방법
- **직무 연관성**: 사용자의 목표 직무와 해당 자격증이 어떻게 연결되는지, 실무에서 어떤 도움이 되는지
- **취득 우선순위**: 사용자의 현재 상황(경력, 목표)에 맞춰 어떤 순서로 취득하면 효과적인지
- **예상 준비 기간**: 자격증 난이도와 사용자 수준을 고려한 현실적인 준비 기간

## 응답 형식

- 자격증을 난이도/우선순위별로 정리
- 각 자격증의 특징과 취득 효과 설명
- 구체적인 학습 로드맵 제시
- 시험 일정과 준비 기간 안내
""",
        tools=[
            get_certifications,
            search_certification_by_career,
            get_career_path_info,
            search_jobs,
            analyze_tech_stack
        ]
    )


def create_career_growth_agent() -> Agent:
    """커리어 성장 에이전트 생성"""

    return Agent(
        name="CareerGrowthAgent",
        instructions="""당신은 커리어 성장 전문 컨설턴트입니다.
사용자의 현재 상황을 분석하고, 목표 직무까지의 성장 경로를 제시합니다.

## 작업 가이드

1. **커리어 로드맵 요청 시:**
   - get_career_path_info로 목표 직무 요구사항 분석
   - 현재 수준에서 목표까지의 단계별 계획 수립
   - 각 단계별 필요 스킬과 학습 방법 제시

2. **스킬 갭 분석 요청 시:**
   - search_jobs로 실제 채용 요구사항 확인
   - analyze_tech_stack으로 필수 기술 파악
   - 부족한 스킬 목록과 학습 우선순위 제시

3. **경력 전환 상담 시:**
   - 현재 직무와 목표 직무의 연관성 분석
   - 전환에 필요한 준비사항 정리
   - 성공적인 전환 사례와 전략 공유

4. **성장 전략 요청 시:**
   - 단기(3개월), 중기(1년), 장기(3년) 목표 설정
   - 자격증, 프로젝트, 학습 등 구체적 액션 플랜
   - 마일스톤과 성과 측정 방법 제시

## 커리어 조언 생성 가이드

get_career_path_info 도구는 채용공고 데이터(요구 기술, 스킬, 경력 분포)만 반환합니다.
이 데이터를 바탕으로 당신이 직접 다음을 분석하여 제공하세요:

- **신입/주니어 조언**: 해당 직무의 요구 기술을 보고, 신입이 우선 학습해야 할 기술과 포트폴리오 전략
- **미드레벨 조언**: 경력 분포와 요구 스킬을 보고, 전문성 확립을 위한 구체적 방향
- **시니어 조언**: 해당 직무에서 리더로 성장하기 위한 기술적/비기술적 역량

각 직무의 특성에 맞게 맞춤형 조언을 생성하세요.
예를 들어 "백엔드 개발자"와 "데이터 분석가"는 완전히 다른 조언이 필요합니다.

## 응답 형식

- 단계별 성장 계획을 시각적으로 정리
- 각 단계의 목표와 예상 소요 기간 명시
- 구체적이고 실천 가능한 조언 제공
- 동기부여가 되는 긍정적인 톤 유지
""",
        tools=[
            get_career_path_info,
            search_jobs,
            get_recent_jobs,
            get_certifications,
            search_certification_by_career,
            analyze_tech_stack,
            get_user_profile
        ]
    )


def create_company_info_agent() -> Agent:
    """기업 정보 에이전트 생성"""

    return Agent(
        name="CompanyInfoAgent",
        instructions="""당신은 기업 정보 분석 전문가입니다.
기업의 상세 정보, 문화, 복지, 성장성 등을 분석하여
취업 및 이직 의사결정에 도움을 줍니다.

## 작업 가이드

1. **기업 정보 조회 요청 시:**
   - get_company_info로 기업 상세 정보 검색
   - 업종, 규모, 연봉, 복지 등 핵심 정보 정리
   - 기업 문화와 비전 설명

2. **기업 비교 요청 시:**
   - 여러 기업의 정보를 get_company_info로 조회
   - 규모, 연봉, 복지, 성장성 등 항목별 비교
   - 장단점을 객관적으로 분석

3. **업계 분석 요청 시:**
   - search_jobs로 해당 업계 채용 동향 파악
   - 주요 기업들의 정보 수집 및 정리
   - 업계 전망과 성장 가능성 분석

4. **입사 의사결정 지원 시:**
   - 해당 기업의 상세 정보 제공
   - 유사 기업과의 비교 자료 제공
   - 해당 기업에서 성장할 수 있는 커리어 경로 제시

## 응답 형식

- 기업 정보를 구조화하여 정리
- 객관적인 데이터 기반으로 분석
- 장단점을 균형있게 제시
- 의사결정에 도움되는 인사이트 제공

## 주의사항

- 확인되지 않은 정보는 추측이라고 명시
- 부정적인 정보도 객관적으로 전달
- 기업 비방이나 과도한 칭찬 자제
""",
        tools=[
            get_company_info,
            search_jobs,
            get_recent_jobs,
            analyze_tech_stack
        ]
    )


# ==================== 메인 에이전트 (라우터) ====================

# 에이전트 인스턴스
_recommendation_agent: Optional[Agent] = None
_recommendation_json_agent: Optional[Agent] = None
_analysis_agent: Optional[Agent] = None
_certification_agent: Optional[Agent] = None
_career_growth_agent: Optional[Agent] = None
_company_info_agent: Optional[Agent] = None
_main_agent: Optional[Agent] = None


def get_recommendation_agent() -> Agent:
    """추천 에이전트 싱글톤 (자연어 응답)"""
    global _recommendation_agent
    if _recommendation_agent is None:
        _recommendation_agent = create_job_recommendation_agent()
    return _recommendation_agent


def get_recommendation_json_agent() -> Agent:
    """추천 에이전트 싱글톤 (JSON 응답)"""
    global _recommendation_json_agent
    if _recommendation_json_agent is None:
        _recommendation_json_agent = create_job_recommendation_json_agent()
    return _recommendation_json_agent


def get_analysis_agent() -> Agent:
    """분석 에이전트 싱글톤"""
    global _analysis_agent
    if _analysis_agent is None:
        _analysis_agent = create_job_analysis_agent()
    return _analysis_agent


def get_certification_agent() -> Agent:
    """자격증 에이전트 싱글톤"""
    global _certification_agent
    if _certification_agent is None:
        _certification_agent = create_certification_agent()
    return _certification_agent


def get_career_growth_agent() -> Agent:
    """커리어 성장 에이전트 싱글톤"""
    global _career_growth_agent
    if _career_growth_agent is None:
        _career_growth_agent = create_career_growth_agent()
    return _career_growth_agent


def get_company_info_agent() -> Agent:
    """기업 정보 에이전트 싱글톤"""
    global _company_info_agent
    if _company_info_agent is None:
        _company_info_agent = create_company_info_agent()
    return _company_info_agent


def get_main_agent() -> Agent:
    """
    메인 에이전트 (종합 상담 코디네이터)
    사용자 요청을 분석하여 적절한 전문 에이전트에게 핸드오프합니다.
    """
    global _main_agent
    if _main_agent is None:
        _main_agent = Agent(
            name="CareerCoordinator",
            instructions="""당신은 커리어 상담 종합 코디네이터입니다.
사용자의 요청을 분석하여 가장 적절한 전문 에이전트에게 연결합니다.

## 전문 에이전트 소개

1. **JobRecommendationAgent** - 채용공고 추천 전문가
   - 사용자 프로필 기반 맞춤 채용공고 추천
   - 키워드 기반 채용공고 검색
   - 최신 채용 동향 안내

2. **JobAnalysisAgent** - 채용 시장 분석 전문가
   - 기술 트렌드 분석
   - 직무별 요구 기술 비교
   - 채용 시장 현황 분석

3. **CertificationAgent** - 자격증 추천 전문가
   - 직무별 필요 자격증 추천
   - 자격증 취득 전략 및 준비 방법
   - 시험 일정 및 정보 안내

4. **CareerGrowthAgent** - 커리어 성장 컨설턴트
   - 커리어 로드맵 설계
   - 스킬 갭 분석 및 학습 계획
   - 경력 전환 상담

5. **CompanyInfoAgent** - 기업 정보 분석 전문가
   - 기업 상세 정보 조회
   - 기업 비교 분석
   - 입사 의사결정 지원

## 라우팅 가이드

### JobRecommendationAgent로 연결:
- "채용공고 추천해줘", "일자리 찾아줘"
- "백엔드 개발자 채용 있어?"
- "내 프로필에 맞는 공고"
- "어떤 회사에 지원하면 좋을까?"

### JobAnalysisAgent로 연결:
- "채용 트렌드 분석해줘"
- "요즘 어떤 기술이 인기야?"
- "프론트엔드 vs 백엔드 비교"
- "개발자 시장 현황"

### CertificationAgent로 연결:
- "자격증 추천해줘"
- "정보처리기사 어때?"
- "개발자 필수 자격증"
- "자격증 시험 일정"
- "어떤 자격증 따면 좋아?"

### CareerGrowthAgent로 연결:
- "커리어 로드맵 만들어줘"
- "어떻게 성장해야 할까?"
- "스킬 갭 분석해줘"
- "경력 전환하고 싶어"
- "3년 뒤 목표 설정"

### CompanyInfoAgent로 연결:
- "삼성전자 정보 알려줘"
- "이 회사 어때?"
- "A사 vs B사 비교"
- "기업 복지 비교"
- "연봉 어느 정도야?"

### 직접 처리:
- 간단한 인사나 질문
- 서비스 소개 요청
- 여러 영역을 아우르는 종합 상담

## 응답 형식

- 사용자의 요청을 정확히 파악하고 적절한 에이전트로 연결
- 모호한 요청은 질문을 통해 명확히 한 후 연결
- 여러 에이전트가 필요한 경우 순차적으로 연결
- 친절하고 전문적인 톤 유지
""",
            handoffs=[
                get_recommendation_agent(),
                get_analysis_agent(),
                get_certification_agent(),
                get_career_growth_agent(),
                get_company_info_agent()
            ]
        )
    return _main_agent


# ==================== 실행 함수 ====================

async def run_job_agent(
    user_request: str,
    user_id: Optional[int] = None,
    agent_type: str = "main"
) -> Dict:
    """
    채용 에이전트 실행

    Args:
        user_request: 사용자 요청
        user_id: 사용자 ID (선택)
        agent_type: 에이전트 타입
            - "main": 종합 상담 코디네이터 (기본값)
            - "recommendation": 채용공고 추천
            - "analysis": 채용 시장 분석
            - "certification": 자격증 추천
            - "career_growth": 커리어 성장
            - "company_info": 기업 정보

    Returns:
        에이전트 실행 결과
    """
    try:
        # 에이전트 선택
        if agent_type == "recommendation":
            agent = get_recommendation_agent()
        elif agent_type == "analysis":
            agent = get_analysis_agent()
        elif agent_type == "certification":
            agent = get_certification_agent()
        elif agent_type == "career_growth":
            agent = get_career_growth_agent()
        elif agent_type == "company_info":
            agent = get_company_info_agent()
        else:
            agent = get_main_agent()

        # 사용자 ID가 있으면 요청에 포함
        input_text = user_request
        if user_id:
            input_text = f"[user_id: {user_id}] {user_request}"

        # 에이전트 실행
        result = await Runner.run(agent, input=input_text)

        return {
            "success": True,
            "response": result.final_output,
            "agent": agent.name
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def run_job_agent_sync(
    user_request: str,
    user_id: Optional[int] = None,
    agent_type: str = "main"
) -> Dict:
    """
    채용 에이전트 동기 실행 (테스트용)

    Args:
        user_request: 사용자 요청
        user_id: 사용자 ID (선택)
        agent_type: 에이전트 타입
            - "main": 종합 상담 코디네이터 (기본값)
            - "recommendation": 채용공고 추천
            - "analysis": 채용 시장 분석
            - "certification": 자격증 추천
            - "career_growth": 커리어 성장
            - "company_info": 기업 정보
    """
    try:
        if agent_type == "recommendation":
            agent = get_recommendation_agent()
        elif agent_type == "analysis":
            agent = get_analysis_agent()
        elif agent_type == "certification":
            agent = get_certification_agent()
        elif agent_type == "career_growth":
            agent = get_career_growth_agent()
        elif agent_type == "company_info":
            agent = get_company_info_agent()
        else:
            agent = get_main_agent()

        input_text = user_request
        if user_id:
            input_text = f"[user_id: {user_id}] {user_request}"

        result = Runner.run_sync(agent, input=input_text)

        return {
            "success": True,
            "response": result.final_output,
            "agent": agent.name
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


async def run_job_agent_json(
    user_id: Optional[int] = None,
    career_analysis: Optional[Dict] = None,
    user_profile: Optional[Dict] = None,
    limit: int = 20
) -> Dict:
    """
    채용 에이전트 실행 (JSON 응답 - 프론트엔드 카드 UI용)

    Args:
        user_id: 사용자 ID
        career_analysis: 커리어 분석 데이터
        user_profile: 사용자 프로필 데이터
        limit: 추천 공고 수

    Returns:
        {
            "success": bool,
            "recommendations": [...],
            "totalCount": int
        }
    """
    import re

    try:
        agent = get_recommendation_json_agent()

        # 요청 메시지 구성
        request_parts = []
        request_parts.append(f"최대 {limit}개의 채용공고를 추천해주세요.")

        if user_id:
            request_parts.append(f"[user_id: {user_id}]")

        if career_analysis:
            # 추천 직업 정보 추출
            careers = career_analysis.get("recommendedCareers", [])
            if careers:
                career_names = [c.get("careerName", "") for c in careers[:3] if c.get("careerName")]
                if career_names:
                    request_parts.append(f"추천 직업: {', '.join(career_names)}")

            strengths = career_analysis.get("strengths", [])
            if strengths:
                request_parts.append(f"강점: {', '.join(strengths[:5])}")

            interests = career_analysis.get("interests", [])
            if interests:
                request_parts.append(f"관심분야: {', '.join(interests[:5])}")

        if user_profile:
            skills = user_profile.get("skills", [])
            if skills:
                request_parts.append(f"보유 스킬: {', '.join(skills[:10])}")

            experience = user_profile.get("experience", "")
            if experience:
                request_parts.append(f"경력: {experience}")

        input_text = "\n".join(request_parts)
        print(f"[JobAgentJSON] Input: {input_text[:200]}...")

        # 에이전트 실행
        result = await Runner.run(agent, input=input_text)
        output = result.final_output

        print(f"[JobAgentJSON] Output length: {len(output)}")

        # JSON 파싱 시도
        try:
            # 마크다운 코드 블록 제거
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', output)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 코드 블록이 없으면 전체 텍스트에서 JSON 추출 시도
                json_str = output.strip()

            data = json.loads(json_str)

            recommendations = data.get("recommendations", [])

            # 매칭 점수 순으로 정렬 (높은 순)
            recommendations.sort(key=lambda x: x.get("matchScore", 0), reverse=True)

            total_count = data.get("totalCount", len(recommendations))

            return {
                "success": True,
                "recommendations": recommendations,
                "totalCount": total_count
            }

        except json.JSONDecodeError as e:
            print(f"[JobAgentJSON] JSON parse error: {e}")
            print(f"[JobAgentJSON] Raw output: {output[:500]}...")

            # JSON 파싱 실패 시 빈 결과 반환
            return {
                "success": False,
                "error": f"JSON 파싱 실패: {str(e)}",
                "raw_response": output[:1000],
                "recommendations": [],
                "totalCount": 0
            }

    except Exception as e:
        import traceback
        print(f"[JobAgentJSON] Error: {e}")
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "recommendations": [],
            "totalCount": 0
        }
