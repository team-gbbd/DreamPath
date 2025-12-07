"""
FAQ 검색 서비스 (공통)
"""
from typing import Dict, Any, Optional
from services.database_service import DatabaseService


class FaqService:
    """FAQ 검색 서비스"""

    def search_faq(self, message: str, user_type: str = "guest", db: DatabaseService = None) -> Optional[Dict[str, Any]]:
        """
        FAQ 검색 - 키워드 기반 매칭

        Args:
            message: 사용자 질문
            user_type: "guest" 또는 "member"
            db: DatabaseService 인스턴스

        Returns:
            매칭된 FAQ 또는 None
        """
        if not db:
            return None

        try:
            # user_type에 맞는 FAQ 조회 (우선순위 높은 순)
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

            if not faqs:
                return None

            # 키워드 매칭
            message_lower = message.lower()

            for faq in faqs:
                keywords = faq.get("keywords", "")
                if not keywords:
                    continue

                # 쉼표로 구분된 키워드 리스트
                keyword_list = [k.strip().lower() for k in keywords.split(",")]

                # 키워드가 메시지에 포함되어 있는지 확인
                if any(keyword in message_lower for keyword in keyword_list if keyword):
                    return faq

            return None

        except Exception as e:
            print(f"FAQ 검색 오류: {str(e)}")
            return None