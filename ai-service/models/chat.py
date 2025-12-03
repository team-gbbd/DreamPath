"""
채팅 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional
from .common import ConversationMessage


class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str  # PRESENT, PAST, VALUES, FUTURE, IDENTITY
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None  # 설문조사 정보


class ChatResponse(BaseModel):
    sessionId: str
    message: str

