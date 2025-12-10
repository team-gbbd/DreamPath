"""
결제 내역 Tool - 사용자의 결제 내역 조회
"""
from typing import Dict, Any, List
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_payment_history",
        "description": "사용자의 결제 내역을 조회합니다. 결제 금액, 구매한 패키지, 결제 상태 등을 확인할 수 있습니다.",
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
    결제 내역 조회 실행

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        결제 내역
    """
    try:
        if db is None:
            db = DatabaseService()

        # 결제 내역 조회
        query = """
            SELECT
                payment_id,
                amount,
                session_package,
                sessions_purchased,
                payment_method,
                order_name,
                status,
                paid_at,
                created_at
            FROM payments
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """
        payments = db.execute_query(query, (user_id,))

        if not payments or len(payments) == 0:
            return {
                "success": False,
                "message": "결제 내역이 없습니다."
            }

        return {
            "success": True,
            "data": payments
        }

    except Exception as e:
        print(f"결제 내역 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"결제 내역 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    결제 내역을 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "결제 내역을 찾을 수 없습니다.")

    payments = data.get("data", [])

    response = "## 💳 결제 내역\n\n"

    total_amount = 0
    total_sessions = 0

    for idx, payment in enumerate(payments, 1):
        amount = payment.get('amount', 0)
        session_package = payment.get('session_package', 'N/A')
        sessions_purchased = payment.get('sessions_purchased', 0)
        payment_method = payment.get('payment_method', 'N/A')
        order_name = payment.get('order_name', 'N/A')
        status = payment.get('status', 'N/A')
        paid_at = payment.get('paid_at')

        # 상태 배지
        if status == 'paid':
            status_badge = "✅ 결제 완료"
            total_amount += amount
            total_sessions += sessions_purchased
        elif status == 'cancelled':
            status_badge = "❌ 취소됨"
        elif status == 'failed':
            status_badge = "⚠️ 실패"
        else:
            status_badge = f"⏳ {status}"

        # 결제 수단 한글화
        method_kr = {
            'card': '카드',
            'trans': '계좌이체',
            'vbank': '가상계좌',
            'phone': '휴대폰'
        }.get(payment_method, payment_method)

        response += f"### {idx}. {order_name or session_package}\n"
        response += f"- **상태**: {status_badge}\n"
        response += f"- **금액**: {amount:,}원\n"
        response += f"- **구매 횟수**: {sessions_purchased}회\n"
        response += f"- **결제 수단**: {method_kr}\n"

        # 결제 일시
        if paid_at:
            paid_at_str = str(paid_at)[:19]
            response += f"- **결제 일시**: {paid_at_str}\n"

        response += "\n"

    # 총계
    response += "---\n"
    response += f"**총 결제 금액**: {total_amount:,}원\n"
    response += f"**총 구매 횟수**: {total_sessions}회\n\n"
    response += f"*최근 {len(payments)}건의 결제 내역입니다.*"

    return response