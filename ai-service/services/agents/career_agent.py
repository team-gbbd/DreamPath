"""
DreamPath ReAct 진로 상담 에이전트
LangGraph StateGraph 기반 구현
"""
import os
import json
import logging
import asyncio
from typing import Literal

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

from .state import AgentState, MAX_STEPS, TOOL_TIMEOUT_SECONDS
from .career_tools import TOOL_MAP
from .prompts import (
    REACT_SYSTEM_PROMPT,
    ANSWER_SYSTEM_PROMPT,
    format_conversation_for_reasoning,
    format_observation_for_answer,
)

logger = logging.getLogger(__name__)


# ============================================================
# LLM 초기화
# ============================================================

def get_llm():
    """LLM 인스턴스 반환 (팩트 기반 에이전트 - temperature=0)"""
    return ChatOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0,
    )


# ============================================================
# 노드 함수들 (LangGraph StateGraph의 각 노드)
# ============================================================

# LLM이 상황 분석 후 다음 행동 결정 (도구 사용 or FINISH)
async def reason_node(state: AgentState) -> dict:
    """
    ReAct - Reasoning 단계
    LLM이 상황을 분석하고 다음 행동을 결정
    """
    logger.info(f"[Agent] reason_node - step {state['current_step']}")

    try:
        llm = get_llm()

        context = format_conversation_for_reasoning(
            state["messages"],
            state["tool_history"]
        )

        prompt = f"""{REACT_SYSTEM_PROMPT}

{context}

현재 스텝: {state['current_step'] + 1}/{MAX_STEPS}

다음 행동을 결정하세요. 반드시 JSON 형식으로 응답하세요."""

        response = await llm.ainvoke(prompt)
        content = response.content.strip()

        # 토큰 사용량 추적
        token_usage = response.response_metadata.get("token_usage", {})
        new_prompt_tokens = token_usage.get("prompt_tokens", 0)
        new_completion_tokens = token_usage.get("completion_tokens", 0)
        logger.info(f"[Agent] reason_node 토큰: +{new_prompt_tokens + new_completion_tokens}")

        parsed = _parse_json_response(content)

        if not parsed:
            logger.warning(f"[Agent] JSON 파싱 실패: {content[:200]}")
            return {
                "thought": "응답 파싱 실패",
                "action": "FINISH",
                "action_input": None,
                "should_fallback": True,
                "prompt_tokens": state["prompt_tokens"] + new_prompt_tokens,
                "completion_tokens": state["completion_tokens"] + new_completion_tokens,
                "total_tokens": state["total_tokens"] + new_prompt_tokens + new_completion_tokens,
            }

        logger.info(f"[Agent] thought: {parsed.get('thought', '')[:100]}")
        logger.info(f"[Agent] action: {parsed.get('action')}")

        return {
            "thought": parsed.get("thought", ""),
            "action": parsed.get("action", "FINISH"),
            "action_input": parsed.get("action_input", {}),
            "current_step": state["current_step"] + 1,
            "prompt_tokens": state["prompt_tokens"] + new_prompt_tokens,
            "completion_tokens": state["completion_tokens"] + new_completion_tokens,
            "total_tokens": state["total_tokens"] + new_prompt_tokens + new_completion_tokens,
        }

    except Exception as e:
        logger.error(f"[Agent] reason_node 오류: {e}")
        return {
            "thought": f"추론 중 오류: {str(e)}",
            "action": "FINISH",
            "action_input": None,
            "error": str(e),
            "should_fallback": True,
        }


