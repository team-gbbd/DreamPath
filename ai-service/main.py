"""
DreamPath Career Analysis AI Service
Python FastAPI Microservice
"""

import os
from dotenv import load_dotenv

# 환경변수를 먼저 로드 (다른 모듈 import 전에 반드시 실행)
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from config import settings
from routers import api_router

# ====== Routers (kyoungjin additions) ======
from routers.vector_router import router as vector_router
from routers.rag_router import router as rag_router
from routers.profile_match_router import router as profile_match_router
from routers.user_document import router as user_document_router
from routers.user_embedding import router as user_embedding_router
from routers.bigfive_router import router as bigfive_router
from routers.mbti_router import router as mbti_router
from routers.personality_profile_router import router as personality_profile_router

# ====== Services ======
from services.common.openai_client import OpenAIService as OpenAIServiceDev
from services.learning import (
    QuestionGeneratorService,
    AnswerEvaluatorService,
    CodeExecutorService,
)
from services.recommend.recommend_service import RecommendService
from services.recommend.hybrid_recommend_service import HybridRecommendService

from services.career_analysis_service import CareerAnalysisService
from services.identity_analysis_service import IdentityAnalysisService
from services.chat_service import ChatService


# =========================================
# Environment Variables
# =========================================
api_key = os.getenv("OPENAI_API_KEY", "")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# =========================================
# FastAPI Application Init
# =========================================
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION
)

# =========================================
# CORS
# =========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# =========================================
# Core Routers
# =========================================
app.include_router(api_router)              # 기존 chat, analysis, identity, job_sites API
app.include_router(vector_router, prefix="/api")
app.include_router(rag_router)
app.include_router(profile_match_router, prefix="/api")
app.include_router(user_document_router, prefix="/analysis", tags=["analysis"])
app.include_router(user_embedding_router, prefix="/embedding", tags=["embedding"])
app.include_router(bigfive_router, prefix="/api")
app.include_router(personality_profile_router, prefix="/api")
app.include_router(mbti_router, prefix='/api')


# =========================================
# Initialize Services
# =========================================

try:
    openai_service = OpenAIServiceDev()
except Exception:
    openai_service = None

analysis_service = CareerAnalysisService(openai_service)
identity_service = IdentityAnalysisService(api_key, model) if api_key else None
chat_service = ChatService(api_key, model) if api_key else None

question_generator = QuestionGeneratorService() if api_key else None
answer_evaluator = AnswerEvaluatorService() if api_key else None
code_executor = CodeExecutorService()

recommend_service = RecommendService()
# hybrid_recommender = HybridRecommendService()  # Temporarily disabled due to Pinecone Index error


