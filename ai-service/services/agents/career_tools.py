"""
DreamPath ReAct 에이전트 Custom Tools
LangChain @tool 데코레이터를 사용한 도구 정의
"""
import os
import logging
from datetime import datetime
import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")


# ============================================================
# Tool 1: 멘토링 세션 검색
# ============================================================

# 백엔드 API에서 멘토링 세션 검색 후 매칭
@tool
async def search_mentoring_sessions(career_interest: str) -> dict:
    """
    현직자 멘토와의 1:1 상담 세션을 검색합니다.

    실제 현직자에게 직접 조언을 받고 싶을 때 사용하세요.
    웹 검색과 달리, 실제 사람과 대화할 수 있는 멘토링 세션을 찾아줍니다.

    이 도구가 적합한 상황:
    - "조언 받고 싶어", "상담 받고 싶어"
    - "현직자한테 물어보고 싶어", "실제 경험 듣고 싶어"
    - "전문가한테 직접 물어보고 싶어"
    - 특정 직업에 대해 현직자와 대화하고 싶을 때

    Args:
        career_interest: 관심 직업/분야 (예: '백엔드 개발자', '파이썬')

    Returns:
        멘토링 세션 목록 (멘토 이름, 직함, 주제, 일정 등)
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_URL}/api/mentoring-sessions/available")
            response.raise_for_status()
            sessions = response.json()

            # 검색어를 공백으로 분리 (예: "python 파이썬 개발" → ["python", "파이썬", "개발"])
            keywords = [k.strip().lower() for k in career_interest.split() if k.strip()]
            matched = []

            for s in sessions:
                title = (s.get("title") or "").lower()
                desc = (s.get("description") or "").lower()
                job = (s.get("mentorJob") or "").lower()
                username = (s.get("mentorUsername") or "").lower()
                searchable = f"{title} {desc} {job} {username}"

                # 키워드 중 하나라도 매칭되면 포함
                if any(kw in searchable for kw in keywords):
                    matched.append({
                        "sessionId": s.get("sessionId"),
                        "mentorName": s.get("mentorName"),
                        "mentorTitle": s.get("mentorJob"),
                        "topic": s.get("title"),
                        "description": s.get("description"),
                        "sessionDate": _format_date(s.get("sessionDate")),
                    })

            if matched:
                return {"success": True, "sessions": matched[:3], "total": len(matched)}

            # 매칭 없음 → 조용히 스킵 (보조 에이전트는 결과 없으면 말 안함)
            return {"success": True, "sessions": []}

    except Exception as e:
        logger.error(f"[Tools] 멘토링 검색 오류: {e}")
        return {"success": False, "error": str(e)}


# ============================================================
# Tool 2: 학습 경로 조회 (백엔드 API 연동)
# ============================================================

# 기존 학습 경로 조회, 없으면 생성 가능 여부 반환
@tool
async def get_learning_path(career: str, user_id: int = None) -> dict:
    """
    목표 직업 또는 기술을 위한 학습 경로를 조회합니다.
    기존 경로가 없으면 AI가 새로 생성합니다.

    이 도구가 적합한 상황:
    - "뭘 배워야 해?", "어떻게 공부해?" 질문
    - "시작하려면", "준비하려면" 등 학습 의지 표현
    - 구체적인 직업/기술 목표 + 학습 관심

    Args:
        career: 목표 직업 또는 기술 (예: '백엔드 개발자', '자바', 'React')
        user_id: 사용자 ID (선택)

    Returns:
        학습 경로 정보
    """
    try:
        if user_id:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{BACKEND_URL}/api/learning-paths/user/{user_id}")
                if response.status_code == 200:
                    paths = response.json()

                    career_lower = career.lower()
                    for path in paths:
                        domain = (path.get("domain") or "").lower()
                        if career_lower in domain or domain in career_lower:
                            weeks = path.get("weeklySessions") or []
                            topics = [w.get("topic") or f"{i+1}주차" for i, w in enumerate(weeks)]

                            return {
                                "success": True,
                                "exists": True,
                                "path": {
                                    "pathId": path.get("pathId"),
                                    "career": path.get("domain"),
                                    "weeks": len(weeks),
                                    "topics": topics[:6],
                                    "status": path.get("status"),
                                    "progress": path.get("progressRate", 0),
                                },
                                "message": "기존 학습 경로가 있어요. 이어서 학습할 수 있어요."
                            }

        # 기존 경로가 없으면 새로 생성 가능
        return {
            "success": True,
            "exists": False,
            "canCreate": True,
            "path": {
                "career": career,
                "weeks": 4,
                "topics": ["기초 개념", "핵심 스킬", "실습 프로젝트", "심화 학습"],
            },
            "message": f"{career} 학습 경로를 시작할 수 있어요.",
            "createUrl": f"/learning?career={career}"
        }

    except Exception as e:
        logger.error(f"[Tools] 학습 경로 조회 오류: {e}")
        return {"success": False, "error": str(e)}




# ============================================================
# Tool 3: 멘토링 예약
# ============================================================

@tool
async def book_mentoring(session_id: int, user_id: int, reason: str = "") -> dict:
    """
    멘토링 세션을 예약합니다.

    이 도구를 사용해야 하는 상황:
    - "예약할게", "신청할게" 등 예약 의사 표현
    - 이전에 멘토링 검색 후 특정 세션 선택
    - 반드시 session_id와 user_id 필요

    Args:
        session_id: 멘토링 세션 ID
        user_id: 사용자 ID
        reason: 상담 희망 이유

    Returns:
        예약 결과
    """
    if not user_id:
        return {"success": False, "message": "로그인이 필요합니다."}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/api/mentoring-bookings",
                json={"sessionId": session_id, "menteeId": user_id, "reason": reason or "AI 상담 중 예약"}
            )
            response.raise_for_status()
            booking = response.json()

            return {
                "success": True,
                "bookingId": booking.get("bookingId"),
                "mentorName": booking.get("mentorName"),
                "sessionDate": booking.get("sessionDate"),
                "message": "멘토링 예약 완료!"
            }

    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"HTTP {e.response.status_code}"}
    except Exception as e:
        logger.error(f"[Tools] 예약 오류: {e}")
        return {"success": False, "error": str(e)}


# ============================================================
# Tool 4: 웹 검색 (Serper API로 Google 검색)
# ============================================================

# 연봉, 전망 등 최신 정보 검색 (트렌드 키워드면 연도 자동 추가)
@tool
async def web_search(query: str) -> dict:
    """
    실시간 웹 검색을 수행합니다 (Google 검색).

    객관적인 정보나 데이터가 필요할 때 사용하세요.
    멘토링과 달리, 웹에서 일반적인 정보를 수집합니다.

    이 도구가 적합한 상황:
    - 연봉, 취업률 등 통계 데이터가 필요할 때
    - 전망, 트렌드 등 최신 정보가 필요할 때
    - 학습 자료나 공부 방법을 찾을 때
    - 특정 기술, 회사, 산업에 대한 정보가 필요할 때

    Args:
        query: 검색 쿼리 (예: '백엔드 개발자 연봉 2025')

    Returns:
        검색 결과 목록 (제목, URL, 요약)
    """
    import re
    from datetime import datetime

    try:
        import httpx

        serper_api_key = os.getenv("SERPER_API_KEY")
        if not serper_api_key:
            logger.warning("[Tools] SERPER_API_KEY 환경변수 미설정")
            return {"success": False, "error": "Serper API 키가 설정되지 않았습니다"}

        current_year = datetime.now().year
        optimized_query = query.strip()

        # 트렌드 키워드가 있으면 연도 자동 추가
        trend_keywords = ["최근", "요즘", "트렌드", "전망", "유망", "올해"]
        if any(kw in optimized_query for kw in trend_keywords):
            if not re.search(r'\b20\d{2}\b', optimized_query):
                optimized_query = f"{optimized_query} {current_year}"

        logger.info(f"[Tools] Serper 검색: '{query}' → '{optimized_query}'")

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": serper_api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "q": optimized_query,
                    "gl": "kr",
                    "hl": "ko",
                    "num": 5
                }
            )
            response.raise_for_status()
            data = response.json()

        results = []

        for item in data.get("organic", [])[:5]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", "")[:200] + "..." if item.get("snippet") else "",
            })

        if data.get("knowledgeGraph"):
            kg = data["knowledgeGraph"]
            if kg.get("description"):
                results.insert(0, {
                    "title": kg.get("title", "정보"),
                    "url": kg.get("website", ""),
                    "snippet": kg.get("description", "")[:200],
                })

        if results:
            logger.info(f"[Tools] Serper 검색 성공: {len(results)}개 결과")
            return {
                "success": True,
                "results": results,
                "total": len(results),
                "query": query,
            }

        logger.warning(f"[Tools] Serper 검색 결과 없음: {query}")
        return {"success": False, "results": [], "message": "검색 결과 없음"}

    except httpx.HTTPStatusError as e:
        logger.error(f"[Tools] Serper API 오류: {e.response.status_code}")
        return {"success": False, "error": f"API 오류: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"[Tools] 웹 검색 오류: {e}")
        return {"success": False, "error": str(e)}


# ============================================================
# Helper
# ============================================================

def _format_date(date_str: str) -> str:
    if not date_str:
        return "미정"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return f"{dt.month}/{dt.day} {dt.hour:02d}:{dt.minute:02d}"
    except:
        return date_str


# ============================================================
# 도구 목록
# ============================================================

TOOLS = [
    search_mentoring_sessions,
    get_learning_path,
    book_mentoring,
    web_search,
]

TOOL_MAP = {
    "search_mentoring_sessions": search_mentoring_sessions,
    "get_learning_path": get_learning_path,
    "book_mentoring": book_mentoring,
    "web_search": web_search,
}
