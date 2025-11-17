"""
DreamPath 진로 분석 AI 서비스
Python FastAPI를 사용한 진로 분석 마이크로서비스
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

from services.career_analysis_service import CareerAnalysisService
from services.openai_service import OpenAIService

# 환경 변수 로드
load_dotenv()

app = FastAPI(
    title="DreamPath Career Analysis AI Service",
    description="AI 기반 진로 분석 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 초기화
openai_service = OpenAIService()
analysis_service = CareerAnalysisService(openai_service)


# 요청/응답 모델
class ConversationMessage(BaseModel):
    role: str  # USER, ASSISTANT, SYSTEM
    content: str


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


@app.get("/")
async def root():
    return {"message": "DreamPath Career Analysis AI Service", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_career(request: AnalysisRequest):
    """
    대화 내용을 기반으로 진로 분석을 수행합니다.
    
    - 감정 분석
    - 성향 분석
    - 흥미 분석
    - 종합 분석
    - 진로 추천
    """
    try:
        # 대화 내용을 문자열로 변환
        conversation_text = "\n\n".join([
            f"{msg.role}: {msg.content}" 
            for msg in request.conversationHistory
        ])
        
        # 분석 수행
        result = await analysis_service.analyze_session(
            session_id=request.sessionId,
            conversation_history=conversation_text
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

