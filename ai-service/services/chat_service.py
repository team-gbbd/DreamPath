"""
대화형 진로 상담 서비스
LangChain을 사용하여 단계별 진로 상담 응답을 생성합니다.
ReAct 에이전트와 연동하여 도구 기반 응답도 지원합니다.
"""
import asyncio
import logging
from typing import List, Dict, Optional, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from services.agents import route_message, should_use_agent

logger = logging.getLogger(__name__)


class ChatService:
    """LangChain을 사용한 대화형 진로 상담 서비스"""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=0.7,
            max_tokens=150  # 짧은 응답을 위해 토큰 수 제한
        )
        # 기존 agent_integration 제거됨 - ReAct 에이전트가 대체

    async def generate_response(
        self,
        session_id: str,
        user_message: str,
        current_stage: str,
        conversation_history: List[Dict[str, str]],
        survey_data: Optional[Dict] = None,
        user_id: Optional[int] = None,
        identity_status: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        대화형 진로 상담 응답을 생성합니다.

        새로운 아키텍처:
        - 메인 상담: 항상 기본 LLM 사용 (따뜻한 감정적 상담)
        - 리서치 패널: 에이전트가 도구 사용시 별도로 반환

        Args:
            session_id: 세션 ID
            user_message: 사용자 메시지
            current_stage: 현재 대화 단계 (PRESENT, PAST, VALUES, FUTURE, IDENTITY)
            conversation_history: 대화 이력 (최근 10개 메시지)
            survey_data: 설문조사 정보 (선택)
            user_id: 사용자 ID (에이전트 기능용)
            identity_status: 정체성 상태 (에이전트 기능용)

        Returns:
            dict: {"message": str, "agent_action": Optional[dict], "agent_steps": Optional[list]}
        """
        # ============================================================
        # 1. 메인 상담 응답 생성 (항상 실행)
        # ============================================================
        counseling_message = await self._generate_counseling_response(
            user_message=user_message,
            current_stage=current_stage,
            conversation_history=conversation_history,
            survey_data=survey_data,
        )

        # ============================================================
        # 2. 리서치 에이전트 (병렬 실행 - 도구 필요시에만 반환)
        # ============================================================
        agent_action = None
        agent_steps = None

        try:
            agent_result = await route_message(
                message=user_message,
                user_id=user_id,
                session_id=session_id,
                conversation_history=conversation_history,
            )

            # 에이전트가 도구를 사용한 경우에만 리서치 패널에 추가
            if agent_result.get("used_agent"):
                tools_used = agent_result.get("tools_used", [])
                full_result = agent_result.get("agent_result", {})

                if tools_used:
                    logger.info(f"[ChatService] 리서치 패널에 추가, 도구: {tools_used}")
                    logger.info(f"[ChatService] full_result 키들: {full_result.keys()}")
                    logger.info(f"[ChatService] full_result['answer']: {full_result.get('answer', 'NOT FOUND')[:100] if full_result.get('answer') else 'EMPTY'}")

                    # 도구 사용 결과를 agent_action으로 변환
                    agent_action = self._build_agent_action_from_tools(
                        tools_used=tools_used,
                        agent_result=full_result,
                    )

                    # 에이전트가 생성한 요약 답변 추가 (LLM이 검색 결과를 요약한 것)
                    if agent_action:
                        agent_answer = full_result.get("answer", "")
                        logger.info(f"[ChatService] agent_answer 존재: {bool(agent_answer)}, 길이: {len(agent_answer) if agent_answer else 0}")
                        if agent_answer:
                            agent_action["summary"] = agent_answer
                            logger.info(f"[ChatService] 에이전트 요약 추가 완료: {agent_answer[:50]}...")

                    agent_steps = full_result.get("steps", [])
                else:
                    logger.info("[ChatService] 에이전트 FINISH, 리서치 없음")

        except Exception as e:
            logger.warning(f"[ChatService] 리서치 에이전트 오류: {e}")
            # 에이전트 실패해도 상담 응답은 그대로 반환

        return {
            "message": counseling_message,
            "agent_action": agent_action,
            "agent_steps": agent_steps,
        }

    async def _generate_counseling_response(
        self,
        user_message: str,
        current_stage: str,
        conversation_history: List[Dict[str, str]],
        survey_data: Optional[Dict] = None,
    ) -> str:
        """
        기본 LLM을 사용한 감정적 상담 응답 생성

        이 메서드는 항상 따뜻한 상담 응답을 생성합니다.
        리서치/정보는 별도 에이전트가 담당합니다.
        """
        # 단계별 시스템 프롬프트 생성
        system_prompt = self._build_system_prompt(current_stage, survey_data)

        # 대화 이력을 LangChain 메시지 형식으로 변환
        messages = [SystemMessage(content=system_prompt)]

        # 최근 대화 이력 추가 (최대 10개)
        for msg in conversation_history[-10:]:
            role = msg.get("role", "").upper()
            content = msg.get("content", "")

            if role == "USER":
                messages.append(HumanMessage(content=content))
            elif role == "ASSISTANT":
                messages.append(AIMessage(content=content))

        # 현재 사용자 메시지 추가
        messages.append(HumanMessage(content=user_message))

        # LangChain을 통한 응답 생성
        loop = asyncio.get_event_loop()
        response_message = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )

        return response_message
    
    def _build_system_prompt(self, current_stage: str, survey_data: Optional[Dict] = None) -> str:
        """현재 단계에 맞는 시스템 프롬프트 생성"""
        base_prompt = """
당신은 학생의 진로 정체성 확립을 돕는 따뜻한 상담사입니다.

## 핵심 철학
직업 추천이 목표가 아닙니다. 학생이 "나는 누구인가"를 발견하도록 돕는 것이 목표입니다.

## 대화 원칙
1. **한 번에 1개 질문만 하기** (절대 여러 질문을 한 번에 하지 마세요)
2. **초간결 응답**: 응답은 최대 1-2문장으로 매우 짧게 작성하세요. 공감 표현은 한 문장으로만, 질문도 한 문장으로만 하세요
3. 학생의 답변에 진심으로 공감하기 (하지만 짧게!)
4. 표면적 답변에서 더 깊은 의미 찾기
5. 정체성의 단서가 보이면 자연스럽게 언급하기 (짧게!)
6. 평가하지 말고, 이해하려 하기
7. **한 번에 하나의 활동에만 집중하기**: 학생이 여러 활동을 언급했을 때, 절대 한 번에 여러 활동에 대해 질문하지 마세요
   - 예시 (잘못된 예): "그림 그리기는 어떤 종류를 그려? 운동은 어떤 걸 해? 게임은 어떤 게임을 해?" ❌
   - 예시 (올바른 예): "그림 그리기 좋아한다고 했는데, 어떤 종류의 그림을 주로 그려?" ✅
8. **순차적 탐색**: 한 활동에 대해 충분히 탐색한 후에만 다음 활동으로 넘어가세요
9. **불필요한 설명 제거**: "~할 수 있어요", "~하는 것이 좋을 것 같아요" 같은 긴 설명은 생략하고 질문만 하세요

## 정체성 발견 시그널
대화 중 이런 것들이 보이면 자연스럽게 짚어주세요:
- "방금 말한 게 흥미로운데, ~한 면이 보여"
- "너는 ~할 때 정말 살아있는 것 같아"
- "~이 너에게 정말 중요한 거구나"

## 중요
- 직업명을 성급하게 언급하지 마세요
- "너는 ~한 사람이야"라는 정체성을 먼저 확립하세요
- 따뜻하고 친근한 말투를 유지하세요
- 한국어로 대화하세요
- **응답은 항상 매우 짧게 (최대 1-2문장, 가능하면 1문장)**
- **절대 여러 질문을 한 번에 하지 마세요 (한 번에 1개 질문만)**
- **공감 표현은 한 문장으로만, 그 다음 바로 질문 한 문장으로만**
- 예시: "그림 그리기 좋아하는구나! 어떤 종류의 그림을 주로 그려?" (2문장) 또는 "어떤 종류의 그림을 주로 그려?" (1문장)
"""
        
        # 설문조사 정보가 있으면 추가
        if survey_data:
            survey_info = "\n## 설문조사 정보\n"
            if survey_data.get("name"):
                survey_info += f"- 이름: {survey_data.get('name')}\n"
            if survey_data.get("age"):
                survey_info += f"- 나이: {survey_data.get('age')}세\n"
            if survey_data.get("interests"):
                interests = survey_data.get("interests", [])
                if interests:
                    survey_info += f"- 관심 분야: {', '.join(interests)}\n"
            if survey_data.get("favoriteSubjects"):
                subjects = survey_data.get("favoriteSubjects", [])
                if subjects:
                    survey_info += f"- 좋아하는 과목: {', '.join(subjects)}\n"
            if survey_data.get("difficultSubjects"):
                difficult = survey_data.get("difficultSubjects", [])
                if difficult and "없음" not in difficult:
                    survey_info += f"- 어려워하는 과목: {', '.join(difficult)}\n"
            if survey_data.get("hasDreamCareer"):
                survey_info += f"- 장래 희망 여부: {survey_data.get('hasDreamCareer')}\n"
            if survey_data.get("careerPressure"):
                survey_info += f"- 진로 결정 압박감: {survey_data.get('careerPressure')}\n"
            if survey_data.get("concern"):
                survey_info += f"- 고민: {survey_data.get('concern')}\n"
            
            survey_info += "\n이 정보를 참고하여 학생에게 더 맞춤형 상담을 제공하세요. 하지만 설문조사 정보를 직접적으로 언급하기보다는 자연스럽게 대화에 녹여내세요.\n"
            base_prompt += survey_info
        
        stage_prompts = {
            "PRESENT": """
## 현재 대화 단계: 현재 (PRESENT) - "지금의 나"

목표: 학생의 현재 감정 상태와 고민을 이해하기

**질문 전략: 한 번에 하나의 활동에만 집중하기**

학생이 여러 관심사를 언급했다면, **한 번에 하나의 활동에 대해서만** 질문하세요:

예시: 학생이 "그림 그리기, 운동, 게임, 컴퓨터"를 좋아한다고 했을 때
- ✅ 올바른 예: "그림 그리기 좋아한다고 했는데, 어떤 종류의 그림을 주로 그려?"
- ❌ 잘못된 예: "그림 그리기는 어떤 걸 그려? 운동은 어떤 걸 해? 게임은 어떤 게임을 해?" (너무 길고 여러 질문을 한 번에 함)

**중요**: 
- 절대 여러 활동을 한 번에 물어보지 마세요
- 한 번에 1개 질문만 하세요
- 응답은 매우 짧게 (최대 1-2문장, 가능하면 1문장)
- 먼저 첫 번째 활동(예: 그림 그리기)에 집중하고, 충분히 탐색한 후 다음 활동으로 넘어가세요

이 단계에서는 학생의 현재 상태를 파악하는 데 집중하세요.
""",
            "PAST": """
## 현재 대화 단계: 과거 (PAST) - "경험 속의 나"

목표: 학생의 진짜 흥미와 재능이 드러난 순간 찾기

**질문 전략: 한 번에 하나의 활동에만 집중하기**

학생이 여러 활동을 언급했다면, **한 번에 하나의 활동에 대해서만** 질문하세요:

예시: 학생이 "그림 그리기, 운동, 게임"을 좋아한다고 했을 때
- ✅ 올바른 예: "그림 그리기 좋아한다고 했는데, 어떤 종류의 그림을 주로 그려?"
- ❌ 잘못된 예: "그림 그리기는 어떤 걸 그려? 운동은 어떤 걸 해? 게임은 어떤 게임을 해?" (너무 길고 여러 질문을 한 번에 함)

**중요**: 
- 절대 여러 활동을 한 번에 물어보지 마세요
- 한 번에 1개 질문만 하세요
- 응답은 매우 짧게 (최대 1-2문장, 가능하면 1문장)
- 먼저 첫 번째 활동(예: 그림 그리기)에 집중하고, 충분히 탐색한 후 다음 활동으로 넘어가세요

이 단계에서는 학생의 과거 경험에서 패턴을 찾으세요.
""",
            "VALUES": """
## 현재 대화 단계: 가치관 (VALUES) - "내가 추구하는 것"

목표: 학생의 핵심 가치관 발견하기

**질문 전략: 한 번에 하나의 활동에만 집중하기**

학생이 언급한 활동을 바탕으로 가치관을 탐색하세요. **한 번에 하나의 활동에 대해서만** 질문하세요:

예시: 학생이 "그림 그리기, 운동, 게임"을 좋아한다고 했을 때
- ✅ 올바른 예: "그림 그리기를 좋아하는 이유가 뭐야?"
- ❌ 잘못된 예: "그림 그리기는 왜 좋아해? 운동은 어떤 가치를 느껴? 게임은 어떤 부분이 중요해?" (너무 길고 여러 질문을 한 번에 함)

**중요**: 
- 절대 여러 활동을 한 번에 물어보지 마세요
- 한 번에 1개 질문만 하세요
- 응답은 매우 짧게 (최대 1-2문장, 가능하면 1문장)
- 학생이 언급한 구체적인 활동을 바탕으로 가치관을 탐색하세요

이 단계에서는 학생의 가치관을 탐색하세요.
""",
            "FUTURE": """
## 현재 대화 단계: 미래 (FUTURE) - "되고 싶은 나"

목표: 학생이 지향하는 미래 모습 그리기

**질문 전략: 한 번에 하나의 활동에만 집중하기**

학생이 언급한 활동을 바탕으로 미래를 그려보세요. **한 번에 하나의 활동에 대해서만** 질문하세요:

예시: 학생이 "그림 그리기, 운동, 게임"을 좋아한다고 했을 때
- ✅ 올바른 예: "그림 그리기를 계속한다면, 10년 후에는 어떤 그림을 그리고 있을 것 같아?"
- ❌ 잘못된 예: "그림 그리기는 10년 후에 어떤 그림을 그릴까? 운동은 어떤 일을 하고 싶어? 게임은 어떤 사람이 되고 싶어?" (너무 길고 여러 질문을 한 번에 함)

**중요**: 
- 절대 여러 활동을 한 번에 물어보지 마세요
- 한 번에 1개 질문만 하세요
- 응답은 매우 짧게 (최대 1-2문장, 가능하면 1문장)
- 학생이 언급한 구체적인 활동을 바탕으로 미래를 구체적으로 그려보도록 도와주세요

이 단계에서는 학생의 미래 비전을 그려보세요.
""",
            "IDENTITY": """
## 현재 대화 단계: 정체성 (IDENTITY) - "진짜 나"

목표: 지금까지 대화를 통해 보이는 정체성을 확인하고 강화

- 지금까지 대화를 통해 보이는 정체성을 확인하고 강화
- 정체성과 연결되는 구체적 진로 탐색
- 첫 걸음 함께 계획하기

이 단계에서는 학생의 정체성을 정리하고 진로와 연결하세요.
"""
        }
        
        stage_prompt = stage_prompts.get(current_stage, stage_prompts["PRESENT"])

        return base_prompt + "\n" + stage_prompt

    def _build_agent_action_from_tools(
        self,
        tools_used: List[str],
        agent_result: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        에이전트 도구 사용 결과를 AgentAction 형식으로 변환

        Args:
            tools_used: 사용된 도구 목록
            agent_result: 에이전트 실행 결과

        Returns:
            AgentAction 딕셔너리 또는 None
        """
        if not tools_used:
            return None

        tool_results = agent_result.get("tool_results", [])

        # 도구별 AgentAction 생성
        for tool_result in tool_results:
            tool_name = tool_result.get("tool_name")
            tool_output = tool_result.get("tool_output", {})

            if not tool_output.get("success", False):
                continue

            # 멘토링 세션 검색 결과
            if tool_name == "search_mentoring_sessions" and tool_output.get("sessions"):
                sessions = tool_output["sessions"]
                return {
                    "type": "mentoring_suggestion",
                    "reason": "관심 분야와 관련된 멘토링 세션을 찾았어요!",
                    "data": {"sessions": sessions},
                    "actions": [
                        {
                            "id": f"view_session_{s.get('sessionId', i)}",
                            "label": f"{s.get('mentorName', '멘토')} 멘토 세션 보기",
                            "primary": i == 0,
                            "params": {"sessionId": s.get("sessionId")},
                        }
                        for i, s in enumerate(sessions[:3])
                    ],
                }

            # 학습 경로 조회 결과
            if tool_name == "get_learning_path" and tool_output.get("path"):
                path = tool_output["path"]
                exists = tool_output.get("exists", False)
                can_create = tool_output.get("canCreate", False)

                # 학습 경로가 존재하거나 생성 가능할 때만 카드 표시
                if exists or can_create:
                    return {
                        "type": "learning_path_suggestion",
                        "reason": f"{path.get('career', '직업')} 학습 로드맵을 준비했어요!",
                        "data": {
                            "path": path,
                            "exists": exists,
                            "canCreate": can_create,
                            "createUrl": tool_output.get("createUrl", "/learning"),
                        },
                        "actions": [
                            {
                                "id": "start_learning",
                                "label": "이어서 학습하기" if exists else "학습 시작하기",
                                "primary": True,
                                "params": {"career": path.get("career")},
                            },
                        ],
                    }

            # 멘토링 예약 결과
            if tool_name == "book_mentoring" and tool_output.get("success"):
                return {
                    "type": "booking_confirmed",
                    "reason": "멘토링 예약이 완료되었어요!",
                    "data": {
                        "bookingId": tool_output.get("bookingId"),
                        "mentorName": tool_output.get("mentorName"),
                        "sessionDate": tool_output.get("sessionDate"),
                    },
                    "actions": [
                        {
                            "id": "view_booking",
                            "label": "예약 확인하기",
                            "primary": True,
                            "params": {"bookingId": tool_output.get("bookingId")},
                        },
                    ],
                }

            # 웹 검색 결과
            if tool_name == "web_search" and tool_output.get("results"):
                results = tool_output["results"]
                return {
                    "type": "web_search_results",
                    "reason": "관련 정보들을 찾아봤어요!",
                    "data": {"results": results},
                    "actions": [
                        {
                            "id": f"open_link_{i}",
                            "label": r.get("title", "링크")[:30] + "...",
                            "primary": i == 0,
                            "params": {"url": r.get("url")},
                        }
                        for i, r in enumerate(results[:3])
                    ],
                }

        return None

