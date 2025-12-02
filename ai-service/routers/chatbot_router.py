import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from models.chatbot import (
    ChatRequestDto,
    ChatResponse,
    FaqRequest,
    FaqUpdateRequest,
    InquiryRequest,
    InquiryReplyRequest,
    InquiryResponseDto,
)
from services.chatbot import (
    RagEmbeddingService,
    RagSearchService,
    RagAnswerService,
    EmailService,
)
from services.database_service import DatabaseService

router = APIRouter(prefix="/api", tags=["chatbot"])

# 서비스 인스턴스
embedding_service = RagEmbeddingService()
search_service = RagSearchService()
answer_service = RagAnswerService()
email_service = EmailService()


def get_db():
    """데이터베이스 서비스 의존성"""
    return DatabaseService()


# ============ Chat RAG API ============

@router.post("/chat-rag/message", response_model=ChatResponse)
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

        # 4. RAG 답변 생성
        vector = embedding_service.embed(dto.message)
        matches = search_service.search(vector)
        answer = answer_service.generate_answer(dto.message, matches)

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


@router.get("/chat-rag/history/{session_id}")
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


# ============ FAQ API ============

@router.get("/faq/all")
async def get_all_faq(db: DatabaseService = Depends(get_db)):
    """모든 FAQ 조회"""
    try:
        query = "SELECT * FROM faq ORDER BY id"
        faqs = db.execute_query(query)
        return faqs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FAQ 조회 실패: {str(e)}")


@router.get("/faq/category")
async def get_faq_by_category(name: str, db: DatabaseService = Depends(get_db)):
    """카테고리별 FAQ 조회"""
    try:
        query = "SELECT * FROM faq WHERE category = %s ORDER BY id"
        faqs = db.execute_query(query, (name,))
        return faqs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FAQ 조회 실패: {str(e)}")


@router.get("/faq/{faq_id}")
async def get_faq_by_id(faq_id: int, db: DatabaseService = Depends(get_db)):
    """단일 FAQ 조회"""
    try:
        query = "SELECT * FROM faq WHERE id = %s"
        faq = db.execute_query(query, (faq_id,))

        if not faq:
            return {"success": False, "message": "FAQ를 찾을 수 없습니다."}

        return {"success": True, "data": faq[0]}

    except Exception as e:
        return {"success": False, "message": f"FAQ 조회 중 오류가 발생했습니다: {str(e)}"}


@router.post("/faq")
async def create_faq(request: FaqRequest, db: DatabaseService = Depends(get_db)):
    """FAQ 생성"""
    try:
        if not request.category or not request.question or not request.answer:
            return {
                "success": False,
                "message": "카테고리, 질문, 답변은 필수 입력 항목입니다."
            }

        # DB에 저장 (PostgreSQL RETURNING 사용)
        insert_query = """
            INSERT INTO faq (question, answer, category, updated_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id, question, answer, category, updated_at
        """
        result = db.execute_query(
            insert_query,
            (request.question, request.answer, request.category, datetime.now())
        )
        saved_faq = result[0]

        # Pinecone에 업로드
        try:
            await upload_to_pinecone(saved_faq)
        except Exception as e:
            print(f"Pinecone 업로드 실패: {str(e)}")

        return {
            "success": True,
            "message": "FAQ가 성공적으로 생성되었습니다.",
            "data": saved_faq
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"FAQ 생성 중 오류가 발생했습니다: {str(e)}"
        }


