import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime

from models.chatbot import (
    FaqRequest,
    FaqUpdateRequest,
)
from services.chatbot.rag import (
    RagEmbeddingService,
)
from services.database_service import DatabaseService
from dependencies import get_db

router = APIRouter(prefix="/api/faq", tags=["faq"])

# 서비스 인스턴스 (싱글톤)
embedding_service = RagEmbeddingService()
db_service = DatabaseService()

def get_db():
    """데이터베이스 서비스 의존성 (싱글톤 인스턴스 재사용)"""
    return db_service


# ============ FAQ 관리 API ============

@router.get("/all")
async def get_all_faq(
    user_type: str = "all",  # 'guest', 'member', 'all'
    db: DatabaseService = Depends(get_db)
):
    """
    사용자 타입별 FAQ 조회
    - guest: guest + both FAQ만 조회
    - member: member + both FAQ 조회
    - all: 모든 FAQ 조회 (관리자용)
    """
    try:
        if user_type == "guest":
            query = """
                SELECT * FROM faq
                WHERE user_type IN ('guest', 'both')
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        elif user_type == "member":
            query = """
                SELECT * FROM faq
                WHERE user_type IN ('member', 'both')
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        else:  # all
            query = """
                SELECT * FROM faq
                WHERE is_active = true
                ORDER BY priority DESC, id ASC
            """

        faqs = db.execute_query(query)
        return faqs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FAQ 조회 실패: {str(e)}")


@router.get("/categories")
async def get_faq_categories(
    user_type: str = "guest",  # 'guest', 'member', 'both', 'assistant', 'all'
    db: DatabaseService = Depends(get_db)
):
    """사용자 타입별 카테고리 목록 조회"""
    try:
        if user_type == "guest":
            query = """
                SELECT DISTINCT category
                FROM faq
                WHERE user_type IN ('guest', 'both')
                  AND is_active = true
                ORDER BY category
            """
        elif user_type == "member":
            query = """
                SELECT DISTINCT category
                FROM faq
                WHERE user_type IN ('member', 'both')
                  AND is_active = true
                ORDER BY category
            """
        elif user_type == "both":
            # both는 member + guest 공통 (assistant 제외)
            query = """
                SELECT DISTINCT category
                FROM faq
                WHERE user_type = 'both'
                  AND is_active = true
                ORDER BY category
            """
        elif user_type == "assistant":
            query = """
                SELECT DISTINCT category
                FROM faq
                WHERE user_type = 'assistant'
                  AND is_active = true
                ORDER BY category
            """
        else:  # all (관리자용)
            query = """
                SELECT DISTINCT category
                FROM faq
                WHERE is_active = true
                ORDER BY category
            """

        results = db.execute_query(query)
        # 결과가 [{'category': 'A'}, {'category': 'B'}] 형태이므로 리스트로 변환
        categories = [row['category'] for row in results if row.get('category')]
        return categories

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리 조회 실패: {str(e)}")


