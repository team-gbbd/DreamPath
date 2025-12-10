"""
DreamPath 에이전트 라우터
메시지를 분석하여 ReAct 에이전트 사용 여부 결정
"""
import logging
import re

logger = logging.getLogger(__name__)


# ============================================================
# 에이전트 사용 조건 판단
# ============================================================

# 최소 필터만 적용, 도구 선택은 LLM(reason_node)이 판단
def should_use_agent(message: str) -> bool:
    """
    에이전트 실행 여부 판단 (최소 필터)

    원칙:
    - "에이전트가 판단할 가치가 있는 메시지인가?"만 체크
    - 도구 선택/FINISH 결정은 100% LLM(reason_node)이 담당
    - ReAct 패턴 보존: 사람이 도구 매핑 로직을 강제하지 않음

    Args:
        message: 사용자 메시지

    Returns:
        True: 에이전트가 판단 (도구 사용 or FINISH)
        False: 에이전트 스킵 (상담 LLM만 응답)
    """
    text = message.strip()

    # 1. 빈 메시지
    if not text:
        return False

    # 2. 너무 짧은 메시지 (에이전트 돌릴 가치 없음)
    if len(text) < 4:
        logger.debug(f"[Router] 너무 짧음: {text}")
        return False

    # 3. 단답/감탄사/인사 패턴 (상담 LLM이 처리)
    skip_patterns = [
        r"^[ㅋㅎㅠㅜㄱㄴㅇㄹ\s]+$",              # ㅋㅋ, ㅠㅠ
        r"^(응|네|아니|그래|ㅇㅇ|ㄴㄴ)[요~!.]*$", # 단답
        r"^(오|와|우와|헐|대박)[~!.]*$",         # 감탄
        r"^(안녕|하이|반가워)[요~!?.]*$",        # 인사
        r"^(고마워|감사합니다|ㄱㅅ)[요~!.]*$",   # 감사
    ]

    for pattern in skip_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            logger.debug(f"[Router] 스킵 패턴: {text}")
            return False

    # 4. 나머지는 에이전트가 판단 (FINISH or 도구 사용)
    logger.info(f"[Router] 에이전트 판단 위임: {text[:30]}...")
    return True


# ============================================================
# 메시지 라우팅
# ============================================================

# 에이전트 사용 여부에 따라 ReAct 에이전트 or 단순 응답 분기
async def route_message(
    message: str,
    user_id: int = None,
    session_id: str = None,
    conversation_history: list = None,
) -> dict:
    """
    메시지를 적절한 처리기로 라우팅

    Args:
        message: 사용자 메시지
        user_id: 사용자 ID
        session_id: 세션 ID
        conversation_history: 이전 대화 기록

    Returns:
        {
            "message": 응답 메시지,
            "used_agent": 에이전트 사용 여부,
            "tools_used": 사용한 도구 목록,
            "agent_result": 에이전트 상세 결과 (선택)
        }
    """
    if should_use_agent(message):
        logger.info(f"[Router] 에이전트 사용 결정")

        try:
            from .career_agent import run_career_agent

            result = await run_career_agent(
                user_message=message,
                user_id=user_id,
                session_id=session_id,
                conversation_history=conversation_history,
            )

            # 에이전트가 "액션 불필요"로 판단한 경우 (FINISH without tools)
            if result.get("no_action"):
                logger.info("[Router] 에이전트 판단: 액션 불필요")
                return {
                    "message": None,
                    "used_agent": True,  # 에이전트는 사용했으나
                    "no_action": True,   # 표시할 내용 없음
                    "tools_used": [],
                    "agent_result": result,
                }

            return {
                "message": result["answer"],
                "used_agent": True,
                "tools_used": result.get("tools_used", []),
                "agent_result": result,
            }

        except Exception as e:
            logger.error(f"[Router] 에이전트 실행 실패, fallback: {e}")

            # Fallback: 단순 응답
            return {
                "message": "죄송해요, 잠시 문제가 발생했어요. 다시 질문해주시겠어요?",
                "used_agent": False,
                "tools_used": [],
                "error": str(e),
            }

    else:
        logger.info(f"[Router] 단순 응답 사용")

        # 단순 응답 (에이전트 미사용)
        return {
            "message": None,  # 기존 chat_service가 처리하도록 None 반환
            "used_agent": False,
            "tools_used": [],
        }


# ============================================================
# 유틸리티
# ============================================================

def get_agent_stats(conversation_history: list) -> dict:
    """
    대화에서 에이전트 사용 통계

    Args:
        conversation_history: 대화 기록

    Returns:
        {
            "total_messages": 전체 메시지 수,
            "agent_used_count": 에이전트 사용 횟수,
            "agent_usage_rate": 에이전트 사용률
        }
    """
    if not conversation_history:
        return {"total_messages": 0, "agent_used_count": 0, "agent_usage_rate": 0}

    user_messages = [m for m in conversation_history if m.get("role") == "user"]
    agent_count = sum(1 for m in user_messages if should_use_agent(m.get("content", "")))

    total = len(user_messages)
    rate = (agent_count / total * 100) if total > 0 else 0

    return {
        "total_messages": total,
        "agent_used_count": agent_count,
        "agent_usage_rate": round(rate, 1),
    }