@router.put("/faq/{faq_id}")
async def update_faq(
    faq_id: int,
    request: FaqUpdateRequest,
    db: DatabaseService = Depends(get_db)
):
    """FAQ 수정"""
    try:
        # 기존 FAQ 확인
        select_query = "SELECT * FROM faq WHERE id = %s"
        faq = db.execute_query(select_query, (faq_id,))

        if not faq:
            return {"success": False, "message": "FAQ를 찾을 수 없습니다."}

        # 업데이트할 필드 구성
        update_fields = []
        params = []

        if request.category is not None:
            update_fields.append("category = %s")
            params.append(request.category)
        if request.question is not None:
            update_fields.append("question = %s")
            params.append(request.question)
        if request.answer is not None:
            update_fields.append("answer = %s")
            params.append(request.answer)

        update_fields.append("updated_at = %s")
        params.append(datetime.now())
        params.append(faq_id)

        # 업데이트 실행
        update_query = f"UPDATE faq SET {', '.join(update_fields)} WHERE id = %s"
        db.execute_update(update_query, tuple(params))

        # 업데이트된 FAQ 조회
        updated_faq = db.execute_query(select_query, (faq_id,))[0]

        # Pinecone에 업데이트
        try:
            await upload_to_pinecone(updated_faq)
        except Exception as e:
            print(f"Pinecone 업데이트 실패: {str(e)}")

        return {
            "success": True,
            "message": "FAQ가 성공적으로 수정되었습니다.",
            "data": updated_faq
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"FAQ 수정 중 오류가 발생했습니다: {str(e)}"
        }


@router.delete("/faq/{faq_id}")
async def delete_faq(faq_id: int, db: DatabaseService = Depends(get_db)):
    """FAQ 삭제"""
    try:
        # FAQ 존재 확인
        check_query = "SELECT * FROM faq WHERE id = %s"
        faq = db.execute_query(check_query, (faq_id,))

        if not faq:
            return {"success": False, "message": "FAQ를 찾을 수 없습니다."}

        # DB에서 삭제
        delete_query = "DELETE FROM faq WHERE id = %s"
        db.execute_update(delete_query, (faq_id,))

        # Pinecone에서 삭제
        try:
            await delete_from_pinecone(faq_id)
        except Exception as e:
            print(f"Pinecone 삭제 실패: {str(e)}")

        return {
            "success": True,
            "message": "FAQ가 성공적으로 삭제되었습니다."
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"FAQ 삭제 중 오류가 발생했습니다: {str(e)}"
        }


@router.post("/faq/sync-pinecone")
async def sync_to_pinecone(db: DatabaseService = Depends(get_db)):
    """모든 FAQ를 Pinecone에 동기화"""
    try:
        query = "SELECT * FROM faq"
        all_faqs = db.execute_query(query)

        if not all_faqs:
            return {
                "success": False,
                "message": "동기화할 FAQ가 없습니다."
            }

        success_count = 0
        fail_count = 0

        for faq in all_faqs:
            try:
                await upload_to_pinecone(faq)
                success_count += 1
            except Exception as e:
                print(f"FAQ #{faq['id']} 동기화 실패: {str(e)}")
                fail_count += 1

        return {
            "success": True,
            "message": "Pinecone 동기화 완료",
            "total": len(all_faqs),
            "successCount": success_count,
            "failedCount": fail_count
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Pinecone 동기화 중 오류가 발생했습니다: {str(e)}"
        }


# ============ Inquiry API ============

