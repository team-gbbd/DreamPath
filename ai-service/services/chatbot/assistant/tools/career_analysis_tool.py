"""
진로 분석 Tool - 사용자의 진로 분석 결과 조회
"""
from typing import Dict, Any, Optional
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_career_analysis",
        "description": "사용자의 진로 분석 결과를 조회합니다. 감정, 성향, 흥미, 추천 직업 등의 정보를 확인할 수 있습니다.",
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


def execute(user_id: int, db: DatabaseService = None, **kwargs) -> Dict[str, Any]:
    """
    진로 분석 결과 조회 실행

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        진로 분석 결과
    """
    try:
        if db is None:
            db = DatabaseService()

        # SQL 쿼리 - career_analyses 테이블과 career_sessions 테이블을 조인하여 최신 분석 결과 조회
        # JPA 컬럼명: camelCase -> DB 컬럼명: snake_case
        query = """
            SELECT
                ca.id,
                ca.analyzed_at,
                ca.comprehensive_analysis,
                ca.emotion_analysis,
                ca.emotion_score,
                ca.interest_analysis,
                ca.interest_areas,
                ca.personality_analysis,
                ca.personality_type,
                ca.recommended_careers
            FROM career_analyses ca
            JOIN career_sessions cs ON ca.session_id = cs.id
            WHERE cs.user_id = %s
            ORDER BY ca.analyzed_at DESC
            LIMIT 1
        """

        # user_id는 String 타입
        results = db.execute_query(query, (str(user_id),))

        if not results or len(results) == 0:
            return {
                "success": False,
                "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 결과를 조회할 수 있어요."
            }

        analysis = results[0]

        # JSON 필드 파싱 (PostgreSQL JSONB 또는 TEXT 형식)
        import json

        try:
            if isinstance(analysis.get('interest_areas'), str):
                analysis['interest_areas'] = json.loads(analysis['interest_areas'])
        except:
            pass

        try:
            if isinstance(analysis.get('recommended_careers'), str):
                analysis['recommended_careers'] = json.loads(analysis['recommended_careers'])
        except:
            pass

        return {
            "success": True,
            "data": analysis
        }

    except Exception as e:
        print(f"진로 분석 조회 오류: {str(e)}")
        # user_id 컬럼이 없을 경우를 대비한 안내
        if "Unknown column 'user_id'" in str(e):
             return {
                "success": False,
                "message": "시스템 오류: 진로 분석 테이블에 사용자 정보가 연결되지 않았습니다."
            }
        return {
            "success": False,
            "message": f"진로 분석 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    진로 분석 결과를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "진로 분석 결과를 찾을 수 없습니다.")

    analysis = data.get("data", {})

    response = "## 🎯 진로 분석 결과\n\n"

    # 감정 분석
    response += "### 😊 감정 분석\n"
    response += f"- **점수 (긍정적 감정 지수)**: {analysis.get('emotion_score', 0)}/100\n"
    response += f"- **설명**: {analysis.get('emotion_analysis', 'N/A')}\n\n"

    # 성향 분석
    response += "### 🧠 성향 분석\n"
    response += f"- **유형**: {analysis.get('personality_type', 'N/A')}\n"
    response += f"- **설명**: {analysis.get('personality_analysis', 'N/A')}\n\n"

    # 흥미 분석
    response += "### 🌟 흥미 분야\n"
    response += f"- **설명**: {analysis.get('interest_analysis', 'N/A')}\n"

    interest_areas = analysis.get('interest_areas', [])
    if interest_areas and isinstance(interest_areas, list):
        response += "- **관심 분야**:\n"
        for area in interest_areas[:5]:
            if isinstance(area, dict):
                name = area.get('name', 'N/A')
                level = area.get('level', 0)
                response += f"  - {name} (관심도: {level}/10)\n"
            elif isinstance(area, str):
                response += f"  - {area}\n"
        response += "\n"

    # 추천 직업
    recommended_careers = analysis.get('recommended_careers', [])
    if recommended_careers and isinstance(recommended_careers, list):
        response += "### 💼 추천 직업\n"
        for idx, career in enumerate(recommended_careers[:3], 1):
            if isinstance(career, dict):
                career_name = career.get('careerName', 'N/A')
                match_score = career.get('matchScore', 0)
                description = career.get('description', '')
                reasons = career.get('reasons', [])

                response += f"{idx}. **{career_name}** (적합도: {match_score}/100)\n"
                if description:
                    response += f"   - {description}\n"
                if reasons and isinstance(reasons, list):
                    response += f"   - 이유: {', '.join(reasons[:2])}\n"
            elif isinstance(career, str):
                 response += f"{idx}. **{career}**\n"
        response += "\n"

    # 종합 분석
    comprehensive = analysis.get('comprehensive_analysis')
    if comprehensive:
        response += "### 📋 종합 분석\n"
        response += f"{comprehensive}\n\n"

    # 분석 일시 (초 단위 제거: YYYY-MM-DD HH:MM:SS 형식으로 출력)
    analyzed_at = str(analysis.get('analyzed_at', 'N/A'))
    if analyzed_at and analyzed_at != 'N/A':
        # "2025-12-09 15:48:44.890868" -> "2025-12-09 15:48:44"
        formatted_date = analyzed_at[:19] if len(analyzed_at) >= 19 else analyzed_at
        response += f"*분석 일시: {formatted_date}*"
    else:
        response += f"*분석 일시: N/A*"

    return response