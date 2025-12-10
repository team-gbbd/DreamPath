"""
회원용 AI 챗봇 비서 모델
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class AssistantChatRequest(BaseModel):
    """회원용 챗봇 요청"""
    userId: int  # 회원 ID (필수)
    sessionId: Optional[UUID] = None  # 세션 ID (선택)
    message: str  # 사용자 메시지
    conversationTitle: Optional[str] = "새 대화"
    functionName: Optional[str] = None  # FAQ 직접 호출용 (유사도 검색 건너뛰기)


class AssistantChatResponse(BaseModel):
    """회원용 챗봇 응답"""
    session: UUID
    response: str