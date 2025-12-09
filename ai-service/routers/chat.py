"""
채팅 API 라우터
에이전트 호출 분리: 상담 응답 즉시 반환, 에이전트는 백그라운드 실행
"""
import asyncio
import threading
import logging
from fastapi import APIRouter, HTTPException, Depends

from models.chat import (
    ChatRequest, ChatResponse, AgentTaskResponse,
    AgentAction, ActionButton, AgentStep
)
from services.chat_service import ChatService
from services.agent_task_store import get_agent_task_store
from services.agents import should_use_agent
from dependencies import get_chat_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


def run_agent_in_background(
    task_id: str,
    chat_service: ChatService,
    session_id: str,
    user_message: str,
    user_id: int,
    conversation_history: list,
):
    """
    백그라운드에서 에이전트 실행 후 Redis에 결과 저장
    """
    task_store = get_agent_task_store()

    try:
        task_store.set_running(task_id)
        logger.info(f"[Agent Background] 시작: task_id={task_id}")

        # 새 이벤트 루프 생성 (백그라운드 스레드용)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                chat_service.run_agent_task(
                    session_id=session_id,
                    user_message=user_message,
                    user_id=user_id,
                    conversation_history=conversation_history,
                )
            )

            if result.get("used_agent") and result.get("agent_action"):
                task_store.set_completed(task_id, result)
                logger.info(f"[Agent Background] 완료: task_id={task_id}")
            else:
                task_store.set_skipped(task_id)
                logger.info(f"[Agent Background] 스킵 (도구 미사용): task_id={task_id}")

        finally:
            loop.close()

    except Exception as e:
        logger.error(f"[Agent Background] 실패: task_id={task_id}, error={e}")
        task_store.set_failed(task_id, str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    대화형 진로 상담 응답 생성

    개선된 아키텍처:
    - 상담 응답: 즉시 반환 (빠름)
    - 에이전트: 백그라운드에서 실행 → taskId로 폴링
    """
    try:
        # 대화 이력 변환
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]

        # 1. 상담 응답 생성 (즉시)
        result = await chat_service.generate_response(
            session_id=request.sessionId,
            user_message=request.userMessage,
            current_stage=request.currentStage,
            conversation_history=history,
            survey_data=request.surveyData,
            user_id=request.userId,
            identity_status=request.identityStatus,
        )

        # 2. 에이전트 필요 여부 판단
        task_id = None
        if should_use_agent(request.userMessage):
            task_store = get_agent_task_store()
            task_id = task_store.create_task(
                session_id=request.sessionId,
                user_id=request.userId
            )

            # 백그라운드에서 에이전트 실행
            thread = threading.Thread(
                target=run_agent_in_background,
                args=(
                    task_id,
                    chat_service,
                    request.sessionId,
                    request.userMessage,
                    request.userId,
                    history,
                ),
                daemon=True,
            )
            thread.start()
            logger.info(f"[Chat] 에이전트 백그라운드 시작: task_id={task_id}")

        # 3. 즉시 응답 반환
        return ChatResponse(
            sessionId=request.sessionId,
            message=result["message"],
            taskId=task_id,
        )

    except Exception as e:
        logger.error(f"[Chat] 에러: {e}")
        raise HTTPException(status_code=500, detail=f"채팅 응답 생성 실패: {str(e)}")


@router.get("/chat/agent-result/{task_id}", response_model=AgentTaskResponse)
async def get_agent_result(task_id: str):
    """
    에이전트 태스크 결과 조회 (폴링용)

    상태:
    - pending: 대기 중
    - running: 실행 중
    - completed: 완료 (결과 있음)
    - skipped: 에이전트가 도구를 사용하지 않음
    - failed: 실패
    """
    task_store = get_agent_task_store()
    task = task_store.get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다")

    # 결과 변환
    agent_action = None
    agent_steps = None

    if task["status"] == "completed" and task.get("result"):
        result = task["result"]

        if result.get("agent_action"):
            action_data = result["agent_action"]
            agent_action = AgentAction(
                type=action_data["type"],
                reason=action_data["reason"],
                summary=action_data.get("summary"),
                data=action_data["data"],
                actions=[
                    ActionButton(**btn) for btn in action_data.get("actions", [])
                ],
            )

        if result.get("agent_steps"):
            agent_steps = [
                AgentStep(**step) for step in result["agent_steps"]
            ]

    return AgentTaskResponse(
        taskId=task_id,
        status=task["status"],
        agentAction=agent_action,
        agentSteps=agent_steps,
        error=task.get("error"),
    )
