"""
FAQ 검색 서비스 (비회원/회원 공통)
"""
import os
from typing import Dict, Any, Optional
from openai import OpenAI
from pinecone import Pinecone
from services.database_service import DatabaseService


class FaqService:
    """FAQ 검색 서비스 - RAG 기반 (키워드 + 벡터 검색)"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Pinecone FAQ 초기화
        self.pinecone_faq_enabled = False
        try:
            pinecone_api_key = os.getenv("PINECONE_FAQ_API_KEY")
            pinecone_host = os.getenv("PINECONE_FAQ_HOST")
            if pinecone_api_key and pinecone_host:
                pc = Pinecone(api_key=pinecone_api_key)
                self.faq_index = pc.Index(
                    name=os.getenv("PINECONE_FAQ_INDEX", "faq-index"),
                    host=pinecone_host
                )
                self.pinecone_faq_enabled = True
        except Exception as e:
            print(f"Pinecone FAQ 초기화 실패 (키워드 검색 사용): {str(e)}")

    def search_faq(self, message: str, user_type: str = "member", db: DatabaseService = None) -> Optional[Dict[str, Any]]:
        """
        FAQ 검색 (RAG: 키워드 우선 + 벡터 검색)

        Args:
            message: 사용자 메시지
            user_type: 'guest' 또는 'member'
            db: DatabaseService 인스턴스 (선택사항)

        Returns:
            매칭된 FAQ 또는 None
        """
        try:
            # ========== 1단계: 키워드 검색 (우선) ==========
            if db is None:
                db = DatabaseService()

            message_lower = message.lower()

            # FAQ 조회 (user_type 필터링)
            if user_type == "guest":
                query = """
                    SELECT * FROM faq
                    WHERE user_type IN ('guest', 'both')
                      AND is_active = true
                    ORDER BY priority DESC, id ASC
                """
            else:  # member
                query = """
                    SELECT * FROM faq
                    WHERE user_type IN ('member', 'both')
                      AND is_active = true
                    ORDER BY priority DESC, id ASC
                """

            faqs = db.execute_query(query)

            # 키워드 매칭 (우선순위 높은 순서대로)
            if faqs:
                # 1단계: 정확한 질문 매칭 (최우선)
                for faq in faqs:
                    if faq.get("question"):
                        question_lower = faq["question"].lower().strip()
                        if question_lower == message_lower:
                            return faq

                # 2단계: 키워드 매칭
                for faq in faqs:
                    keywords = faq.get("keywords") or []
                    if keywords:
                        for keyword in keywords:
                            keyword_lower = keyword.lower()
                            if keyword_lower in message_lower:
                                return faq

                # 3단계: 질문 포함 관계 확인 (매우 엄격하게)
                # 이 단계는 거의 매칭하지 않도록 임계값을 높임 (95% 이상)
                for faq in faqs:
                    if faq.get("question"):
                        question_lower = faq["question"].lower()
                        # 거의 완전히 일치하는 경우만 (95% 이상)
                        if len(question_lower) > 10 and len(message_lower) > 10:
                            if question_lower in message_lower and len(question_lower) / len(message_lower) > 0.95:
                                return faq
                            if message_lower in question_lower and len(message_lower) / len(question_lower) > 0.95:
                                return faq

            # ========== 2단계: 벡터 검색 (키워드 매칭 실패 시) ==========
            if self.pinecone_faq_enabled:
                try:
                    # 메시지 임베딩 생성
                    embedding_response = self.client.embeddings.create(
                        model="text-embedding-3-small",
                        input=message
                    )
                    query_embedding = embedding_response.data[0].embedding

                    # Pinecone에서 유사한 FAQ 검색 (user_type 필터 포함)
                    search_results = self.faq_index.query(
                        vector=query_embedding,
                        top_k=5,
                        include_metadata=True,
                        filter={"user_type": {"$in": [user_type, "both"]}}
                    )

                    # 유사도 임계값 (0.35 이상만) - 정확도 향상
                    if search_results.matches and search_results.matches[0].score >= 0.35:
                        best_match = search_results.matches[0]

                        # 벡터 ID가 곧 faq_id
                        faq_id = best_match.id

                        # DB에서 전체 FAQ 정보 조회
                        if db is None:
                            db = DatabaseService()

                        query = "SELECT * FROM faq WHERE id = %s AND is_active = true"
                        result = db.execute_query(query, (faq_id,))
                        if result:
                            # user_type 확인
                            faq_user_type = result[0].get("user_type")
                            if faq_user_type in [user_type, "both"]:
                                return result[0]

                except Exception as e:
                    print(f"벡터 검색 실패: {str(e)}")

            return None

        except Exception as e:
            print(f"FAQ 검색 오류: {str(e)}")
            return None
