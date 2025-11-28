"""
채팅 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import ChatRequest, ChatResponse
from services.chat_service import ChatService
from dependencies import get_chat_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """대화형 진로 상담 응답 생성"""
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

