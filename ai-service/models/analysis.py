"""
진로 분석 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .common import ConversationMessage


class AnalysisRequest(BaseModel):
    sessionId: str
    conversationHistory: List[ConversationMessage]


class EmotionAnalysis(BaseModel):
    description: str
    score: int  # 1-100
    emotionalState: str  # 긍정적, 중립적, 부정적, 혼합


class PersonalityAnalysis(BaseModel):
    description: str
    type: str
    strengths: List[str]
    growthAreas: List[str]
    big_five: Optional[Dict[str, Any]] = None


class InterestArea(BaseModel):
    name: str
    level: int  # 1-10
    description: str


class InterestAnalysis(BaseModel):
    description: str
    areas: List[InterestArea]


class CareerRecommendation(BaseModel):
    careerName: str
    description: str
    matchScore: int  # 1-100
    reasons: List[str]


class AnalysisResponse(BaseModel):
    sessionId: str
    emotion: EmotionAnalysis
    personality: PersonalityAnalysis
    interest: InterestAnalysis
    comprehensiveAnalysis: str
    recommendedCareers: List[CareerRecommendation]

