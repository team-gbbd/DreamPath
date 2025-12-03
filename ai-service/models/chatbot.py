from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ChatRequestDto(BaseModel):
    userId: Optional[int] = None
    sessionId: Optional[UUID] = None
    guestId: Optional[str] = None
    message: str
    conversationTitle: Optional[str] = None


class FaqRequest(BaseModel):
    category: str
    question: str
    answer: str


class FaqUpdateRequest(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None


class InquiryRequest(BaseModel):
    name: str
    email: str
    content: str
    userId: Optional[int] = None
    sessionId: Optional[str] = None


class InquiryReplyRequest(BaseModel):
    inquiryId: Optional[int] = None
    recipientEmail: str
    recipientName: str
    inquiryContent: str
    replyContent: str


class ChatResponse(BaseModel):
    session: UUID
    response: str


class UserInfo(BaseModel):
    userId: int
    name: str
    email: str


class InquiryResponseDto(BaseModel):
    id: int
    user: Optional[UserInfo] = None
    name: str
    email: str
    content: str
    answered: bool
    answeredAt: Optional[datetime] = None
    replyContent: Optional[str] = None
    createdAt: datetime
