"""
학습 문제 생성 API 라우터
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from services.learning.question_generator import QuestionGeneratorService
from services.learning.answer_evaluator import AnswerEvaluatorService
from services.learning.weakness_analyzer import WeaknessAnalyzerService

router = APIRouter(prefix="/api/learning", tags=["learning"])

# 서비스 인스턴스
question_generator = QuestionGeneratorService()
answer_evaluator = AnswerEvaluatorService()
weakness_analyzer = WeaknessAnalyzerService()


# ========== Request/Response Models ==========

class GenerateQuestionsRequest(BaseModel):
    domain: str
    weekNumber: int
    count: int = 5


class QuestionItem(BaseModel):
    type: str
    difficulty: str
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: Optional[str] = None
    maxScore: int = 10


class GenerateQuestionsResponse(BaseModel):
    success: bool
    questions: List[QuestionItem]
    count: int


class EvaluateAnswerRequest(BaseModel):
    questionType: str
    question: str
    correctAnswer: str
    userAnswer: str
    maxScore: int = 10


class EvaluateAnswerResponse(BaseModel):
    score: int
    feedback: str
    isCorrect: bool


class WrongAnswerItem(BaseModel):
    questionType: str
    questionText: str
    correctAnswer: str
    userAnswer: str
    feedback: Optional[str] = None
    score: int = 0
    maxScore: int = 10


class AnalyzeWeaknessRequest(BaseModel):
    domain: str
    wrongAnswers: List[WrongAnswerItem]


class WeaknessTag(BaseModel):
    tag: str
    count: int
    severity: str
    description: str


class RadarDataItem(BaseModel):
    category: str
    score: int
    fullMark: int = 100


class AnalyzeWeaknessResponse(BaseModel):
    weaknessTags: List[WeaknessTag]
    recommendations: List[str]
    overallAnalysis: str
    radarData: List[RadarDataItem]


# ========== Endpoints ==========

@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(request: GenerateQuestionsRequest):
    """
    AI 학습 문제 생성

    - domain: 학습 분야 (예: "프로그래밍", "디자인")
    - weekNumber: 주차 (1-4)
    - count: 생성할 문제 개수
    """
    try:
        questions = await question_generator.generate_questions(
            domain=request.domain,
            week_number=request.weekNumber,
            count=request.count
        )

        return GenerateQuestionsResponse(
            success=True,
            questions=questions,
            count=len(questions)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


@router.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
async def evaluate_answer(request: EvaluateAnswerRequest):
    """
    AI 답변 평가

    - questionType: 문제 유형 (MCQ, SCENARIO, CODING, DESIGN)
    - question: 문제 텍스트
    - correctAnswer: 정답
    - userAnswer: 사용자 답변
    - maxScore: 최대 점수
    """
    try:
        result = await answer_evaluator.evaluate_answer(
            question_type=request.questionType,
            question_text=request.question,
            correct_answer=request.correctAnswer,
            user_answer=request.userAnswer,
            max_score=request.maxScore
        )

        return EvaluateAnswerResponse(
            score=result["score"],
            feedback=result["feedback"],
            isCorrect=result["score"] == request.maxScore
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"답변 평가 실패: {str(e)}")


@router.post("/analyze-weakness", response_model=AnalyzeWeaknessResponse)
async def analyze_weakness(request: AnalyzeWeaknessRequest):
    """
    AI 약점 분석

    - domain: 학습 분야 (예: "백엔드 개발", "데이터 분석")
    - wrongAnswers: 오답 리스트
    """
    try:
        # Pydantic 모델을 dict로 변환
        wrong_answers_dict = [wa.model_dump() for wa in request.wrongAnswers]

        result = await weakness_analyzer.analyze_weaknesses(
            domain=request.domain,
            wrong_answers=wrong_answers_dict
        )

        return AnalyzeWeaknessResponse(
            weaknessTags=result["weaknessTags"],
            recommendations=result["recommendations"],
            overallAnalysis=result["overallAnalysis"],
            radarData=result["radarData"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"약점 분석 실패: {str(e)}")
