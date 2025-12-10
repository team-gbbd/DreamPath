"""
프로필 Tool - 사용자 프로필 정보 조회
"""
from typing import Dict, Any
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_my_profile",
        "description": "사용자의 프로필 정보를 조회합니다. 이름, 이메일, 연락처, 잔여 멘토링 횟수 등을 확인할 수 있습니다.",
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
    프로필 정보 조회 실행

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        프로필 정보
    """
    try:
        if db is None:
            db = DatabaseService()

        # 사용자 기본 정보 조회
        user_query = """
            SELECT
                user_id,
                username,
                name,
                email,
                phone,
                birth,
                role,
                remaining_sessions,
                created_at
            FROM users
            WHERE user_id = %s AND is_active = TRUE
        """
        user_result = db.execute_query(user_query, (user_id,))

        if not user_result or len(user_result) == 0:
            return {
                "success": False,
                "message": "프로필 정보를 찾을 수 없습니다."
            }

        user = user_result[0]

        # 프로필 상세 정보 조회 (user_profiles 테이블)
        profile_query = """
            SELECT
                personality,
                values,
                interests,
                updated_at
            FROM user_profiles
            WHERE user_id = %s
            ORDER BY updated_at DESC
            LIMIT 1
        """
        profile_result = db.execute_query(profile_query, (user_id,))
        profile = profile_result[0] if profile_result else None

        return {
            "success": True,
            "data": {
                "user": user,
                "profile": profile
            }
        }

    except Exception as e:
        print(f"프로필 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"프로필 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    프로필 정보를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "프로필 정보를 찾을 수 없습니다.")

    result = data.get("data", {})
    user = result.get("user", {})
    profile = result.get("profile")

    response = "## 👤 내 프로필\n\n"

    # 기본 정보
    response += "### 📋 기본 정보\n"
    response += f"- **이름**: {user.get('name', 'N/A')}\n"
    response += f"- **아이디**: {user.get('username', 'N/A')}\n"

    email = user.get('email')
    if email:
        response += f"- **이메일**: {email}\n"

    phone = user.get('phone')
    if phone:
        response += f"- **연락처**: {phone}\n"

    birth = user.get('birth')
    if birth:
        response += f"- **생년월일**: {birth}\n"

    # 멘토링 정보
    remaining_sessions = user.get('remaining_sessions', 0)
    response += f"\n### 🎓 멘토링 정보\n"
    response += f"- **잔여 멘토링 횟수**: {remaining_sessions}회\n"

    # 가입일
    created_at = str(user.get('created_at', 'N/A'))
    if created_at and created_at != 'N/A':
        created_at = created_at[:10]  # 날짜만 표시
    response += f"\n*가입일: {created_at}*"

    return response