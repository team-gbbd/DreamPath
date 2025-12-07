"""
채용 공고 추천 Tool - 사용자 맞춤 채용 공고 추천
"""
from typing import Dict, Any, List, Optional
from services.database_service import DatabaseService
import asyncio


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_job_postings",
        "description": "사용자에게 맞는 최신 채용 공고를 추천합니다. 키워드가 없으면 진로 분석 결과를 기반으로 추천합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "keywords": {
                    "type": "string",
                    "description": "검색 키워드 (예: '백엔드 개발자', '마케팅'). 없으면 자동으로 추천됩니다."
                },
                "limit": {
                    "type": "integer",
                    "description": "추천 결과 개수 (기본: 5)",
                    "default": 5
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(
    user_id: int,
    keywords: Optional[str] = None,
    limit: int = 5,
    db: DatabaseService = None,
    **kwargs
) -> Dict[str, Any]:
    """
    채용 공고 추천 실행

    Args:
        user_id: 사용자 ID
        keywords: 검색 키워드 (선택)
        limit: 추천 결과 개수
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        채용 공고 목록
    """
    try:
        if db is None:
            db = DatabaseService()

        # 키워드가 없으면 진로 분석 결과에서 추천 직업을 가져옴
        if not keywords:
            try:
                career_query = """
                    SELECT recommended_careers
                    FROM career_analysis
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """
                career_result = db.execute_query(career_query, (user_id,))

                if career_result and len(career_result) > 0:
                    recommended_careers = career_result[0].get("recommended_careers")

                    if recommended_careers:
                        # JSON 파싱
                        import json
                        if isinstance(recommended_careers, str):
                            try:
                                careers = json.loads(recommended_careers)
                                if careers and len(careers) > 0:
                                    # 첫 번째 추천 직업을 키워드로 사용
                                    keywords = careers[0].get("careerName", "")
                            except:
                                pass
            except Exception as e:
                print(f"진로 분석 결과 조회 오류: {str(e)}")

        # 여전히 키워드가 없으면 최신 공고를 반환
        if not keywords:
            query = """
                SELECT
                    id, title, company, location, url, description,
                    site_name, crawled_at
                FROM job_listings
                WHERE crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """
            params = (limit,)
        else:
            # 키워드 기반 검색
            query = """
                SELECT
                    id, title, company, location, url, description,
                    site_name, crawled_at
                FROM job_listings
                WHERE
                    (title ILIKE %s OR description ILIKE %s OR company ILIKE %s)
                    AND crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """
            keyword_pattern = f"%{keywords}%"
            params = (keyword_pattern, keyword_pattern, keyword_pattern, limit)

        job_postings = db.execute_query(query, params)

        if not job_postings or len(job_postings) == 0:
            return {
                "success": False,
                "message": f"검색 조건에 맞는 채용 공고가 없습니다. (키워드: {keywords or '없음'})"
            }

        return {
            "success": True,
            "data": {
                "keywords": keywords or "최신 공고",
                "job_postings": job_postings
            }
        }

    except Exception as e:
        print(f"채용 공고 추천 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"채용 공고 추천 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    채용 공고를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "채용 공고를 찾을 수 없습니다.")

    result = data.get("data", {})
    keywords = result.get("keywords", "최신 공고")
    job_postings = result.get("job_postings", [])

    response = f"## 💼 채용 공고 추천 (키워드: {keywords})\n\n"

    if not job_postings or len(job_postings) == 0:
        return f"'{keywords}' 관련 채용 공고가 없습니다."

    for idx, job in enumerate(job_postings, 1):
        title = job.get("title", "제목 없음")
        company = job.get("company", "회사명 없음")
        location = job.get("location", "위치 미상")
        url = job.get("url", "")
        site_name = job.get("site_name", "")
        crawled_at = job.get("crawled_at", "")

        response += f"### {idx}. {title}\n"
        response += f"- **회사**: {company}\n"
        response += f"- **위치**: {location}\n"

        if site_name:
            response += f"- **출처**: {site_name}\n"

        if url:
            response += f"- **링크**: {url}\n"

        # 설명 (100자 제한)
        description = job.get("description", "")
        if description:
            if len(description) > 100:
                description = description[:100] + "..."
            response += f"- **설명**: {description}\n"

        if crawled_at:
            response += f"- **등록일**: {crawled_at}\n"

        response += "\n"

    response += f"*총 {len(job_postings)}개의 채용 공고가 있습니다. 최근 7일 이내의 공고만 표시됩니다.*"

    return response