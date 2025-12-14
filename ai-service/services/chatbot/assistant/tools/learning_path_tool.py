"""
학습 경로 및 진행 현황 Tool - 사용자의 학습 경로/로드맵 및 진행 현황 조회
"""
from typing import Dict, Any, List
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_learning_path",
        "description": "사용자의 학습 진행 현황을 조회합니다. 학습 도메인, 진행률, 정답률, 주차별 학습 현황 등을 확인할 수 있습니다.",
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
    학습 경로 조회 실행

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        학습 경로 정보
    """
    try:
        if db is None:
            db = DatabaseService()

        # 학습 경로 조회 (주차별 세션 정보 포함)
        query = """
            SELECT
                lp.path_id,
                lp.domain,
                lp.status,
                lp.total_questions,
                lp.correct_count,
                lp.correct_rate,
                lp.created_at,
                lp.updated_at,
                (SELECT MAX(ws.week_number) FROM weekly_sessions ws
                 WHERE ws.path_id = lp.path_id AND ws.status != 'LOCKED') as current_week,
                (SELECT COUNT(*) FROM weekly_sessions ws WHERE ws.path_id = lp.path_id) as total_weeks
            FROM learning_paths lp
            WHERE lp.user_id = %s
            ORDER BY lp.updated_at DESC
        """
        learning_paths = db.execute_query(query, (user_id,))

        if not learning_paths or len(learning_paths) == 0:
            return {
                "success": False,
                "message": "진행중인 학습이 없습니다. 먼저 학습을 진행해주세요!"
            }

        return {
            "success": True,
            "data": learning_paths
        }

    except Exception as e:
        print(f"학습 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"학습 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    학습 경로를 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "학습을 찾을 수 없습니다.")

    learning_paths = data.get("data", [])

    response = "## 📚 내 학습 현황\n\n"

    for idx, path in enumerate(learning_paths, 1):
        domain = path.get('domain', 'N/A')
        status = path.get('status', 'N/A')
        total_questions = path.get('total_questions', 0)
        correct_count = path.get('correct_count', 0)
        correct_rate = path.get('correct_rate', 0)

        # 상태 배지
        status_badge = "🟢 진행 중" if status == "ACTIVE" else "⏸️ 일시정지" if status == "PAUSED" else "✅ 완료"

        response += f"### {idx}. {domain}\n"
        response += f"- **상태**: {status_badge}\n"

        # 주차 정보
        current_week = path.get('current_week')
        total_weeks = path.get('total_weeks', 0)
        if current_week and total_weeks:
            response += f"- **진행 주차**: {current_week}주차 / 총 {total_weeks}주차\n"
        elif total_weeks:
            response += f"- **진행 주차**: 시작 전 / 총 {total_weeks}주차\n"

        response += f"- **총 문제 수**: {total_questions}문제\n"
        response += f"- **맞은 문제**: {correct_count}문제\n"

        # 정답률 표시
        if correct_rate:
            rate_percent = float(correct_rate) * 100
            response += f"- **정답률**: {rate_percent:.1f}%\n"
        elif total_questions > 0:
            rate_percent = (correct_count / total_questions) * 100
            response += f"- **정답률**: {rate_percent:.1f}%\n"

        # 최근 학습일
        updated_at = str(path.get('updated_at', 'N/A'))
        if updated_at and updated_at != 'N/A':
            updated_at = updated_at[:10]
            response += f"- **최근 학습일**: {updated_at}\n"

        response += "\n"

    response += f"*총 {len(learning_paths)}개의 학습이 있습니다.*"

    return response