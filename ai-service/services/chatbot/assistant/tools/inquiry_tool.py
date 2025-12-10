"""
문의 Tool - 사용자 문의 내역 조회
"""
from typing import Dict, Any, List
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_my_inquiries",
        "description": "사용자가 제출한 문의 내역을 조회합니다. 문의 내용, 답변 상태, 답변 내용 등을 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "status": {
                    "type": "string",
                    "enum": ["all", "answered", "pending"],
                    "description": "필터링할 답변 상태 (all: 전체, answered: 답변 완료, pending: 대기 중)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(
    user_id: int,
    status: str = "all",
    db: DatabaseService = None,
    **kwargs
) -> List[Dict[str, Any]]:
    """
    문의 내역 조회 실행

    Args:
        user_id: 사용자 ID
        status: 답변 상태 필터 (all, answered, pending)
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        문의 목록
    """
    try:
        if db is None:
            db = DatabaseService()

        # SQL 쿼리
        query = """
            SELECT
                id,
                user_id,
                name,
                email,
                content,
                answered,
                answered_at,
                reply_content,
                created_at
            FROM inquiry
            WHERE user_id = %s
        """

        params = [user_id]

        # 상태 필터 추가
        if status == "answered":
            query += " AND answered = TRUE"
        elif status == "pending":
            query += " AND answered = FALSE"

        query += " ORDER BY created_at DESC"

        inquiries = db.execute_query(query, tuple(params))

        return inquiries if inquiries else []

    except Exception as e:
        print(f"문의 내역 조회 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


def format_result(data: List[Dict[str, Any]]) -> str:
    """
    문의 내역을 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값 (리스트)

    Returns:
        포맷된 마크다운 문자열
    """
    if not data or len(data) == 0:
        return "제출한 문의 내역이 없습니다."

    response = "## 📮 문의 내역\n\n"

    for idx, inquiry in enumerate(data, 1):
        answered = inquiry.get("answered")
        status_badge = "✅ 답변 완료" if answered else "⏳ 답변 대기"

        response += f"### {idx}. {status_badge}\n"
        # 문의 일시 (초 단위까지만 표시)
        created_at = str(inquiry.get('created_at', 'N/A'))
        if created_at and created_at != 'N/A':
            created_at = created_at[:19] if len(created_at) >= 19 else created_at
        response += f"- **문의 일시**: {created_at}\n"

        # 문의 내용 (100자 제한)
        content = inquiry.get("content", "")
        if len(content) > 100:
            content = content[:100] + "..."
        response += f"- **문의 내용**: {content}\n"

        # 답변 완료인 경우 답변 내용과 일시 표시
        if answered:
            answered_at = inquiry.get("answered_at")
            reply_content = inquiry.get("reply_content", "")

            if answered_at:
                # 답변 일시 (초 단위까지만 표시)
                answered_at = str(answered_at)
                if len(answered_at) >= 19:
                    answered_at = answered_at[:19]
                response += f"- **답변 일시**: {answered_at}\n"

            if reply_content:
                if len(reply_content) > 200:
                    reply_content = reply_content[:200] + "..."
                response += f"- **답변 내용**: {reply_content}\n"

        response += "\n"

    response += f"*총 {len(data)}개의 문의가 있습니다.*"

    return response