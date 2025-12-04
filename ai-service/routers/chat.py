"""
채팅 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models.chat import ChatRequest, ChatResponse, AgentAction, ActionButton, AgentStep
from services.chat_service import ChatService
from dependencies import get_chat_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """대화형 진로 상담 응답 생성 (에이전트 액션 포함)"""
    try:
        # 대화 이력을 딕셔너리 리스트로 변환
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]

        # 채팅 응답 생성 (에이전트 분석 포함)
        result = await chat_service.generate_response(
            session_id=request.sessionId,
            user_message=request.userMessage,
            current_stage=request.currentStage,
            conversation_history=history,
            survey_data=request.surveyData,
            user_id=request.userId,
            identity_status=request.identityStatus,
        )

        # AgentAction 변환
        agent_action = None
        if result.get("agent_action"):
            action_data = result["agent_action"]
            agent_action = AgentAction(
                type=action_data["type"],
                reason=action_data["reason"],
                summary=action_data.get("summary"),  # AI 에이전트 요약 추가
                data=action_data["data"],
                actions=[
                    ActionButton(**btn) for btn in action_data.get("actions", [])
                ],
            )

        # AgentSteps 변환 (ReAct 단계 시각화용)
        agent_steps = None
        if result.get("agent_steps"):
            agent_steps = [
                AgentStep(**step) for step in result["agent_steps"]
            ]

        return ChatResponse(
            sessionId=request.sessionId,
            message=result["message"],
            agentAction=agent_action,
            agentSteps=agent_steps,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 응답 생성 실패: {str(e)}")

