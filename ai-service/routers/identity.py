"""
정체성 분석 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import (
    ClarityRequest, ClarityResponse,
    IdentityRequest, IdentityResponse, IdentityTrait,
    InsightRequest, InsightResponse,
    ProgressRequest, ProgressResponse
)
from services.identity_analysis_service import IdentityAnalysisService
from dependencies import get_identity_service

router = APIRouter(prefix="/api/identity", tags=["identity"])


@router.post("/clarity", response_model=ClarityResponse)
async def assess_clarity(
    request: ClarityRequest,
    identity_service: IdentityAnalysisService = Depends(get_identity_service)
):
    """정체성 명확도 평가 (userId가 있으면 이전 대화 기록도 포함)"""
    try:
        result = await identity_service.assess_clarity(
            request.conversationHistory,
            request.userId
        )
        return ClarityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"명확도 평가 실패: {str(e)}")


@router.post("/extract", response_model=IdentityResponse)
async def extract_identity(
    request: IdentityRequest,
    identity_service: IdentityAnalysisService = Depends(get_identity_service)
):
    """정체성 특징 추출 (userId가 있으면 이전 대화 기록도 포함)"""
    try:
        result = await identity_service.extract_identity(
            request.conversationHistory,
            request.userId
        )
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


@router.post("/insight", response_model=InsightResponse)
async def generate_insight(
    request: InsightRequest,
    identity_service: IdentityAnalysisService = Depends(get_identity_service)
):
    """최근 인사이트 생성"""
    try:
        result = await identity_service.generate_insight(
            request.recentMessages,
            request.previousContext
        )
        return InsightResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인사이트 생성 실패: {str(e)}")


@router.post("/progress", response_model=ProgressResponse)
async def assess_progress(
    request: ProgressRequest,
    identity_service: IdentityAnalysisService = Depends(get_identity_service)
):
    """단계 진행 평가 (userId가 있으면 이전 대화 기록도 포함)"""
    try:
        result = await identity_service.assess_stage_progress(
            request.conversationHistory,
            request.currentStage,
            request.userId
        )
        return ProgressResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진행 평가 실패: {str(e)}")