@router.get("/category")
async def get_faq_by_category(
    name: str,
    user_type: str = "guest",
    db: DatabaseService = Depends(get_db)
):
    """카테고리별 FAQ 조회 (사용자 타입별 필터링)"""
    try:
        if user_type == "guest":
            # 비회원: guest + both FAQ 모두 조회
            query = """
                SELECT * FROM faq
                WHERE category = %s
                  AND user_type IN ('guest', 'both')
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        elif user_type == "member":
            # 회원: member + both FAQ 모두 조회
            query = """
                SELECT * FROM faq
                WHERE category = %s
                  AND user_type IN ('member', 'both')
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        elif user_type == "both":
            # 공통: both만 조회
            query = """
                SELECT * FROM faq
                WHERE category = %s
                  AND user_type = 'both'
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        elif user_type == "assistant":
            # 챗봇 비서: assistant만 조회
            query = """
                SELECT * FROM faq
                WHERE category = %s
                  AND user_type = 'assistant'
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """
        else:  # all (관리자용)
            query = """
                SELECT * FROM faq
                WHERE category = %s
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """

        faqs = db.execute_query(query, (name,))
        return faqs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FAQ 조회 실패: {str(e)}")


@router.get("/{faq_id}")
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


@router.post("")
async def create_faq(request: FaqRequest, db: DatabaseService = Depends(get_db)):
    """FAQ 생성 (정적/동적 답변 모두 지원)"""
    try:
        # 유효성 검사
        if not request.category or not request.question:
            return {
                "success": False,
                "message": "카테고리와 질문은 필수 입력 항목입니다."
            }

        # answer_type에 따른 검증
        if request.answer_type == "static" and not request.answer:
            return {
                "success": False,
                "message": "정적 답변 타입은 answer가 필수입니다."
            }

        if request.answer_type == "function" and not request.function_name:
            return {
                "success": False,
                "message": "동적 답변 타입은 function_name이 필수입니다."
            }

        # DB에 저장
        insert_query = """
            INSERT INTO faq (
                question, answer, category, user_type, answer_type,
                function_name, function_description, keywords, priority, is_active,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        result = db.execute_query(
            insert_query,
            (
                request.question,
                request.answer,
                request.category,
                request.user_type,
                request.answer_type,
                request.function_name,
                request.function_description,
                request.keywords,
                request.priority,
                request.is_active,
                datetime.now(),
                datetime.now()
            )
        )
        saved_faq = result[0]

        # Pinecone에 업로드 (static + function 모두)
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


@router.put("/{faq_id}")
async def update_faq(
    faq_id: int,
    request: FaqUpdateRequest,
    db: DatabaseService = Depends(get_db)
):
    """FAQ 수정 (모든 필드 지원)"""
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
        if request.user_type is not None:
            update_fields.append("user_type = %s")
            params.append(request.user_type)
        if request.answer_type is not None:
            update_fields.append("answer_type = %s")
            params.append(request.answer_type)
        if request.function_name is not None:
            update_fields.append("function_name = %s")
            params.append(request.function_name)
        if request.function_description is not None:
            update_fields.append("function_description = %s")
            params.append(request.function_description)
        if request.keywords is not None:
            update_fields.append("keywords = %s")
            params.append(request.keywords)
        if request.priority is not None:
            update_fields.append("priority = %s")
            params.append(request.priority)
        if request.is_active is not None:
            update_fields.append("is_active = %s")
            params.append(request.is_active)

        update_fields.append("updated_at = %s")
        params.append(datetime.now())
        params.append(faq_id)

        # 업데이트 실행
        update_query = f"UPDATE faq SET {', '.join(update_fields)} WHERE id = %s"
        db.execute_update(update_query, tuple(params))

        # 업데이트된 FAQ 조회
        updated_faq = db.execute_query(select_query, (faq_id,))[0]

        # Pinecone에 업데이트 (static + function 모두)
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


@router.delete("/{faq_id}")
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


@router.post("/sync-pinecone")
async def sync_to_pinecone(db: DatabaseService = Depends(get_db)):
    """모든 FAQ를 Pinecone에 동기화 (static + function 모두)"""
    try:
        # 모든 활성 FAQ 조회
        query = "SELECT * FROM faq WHERE is_active = true"
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


# ============ Helper Functions ============

async def upload_to_pinecone(faq: Dict[str, Any]):
    """FAQ를 Pinecone에 업로드/업데이트 (static + function 모두 지원)"""
    faq_id = str(faq["id"])
    answer_type = faq.get("answer_type", "static")

    # 임베딩용 텍스트 생성 (question + keywords 조합 - 유사 질문 매칭 향상)
    keywords = faq.get('keywords') or []
    if isinstance(keywords, list):
        keywords_str = ' '.join(keywords)
    else:
        keywords_str = str(keywords) if keywords else ''

    text = f"{faq['question']} {keywords_str}".strip()

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

    # metadata 구성
    metadata = {
        "category": faq["category"],
        "question": faq["question"],
        "user_type": faq.get("user_type", "guest"),
        "answer_type": answer_type
    }

    # static이면 answer 추가, function이면 function_name 추가
    if answer_type == "function":
        metadata["function_name"] = faq.get("function_name")
        metadata["function_description"] = faq.get("function_description")
    else:
        metadata["answer"] = faq.get("answer")

    payload = {
        "vectors": [
            {
                "id": faq_id,
                "values": embedding,
                "metadata": metadata
            }
        ]
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()


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