@router.post("/inquiry")
async def create_inquiry(request: InquiryRequest, db: DatabaseService = Depends(get_db)):
    """문의 생성"""
    try:
        if not request.name or not request.name.strip():
            return {"success": False, "message": "이름을 입력해주세요."}

        if not request.email or not request.email.strip():
            return {"success": False, "message": "이메일을 입력해주세요."}

        if not request.content or not request.content.strip():
            return {"success": False, "message": "문의 내용을 입력해주세요."}

        print(f"📬 문의 접수 - userId: {request.userId}, sessionId: {request.sessionId}")

        # 문의 저장 (PostgreSQL RETURNING 사용)
        insert_query = """
            INSERT INTO inquiry (user_id, session_id, name, email, content, created_at, answered)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        result = db.execute_query(
            insert_query,
            (
                request.userId,
                request.sessionId,
                request.name.strip(),
                request.email.strip(),
                request.content.strip(),
                datetime.now(),
                False
            )
        )
        saved_inquiry = result[0]

        print(f"✅ 문의 저장 완료 - ID: {saved_inquiry['id']}")

        return {
            "success": True,
            "message": "문의가 성공적으로 접수되었습니다.",
            "data": saved_inquiry
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"문의 접수 중 오류가 발생했습니다: {str(e)}"
        }


@router.get("/inquiry/all", response_model=List[InquiryResponseDto])
async def get_all_inquiries(db: DatabaseService = Depends(get_db)):
    """모든 문의 조회 (관리자용)"""
    try:
        query = """
            SELECT i.*, u.user_id as user_user_id, u.name as user_name, u.email as user_email
            FROM inquiry i
            LEFT JOIN users u ON i.user_id = u.user_id
            ORDER BY i.created_at DESC
        """
        inquiries = db.execute_query(query)

        # DTO 형식으로 변환
        result = []
        for inquiry in inquiries:
            user_info = None
            if inquiry.get('user_user_id'):
                user_info = {
                    "userId": inquiry['user_user_id'],
                    "name": inquiry['user_name'],
                    "email": inquiry['user_email']
                }

            result.append({
                "id": inquiry['id'],
                "user": user_info,
                "name": inquiry['name'],
                "email": inquiry['email'],
                "content": inquiry['content'],
                "answered": inquiry['answered'],
                "answeredAt": inquiry.get('answered_at'),
                "replyContent": inquiry.get('reply_content'),
                "createdAt": inquiry['created_at']
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문의 조회 실패: {str(e)}")


@router.post("/inquiry/reply")
async def send_reply(request: InquiryReplyRequest, db: DatabaseService = Depends(get_db)):
    """문의 답변 이메일 전송"""
    try:
        # 문의 확인 및 업데이트
        inquiry = None
        if request.inquiryId:
            inquiry_query = "SELECT * FROM inquiry WHERE id = %s"
            inquiry_result = db.execute_query(inquiry_query, (request.inquiryId,))

            if not inquiry_result:
                return {"success": False, "message": "문의를 찾을 수 없습니다."}

            inquiry = inquiry_result[0]

        # 이메일 전송
        email_service.send_inquiry_reply(
            request.recipientEmail,
            request.recipientName,
            request.inquiryContent,
            request.replyContent
        )

        # 답변 완료 상태로 업데이트
        if inquiry:
            update_query = """
                UPDATE inquiry
                SET answered = %s, answered_at = %s, reply_content = %s
                WHERE id = %s
            """
            db.execute_update(
                update_query,
                (True, datetime.now(), request.replyContent, request.inquiryId)
            )
            print(f"✅ 문의 답변 완료 처리: ID {request.inquiryId}")

        return {
            "success": True,
            "message": "답변이 성공적으로 전송되었습니다."
        }

    except Exception as e:
        print(f"❌ 답변 전송 실패: {str(e)}")
        return {
            "success": False,
            "message": f"답변 전송에 실패했습니다: {str(e)}"
        }


# ============ Helper Functions ============

async def upload_to_pinecone(faq: Dict[str, Any]):
    """FAQ를 Pinecone에 업로드/업데이트"""
    faq_id = str(faq["id"])
    text = f"{faq['category']}\n{faq['question']}\n{faq['answer']}"

    # 임베딩 생성
    embedding = embedding_service.embed(text)

    # Pinecone 업서트
    pinecone_api_key = os.getenv("PINECONE_FAQ_API_KEY")
    pinecone_host = os.getenv("PINECONE_FAQ_HOST")

    if not pinecone_api_key or not pinecone_host:
        raise RuntimeError("Pinecone 설정이 없습니다.")

    url = f"https://{pinecone_host}/vectors/upsert"
    headers = {
        "Api-Key": pinecone_api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "vectors": [
            {
                "id": faq_id,
                "values": embedding,
                "metadata": {
                    "category": faq["category"],
                    "question": faq["question"],
                    "answer": faq["answer"]
                }
            }
        ]
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()

    print(f"✅ FAQ #{faq_id} Pinecone 업로드 완료")


async def delete_from_pinecone(faq_id: int):
    """FAQ를 Pinecone에서 삭제"""
    pinecone_api_key = os.getenv("PINECONE_FAQ_API_KEY")
    pinecone_host = os.getenv("PINECONE_FAQ_HOST")

    if not pinecone_api_key or not pinecone_host:
        raise RuntimeError("Pinecone 설정이 없습니다.")

    url = f"https://{pinecone_host}/vectors/delete"
    headers = {
        "Api-Key": pinecone_api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "ids": [str(faq_id)]
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()

    print(f"✅ FAQ #{faq_id} Pinecone에서 삭제 완료")