"""
학습 진행 Tool - 학습 진행 현황 조회
"""
from typing import Dict, Any, List
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_learning_progress",
        "description": "사용자의 학습 진행 현황을 조회합니다. 완료한 문제, 점수, 진도율 등을 확인할 수 있습니다.",
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
    학습 진행 현황 조회 실행

    Args:
        user_id: 사용자 ID
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        학습 진행 현황
    """
    # 현재 학습 진행 테이블이 구현되지 않았으므로 안내 메시지 반환
    return {
        "success": False,
        "message": "학습 진행 현황 기능은 현재 준비 중입니다. 곧 이용하실 수 있습니다!"
    }


def format_result(data: Dict[str, Any]) -> str:
    """
    학습 진행 현황을 사용자 친화적인 마크다운으로 포맷팅

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "학습 기록을 찾을 수 없습니다.")

    results = data.get("data", {})
    response = "## 📚 학습 진행 현황\n\n"

    # 전체 진도
    overall = results.get("overall_progress")
    if overall:
        total = overall.get("total_questions", 0)
        completed = overall.get("completed_questions", 0)
        avg_score = overall.get("average_score", 0)
        study_time = overall.get("total_study_time_minutes", 0)

        progress_rate = (completed / total * 100) if total > 0 else 0

        response += "### 📊 전체 진도\n"
        response += f"- **완료 문제**: {completed}/{total} 문제 ({progress_rate:.1f}%)\n"
        response += f"- **평균 점수**: {avg_score:.1f}점\n"
        response += f"- **총 학습 시간**: {study_time}분\n"

        last_activity = overall.get("last_activity_at")
        if last_activity:
            response += f"- **마지막 활동**: {last_activity}\n"

        response += "\n"

    # 카테고리별 통계
    category_stats = results.get("category_stats")
    if category_stats and len(category_stats) > 0:
        response += "### 📂 카테고리별 학습 현황\n"
        for stat in category_stats:
            category = stat.get("category", "기타")
            total_attempts = stat.get("total_attempts", 0)
            correct_count = stat.get("correct_count", 0)
            avg_score = stat.get("avg_score", 0)

            accuracy = (correct_count / total_attempts * 100) if total_attempts > 0 else 0

            response += f"- **{category}**: {total_attempts}문제 시도, 정답률 {accuracy:.1f}%, 평균 {avg_score:.1f}점\n"

        response += "\n"

    # 최근 시도한 문제
    recent_attempts = results.get("recent_attempts")
    if recent_attempts and len(recent_attempts) > 0:
        response += "### 🕐 최근 학습 기록 (최근 10개)\n"
        for idx, attempt in enumerate(recent_attempts[:5], 1):
            question_title = attempt.get("question_title", "제목 없음")
            is_correct = attempt.get("is_correct")
            score = attempt.get("score", 0)
            attempted_at = attempt.get("attempted_at", "N/A")

            status = "✅" if is_correct else "❌"

            response += f"{idx}. {status} **{question_title}** - {score}점 ({attempted_at})\n"

        response += "\n"

    if not overall and not recent_attempts:
        return "학습 기록이 없습니다."

    response += "*계속 학습하여 실력을 향상시켜보세요! 화이팅!*"

    return response