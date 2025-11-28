"""
채용공고 AI 에이전트 (OpenAI Agents SDK)

OpenAI Agents SDK를 사용한 채용공고 추천 에이전트입니다.
사용자 프로필을 기반으로 맞춤 채용공고를 추천하고,
관련 자격증 정보를 제공합니다.
"""
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


# ==================== 메인 에이전트 (라우터) ====================

# 에이전트 인스턴스
_recommendation_agent: Optional[Agent] = None
_recommendation_json_agent: Optional[Agent] = None
_analysis_agent: Optional[Agent] = None
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


def get_main_agent() -> Agent:
    """
    메인 에이전트 (라우터)
    사용자 요청을 분석하여 적절한 전문 에이전트에게 핸드오프합니다.
    """
    global _main_agent
    if _main_agent is None:
        _main_agent = Agent(
            name="JobCoordinator",
            instructions="""당신은 채용 서비스 코디네이터입니다.
사용자의 요청을 분석하여 적절한 전문 에이전트에게 연결합니다.

## 라우팅 가이드

1. **채용공고 추천 에이전트로 연결:**
   - "채용공고 추천해줘"
   - "백엔드 개발자 채용 찾아줘"
   - "내 프로필에 맞는 공고"
   - "지원할 만한 회사"

2. **채용 시장 분석 에이전트로 연결:**
   - "채용 트렌드 분석해줘"
   - "어떤 기술이 많이 요구돼?"
   - "프론트엔드 vs 백엔드 비교"
   - "시장 현황"

3. **직접 처리:**
   - 간단한 인사나 질문
   - 서비스 소개 요청
""",
            handoffs=[
                get_recommendation_agent(),
                get_analysis_agent()
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
        agent_type: 에이전트 타입 ("main", "recommendation", "analysis")

    Returns:
        에이전트 실행 결과
    """
    try:
        # 에이전트 선택
        if agent_type == "recommendation":
            agent = get_recommendation_agent()
        elif agent_type == "analysis":
            agent = get_analysis_agent()
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
    """
    try:
        if agent_type == "recommendation":
            agent = get_recommendation_agent()
        elif agent_type == "analysis":
            agent = get_analysis_agent()
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