# reason에서 선택한 도구 실행 (FINISH면 스킵)
async def action_node(state: AgentState) -> dict:
    """
    ReAct - Action 단계
    선택된 도구 실행
    """
    action = state.get("action", "FINISH")
    action_input = state.get("action_input", {}) or {}

    logger.info(f"[Agent] action_node - {action}")

    if action == "FINISH":
        return {"observation": None}

    tool_func = TOOL_MAP.get(action)
    if not tool_func:
        logger.warning(f"[Agent] 알 수 없는 도구: {action}")
        return {
            "observation": {"error": f"알 수 없는 도구: {action}"},
            "tool_history": state["tool_history"] + [{
                "tool_name": action,
                "tool_input": action_input,
                "tool_output": None,
                "success": False,
                "error": "도구 없음"
            }]
        }

    # 도구 실행 (타임아웃 적용)
    try:
        # LangChain @tool 도구의 입력 포맷: 단일 인자면 값만, 복수면 dict
        # arun()은 문자열/dict 입력을 받아 내부에서 파싱
        logger.info(f"[Agent] 도구 호출: {action}, 입력: {action_input}")

        result = await asyncio.wait_for(
            tool_func.ainvoke(action_input),
            timeout=TOOL_TIMEOUT_SECONDS
        )

        logger.info(f"[Agent] 도구 결과 타입: {type(result)}, 값: {result}")

        logger.info(f"[Agent] 도구 실행 완료: {action}")

        # 결과가 문자열이면 dict로 변환
        if isinstance(result, str):
            result = {"message": result}

        return {
            "observation": result,
            "tool_history": state["tool_history"] + [{
                "tool_name": action,
                "tool_input": action_input,
                "tool_output": result,
                "success": result.get("success", True) if isinstance(result, dict) else True,
                "error": None
            }]
        }

    except asyncio.TimeoutError:
        logger.error(f"[Agent] 도구 타임아웃: {action}")
        return {
            "observation": {"error": "시간 초과", "success": False},
            "tool_history": state["tool_history"] + [{
                "tool_name": action,
                "tool_input": action_input,
                "tool_output": None,
                "success": False,
                "error": "타임아웃"
            }],
            "should_fallback": True,
        }

    except Exception as e:
        logger.error(f"[Agent] 도구 실행 오류: {action} - {e}")
        return {
            "observation": {"error": str(e), "success": False},
            "tool_history": state["tool_history"] + [{
                "tool_name": action,
                "tool_input": action_input,
                "tool_output": None,
                "success": False,
                "error": str(e)
            }],
        }


# 수집된 정보로 최종 사용자 답변 생성
async def answer_node(state: AgentState) -> dict:
    """
    최종 답변 생성
    """
    logger.info("[Agent] answer_node")

    try:
        llm = get_llm()

        observations = format_observation_for_answer(state["tool_history"])

        user_message = ""
        for msg in reversed(state["messages"]):
            if isinstance(msg, dict) and msg.get("role") == "user":
                user_message = msg.get("content", "")
                break
            elif hasattr(msg, "type") and msg.type == "human":
                user_message = msg.content
                break

        prompt = f"""{ANSWER_SYSTEM_PROMPT}

## 학생의 질문/고민
{user_message}

## 수집한 정보
{observations}

## 에이전트의 추론 과정
{state.get('thought', '')}

위 정보를 바탕으로 학생에게 도움이 되는 답변을 작성하세요.
답변만 출력하세요."""

        response = await llm.ainvoke(prompt)
        answer = response.content.strip()

        # 토큰 사용량 추적
        token_usage = response.response_metadata.get("token_usage", {})
        new_prompt_tokens = token_usage.get("prompt_tokens", 0)
        new_completion_tokens = token_usage.get("completion_tokens", 0)

        total = state["total_tokens"] + new_prompt_tokens + new_completion_tokens
        logger.info(f"[Agent] answer_node 토큰: +{new_prompt_tokens + new_completion_tokens}, 총합: {total}")

        return {
            "final_answer": answer,
            "prompt_tokens": state["prompt_tokens"] + new_prompt_tokens,
            "completion_tokens": state["completion_tokens"] + new_completion_tokens,
            "total_tokens": total,
        }

    except Exception as e:
        logger.error(f"[Agent] answer_node 오류: {e}")

        # Fallback 답변
        return {
            "final_answer": "죄송해요, 답변을 생성하는 중에 문제가 발생했어요. 다시 질문해주시겠어요?",
            "error": str(e),
        }


# ============================================================
# 조건부 엣지 (ReAct 루프 제어)
# ============================================================

