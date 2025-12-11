import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from models.chatbot import (
    ChatRequestDto,
    ChatResponse,
)
from services.chatbot import (
    RagEmbeddingService,
    RagSearchService,
    RagAnswerService,
)
from services.chatbot.shared.faq_service import FaqService
from services.database_service import DatabaseService
from dependencies import get_db

router = APIRouter(prefix="/api/rag", tags=["rag-chatbot"])

# 서비스 인스턴스 (싱글톤)
embedding_service = RagEmbeddingService()
search_service = RagSearchService()
answer_service = RagAnswerService()
faq_service = FaqService()
db_service = DatabaseService()


def get_db():
    """데이터베이스 서비스 의존성 (싱글톤 인스턴스 재사용)"""
    return db_service


# ============ Chat RAG API ============

@router.post("/chat", response_model=ChatResponse)
async def chat(dto: ChatRequestDto, db: DatabaseService = Depends(get_db)):
    """챗봇 메시지 처리"""
    try:
        # 1. User 조회 (비회원이면 None)
        user = None
        if dto.userId:
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
                INSERT INTO chatbot_sessions (id, cb_user_id, guest_id, conversation_title, created_at)
                VALUES (%s, %s, %s, %s, %s)
            """
            db.execute_update(
                insert_session_query,
                (str(session_id), dto.userId, dto.guestId, dto.conversationTitle, datetime.now())
            )
        else:
            session_id = dto.sessionId
            # 기존 세션 확인
            session_query = "SELECT * FROM chatbot_sessions WHERE id = %s"
            session_result = db.execute_query(session_query, (str(session_id),))
            if not session_result:
                raise HTTPException(status_code=404, detail=f"Session not found with id: {session_id}")

        # 3. 사용자 메시지 저장
        insert_user_msg_query = """
            INSERT INTO chatbot_messages (cb_session_id, cb_user_id, guest_id, role, message, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        db.execute_update(
            insert_user_msg_query,
            (str(session_id), dto.userId, dto.guestId, "user", dto.message, datetime.now())
        )

        # 4. FAQ 검색 먼저 시도
        user_type = "member" if dto.userId else "guest"
        print(f"\n{'='*60}")
        print(f"[ROUTER] user_type={user_type}, 질문: {dto.message}")

        faq_match = faq_service.search_faq(dto.message, user_type=user_type, db=db)

        if faq_match:
            # FAQ 매칭되면 FAQ 답변 반환
            answer = faq_match.get("answer", "답변을 찾을 수 없습니다.")
            print(f"[FAQ 매칭 ✅] 카테고리: {faq_match.get('category')}, 질문: {faq_match.get('question')}")
        else:
            # FAQ 매칭 안되면 RAG 답변 생성
            print("[FAQ 매칭 실패] RAG로 답변 생성 시도...")
            vector = embedding_service.embed(dto.message)
            print(f"[RAG] 임베딩 벡터 생성 완료 (차원: {len(vector)})")
            matches = search_service.search(vector, user_type=user_type)
            print(f"[RAG] Pinecone 검색 결과 개수: {len(matches)}")

            if matches:
                for i, match in enumerate(matches[:3]):
                    score = match.get('score', 0)
                    metadata = match.get('metadata', {})
                    question = metadata.get('question', 'N/A')
                    print(f"  [{i+1}] 유사도: {score:.3f}, 질문: {question[:50]}")

            answer = answer_service.generate_answer(dto.message, matches)

        print(f"[최종 답변] {answer[:100]}...")
        print(f"{'='*60}\n")

        # 5. AI 답변 저장
        insert_ai_msg_query = """
            INSERT INTO chatbot_messages (cb_session_id, cb_user_id, guest_id, role, message, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        db.execute_update(
            insert_ai_msg_query,
            (str(session_id), dto.userId, dto.guestId, "assistant", answer, datetime.now())
        )

        # 6. 응답 반환
        return ChatResponse(session=session_id, response=answer)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"챗봇 메시지 처리 실패: {str(e)}")


@router.get("/history/{session_id}")
async def get_history(session_id: UUID, db: DatabaseService = Depends(get_db)):
    """챗봇 히스토리 조회"""
    try:
        query = """
            SELECT role, message
            FROM chatbot_messages
            WHERE cb_session_id = %s
            ORDER BY created_at ASC
        """
        messages = db.execute_query(query, (str(session_id),))

        history = [{"role": msg["role"], "text": msg["message"]} for msg in messages]
        return {"history": history}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"히스토리 조회 실패: {str(e)}")
