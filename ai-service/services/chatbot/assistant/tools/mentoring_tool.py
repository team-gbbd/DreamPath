"""
멘토링 Tool - 멘토링 예약 조회 기능
"""
from typing import Dict, Any, List, Optional
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_mentoring_bookings",
        "description": "사용자의 멘토링 예약 목록을 조회합니다. 예약 날짜, 시간, 멘토 정보, 상태 등을 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "status": {
                    "type": "string",
                    "enum": ["PENDING", "CONFIRMED", "CANCELLED", "REJECTED", "COMPLETED"],
                    "description": "필터링할 예약 상태 (선택사항)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(user_id: int, status: Optional[str] = None, db: DatabaseService = None, **kwargs) -> List[Dict[str, Any]]:
    """
    멘토링 예약 조회 실행

    Args:
        user_id: 사용자 ID
        status: 예약 상태 필터 (선택)
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        예약 목록
    """
    try:
        if db is None:
            db = DatabaseService()

        # SQL 쿼리
        query = """
            SELECT
                mb.booking_id,
                mb.booking_date,
                mb.time_slot,
                mb.message as mentee_message,
                mb.status,
                mb.rejection_reason,
                mb.meeting_url,
                mb.created_at,
                ms.title as session_title,
                ms.description as session_description,
                ms.duration_minutes,
                ms.price,
                m.company as mentor_company,
                m.job as mentor_job,
                u.name as mentor_name
            FROM mentoring_bookings mb
            JOIN mentoring_sessions ms ON mb.session_id = ms.session_id
            JOIN mentors m ON ms.mentor_id = m.mentor_id
            JOIN users u ON m.user_id = u.user_id
            WHERE mb.mentee_id = %s
        """

        params = [user_id]

        # 상태 필터 추가
        if status:
            query += " AND mb.status = %s"
            params.append(status)

        query += " ORDER BY mb.booking_date DESC, mb.time_slot DESC"

        bookings = db.execute_query(query, tuple(params))

        # time_slot 포맷팅 (HH:MM 형식으로 변환)
        for booking in bookings:
            time_slot = booking.get('time_slot')
            if time_slot:
                time_slot_str = str(time_slot)
                if ':' in time_slot_str:
                    try:
                        # "03:50:44.732680" → "3:50"
                        time_str = time_slot_str.split('.')[0]
                        time_parts = time_str.split(':')
                        hour = int(time_parts[0])
                        minute = int(time_parts[1])
                        booking['time_slot'] = f"{hour}:{minute:02d}"
                    except:
                        pass

        return bookings if bookings else []

    except Exception as e:
        print(f"멘토링 예약 조회 오류: {str(e)}")
        return []


def format_result(data):
    """
    멘토링 예약 결과를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값 (리스트 또는 빈 리스트)

    Returns:
        포맷된 마크다운 문자열
    """
    if not data or len(data) == 0:
        return "현재 예약된 멘토링이 없습니다."

    response = "## 📅 멘토링 예약 내역\n\n"
    for idx, booking in enumerate(data, 1):
        response += f"### {idx}. {booking.get('session_title', '세션 정보 없음')}\n"
        response += f"- **날짜**: {booking.get('booking_date', 'N/A')}\n"
        response += f"- **시간**: {booking.get('time_slot', 'N/A')}\n"
        response += f"- **멘토**: {booking.get('mentor_name', 'N/A')} ({booking.get('mentor_company', 'N/A')})\n"
        response += f"- **상태**: {booking.get('status', 'N/A')}\n"
        if booking.get('meeting_url'):
            response += f"- **미팅 URL**: {booking.get('meeting_url')}\n"
        response += "\n"

    return response