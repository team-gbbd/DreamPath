"""
DreamPath ReAct 에이전트 상태 정의
LangGraph StateGraph에서 사용하는 상태 스키마입니다.
"""
from typing import TypedDict, Annotated, List, Optional
from langgraph.graph.message import add_messages


class ToolCall(TypedDict):
    """도구 호출 정보"""
    tool_name: str
    tool_input: dict
    tool_output: Optional[dict]
    success: bool
    error: Optional[str]


# LangGraph StateGraph에서 노드 간 공유되는 상태
class AgentState(TypedDict):
    """
    ReAct 에이전트의 상태

    Attributes:
        messages: 대화 히스토리 (LangGraph add_messages로 자동 병합)
        user_id: 사용자 ID (멘토링 예약 등에 필요)
        session_id: 채팅 세션 ID
        current_step: 현재 ReAct 스텝 (최대 4)
        thought: 현재 추론 내용
        action: 선택한 도구 또는 "FINISH"
        action_input: 도구 입력 파라미터
        observation: 도구 실행 결과
        tool_history: 실행한 도구들의 히스토리
        final_answer: 최종 응답 (FINISH 시 생성)
        detected_career: 감지된 관심 직업
        error: 에러 발생 시 메시지
        should_fallback: 에러로 인해 일반 응답으로 전환해야 하는지
    """
    # 대화 관련
    messages: Annotated[List, add_messages]
    user_id: Optional[int]
    session_id: Optional[str]

    # ReAct 루프 상태
    current_step: int
    thought: Optional[str]
    action: Optional[str]
    action_input: Optional[dict]
    observation: Optional[dict]

    # 컨텍스트
    detected_career: Optional[str]

    # 히스토리 및 결과
    tool_history: List[ToolCall]
    final_answer: Optional[str]

    # 에러 핸들링
    error: Optional[str]
    should_fallback: bool

    # 토큰 사용량 추적
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int


# 에이전트 실행 시작 시 초기 상태 생성
def create_initial_state(
    user_message: str,
    user_id: Optional[int] = None,
    session_id: Optional[str] = None,
    conversation_history: Optional[List[dict]] = None,
) -> AgentState:
    """
    초기 에이전트 상태 생성

    Args:
        user_message: 사용자 입력 메시지
        user_id: 사용자 ID
        session_id: 세션 ID
        conversation_history: 이전 대화 히스토리 (선택)

    Returns:
        초기화된 AgentState
    """
    messages = []

    # 이전 대화 히스토리가 있으면 추가 (최근 10개만)
    if conversation_history:
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user").lower()
            content = msg.get("content", "") or msg.get("message", "")
            if content:
                messages.append({
                    "role": role,
                    "content": content
                })

    messages.append({
        "role": "user",
        "content": user_message
    })

    return AgentState(
        messages=messages,
        user_id=user_id,
        session_id=session_id,
        current_step=0,
        thought=None,
        action=None,
        action_input=None,
        observation=None,
        detected_career=None,
        tool_history=[],
        final_answer=None,
        error=None,
        should_fallback=False,
        total_tokens=0,
        prompt_tokens=0,
        completion_tokens=0,
    )


def get_last_user_message(state: AgentState) -> str:
    """상태에서 마지막 사용자 메시지 추출"""
    for msg in reversed(state["messages"]):
        if isinstance(msg, dict) and msg.get("role") == "user":
            return msg.get("content", "")
        elif hasattr(msg, "type") and msg.type == "human":
            return msg.content
    return ""


def get_conversation_context(state: AgentState, max_turns: int = 5) -> str:
    """상태에서 대화 컨텍스트 문자열 생성"""
    lines = []
    messages = state["messages"][-max_turns * 2:]  # 최근 N턴

    for msg in messages:
        if isinstance(msg, dict):
            role = "사용자" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "")
        elif hasattr(msg, "type"):
            role = "사용자" if msg.type == "human" else "AI"
            content = msg.content
        else:
            continue

        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines)


# ===== 상수 정의 =====

MAX_STEPS = 2  # 최대 ReAct 스텝 수 (속도 개선)
TIMEOUT_SECONDS = 30  # 전체 타임아웃
TOOL_TIMEOUT_SECONDS = 10  # 개별 도구 타임아웃
