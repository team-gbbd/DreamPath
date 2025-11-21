"""
DreamPath – Career Analysis + Identity + Chat + Learning Path + Vector Service
Fully merged version (HEAD + dev)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# =============================
# IMPORTS (HEAD services)
# =============================
from services.career_analysis_service import CareerAnalysisService
from services.chat_service import ChatService
from services.identity_analysis_service import IdentityAnalysisService
from services.openai_service import OpenAIService as OpenAIServiceHead

# =============================
# IMPORTS (dev services)
# =============================
from services.common.openai_client import OpenAIService as OpenAIServiceDev
from services.learning import (
    QuestionGeneratorService,
    AnswerEvaluatorService,
    CodeExecutorService,
)

# Vector Router
from routers.vector_router import router as vector_router

# =========================================
# Environment
# =========================================
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY", "")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# =========================================
# FastAPI App
# =========================================
app = FastAPI(
    title="DreamPath AI Server",
    description="Career Analysis + Identity + Chat + Learning Path API Gateway",
    version="1.0.0"
)

# =========================================
# CORS
# =========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================
# Initialize Services
# =========================================

# OpenAI Service — choose dev/common version first, fallback to HEAD
try:
    openai_service = OpenAIServiceDev()
except Exception:
    openai_service = OpenAIServiceHead()

# HEAD services
analysis_service = CareerAnalysisService(openai_service)
identity_service = IdentityAnalysisService(api_key, model) if api_key else None
chat_service = ChatService(api_key, model) if api_key else None

# Learning Path services (dev)
question_generator = QuestionGeneratorService() if api_key else None
answer_evaluator = AnswerEvaluatorService() if api_key else None
code_executor = CodeExecutorService()

# Vector router
app.include_router(vector_router, prefix="/api")

# =========================================
# MODELS
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
# Root + Health
# =========================================

@app.get("/")
async def root():
    return {"message": "DreamPath AI Service Running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# =========================================
# Career Analysis
# =========================================

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_career(request: AnalysisRequest):

    try:
        text = "\n\n".join([f"{m.role}: {m.content}" for m in request.conversationHistory])
        result = await analysis_service.analyze_session(
            session_id=request.sessionId,
            conversation_history=text
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 오류: {str(e)}")


# =========================================
# Identity Analysis
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
async def identity_clarity(request: ClarityRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 설정 필요")

    result = await identity_service.assess_clarity(request.conversationHistory)
    return ClarityResponse(**result)


@app.post("/api/identity/extract", response_model=IdentityResponse)
async def extract_identity(request: IdentityRequest):

    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API Key 설정 필요")

    result = await identity_service.extract_identity(request.conversationHistory)
    traits = [IdentityTrait(**t) for t in result.get("traits", [])]

    return IdentityResponse(
        identityCore=result.get("identityCore", ""),
        confidence=result.get("confidence", 0),
        traits=traits,
        insights=result.get("insights", []),
        nextFocus=result.get("nextFocus", "")
    )


@app.post("/api/identity/insight", response_model=InsightResponse)
async def generate_identity_insight(request: InsightRequest):

    result = await identity_service.generate_insight(
        request.recentMessages,
        request.previousContext
    )
    return InsightResponse(**result)


@app.post("/api/identity/progress", response_model=ProgressResponse)
async def identity_stage_progress(request: ProgressRequest):

    result = await identity_service.assess_stage_progress(
        request.conversationHistory,
        request.currentStage
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

class ChatResponse(BaseModel):
    sessionId: str
    message: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):

    history = [{"role": m.role, "content": m.content} for m in request.conversationHistory]

    message = await chat_service.generate_response(
        session_id=request.sessionId,
        user_message=request.userMessage,
        current_stage=request.currentStage,
        conversation_history=history,
        survey_data=request.surveyData
    )

    return ChatResponse(sessionId=request.sessionId, message=message)


# =========================================
# Learning Path API
# =========================================

from pydantic import BaseModel

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
        domain=req.domain,
        week_number=req.weekNumber,
        count=req.count
    )
    return {"questions": result}

@app.post("/api/learning/evaluate-answer")
async def evaluate_answer(req: EvaluateAnswerRequest):

    result = await answer_evaluator.evaluate_answer(
        question_type=req.questionType,
        question_text=req.questionText,
        user_answer=req.userAnswer,
        correct_answer=req.correctAnswer,
        max_score=req.maxScore
    )
    return result

@app.post("/api/learning/execute-code")
async def execute_code(req: ExecuteCodeRequest):

    result = await code_executor.execute_code(
        code=req.code,
        language=req.language,
        stdin=req.stdin
    )
    return result


# =========================================
# Run (Only when executed directly)
# =========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
