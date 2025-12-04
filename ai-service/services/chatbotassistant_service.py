"""
회원용 AI 챗봇 비서 서비스 (Function Calling)
"""
import os
import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from services.database_service import DatabaseService
from pinecone import Pinecone


class ChatbotAssistantService:
    """회원용 챗봇 비서 - OpenAI Function Calling 사용"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

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

        # Function Calling 정의
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_mentoring_bookings",
                    "description": "사용자의 멘토링 예약 목록을 조회합니다. 예약 날짜, 시간, 멘토 정보, 상태 등을 확인할 수 있습니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "integer",
                                "description": "조회할 사용자의 ID"
                            },
                            "status": {
                                "type": "string",
                                "enum": ["PENDING", "CONFIRMED", "CANCELLED", "REJECTED", "COMPLETED"],
                                "description": "필터링할 예약 상태 (선택사항)"
                            }
                        },
                        "required": ["user_id"]
                    }
                }
            }
        ]

    def get_mentoring_bookings(self, user_id: int, status: Optional[str] = None, db: DatabaseService = None) -> List[Dict[str, Any]]:
        """멘토링 예약 조회"""
        try:
            if db is None:
                db = DatabaseService()

            # SQL 쿼리
            query = """
                SELECT
                    mb.booking_id,
                    mb.booking_date,
                    mb.time_slot,
                    mb.message as mentee_message,
                    mb.status,
                    mb.rejection_reason,
                    mb.meeting_url,
                    mb.created_at,
                    ms.title as session_title,
                    ms.description as session_description,
                    ms.duration_minutes,
                    ms.price,
                    m.company as mentor_company,
                    m.job as mentor_job,
                    u.name as mentor_name
                FROM mentoring_bookings mb
                JOIN mentoring_sessions ms ON mb.session_id = ms.session_id
                JOIN mentors m ON ms.mentor_id = m.mentor_id
                JOIN users u ON m.user_id = u.user_id
                WHERE mb.mentee_id = %s
            """

            params = [user_id]

            # 상태 필터 추가
            if status:
                query += " AND mb.status = %s"
                params.append(status)

            query += " ORDER BY mb.booking_date DESC, mb.time_slot DESC"

            bookings = db.execute_query(query, tuple(params))

            # time_slot 포맷팅 (HH:MM 형식으로 변환)
            for booking in bookings:
                time_slot = booking.get('time_slot')
                if time_slot:
                    time_slot_str = str(time_slot)
                    if ':' in time_slot_str:
                        try:
                            # "03:50:44.732680" → "3:50"
                            time_str = time_slot_str.split('.')[0]
                            time_parts = time_str.split(':')
                            hour = int(time_parts[0])
                            minute = int(time_parts[1])
                            booking['time_slot'] = f"{hour}:{minute:02d}"
                        except:
                            pass

            return bookings if bookings else []

        except Exception as e:
            print(f"멘토링 예약 조회 오류: {str(e)}")
            return []

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
                for faq in faqs:
                    keywords = faq.get("keywords") or []

                    # 키워드 양방향 매칭: 키워드가 메시지에 포함 OR 메시지가 키워드에 포함
                    if keywords:
                        for keyword in keywords:
                            keyword_lower = keyword.lower()
                            # 양방향 매칭으로 "멘토링 예약"도 "멘토링 예약 확인"과 매칭
                            if keyword_lower in message_lower or message_lower in keyword_lower:
                                return faq

                    # 질문 자체가 비슷한지 확인 (양방향)
                    if faq.get("question"):
                        question_lower = faq["question"].lower()
                        if question_lower in message_lower or message_lower in question_lower:
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

    def execute_function(self, function_name: str, arguments: Dict[str, Any], db: DatabaseService = None) -> str:
        """함수 실행 - 동적으로 메서드 찾아서 실행"""
        # 메서드가 존재하는지 확인
        if hasattr(self, function_name):
            method = getattr(self, function_name)
            # db 파라미터 추가
            result = method(**arguments, db=db)
            return json.dumps(result, ensure_ascii=False, default=str)

        return json.dumps({"error": f"Unknown function: {function_name}"}, ensure_ascii=False)

    def chat(self, user_id: int, message: str, conversation_history: List[Dict[str, str]] = None, db: DatabaseService = None) -> str:
        try:
            # ========== 1단계: FAQ 검색 (빠른 응답) ==========
            matched_faq = self.search_faq(message, user_type="member", db=db)

            if matched_faq:
                answer_type = matched_faq.get("answer_type")

                # 정적 답변 - 바로 반환
                if answer_type == "static":
                    return matched_faq.get("answer", "답변을 찾을 수 없습니다.")

            # ========== 2단계: OpenAI Function Calling (유연한 대화) ==========
            messages = conversation_history or []

            # 시스템 메시지 추가 (첫 메시지인 경우)
            if not messages:
                messages.append({
                    "role": "system",
                    "content": f"""당신은 DreamPath의 회원 전용 AI 비서입니다.
사용자 ID는 {user_id}입니다.

**역할:**
- DreamPath 서비스 관련 질문에 답변합니다.
- 사용자가 데이터 조회를 요청하면 적절한 함수를 호출하여 실제 데이터를 제공하세요.
- 서비스와 무관한 일상 대화나 일반 상식 질문은 정중히 거절하세요.

**응답 원칙:**
- 마크다운 형식으로 답변하세요.
- 데이터 조회가 필요한 경우 추측하지 말고 함수를 사용하세요.
- DreamPath 서비스 외 질문은 다음과 같이 거절하세요:
  "죄송하지만, 저는 DreamPath 서비스 전용 AI 비서입니다. 서비스 이용 관련 질문만 답변드릴 수 있습니다. DreamPath와 관련된 질문이 있으시면 언제든지 말씀해 주세요! 😊"

사용자의 질문 의도를 파악하고 적절히 한국어로 대응하세요."""
                })

            # 사용자 메시지 추가
            messages.append({"role": "user", "content": message})

            # OpenAI API 호출 (Function Calling)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto"  # AI가 자동으로 함수 호출 여부 결정
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # 함수 호출이 있는 경우
            if tool_calls:
                # 원래 응답 추가
                messages.append(response_message)

                # 각 함수 호출 실행
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)

                    # 함수 실행
                    function_response = self.execute_function(function_name, function_args, db=db)

                    # 함수 결과를 메시지에 추가
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response
                    })

                # 함수 결과를 포함하여 다시 API 호출
                second_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )

                return second_response.choices[0].message.content

            # 함수 호출이 없는 경우 바로 응답 반환
            return response_message.content

        except Exception as e:
            print(f"챗봇 오류: {str(e)}")
            return f"죄송합니다. 오류가 발생했습니다: {str(e)}"