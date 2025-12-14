"""
성격 검사 Tool - BigFive 및 MBTI 결과 조회
profile_analysis 테이블에서 성격 분석 결과를 가져옵니다.
"""
from typing import Dict, Any, Optional
from services.database_service import DatabaseService
import json


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_personality_test_results",
        "description": "사용자의 성격 분석 결과를 조회합니다. Big Five 성격 특성, MBTI 유형, 가치관, 감정 분석 결과를 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "analysis_type": {
                    "type": "string",
                    "enum": ["personality", "mbti", "values", "emotions", "all"],
                    "description": "분석 유형 - personality(성격 특성), mbti(MBTI), values(가치관), emotions(감정), all(전체)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(
    user_id: int,
    analysis_type: str = "all",
    db: DatabaseService = None,
    **kwargs
) -> Dict[str, Any]:
    """
    성격 분석 결과 조회 실행

    Args:
        user_id: 사용자 ID
        analysis_type: 분석 유형 (personality, mbti, values, emotions, all)
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        성격 분석 결과
    """
    try:
        if db is None:
            db = DatabaseService()

        # profile_analysis 테이블에서 사용자의 분석 결과 조회
        # JPA camelCase → PostgreSQL snake_case 매핑
        query = """
            SELECT
                analysis_id AS analysis_id,
                user_id AS user_id,
                personality,
                values,
                emotions,
                interests,
                confidence_score AS confidence_score,
                mbti,
                created_at AS created_at
            FROM profile_analysis
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """

        results = db.execute_query(query, (user_id,))

        if not results or len(results) == 0:
            return {
                "success": False,
                "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 성격 분석 결과를 조회할 수 있어요."
            }

        analysis = results[0]
        data = {}

        # JSON 필드 파싱
        def safe_parse_json(value):
            if value is None:
                return None
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except:
                    return value
            return value

        # 요청된 분석 유형에 따라 데이터 필터링
        if analysis_type in ["personality", "all"]:
            personality = safe_parse_json(analysis.get("personality"))
            if personality:
                data["personality"] = personality

        if analysis_type in ["mbti", "all"]:
            mbti = analysis.get("mbti")
            if mbti:
                data["mbti"] = mbti

        if analysis_type in ["values", "all"]:
            values = safe_parse_json(analysis.get("values"))
            if values:
                data["values"] = values

        if analysis_type in ["emotions", "all"]:
            emotions = safe_parse_json(analysis.get("emotions"))
            if emotions:
                data["emotions"] = emotions

        # 추가 정보
        data["confidence_score"] = analysis.get("confidence_score")
        data["analyzed_at"] = str(analysis.get("created_at")) if analysis.get("created_at") else None

        if not any([data.get("personality"), data.get("mbti"), data.get("values"), data.get("emotions")]):
            return {
                "success": False,
                "message": "성격 분석 결과를 조회할 수 없습니다. 진로 분석을 다시 진행해주세요."
            }

        return {
            "success": True,
            "data": data
        }

    except Exception as e:
        print(f"성격 분석 결과 조회 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"성격 분석 결과 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    성격 분석 결과를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "성격 분석 결과를 찾을 수 없습니다.")

    results = data.get("data", {})
    response = "## 🧠 성격 분석 결과\n\n"

    # 성격 유형 (personality.type 또는 mbti 필드)
    personality = results.get("personality")
    personality_type = None
    if personality and isinstance(personality, dict):
        personality_type = personality.get("type")
    if not personality_type:
        personality_type = results.get("mbti")

    if personality_type:
        response += f"### 🎭 성격 유형: **{personality_type}**\n\n"

    # Big Five 성격 특성
    personality = results.get("personality")
    print(f"[DEBUG format_result] personality: {personality}")
    if personality and isinstance(personality, dict):
        response += "### 📊 Big Five 성격 특성\n\n"

        # bigFive 또는 traits 키가 있는 경우 (백엔드에서 bigFive로 저장)
        traits = personality.get("bigFive") or personality.get("traits") or personality
        print(f"[DEBUG format_result] traits: {traits}")
        if isinstance(traits, dict):
            trait_labels = {
                "openness": "개방성",
                "conscientiousness": "성실성",
                "extraversion": "외향성",
                "agreeableness": "친화성",
                "stability": "정서 안정성",
                "neuroticism": "신경성"
            }

            has_traits = False
            for key, label in trait_labels.items():
                if key in traits:
                    trait_value = traits[key]
                    # score가 객체 안에 있는 경우 (예: {'score': 85, 'reason': '...'})
                    if isinstance(trait_value, dict):
                        score = trait_value.get('score')
                        reason = trait_value.get('reason', '')
                    else:
                        score = trait_value
                        reason = ''

                    if isinstance(score, (int, float)):
                        percent = int(score * 100) if score <= 1 else int(score)
                        response += f"- **{label}**: {percent}%\n"
                        if reason:
                            response += f"  - {reason}\n"
                        has_traits = True

            if has_traits:
                response += "\n"

        # 설명이 있는 경우
        description = personality.get("description")
        if description:
            response += f"**설명**: {description}\n\n"

        # 강점
        strengths = personality.get("strengths", [])
        if strengths and isinstance(strengths, list):
            response += "**강점**: " + ", ".join(strengths[:5]) + "\n\n"

        # 성장 포인트
        growth_areas = personality.get("growthAreas", [])
        if growth_areas and isinstance(growth_areas, list):
            response += "**성장 포인트**: " + ", ".join(growth_areas[:5]) + "\n\n"

    # 감정 분석
    emotions = results.get("emotions")
    if emotions and isinstance(emotions, dict):
        response += "### 😊 감정 분석\n\n"

        for emotion, score in emotions.items():
            if isinstance(score, (int, float)):
                percent = int(score * 100) if score <= 1 else int(score)
                response += f"- **{emotion}** (긍정적 감정 지수): {percent}%\n"

        response += "\n"

    # 신뢰도 점수
    confidence = results.get("confidence_score")
    if confidence:
        response += f"*분석 신뢰도: {confidence:.1%}*\n\n"

    # 분석 일시 (초 단위 제거: YYYY-MM-DD HH:MM 형식으로 출력)
    analyzed_at = results.get("analyzed_at")
    if analyzed_at:
        # "2025-12-09 15:48:45.047117" -> "2025-12-09 15:48"
        formatted_date = analyzed_at[:16] if len(analyzed_at) >= 16 else analyzed_at
        response += f"*분석 일시: {formatted_date}*\n"

    return response