# action → reason 루프 or answer로 종료 결정
def should_continue(state: AgentState) -> Literal["continue", "answer", "end"]:
    """
    계속 추론할지 종료할지 결정

    분기 로직:
    - FINISH + 도구 사용함 → "answer" (answer_node에서 결과 요약)
    - FINISH + 도구 안 씀 → "end" (바로 종료, LLM 호출 절약)
    - 도구 성공 + 결과 있음 → "answer" (바로 답변 생성)
    - 도구 성공 + 결과 없음 → "continue" (broader term으로 재시도)
    - 도구 실패 → "continue" (다른 도구 시도)
    """
    action = state.get("action")
    has_tools = bool(state.get("tool_history"))
    observation = state.get("observation") or {}

    # FINISH 액션 (LLM이 결정)
    if action == "FINISH":
        if has_tools:
            logger.info("[Agent] should_continue -> answer (도구 결과 요약 필요)")
            return "answer"
        else:
            logger.info("[Agent] should_continue -> end (도구 없이 종료)")
            return "end"

    # 도구 실행 성공한 경우
    if action != "FINISH" and observation.get("success"):
        # 멘토링/학습경로 검색: 결과가 비어있으면 broader term으로 재시도
        if action == "search_mentoring_sessions":
            sessions = observation.get("sessions", [])
            if not sessions and state["current_step"] < MAX_STEPS:
                logger.info("[Agent] should_continue -> continue (멘토링 결과 없음, broader term 재시도)")
                return "continue"

        elif action == "get_learning_path":
            if not observation.get("exists") and not observation.get("canCreate"):
                if state["current_step"] < MAX_STEPS:
                    logger.info("[Agent] should_continue -> continue (학습경로 결과 없음, broader term 재시도)")
                    return "continue"

        # 결과 있음 → 바로 답변 생성
        logger.info("[Agent] should_continue -> answer (도구 성공, 바로 답변 생성)")
        return "answer"

    # Fallback 또는 MAX_STEPS (안전망)
    if state.get("should_fallback") or state["current_step"] >= MAX_STEPS:
        if has_tools:
            logger.info("[Agent] should_continue -> answer (안전망, 도구 결과 있음)")
            return "answer"
        logger.info("[Agent] should_continue -> end (안전망, 도구 없음)")
        return "end"

    # 도구 실패 → 다시 reason으로 (다른 도구 시도)
    logger.info("[Agent] should_continue -> continue (도구 실패, 재시도)")
    return "continue"


# ============================================================
# 헬퍼 함수
# ============================================================

def _build_steps_info(result: dict) -> list:
    """
    ReAct 단계 정보를 시각화용 포맷으로 구성

    Args:
        result: 에이전트 실행 결과

    Returns:
        단계 정보 리스트:
        [
            {"step": "analyze", "label": "질문 분석", "status": "completed"},
            {"step": "search", "label": "멘토링 검색", "status": "completed", "tool": "search_mentoring_sessions"},
            {"step": "answer", "label": "답변 생성", "status": "completed"},
        ]
    """
    steps = []

    # 1. 질문 분석 단계 (항상 있음)
    steps.append({
        "step": "analyze",
        "label": "질문 분석",
        "status": "completed",
        "thought": result.get("thought", "")[:100] if result.get("thought") else None,
    })

    # 2. 도구 사용 단계들
    tool_labels = {
        "search_mentoring_sessions": "멘토링 검색",
        "get_learning_path": "학습 경로 조회",
        "search_job_postings": "채용 공고 검색",
        "book_mentoring": "멘토링 예약",
        "web_search": "웹 검색",
    }

    tool_history = result.get("tool_history", [])
    for tool in tool_history:
        tool_name = tool.get("tool_name", "")
        steps.append({
            "step": "tool",
            "label": tool_labels.get(tool_name, tool_name),
            "status": "completed" if tool.get("success", True) else "failed",
            "tool": tool_name,
            "hasData": bool(tool.get("tool_output")),
        })

    # 3. 답변 생성 단계 (최종 답변이 있으면)
    if result.get("final_answer"):
        steps.append({
            "step": "answer",
            "label": "답변 생성",
            "status": "completed",
        })

    return steps


def _parse_json_response(content: str) -> dict:
    """LLM 응답에서 JSON 추출"""
    content = content.strip()

    # ```json ... ``` 블록 추출
    if "```json" in content:
        try:
            start = content.index("```json") + 7
            end = content.index("```", start)
            content = content[start:end].strip()
        except:
            pass
    elif "```" in content:
        try:
            start = content.index("```") + 3
            end = content.index("```", start)
            content = content[start:end].strip()
        except:
            pass

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # { } 찾기
    try:
        start = content.index("{")
        end = content.rindex("}") + 1
        return json.loads(content[start:end])
    except:
        pass

    return None


