import os
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from models.chatbot import (
    InquiryRequest,
    InquiryReplyRequest,
    InquiryResponseDto,
)
from services.chatbot import (
    EmailService,
)
from services.database_service import DatabaseService

router = APIRouter(prefix="/api/inquiry", tags=["inquiry"])

# 서비스 인스턴스
email_service = EmailService()

def get_db():
    """데이터베이스 서비스 의존성"""
    return DatabaseService()


# ============ Inquiry API ============

@router.post("")
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


@router.get("/all", response_model=List[InquiryResponseDto])
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


@router.post("/reply")
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
