"""
회원용 AI 챗봇 비서 서비스 (Function Calling)
"""
import os
import json
from typing import Dict, Any, List
from openai import OpenAI
from services.database_service import DatabaseService

# 프롬프트 import
from .prompts import get_member_system_prompt, get_question_classifier_prompt

# FAQ 서비스 import
from ..shared.faq_service import FaqService

# Tools import
from .tools import (
    mentoring_tool,
    career_analysis_tool,
    recommendation_tool,
    personality_tool,
    learning_progress_tool,
    inquiry_tool,
    job_recommendation_tool
)


class MemberChatbotService:
    """회원용 챗봇 비서 - OpenAI Function Calling 사용"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        # FAQ 서비스 초기화
        self.faq_service = FaqService()

        # Tool 레지스트리 (함수명 -> tool 매핑)
        self.tool_registry = {
            "get_mentoring_bookings": mentoring_tool,
            "get_career_analysis": career_analysis_tool,
            "get_recommendations": recommendation_tool,
            "get_personality_test_results": personality_tool,
            "get_learning_progress": learning_progress_tool,
            "get_my_inquiries": inquiry_tool,
            "get_job_postings": job_recommendation_tool
        }

        # OpenAI Function Calling 스키마 (tools에서 자동 로드)
        self.tools = [
            mentoring_tool.TOOL_SCHEMA,
            career_analysis_tool.TOOL_SCHEMA,
            recommendation_tool.TOOL_SCHEMA,
            personality_tool.TOOL_SCHEMA,
            learning_progress_tool.TOOL_SCHEMA,
            inquiry_tool.TOOL_SCHEMA,
            job_recommendation_tool.TOOL_SCHEMA
        ]

    def execute_function(self, function_name: str, arguments: Dict[str, Any], db: DatabaseService = None) -> str:
        """함수 실행 - Tool Registry에서 찾아서 실행"""
        if function_name in self.tool_registry:
            tool = self.tool_registry[function_name]
            result = tool.execute(**arguments, db=db)
            return json.dumps(result, ensure_ascii=False, default=str)

        return json.dumps({"error": f"Unknown function: {function_name}"}, ensure_ascii=False)

    def _classify_question(self, message: str) -> str:
        """
        LLM으로 질문 분류

        Returns:
            "PERSONAL_DATA" | "SERVICE_QUESTION" | "UNRELATED"
        """
        try:
            classifier_messages = [
                {
                    "role": "system",
                    "content": get_question_classifier_prompt()
                },
                {
                    "role": "user",
                    "content": message
                }
            ]

            response = self.client.chat.completions.create(
                model=self.model,
                messages=classifier_messages,
                temperature=0,
                max_tokens=15
            )

            classification = response.choices[0].message.content.strip().upper()

            # 분류 결과 반환
            if "PERSONAL_DATA" in classification:
                return "PERSONAL_DATA"
            elif "UNRELATED" in classification:
                return "UNRELATED"
            else:
                return "SERVICE_QUESTION"

        except Exception as e:
            print(f"질문 분류 오류: {str(e)}")
            # 오류 시 안전하게 SERVICE_QUESTION 반환
            return "SERVICE_QUESTION"

    def chat(self, user_id: int, message: str, conversation_history: List[Dict[str, str]] = None, db: DatabaseService = None) -> str:
        try:
            # ========== 1단계: LLM 질문 분류 먼저 ==========
            question_type = self._classify_question(message)

            # ========== 2단계: 서비스 외 질문 차단 ==========
            if question_type == "UNRELATED":
                return "죄송하지만, DreamPath 서비스 관련 질문만 답변할 수 있습니다. 진로, 학습, 멘토링 등에 대해 궁금한 점이 있으시면 언제든지 물어보세요!"

            # ========== 3단계: 개인 데이터 요청이면 FAQ 건너뛰고 바로 Function Calling ==========
            if question_type == "PERSONAL_DATA":
                # "내 진로 분석", "나 멘토링 예약" 등 → FAQ 검색하지 않고 바로 Function Calling
                pass
            else:
                # ========== 4단계: 서비스 질문이면 FAQ 검색 ==========
                # "이름 수정", "비밀번호 변경", "DreamPath란?" 등
                matched_faq = self.faq_service.search_faq(message, user_type="member", db=db)

                if matched_faq:
                    answer_type = matched_faq.get("answer_type")

                    # answer_type='static' → 즉시 FAQ 답변 반환
                    if answer_type == "static":
                        return matched_faq.get("answer", "답변을 찾을 수 없습니다.")

                    # answer_type='function' → Function Calling으로 넘어감

            # ========== 5단계: OpenAI Function Calling ==========
            # PERSONAL_DATA 또는 SERVICE_QUESTION (FAQ 없거나 answer_type='function') → Function Calling
            messages = []

            # 시스템 메시지 항상 추가 (매번 강력한 지시 전달)
            messages.append({
                "role": "system",
                "content": get_member_system_prompt(user_id)
            })

            # 이전 대화 내역 추가 (있는 경우)
            if conversation_history:
                # system 메시지를 제외한 나머지만 추가
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

                    # user_id가 없으면 자동으로 추가 (AI가 user_id를 빠뜨린 경우)
                    if "user_id" not in function_args:
                        function_args["user_id"] = user_id

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