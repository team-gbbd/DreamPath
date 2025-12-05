"""
정체성 분석 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional


class ClarityRequest(BaseModel):
    conversationHistory: str
    userId: Optional[str] = None  # userId가 있으면 이전 대화도 포함


class IdentityRequest(BaseModel):
    conversationHistory: str
    userId: Optional[str] = None  # userId가 있으면 이전 대화도 포함


class InsightRequest(BaseModel):
    recentMessages: str
    previousContext: str
    userId: Optional[str] = None


class ProgressRequest(BaseModel):
    conversationHistory: str
    currentStage: str
    userId: Optional[str] = None


class ClarityResponse(BaseModel):
    clarity: int
    reason: str


class IdentityTrait(BaseModel):
    category: str
    trait: str
    evidence: str


class IdentityResponse(BaseModel):
    identityCore: str
    confidence: int
    traits: List[IdentityTrait]
    insights: List[str]
    nextFocus: str


class InsightResponse(BaseModel):
    hasInsight: bool
    insight: Optional[str] = None
    type: Optional[str] = None


class ProgressResponse(BaseModel):
    readyToProgress: bool
    reason: str
    recommendation: str

