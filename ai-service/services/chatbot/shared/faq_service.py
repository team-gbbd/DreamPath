"""
FAQ 검색 서비스 (공통)
"""
from typing import Dict, Any, Optional
from services.database_service import DatabaseService


class FaqService:
    """FAQ 검색 서비스"""

    def search_faq(self, message: str, user_type: str = "guest", db: DatabaseService = None) -> Optional[Dict[str, Any]]:
        """
        FAQ 검색 - 질문 텍스트 매칭

        Args:
            message: 사용자 질문
            user_type: "guest", "member", "assistant"
            db: DatabaseService 인스턴스

        Returns:
            매칭된 FAQ 또는 None
        """
        if not db:
            return None

        try:
            # user_type에 맞는 FAQ 조회 (우선순위 높은 순)
            if user_type == "guest":
                user_type_filter = "('guest', 'both')"
            elif user_type == "member":
                user_type_filter = "('member', 'both')"
            elif user_type == "assistant":
                user_type_filter = "('assistant')"
            else:
                user_type_filter = "('guest', 'both')"  # 기본값

            query = f"""
                SELECT * FROM faq
                WHERE user_type IN {user_type_filter}
                  AND is_active = true
                ORDER BY priority DESC, id ASC
            """

            faqs = db.execute_query(query)

            if not faqs:
                return None

            # FAQ 질문 매칭 (완전 일치 또는 부분 일치)
            message_lower = message.lower()

            for faq in faqs:
                faq_question = faq.get("question", "").lower()

                # 질문이 정확히 일치하거나, 서로 포함 관계에 있으면 매칭
                if faq_question and (faq_question == message_lower or faq_question in message_lower or message_lower in faq_question):
                    return faq

            return None

        except Exception as e:
            print(f"FAQ 검색 오류: {str(e)}")
            return None