# ============================================================
# 그래프 생성 (reason → action → [continue/finish] → answer)
# ============================================================

def create_career_agent():
    """
    ReAct 진로 상담 에이전트 생성

    Returns:
        컴파일된 LangGraph 에이전트

    그래프 구조:
        reason → action → [continue/answer/end]
        - continue: 다시 reason으로 (도구 추가 사용)
        - answer: answer_node로 (도구 결과 요약)
        - end: 바로 종료 (도구 없이 FINISH, LLM 절약)
    """
    graph = StateGraph(AgentState)

    # 노드 추가
    graph.add_node("reason", reason_node)
    graph.add_node("action", action_node)
    graph.add_node("answer", answer_node)

    # 엣지 정의
    graph.set_entry_point("reason")
    graph.add_edge("reason", "action")
    graph.add_conditional_edges(
        "action",
        should_continue,
        {
            "continue": "reason",  # 도구 사용 후 계속 추론
            "answer": "answer",    # 도구 결과 요약 필요
            "end": END,            # 도구 없이 종료 (answer_node 스킵)
        }
    )
    graph.add_edge("answer", END)

    return graph.compile()


# 에이전트 인스턴스 (싱글톤)
career_agent = create_career_agent()


# ============================================================
# 외부 인터페이스
# ============================================================

async def run_career_agent(
    user_message: str,
    user_id: int = None,
    session_id: str = None,
    conversation_history: list = None,
) -> dict:
    """
    에이전트 실행

    Args:
        user_message: 사용자 메시지
        user_id: 사용자 ID
        session_id: 세션 ID
        conversation_history: 이전 대화 기록

    Returns:
        {
            "answer": 최종 답변,
            "tools_used": 사용한 도구 목록,
            "success": 성공 여부
        }
    """
    from .state import create_initial_state

    logger.info(f"[Agent] 에이전트 실행 시작: {user_message[:50]}...")

    try:
        # 초기 상태 생성
        initial_state = create_initial_state(
            user_message=user_message,
            user_id=user_id,
            session_id=session_id,
            conversation_history=conversation_history,
        )

        # 에이전트 실행
        result = await career_agent.ainvoke(initial_state)

        total_tokens = result.get("total_tokens", 0)
        tool_history = result.get("tool_history", [])
        final_answer = result.get("final_answer")

        logger.info(f"[Agent] 에이전트 실행 완료, 도구 {len(tool_history)}개 사용, 토큰 {total_tokens}개")

        # FINISH + 도구 없음 → 에이전트가 필요 없다고 판단, 아무것도 표시 안함
        if not tool_history and final_answer is None:
            logger.info("[Agent] 에이전트 액션 불필요 (FINISH without tools)")
            return {
                "answer": None,
                "tools_used": [],
                "tool_results": [],
                "success": True,
                "no_action": True,  # 프론트엔드에서 아무것도 표시 안함
                "token_usage": {
                    "total": total_tokens,
                    "prompt": result.get("prompt_tokens", 0),
                    "completion": result.get("completion_tokens", 0),
                },
                "steps": [],
            }

        # ReAct 단계 정보 구성
        steps = _build_steps_info(result)

        return {
            "answer": final_answer or "답변을 생성하지 못했습니다.",
            "tools_used": [t["tool_name"] for t in tool_history],
            "tool_results": tool_history,
            "success": not result.get("should_fallback", False),
            "no_action": False,
            "token_usage": {
                "total": total_tokens,
                "prompt": result.get("prompt_tokens", 0),
                "completion": result.get("completion_tokens", 0),
            },
            "steps": steps,  # ReAct 단계 시각화용
        }

    except Exception as e:
        logger.error(f"[Agent] 에이전트 실행 오류: {e}")
        return {
            "answer": "죄송해요, 문제가 발생했어요. 다시 시도해주세요.",
            "tools_used": [],
            "tool_results": [],
            "success": False,
            "error": str(e),
        }
