
import os
import json
from pathlib import Path
from typing import Optional, List, Dict
from agents import Agent, Runner, function_tool
from services.database_service import DatabaseService
from services.qnet_api_service import QnetApiService


# 프롬프트 디렉토리 경로
PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(filename: str) -> str:
    """
    프롬프트 파일을 로드합니다.

    Args:
        filename: 프롬프트 파일명 (예: job_recommendation.txt)

    Returns:
        프롬프트 내용
    """
    prompt_path = PROMPTS_DIR / filename
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except FileNotFoundError:
        print(f"[Warning] 프롬프트 파일을 찾을 수 없습니다: {prompt_path}")
        return f"프롬프트 파일({filename})을 로드할 수 없습니다."
    except Exception as e:
        print(f"[Warning] 프롬프트 로드 실패: {e}")
        return f"프롬프트 로드 오류: {str(e)}"


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

        if results and results[0].get("analysis_data"):
            analysis_data = results[0].get("analysis_data")
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
            AND crawled_at >= NOW() - INTERVAL '30 days'
            ORDER BY crawled_at DESC
            LIMIT %s
        """
        pattern = f"%{keyword}%"
        results = db.execute_query(query, (pattern, pattern, limit))

        jobs = []
        for row in results:
            tech_stack = row.get("tech_stack")
            if tech_stack and isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            required_skills = row.get("required_skills")
            if required_skills and isinstance(required_skills, str):
                try:
                    required_skills = json.loads(required_skills)
                except:
                    required_skills = [required_skills]

            jobs.append({
                "id": row.get("id"),
                "title": row.get("title"),
                "company": row.get("company"),
                "location": row.get("location"),
                "url": row.get("url"),
                "description": (row.get("description") or "")[:300],
                "site_name": row.get("site_name"),
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
            WHERE crawled_at >= NOW() - INTERVAL '30 days'
            ORDER BY crawled_at DESC
            LIMIT %s
        """
        results = db.execute_query(query, (limit,))

        jobs = []
        for row in results:
            tech_stack = row.get("tech_stack")
            if tech_stack and isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            jobs.append({
                "id": row.get("id"),
                "title": row.get("title"),
                "company": row.get("company"),
                "location": row.get("location"),
                "url": row.get("url"),
                "description": (row.get("description") or "")[:300],
                "site_name": row.get("site_name"),
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
                "company_name": row.get("company_name"),
                "industry": row.get("industry"),
                "established_year": row.get("established_year"),
                "employee_count": row.get("employee_count"),
                "address": row.get("address"),
                "description": (row.get("description") or "")[:500],
                "vision": row.get("vision"),
                "benefits": row.get("benefits"),
                "culture": row.get("culture"),
                "average_salary": row.get("average_salary"),
                "company_type": row.get("company_type"),
                "revenue": row.get("revenue"),
                "ceo_name": row.get("ceo_name"),
                "capital": row.get("capital"),
                "homepage_url": row.get("homepage_url")
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
            description = row.get("description") or ""

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
            tech_stack = row.get("tech_stack")
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
            skills = row.get("required_skills")
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


@function_tool
def deep_research(keyword: str) -> str:
    """
    채용 시장 딥리서치를 실행하고 MD 리포트를 생성합니다.
    최신 채용 공고를 분석하여 기술 스택, 우대 자격증, 연봉, 취업 전략을 포함한
    상세 리포트를 마크다운 형식으로 반환합니다.

    Args:
        keyword: 분석할 직무 키워드 (예: 백엔드 개발자, 프론트엔드, 데이터 분석가)

    Returns:
        마크다운 형식의 상세 분석 리포트
    """
    try:
        from services.job_research import run_job_research_sync

        result = run_job_research_sync(keyword)

        if result.get("success"):
            return json.dumps({
                "success": True,
                "report": result.get("report_markdown", ""),
                "report_path": result.get("report_path", ""),
                "total_postings": result.get("total_postings", 0),
                "keyword": keyword
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "error": result.get("error", "알 수 없는 오류"),
                "keyword": keyword
            }, ensure_ascii=False)

    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e),
            "keyword": keyword
        }, ensure_ascii=False)


# ==================== 에이전트 정의 ====================

def create_job_recommendation_agent() -> Agent:
    """채용공고 추천 에이전트 생성 (자연어 응답)"""

    return Agent(
        name="JobRecommendationAgent",
        instructions=load_prompt("job_recommendation.txt"),
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
        instructions=load_prompt("job_recommendation_json.txt"),
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
        instructions=load_prompt("job_analysis.txt"),
        tools=[
            search_jobs,
            get_recent_jobs,
            get_certifications,
            analyze_tech_stack,
            deep_research
        ]
    )


def create_certification_agent() -> Agent:
    """자격증 추천 에이전트 생성"""

    return Agent(
        name="CertificationAgent",
        instructions=load_prompt("certification.txt"),
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
        instructions=load_prompt("career_growth.txt"),
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
        instructions=load_prompt("company_info.txt"),
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
            instructions=load_prompt("career_coordinator.txt"),
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
                # dict 리스트인 경우 name 필드 추출, 문자열 리스트면 그대로 사용
                strength_names = [
                    s.get("name", str(s)) if isinstance(s, dict) else str(s)
                    for s in strengths[:5]
                ]
                request_parts.append(f"강점: {', '.join(strength_names)}")

            interests = career_analysis.get("interests", [])
            if interests:
                # dict 리스트인 경우 name 필드 추출, 문자열 리스트면 그대로 사용
                interest_names = [
                    i.get("name", str(i)) if isinstance(i, dict) else str(i)
                    for i in interests[:5]
                ]
                request_parts.append(f"관심분야: {', '.join(interest_names)}")

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