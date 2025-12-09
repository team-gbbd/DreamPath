"""
채팅 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from .common import ConversationMessage


class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str  # PRESENT, PAST, VALUES, FUTURE, IDENTITY
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None  # 설문조사 정보
    userId: Optional[int] = None  # 에이전트 기능을 위한 사용자 ID
    identityStatus: Optional[dict] = None  # 정체성 상태 (clarity, traits 등)


class ActionButton(BaseModel):
    id: str
    label: str
    primary: Optional[bool] = False
    params: Optional[Dict[str, Any]] = None


class AgentAction(BaseModel):
    type: str  # mentoring_suggestion, learning_path_suggestion, job_posting_suggestion
    reason: str  # 사용자에게 보여줄 제안 이유
    summary: Optional[str] = None  # AI 에이전트가 생성한 요약 (검색 결과 등)
    data: Dict[str, Any]  # 세션 목록, 학습 경로 등
    actions: List[ActionButton]  # 액션 버튼들


class AgentStep(BaseModel):
    """ReAct 에이전트 처리 단계"""
    step: str  # analyze, tool, answer
    label: str  # 사용자에게 보여줄 라벨
    status: str  # pending, in_progress, completed, failed
    tool: Optional[str] = None  # 도구 이름 (step이 tool일 때)
    thought: Optional[str] = None  # AI 생각 (step이 analyze일 때)
    hasData: Optional[bool] = None  # 결과 데이터 유무


class ChatResponse(BaseModel):
    sessionId: str
    message: str
    taskId: Optional[str] = None  # 에이전트 태스크 ID (폴링용)
    agentAction: Optional[AgentAction] = None  # 에이전트 액션 (있을 때만)
    agentSteps: Optional[List[AgentStep]] = None  # ReAct 단계 정보 (시각화용)


class AgentTaskResponse(BaseModel):
    """에이전트 태스크 결과 조회 응답"""
    taskId: str
    status: str  # pending, running, completed, failed, skipped
    agentAction: Optional[AgentAction] = None
    agentSteps: Optional[List[AgentStep]] = None
    error: Optional[str] = None

