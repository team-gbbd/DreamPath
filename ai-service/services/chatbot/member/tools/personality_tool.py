"""
성격 검사 Tool - BigFive 및 MBTI 결과 조회
"""
from typing import Dict, Any, Optional
from services.database_service import DatabaseService
import json


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_personality_test_results",
        "description": "사용자의 성격 검사 결과를 조회합니다. Big Five 성격 검사 및 MBTI 결과를 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "test_type": {
                    "type": "string",
                    "enum": ["bigfive", "mbti", "all"],
                    "description": "검사 유형 - bigfive(Big Five), mbti(MBTI), all(전체)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(
    user_id: int,
    test_type: str = "all",
    db: DatabaseService = None,
    **kwargs
) -> Dict[str, Any]:
    """
    성격 검사 결과 조회 실행

    Args:
        user_id: 사용자 ID
        test_type: 검사 유형 (bigfive, mbti, all)
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        성격 검사 결과
    """
    try:
        # 사용자 요청에 따라 테이블이 생성되지 않았으므로 안내 메시지 반환
        return {
            "success": False,
            "message": "현재 성격 검사 결과 조회 서비스는 준비 중입니다. (데이터베이스 테이블 미생성)"
        }

    except Exception as e:
        print(f"성격 검사 결과 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"성격 검사 결과 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    성격 검사 결과를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "성격 검사 결과를 찾을 수 없습니다.")

    results = data.get("data", {})
    response = "## 🧠 성격 검사 결과\n\n"

    # Big Five 결과
    bigfive = results.get("bigfive")
    if bigfive:
        response += "### 📊 Big Five 성격 검사\n\n"

        traits = [
            ("개방성 (Openness)", bigfive.get("openness"), bigfive.get("openness_reason")),
            ("성실성 (Conscientiousness)", bigfive.get("conscientiousness"), bigfive.get("conscientiousness_reason")),
            ("외향성 (Extraversion)", bigfive.get("extraversion"), bigfive.get("extraversion_reason")),
            ("친화성 (Agreeableness)", bigfive.get("agreeableness"), bigfive.get("agreeableness_reason")),
            ("신경성 (Neuroticism)", bigfive.get("neuroticism"), bigfive.get("neuroticism_reason"))
        ]

        for trait_name, score, reason in traits:
            if score is not None:
                response += f"**{trait_name}**: {score}/100\n"
                if reason:
                    response += f"- {reason}\n\n"
                else:
                    response += "\n"

        response += f"*검사 일시: {bigfive.get('created_at', 'N/A')}*\n\n"

    # MBTI 결과
    mbti = results.get("mbti")
    if mbti:
        response += "### 🎭 MBTI 검사\n\n"
        response += f"**유형**: {mbti.get('mbti', 'N/A')}\n\n"

        reason = mbti.get("reason")
        if reason:
            response += f"**설명**: {reason}\n\n"

        response += f"*검사 일시: {mbti.get('created_at', 'N/A')}*\n\n"

    if not bigfive and not mbti:
        return "성격 검사 결과가 없습니다."

    response += "*성격 검사는 자기 이해와 진로 탐색에 도움이 됩니다.*"

    return response
