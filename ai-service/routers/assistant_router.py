"""
회원용 AI 챗봇 비서 라우터 (Function Calling 전용)
"""
from fastapi import APIRouter, HTTPException, Depends
from uuid import UUID, uuid4
from datetime import datetime

from models.chatbotassistant import AssistantChatRequest, AssistantChatResponse
from services.chatbot.assistant import AssistantService
from services.database_service import DatabaseService
from dependencies import get_db

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

# 서비스 인스턴스 (싱글톤)
assistant_service = AssistantService()
db_service = DatabaseService()


def get_db():
    """데이터베이스 서비스 의존성 (싱글톤 인스턴스 재사용)"""
    return db_service


@router.post("/chat", response_model=AssistantChatResponse)
async def chat(dto: AssistantChatRequest, db: DatabaseService = Depends(get_db)):
    """회원용 AI 챗봇 비서"""
    try:
        # 1. User 조회 (회원 전용이므로 필수)
        user_query = "SELECT * FROM users WHERE user_id = %s"
        user_result = db.execute_query(user_query, (dto.userId,))
        if not user_result:
            raise HTTPException(status_code=404, detail=f"User not found with id: {dto.userId}")
        user = user_result[0]

        # 2. 세션 생성 또는 조회
        if not dto.sessionId:
            # 새 세션 생성
            session_id = uuid4()
            insert_session_query = """
                INSERT INTO chatbot_sessions (id, cb_user_id, conversation_title, created_at)
                VALUES (%s, %s, %s, %s)
            """
            db.execute_update(
                insert_session_query,
                (str(session_id), dto.userId, dto.conversationTitle, datetime.now())
            )
        else:
            session_id = dto.sessionId
            # 기존 세션 확인
            session_query = "SELECT * FROM chatbot_sessions WHERE id = %s AND cb_user_id = %s"
            session_result = db.execute_query(session_query, (str(session_id), dto.userId))
            if not session_result:
                raise HTTPException(
                    status_code=404,
                    detail=f"Session not found or unauthorized"
                )

        # 3. 대화 히스토리 조회 (Function Calling에 컨텍스트 제공)
        history_query = """
            SELECT role, message
            FROM chatbot_messages
            WHERE cb_session_id = %s
            ORDER BY created_at ASC
        """
        history_result = db.execute_query(history_query, (str(session_id),))
        conversation_history = [
            {"role": msg["role"], "content": msg["message"]}
            for msg in (history_result or [])
        ]

        # 4. 사용자 메시지 저장
        insert_user_msg_query = """
            INSERT INTO chatbot_messages (cb_session_id, cb_user_id, role, message, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        db.execute_update(
            insert_user_msg_query,
            (str(session_id), dto.userId, "user", dto.message, datetime.now())
        )

        # 5. AI 응답 생성 (Function Calling)
        answer = assistant_service.chat(
            user_id=dto.userId,
            message=dto.message,
            conversation_history=conversation_history,
            db=db,
            function_name=dto.functionName  # FAQ 직접 호출용
        )

        # 6. AI 답변 저장
        insert_ai_msg_query = """
            INSERT INTO chatbot_messages (cb_session_id, cb_user_id, role, message, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        db.execute_update(
            insert_ai_msg_query,
            (str(session_id), dto.userId, "assistant", answer, datetime.now())
        )

        # 7. 응답 반환
        return AssistantChatResponse(session=session_id, response=answer)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 비서 처리 실패: {str(e)}")


@router.get("/history/{session_id}")
async def get_history(session_id: UUID, user_id: int, db: DatabaseService = Depends(get_db)):
    """챗봇 비서 히스토리 조회 (회원 전용)"""
    try:
        # 세션이 해당 사용자의 것인지 확인
        session_query = "SELECT * FROM chatbot_sessions WHERE id = %s AND cb_user_id = %s"
        session_result = db.execute_query(session_query, (str(session_id), user_id))
        if not session_result:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")

        # 히스토리 조회
        query = """
            SELECT role, message, created_at
            FROM chatbot_messages
            WHERE cb_session_id = %s
            ORDER BY created_at ASC
        """
        messages = db.execute_query(query, (str(session_id),))

        history = [
            {
                "role": msg["role"],
                "text": msg["message"],
                "created_at": str(msg["created_at"])
            }
            for msg in (messages or [])
        ]
        return {"history": history}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"히스토리 조회 실패: {str(e)}")


@router.get("/sessions")
async def get_user_sessions(user_id: int, db: DatabaseService = Depends(get_db)):
    """사용자의 챗봇 비서 세션 목록 조회"""
    try:
        query = """
            SELECT id, conversation_title, created_at
            FROM chatbot_sessions
            WHERE cb_user_id = %s
            ORDER BY created_at DESC
        """
        sessions = db.execute_query(query, (user_id,))

        return {
            "sessions": [
                {
                    "id": str(session["id"]),
                    "title": session["conversation_title"],
                    "created_at": str(session["created_at"])
                }
                for session in (sessions or [])
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"세션 목록 조회 실패: {str(e)}")
