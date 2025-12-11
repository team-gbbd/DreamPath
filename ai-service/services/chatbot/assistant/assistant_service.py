"""
회원용 AI 챗봇 비서 서비스 (Function Calling + FAQ 유사도 매칭)
"""
import os
import json
from typing import Dict, Any, List, Optional, Tuple
from openai import OpenAI
from services.database_service import DatabaseService

# 프롬프트 import
from .prompts import get_member_system_prompt

# Tools import
from .tools import (
    mentoring_tool,
    career_analysis_tool,
    recommendation_tool,
    personality_tool,
    inquiry_tool,
    job_recommendation_tool,
    profile_tool,
    learning_path_tool,
    payment_tool,
    available_mentors_tool,
    job_details_tool
)

# RAG 서비스 import (FAQ 유사도 검색용)
from services.chatbot.rag import RagEmbeddingService, RagSearchService


class AssistantService:
    """회원용 챗봇 비서 - Function Calling + FAQ 유사도 매칭"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-5-mini")

        # RAG 서비스 (FAQ 질문 유사도 검색용)
        self.embedding_service = RagEmbeddingService()
        self.search_service = RagSearchService()

        # FAQ 유사도 임계값 (0.7 이상이면 FAQ 매칭)
        self.FAQ_THRESHOLD = 0.7

        # Tool 레지스트리 (함수명 -> tool 매핑)
        self.tool_registry = {
            "get_mentoring_bookings": mentoring_tool,
            "get_career_analysis": career_analysis_tool,
            "get_recommendations": recommendation_tool,
            "get_personality_test_results": personality_tool,
            "get_my_inquiries": inquiry_tool,
            "get_job_postings": job_recommendation_tool,
            "get_my_profile": profile_tool,
            "get_learning_path": learning_path_tool,
            "get_payment_history": payment_tool,
            "get_available_mentors": available_mentors_tool,
            "get_job_details": job_details_tool
        }

        # OpenAI Function Calling 스키마 (tools에서 자동 로드)
        self.tools = [
            mentoring_tool.TOOL_SCHEMA,
            career_analysis_tool.TOOL_SCHEMA,
            recommendation_tool.TOOL_SCHEMA,
            personality_tool.TOOL_SCHEMA,
            inquiry_tool.TOOL_SCHEMA,
            job_recommendation_tool.TOOL_SCHEMA,
            profile_tool.TOOL_SCHEMA,
            learning_path_tool.TOOL_SCHEMA,
            payment_tool.TOOL_SCHEMA,
            available_mentors_tool.TOOL_SCHEMA,
            job_details_tool.TOOL_SCHEMA
        ]

    def execute_function(self, function_name: str, arguments: Dict[str, Any], db: DatabaseService = None) -> str:
        """함수 실행 - Tool Registry에서 찾아서 실행"""
        if function_name in self.tool_registry:
            tool = self.tool_registry[function_name]
            result = tool.execute(**arguments, db=db)
            return json.dumps(result, ensure_ascii=False, default=str)

        return json.dumps({"error": f"Unknown function: {function_name}"}, ensure_ascii=False)

    def execute_and_format(self, function_name: str, user_id: int, db: DatabaseService = None) -> str:
        """함수 실행 + 결과 포맷팅 (FAQ 직접 호출용)"""
        if function_name not in self.tool_registry:
            return f"알 수 없는 기능입니다: {function_name}"

        tool = self.tool_registry[function_name]

        # 함수 실행
        result = tool.execute(user_id=user_id, db=db)

        # format_result 함수가 있으면 사용, 없으면 JSON 반환
        if hasattr(tool, 'format_result'):
            return tool.format_result(result)
        else:
            return json.dumps(result, ensure_ascii=False, default=str, indent=2)

    def search_faq_by_keywords(self, message: str, db: DatabaseService = None) -> Tuple[Optional[str], Optional[str], float]:
        """
        키워드 기반 FAQ 검색 (벡터 검색 전 1차 필터)

        Returns:
            (function_name, faq_question, score) 또는 (None, None, 0)
        """
        try:
            if db is None:
                db = DatabaseService()

            # assistant FAQ 중 keywords가 있는 것들 조회
            query = """
                SELECT id, question, function_name, keywords
                FROM faq
                WHERE user_type = 'assistant'
                  AND is_active = true
                  AND keywords IS NOT NULL
                  AND array_length(keywords, 1) > 0
            """
            faqs = db.execute_query(query)

            if not faqs:
                return None, None, 0

            message_lower = message.lower()
            best_match = None
            best_score = 0

            for faq in faqs:
                keywords = faq.get('keywords') or []
                if not keywords:
                    continue

                # 키워드 매칭 점수 계산
                matched_count = 0
                for keyword in keywords:
                    if keyword.lower() in message_lower:
                        matched_count += 1

                if matched_count > 0:
                    # 매칭된 키워드 비율을 점수로
                    score = matched_count / len(keywords)
                    if score > best_score:
                        best_score = score
                        best_match = faq

            # 최소 20% 이상 매칭되면 성공
            if best_match and best_score >= 0.2:
                return best_match['function_name'], best_match['question'], best_score

            return None, None, 0

        except Exception as e:
            return None, None, 0

    def search_faq(self, message: str, db: DatabaseService = None) -> Tuple[Optional[str], Optional[str], float]:
        """
        FAQ 검색 (키워드 매칭 → 벡터 유사도 순서)

        Returns:
            (function_name, faq_question, score) 또는 (None, None, 0)
        """
        try:
            # 1. 키워드 매칭 먼저 시도
            function_name, faq_question, keyword_score = self.search_faq_by_keywords(message, db)
            if function_name:
                return function_name, faq_question, keyword_score + 0.5  # 키워드 매칭은 보너스 점수

            # 2. 키워드 매칭 실패 시 벡터 유사도 검색
            vector = self.embedding_service.embed(message)
            matches = self.search_service.search(vector, user_type="assistant", top_k=1)

            if matches and len(matches) > 0:
                top_match = matches[0]
                score = top_match.get("score", 0)
                metadata = top_match.get("metadata", {})

                if score >= self.FAQ_THRESHOLD:
                    function_name = metadata.get("function_name")
                    faq_question = metadata.get("question", "")
                    return function_name, faq_question, score

            return None, None, 0

        except Exception as e:
            return None, None, 0

    def chat(self, user_id: int, message: str, conversation_history: List[Dict[str, str]] = None, db: DatabaseService = None, function_name: str = None) -> str:
        """
        회원용 챗봇 비서 - FAQ 직접 호출 + Function Calling 폴백

        흐름:
        1. function_name이 직접 전달되면 바로 실행 (FAQ 버튼 클릭)
        2. FAQ 유사도 검색
        3. 유사도 >= 0.85 & function_name 있음 → 직접 함수 실행 (OpenAI 스킵)
        4. 그 외 → OpenAI Function Calling 사용
        """
        try:
            # ========== 0. function_name 직접 전달된 경우 바로 실행 ==========
            if function_name and function_name in self.tool_registry:
                print(f"[AssistantService] FAQ 버튼 직접 호출: {function_name}")
                result = self.execute_and_format(function_name, user_id, db)
                return result

            # ========== 1. FAQ 검색 (키워드 → 벡터 순서) ==========
            matched_function, faq_question, score = self.search_faq(message, db)

            # 디버그 로그
            print(f"[AssistantService] 메시지: {message}")
            print(f"[AssistantService] FAQ 매칭 결과: function={matched_function}, question={faq_question}, score={score}")

            # ========== 2. FAQ 매칭 & function_name 있으면 직접 실행 ==========
            if matched_function and matched_function in self.tool_registry:
                print(f"[AssistantService] FAQ 직접 실행: {matched_function}")
                result = self.execute_and_format(matched_function, user_id, db)
                return result

            # ========== 3. FAQ 매칭 안됨 → OpenAI Function Calling ==========
            messages = []

            # 시스템 메시지 항상 추가
            messages.append({
                "role": "system",
                "content": get_member_system_prompt(user_id)
            })

            # 이전 대화 내역 추가 (있는 경우)
            if conversation_history:
                for msg in conversation_history:
                    if msg.get("role") != "system":
                        messages.append(msg)

            # 사용자 메시지 추가
            messages.append({"role": "user", "content": message})

            # OpenAI API 호출 (Function Calling)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto"
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # 함수 호출이 있는 경우
            if tool_calls:
                messages.append(response_message)

                for tool_call in tool_calls:
                    func_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)

                    # user_id 자동 추가
                    if "user_id" not in function_args:
                        function_args["user_id"] = user_id

                    # 함수 실행
                    function_response = self.execute_function(func_name, function_args, db=db)

                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": func_name,
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
            return f"죄송합니다. 오류가 발생했습니다: {str(e)}"