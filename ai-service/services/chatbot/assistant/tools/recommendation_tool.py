"""
추천 시스템 Tool - 직업/학과 추천 (간단 요약)
"""
import json
from typing import Dict, Any, List, Optional
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_recommendations",
        "description": "사용자에게 맞는 직업, 학과를 간단히 추천합니다. 진로 분석 결과를 기반으로 추천 직업과 학과를 요약해서 제공합니다.",
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
    db: DatabaseService = None,
    **kwargs
) -> Dict[str, Any]:
    """
    추천 시스템 실행 - DB에 저장된 진로 분석 결과 기반

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        추천 결과 (직업 + 학과 간단 요약)
    """
    try:
        if db is None:
            db = DatabaseService()

        # 진로 분석 결과에서 추천 직업 조회
        query = """
            SELECT
                ca.recommended_careers,
                ca.interest_areas,
                ca.personality_type
            FROM career_analyses ca
            JOIN career_sessions cs ON ca.session_id = cs.id
            WHERE cs.user_id = %s
            ORDER BY ca.analyzed_at DESC
            LIMIT 1
        """
        results = db.execute_query(query, (str(user_id),))

        if not results or len(results) == 0:
            return {
                "success": False,
                "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 먼저 진행해주세요."
            }

        analysis = results[0]

        # JSON 필드 파싱
        recommended_careers = analysis.get('recommended_careers', [])
        if isinstance(recommended_careers, str):
            try:
                recommended_careers = json.loads(recommended_careers)
            except:
                recommended_careers = []

        interest_areas = analysis.get('interest_areas', [])
        if isinstance(interest_areas, str):
            try:
                interest_areas = json.loads(interest_areas)
            except:
                interest_areas = []

        return {
            "success": True,
            "data": {
                "recommended_careers": recommended_careers,
                "interest_areas": interest_areas,
                "personality_type": analysis.get('personality_type', '')
            }
        }

    except Exception as e:
        print(f"추천 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"추천 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    추천 결과를 사용자 친화적인 마크다운으로 포맷팅 (간단 요약)

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "추천 결과를 찾을 수 없습니다.")

    result = data.get("data", {})
    response = "## 🎯 맞춤형 추천 결과\n\n"

    # 성향 타입
    personality_type = result.get('personality_type')
    if personality_type:
        response += f"**나의 성향**: {personality_type}\n\n"

    # 추천 직업 (간단히)
    recommended_careers = result.get('recommended_careers', [])
    if recommended_careers and isinstance(recommended_careers, list):
        response += "### 💼 추천 직업\n"
        for idx, career in enumerate(recommended_careers[:5], 1):
            if isinstance(career, dict):
                career_name = career.get('careerName', 'N/A')
                match_score = career.get('matchScore', 0)
                response += f"{idx}. **{career_name}** (적합도: {match_score}%)\n"
            elif isinstance(career, str):
                response += f"{idx}. **{career}**\n"
        response += "\n"

    # 관심 분야
    interest_areas = result.get('interest_areas', [])
    if interest_areas and isinstance(interest_areas, list):
        response += "### 🌟 관심 분야\n"
        for area in interest_areas[:5]:
            if isinstance(area, dict):
                name = area.get('name', 'N/A')
                level = area.get('level', 0)
                response += f"- {name} (관심도: {level}/10)\n"
            elif isinstance(area, str):
                response += f"- {area}\n"
        response += "\n"

    if not recommended_careers and not interest_areas:
        return "추천 결과가 없습니다. 진로 분석을 먼저 완료해주세요."

    response += "*상세 분석은 '내 진로 분석 결과'에서 확인하세요.*"

    return response