# =========================================
# Basic Endpoints
# =========================================
@app.get("/")
async def root():
    return {"message": "DreamPath Career Analysis AI Service", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# =========================================
# Models
# =========================================

class ConversationMessage(BaseModel):
    role: str
    content: str

class AnalysisRequest(BaseModel):
    sessionId: str
    conversationHistory: List[ConversationMessage]

class EmotionAnalysis(BaseModel):
    description: str
    score: int
    emotionalState: str

class PersonalityAnalysis(BaseModel):
    description: str
    type: str
    strengths: List[str]
    growthAreas: List[str]

class InterestArea(BaseModel):
    name: str
    level: int
    description: str

class InterestAnalysis(BaseModel):
    description: str
    areas: List[InterestArea]

class CareerRecommendation(BaseModel):
    careerName: str
    description: str
    matchScore: int
    reasons: List[str]

class AnalysisResponse(BaseModel):
    sessionId: str
    emotion: EmotionAnalysis
    personality: PersonalityAnalysis
    interest: InterestAnalysis
    comprehensiveAnalysis: str
    recommendedCareers: List[CareerRecommendation]


# =========================================
# Analysis API
# =========================================

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    try:
        text = "\n\n".join([f"{m.role}: {m.content}" for m in request.conversationHistory])
        result = await analysis_service.analyze_session(request.sessionId, text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 오류: {str(e)}")


# =========================================
# Identity API
# =========================================

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
async def identity_clarity(req: ClarityRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 필요")

    return ClarityResponse(**await identity_service.assess_clarity(req.conversationHistory))


@app.post("/api/identity/extract", response_model=IdentityResponse)
async def extract_identity(req: IdentityRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 필요")

    result = await identity_service.extract_identity(req.conversationHistory)
    traits = [IdentityTrait(**t) for t in result.get("traits", [])]

    return IdentityResponse(
    identityCore=result.get("identityCore", "탐색 중..."),
    confidence=result.get("confidence", 0),
    traits=[IdentityTrait(**t) for t in result.get("traits", [])],
    insights=result.get("insights", []),
    nextFocus=result.get("nextFocus", "")
    )



@app.post("/api/identity/insight", response_model=InsightResponse)
async def identity_insight(req: InsightRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 필요")

    result = await identity_service.generate_insight(
        req.recentMessages,
        req.previousContext
    )
    return InsightResponse(**result)


@app.post("/api/identity/progress", response_model=ProgressResponse)
async def identity_progress(req: ProgressRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 필요")

    result = await identity_service.assess_stage_progress(
        req.conversationHistory,
        req.currentStage
    )
    return ProgressResponse(**result)


# =========================================
# Chat API
# =========================================

class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None

class ChatRes(BaseModel):
    sessionId: str
    message: str


@app.post("/api/chat", response_model=ChatRes)
async def chat(req: ChatRequest):

    if not chat_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 필요")

    history = [{"role": m.role, "content": m.content} for m in req.conversationHistory]

    msg = await chat_service.generate_response(
        session_id=req.sessionId,
        user_message=req.userMessage,
        current_stage=req.currentStage,
        conversation_history=history,
        survey_data=req.surveyData
    )

    return ChatRes(sessionId=req.sessionId, message=msg)


# =========================================
# Recommendation API
# =========================================

@app.get("/recommend/jobs")
async def recommend_jobs(user_vector_id: str, top_k: int = 10):

    try:
        jobs = recommend_service.recommend_jobs(user_vector_id, top_k)
        return {"recommended": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/recommend/hybrid")
async def recommend_hybrid(user_vector_id: str, top_k: int = 20):

    try:
        result = hybrid_recommender.recommend(user_vector_id, top_k)
        return {"recommended": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/worknet")
async def recommend_worknet(payload: dict):

    vector_id = payload.get("vectorId")
    if not vector_id:
        raise HTTPException(status_code=400, detail="vectorId 필요")

    try:
        svc = RecommendService()
        return {"items": svc.recommend_worknet(vector_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/majors")
async def recommend_majors(payload: dict):

    vector_id = payload.get("vectorId")
    if not vector_id:
        raise HTTPException(status_code=400, detail="vectorId 필요")

    try:
        svc = RecommendService()
        return {"items": svc.recommend_major(vector_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/schools")
async def recommend_schools(payload: dict):

    vector_id = payload.get("vectorId")
    if not vector_id:
        raise HTTPException(status_code=400, detail="vectorId 필요")

    try:
        svc = RecommendService()
        return {"items": svc.recommend_school(vector_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/hybrid-jobs")
async def recommend_hybrid_jobs(payload: dict):
    """
    Hybrid job recommendation endpoint for Spring Boot backend
    Temporarily using basic recommend service
    """
    vector_id = payload.get("vectorId")
    top_k = payload.get("topK", 20)
    
    if not vector_id:
        raise HTTPException(status_code=400, detail="vectorId 필요")

    try:
        # Using basic RecommendService instead of HybridRecommendService
        svc = RecommendService()
        result = svc.recommend_jobs(vector_id, top_k)  # Fixed: recommend_jobs not recommend_job
        return {"recommended": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================
# Learning APIs
# =========================================

class GenerateQuestionsRequest(BaseModel):
    domain: str
    weekNumber: int
    count: int = 5

class EvaluateAnswerRequest(BaseModel):
    questionType: str
    questionText: str
    userAnswer: str
    correctAnswer: str
    maxScore: int

class ExecuteCodeRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


@app.post("/api/learning/generate-questions")
async def generate_questions(req: GenerateQuestionsRequest):

    if not question_generator:
        raise HTTPException(status_code=500, detail="OpenAI 설정 필요")

    result = await question_generator.generate_questions(
        req.domain, req.weekNumber, req.count
    )
    return {"questions": result}


@app.post("/api/learning/evaluate-answer")
async def evaluate_answer(req: EvaluateAnswerRequest):

    if not answer_evaluator:
        raise HTTPException(status_code=500, detail="OpenAI 설정 필요")

    return await answer_evaluator.evaluate_answer(
        req.questionType,
        req.questionText,
        req.userAnswer,
        req.correctAnswer,
        req.maxScore
    )


@app.post("/api/learning/execute-code")
async def execute_code(req: ExecuteCodeRequest):

    return await code_executor.execute_code(
        req.code,
        req.language,
        req.stdin
    )


# =========================================
# Run
# =========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
