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
        "description": "사용자에게 맞는 채용 공고를 추천합니다. 진로 분석 결과의 추천 직업을 기반으로 검색합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(
    user_id: int,
    keywords: Optional[str] = None,
    limit: int = 3,
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
                    SELECT ca.recommended_careers
                    FROM career_analyses ca
                    JOIN career_sessions cs ON ca.session_id = cs.id
                    WHERE cs.user_id = %s
                    ORDER BY ca.analyzed_at DESC
                    LIMIT 1
                """
                career_result = db.execute_query(career_query, (str(user_id),))

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
                                    career_name = careers[0].get("careerName", "")
                                    # 키워드 단순화: 괄호 제거, 첫 단어만 추출
                                    # "전문 화가(현대 회화·수채화 작가)" → "화가"
                                    if career_name:
                                        # 괄호 앞부분만 추출
                                        import re
                                        simple_name = re.split(r'[\(\[]', career_name)[0].strip()
                                        # 공백으로 분리 후 마지막 단어 (핵심 직업명)
                                        words = simple_name.split()
                                        if len(words) > 1:
                                            keywords = words[-1]  # "전문 화가" → "화가"
                                        else:
                                            keywords = simple_name
                            except:
                                pass
            except Exception as e:
                pass

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
            # 키워드 기반 검색 (title만 검색 - 더 정확한 매칭)
            query = """
                SELECT
                    id, title, company, location, url, description,
                    site_name, crawled_at
                FROM job_listings
                WHERE
                    title ILIKE %s
                    AND crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """
            keyword_pattern = f"%{keywords}%"
            params = (keyword_pattern, limit)

        job_postings = db.execute_query(query, params)

        if not job_postings or len(job_postings) == 0:
            return {
                "success": False,
                "message": f"'{keywords or '최신'}' 관련 채용 공고를 찾을 수 없습니다."
            }

        return {
            "success": True,
            "data": {
                "keywords": keywords,
                "job_postings": job_postings
            }
        }

    except Exception as e:
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
        return data.get("message", "관련 채용 공고를 찾을 수 없습니다.")

    result = data.get("data", {})
    keywords = result.get("keywords", "최신 공고")
    job_postings = result.get("job_postings", [])

    response = f"## 💼 채용 공고 추천 (키워드: {keywords})\n\n"

    if not job_postings or len(job_postings) == 0:
        return f"'{keywords}' 관련 채용 공고를 찾을 수 없습니다."

    for idx, job in enumerate(job_postings, 1):
        title = job.get("title", "제목 없음")
        company = job.get("company") or ""
        location = job.get("location") or ""
        url = job.get("url", "")
        site_name = job.get("site_name", "")
        description = job.get("description", "")

        response += f"### {idx}. {title}\n"

        # 회사/위치가 있으면 표시
        if company:
            response += f"- **회사**: {company}\n"
        if location:
            response += f"- **위치**: {location}\n"

        if site_name:
            response += f"- **출처**: {site_name}\n"

        # 링크를 마크다운 형식으로 (클릭 가능하게)
        if url:
            response += f"- [🔗 이동하기]({url})\n"

        # 설명 ([주요업무] 내용만 표시, 없으면 표시 안함)
        if description:
            import re
            # [주요업무] 다음 내용만 추출 (다음 [ 전까지)
            match = re.search(r'\[주요업무\]\s*([^\[]+)', description)
            if match:
                main_duties_content = match.group(1).strip()
                if main_duties_content:
                    response += f"- **[주요업무]** {main_duties_content}\n"

        response += "\n"

    response += f"*총 {len(job_postings)}개의 채용 공고가 있습니다. 최근 7일 이내의 공고만 표시됩니다.*"

    return response