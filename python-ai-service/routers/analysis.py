"""
진로 분석 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import AnalysisRequest, AnalysisResponse
from services.career_analysis_service import CareerAnalysisService
from dependencies import get_career_analysis_service

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_career(
    request: AnalysisRequest,
    analysis_service: CareerAnalysisService = Depends(get_career_analysis_service)
):
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

