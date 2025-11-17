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
from services.identity_analysis_service import IdentityAnalysisService
from services.chat_service import ChatService

# 환경 변수 로드
load_dotenv()

app = FastAPI(
    title="DreamPath Career Analysis AI Service",
    description="AI 기반 진로 분석, 정체성 분석 및 대화형 상담 서비스",
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
api_key = os.getenv("OPENAI_API_KEY", "")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

openai_service = OpenAIService()
analysis_service = CareerAnalysisService(openai_service)
identity_service = IdentityAnalysisService(api_key, model) if api_key else None
chat_service = ChatService(api_key, model) if api_key else None


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


# 정체성 분석 요청 모델
class ClarityRequest(BaseModel):
    conversationHistory: str


class IdentityRequest(BaseModel):
    conversationHistory: str


class InsightRequest(BaseModel):
    recentMessages: str
    previousContext: str


class ProgressRequest(BaseModel):
    conversationHistory: str
    currentStage: str


# 정체성 분석 응답 모델
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


@app.post("/api/identity/clarity", response_model=ClarityResponse)
async def assess_clarity(request: ClarityRequest):
    """정체성 명확도 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_clarity(request.conversationHistory)
        return ClarityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"명확도 평가 실패: {str(e)}")


@app.post("/api/identity/extract", response_model=IdentityResponse)
async def extract_identity(request: IdentityRequest):
    """정체성 특징 추출"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.extract_identity(request.conversationHistory)
        # traits 변환
        traits = [IdentityTrait(**t) for t in result.get("traits", [])]
        return IdentityResponse(
            identityCore=result.get("identityCore", "탐색 중..."),
            confidence=result.get("confidence", 0),
            traits=traits,
            insights=result.get("insights", []),
            nextFocus=result.get("nextFocus", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정체성 추출 실패: {str(e)}")


@app.post("/api/identity/insight", response_model=InsightResponse)
async def generate_insight(request: InsightRequest):
    """최근 인사이트 생성"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.generate_insight(
            request.recentMessages,
            request.previousContext
        )
        return InsightResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인사이트 생성 실패: {str(e)}")


@app.post("/api/identity/progress", response_model=ProgressResponse)
async def assess_progress(request: ProgressRequest):
    """단계 진행 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_stage_progress(
            request.conversationHistory,
            request.currentStage
        )
        return ProgressResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진행 평가 실패: {str(e)}")


# 채팅 요청/응답 모델
class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str  # PRESENT, PAST, VALUES, FUTURE, IDENTITY
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None  # 설문조사 정보


class ChatResponse(BaseModel):
    sessionId: str
    message: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """대화형 진로 상담 응답 생성"""
    if not chat_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        # 대화 이력을 딕셔너리 리스트로 변환
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]
        
        # 채팅 응답 생성
        response_message = await chat_service.generate_response(
            session_id=request.sessionId,
            user_message=request.userMessage,
            current_stage=request.currentStage,
            conversation_history=history,
            survey_data=request.surveyData
        )
        
        return ChatResponse(
            sessionId=request.sessionId,
            message=response_message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 응답 생성 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

