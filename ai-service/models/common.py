"""
공통 Pydantic 모델
"""
from pydantic import BaseModel


class ConversationMessage(BaseModel):
    """대화 메시지 모델"""
    role: str  # USER, ASSISTANT, SYSTEM
    content: str

