# DreamPath ReAct 에이전트 개발 계획서

> **작성일**: 2024-12-02
> **목표**: 진로 상담 챗봇을 LangGraph + ReAct 패턴 기반 에이전트로 구현

---

## 1. 프로젝트 개요

### 1.1 목표
사용자가 명시적으로 요청하지 않아도 대화 맥락에서 니즈를 파악하고,
AI가 **스스로 도구를 선택하여 실행**하는 진정한 에이전트 구현

### 1.2 현재 vs 목표

| 항목 | 현재 (agent_integration.py) | 목표 (career_agent.py) |
|------|----------------------------|----------------------|
| 패턴 | LLM → if문 분기 | ReAct (Thought → Action → Observe) |
| 멀티스텝 | ❌ 1회성 판단 | ✅ 최대 4회 반복 |
| 도구 선택 | 개발자가 조건 정의 | AI가 자율 선택 |
| 순환 | ❌ | ✅ 필요시 재추론 |

### 1.3 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 에이전트 프레임워크 | **LangGraph** | 상태 관리, 그래프 기반 워크플로우 |
| 추론 패턴 | **ReAct** | Thought-Action-Observation 루프 |
| 도구 연결 | **Custom Tools** | @tool 데코레이터, 유연성 |
| LLM | **OpenAI GPT-4o-mini** | 기존 사용 중, 비용 효율 |
| MCP | **❌ 사용 안 함** | 오버엔지니어링, Custom Tool로 충분 |

---

## 2. 아키텍처

### 2.1 ReAct 루프 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      ReAct Loop                              │
│                                                              │
│   User Input                                                 │
│       │                                                      │
│       ▼                                                      │
│   ┌──────────┐                                              │
│   │  REASON  │ ◀───────────────────────┐                    │
│   │ (추론)   │                          │                    │
│   └────┬─────┘                          │                    │
│        │                                │                    │
│        │ Thought: "학습경로 필요해 보임"  │                    │
│        │ Action: get_learning_path      │                    │
│        ▼                                │                    │
│   ┌──────────┐                          │                    │
│   │  ACTION  │                          │                    │
│   │ (도구호출)│                          │ 계속 필요시         │
│   └────┬─────┘                          │                    │
│        │                                │                    │
│        ▼                                │                    │
│   ┌──────────┐                          │                    │
│   │ OBSERVE  │ ─────────────────────────┘                    │
│   │ (결과확인)│                                              │
│   └────┬─────┘                                              │
│        │                                                     │
│        │ 완료 (FINISH)                                       │
│        ▼                                                     │
│   ┌──────────┐                                              │
│   │  ANSWER  │                                              │
│   │ (최종응답)│                                              │
│   └──────────┘                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 시스템 흐름도

```
사용자 메시지
     │
     ▼
┌─────────────────┐
│  agent_router   │ ─── 단순 대화 ──▶ 기존 chat_service
│  (조건부 분기)   │
└────────┬────────┘
         │ 복잡한 질문
         ▼
┌─────────────────┐
│  career_agent   │ ◀──── LangGraph StateGraph
│  (ReAct 루프)   │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
 멘토링    학습경로   채용공고   예약
  검색      조회      검색     처리
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
         ▼
    최종 응답 생성
```

---

## 3. 파일 구조

```
ai-service/
├── services/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── state.py              # [신규] AgentState 정의
│   │   ├── tools.py              # [신규] Custom Tools 정의
│   │   ├── prompts.py            # [신규] ReAct 시스템 프롬프트
│   │   ├── career_agent.py       # [신규] LangGraph StateGraph
│   │   ├── agent_router.py       # [신규] 에이전트 사용 조건 판단
│   │   └── (기존 파일들...)
│   │
│   ├── assistant/
│   │   ├── agent_integration.py  # [유지] 기존 트리거 로직 (fallback용)
│   │   └── tools.py              # [유지] 기존 도구 함수들
│   │
│   └── chat_service.py           # [수정] 에이전트 연동
│
├── tests/
│   ├── test_tools.py             # [신규] 도구 단위 테스트
│   ├── test_career_agent.py      # [신규] 에이전트 단독 테스트
│   └── test_integration.py       # [신규] 통합 테스트
│
└── docs/
    └── REACT_AGENT_DEVELOPMENT_PLAN.md  # 이 문서
```

---

## 4. 상세 설계

### 4.1 state.py - 에이전트 상태

```python
class AgentState(TypedDict):
    # 대화 관련
    messages: Annotated[List, add_messages]  # 대화 히스토리
    user_id: Optional[int]                    # 사용자 ID
    session_id: Optional[str]                 # 세션 ID

    # ReAct 루프 상태
    current_step: int          # 현재 스텝 (0~4)
    thought: Optional[str]     # 현재 추론
    action: Optional[str]      # 선택한 도구 또는 "FINISH"
    action_input: Optional[dict]  # 도구 입력
    observation: Optional[dict]   # 도구 결과

    # 히스토리
    tool_history: List[ToolCall]  # 실행한 도구들
    final_answer: Optional[str]   # 최종 응답

    # 에러 핸들링
    error: Optional[str]
    should_fallback: bool      # 일반 응답으로 전환 여부
```

**상수:**
- `MAX_STEPS = 4` (무한루프 방지)
- `TIMEOUT_SECONDS = 30` (전체 타임아웃)
- `TOOL_TIMEOUT_SECONDS = 10` (개별 도구)

---

### 4.2 tools.py - Custom Tools

#### Phase 1 도구 (핵심)

| 도구명 | 설명 | 입력 | 출력 |
|--------|------|------|------|
| `search_mentoring_sessions` | 멘토링 검색 | career_interest: str | sessions: List[dict] |
| `get_learning_path` | 학습 경로 조회 | career: str | path: dict |
| `search_job_postings` | 채용 공고 검색 | keyword: str | jobs: List[dict] |
| `book_mentoring` | 멘토링 예약 | session_id, user_id | booking: dict |

#### 도구 정의 예시

```python
from langchain_core.tools import tool

@tool
def search_mentoring_sessions(career_interest: str) -> dict:
    """
    사용자의 관심 분야와 관련된 멘토링 세션을 검색합니다.

    호출 조건:
    - 사용자가 특정 직업에 관심을 보일 때
    - "어떻게 시작해야 할지", "조언" 등 방향성 질문 시
    - "멘토", "상담" 키워드 언급 시

    Args:
        career_interest: 관심 직업/분야 (예: 'UX 디자이너')

    Returns:
        검색된 멘토링 세션 목록
    """
    # 백엔드 API 호출 로직
    pass
```

#### Phase 2 도구 (확장)

| 도구명 | 설명 | 조건 |
|--------|------|------|
| `web_search` | 실시간 웹 검색 | "최신", "트렌드", "요즘" |
| `prepare_questions` | 멘토링 질문 준비 | 예약 완료 후 |

---

### 4.3 prompts.py - ReAct 프롬프트

#### 핵심 프롬프트 구조

```python
REACT_SYSTEM_PROMPT = """
당신은 DreamPath 진로 상담 AI 에이전트입니다.
사용자의 메시지를 분석하고, 필요한 도구를 선택하여 도움을 제공합니다.

## 사용 가능한 도구
1. search_mentoring_sessions: 멘토링 세션 검색
   - 사용 시점: 직업 관심 표현 + 조언/방향 필요

2. get_learning_path: 학습 경로 조회
   - 사용 시점: "뭘 배워야", "어떻게 공부", "시작하려면"

3. search_job_postings: 채용 공고 검색
   - 사용 시점: "취업", "채용", "연봉", "회사"

4. book_mentoring: 멘토링 예약
   - 사용 시점: "예약", "신청" + 세션 정보 있을 때

5. FINISH: 도구 없이 답변
   - 사용 시점: 충분한 정보 수집 완료 또는 일반 대화

## 추론 규칙
1. 먼저 사용자의 의도를 파악하세요
2. 필요한 정보가 무엇인지 생각하세요
3. 적절한 도구를 선택하세요 (또는 FINISH)
4. 도구 결과를 보고 추가 행동이 필요한지 판단하세요

## 출력 형식 (반드시 JSON)
{
  "thought": "현재 상황 분석 및 다음 행동 이유",
  "action": "도구명 또는 FINISH",
  "action_input": {"param": "value"}  // FINISH면 생략
}

## 주의사항
- 한 번에 하나의 도구만 선택하세요
- 불확실하면 FINISH하고 사용자에게 질문하세요
- 도구 결과가 비어있으면 다른 접근을 시도하세요
"""
```

---

### 4.4 career_agent.py - LangGraph 구현

```python
from langgraph.graph import StateGraph, END
from .state import AgentState, MAX_STEPS
from .tools import TOOLS
from .prompts import REACT_SYSTEM_PROMPT

# 노드 함수들
async def reason_node(state: AgentState) -> dict:
    """LLM이 다음 행동 결정"""
    pass

async def action_node(state: AgentState) -> dict:
    """선택된 도구 실행"""
    pass

async def observe_node(state: AgentState) -> dict:
    """도구 결과 처리"""
    pass

async def answer_node(state: AgentState) -> dict:
    """최종 답변 생성"""
    pass

# 조건부 엣지
def should_continue(state: AgentState) -> str:
    """계속할지 종료할지 판단"""
    if state["should_fallback"]:
        return "fallback"
    if state["current_step"] >= MAX_STEPS:
        return "finish"
    if state["action"] == "FINISH":
        return "finish"
    return "continue"

# 그래프 구성
def create_career_agent():
    graph = StateGraph(AgentState)

    # 노드 추가
    graph.add_node("reason", reason_node)
    graph.add_node("action", action_node)
    graph.add_node("observe", observe_node)
    graph.add_node("answer", answer_node)

    # 엣지 정의
    graph.set_entry_point("reason")
    graph.add_edge("reason", "action")
    graph.add_edge("action", "observe")
    graph.add_conditional_edges(
        "observe",
        should_continue,
        {
            "continue": "reason",
            "finish": "answer",
            "fallback": "answer"
        }
    )
    graph.add_edge("answer", END)

    return graph.compile()
```

---

### 4.5 agent_router.py - 조건부 라우팅

```python
def should_use_agent(message: str) -> bool:
    """
    에이전트 사용 여부 판단 (비용 관리)

    Returns:
        True: ReAct 에이전트 사용
        False: 기존 단순 응답 사용
    """
    # 제외 조건 (단순 대화)
    simple_patterns = ["안녕", "고마워", "ㅋㅋ", "ㅎㅎ", "네", "응", "아니"]
    if any(p in message for p in simple_patterns) and len(message) < 20:
        return False

    # 에이전트 필요 조건
    agent_patterns = [
        # 진로 관심 표현
        "되고 싶", "하고 싶", "관심", "꿈",
        # 방법/시작 질문
        "어떻게", "뭐부터", "시작", "준비",
        # 정보 요청
        "추천", "찾아", "알려", "검색",
        # 도메인 키워드
        "멘토", "취업", "채용", "연봉", "회사",
        "학습", "공부", "배우",
    ]
    return any(p in message for p in agent_patterns)


async def route_message(
    message: str,
    user_id: int = None,
    session_id: str = None,
    conversation_history: list = None
) -> dict:
    """
    메시지를 적절한 처리기로 라우팅
    """
    if should_use_agent(message):
        # ReAct 에이전트 사용
        from .career_agent import career_agent
        result = await career_agent.ainvoke(
            create_initial_state(message, user_id, session_id, conversation_history)
        )
        return {
            "message": result["final_answer"],
            "used_agent": True,
            "tools_used": [t["tool_name"] for t in result["tool_history"]]
        }
    else:
        # 기존 단순 응답
        return {
            "message": await simple_response(message),
            "used_agent": False,
            "tools_used": []
        }
```

---

## 5. 에러 핸들링 전략

### 5.1 에러 유형별 처리

| 에러 유형 | 처리 방법 |
|----------|----------|
| 도구 API 타임아웃 | `should_fallback = True`, 일반 응답 |
| 도구 결과 비어있음 | 다른 도구 시도 또는 FINISH |
| LLM 파싱 실패 | 재시도 1회, 실패 시 fallback |
| MAX_STEPS 초과 | 강제 FINISH, 현재까지 정보로 응답 |

### 5.2 Fallback 로직

```python
async def action_node(state: AgentState) -> dict:
    try:
        result = await execute_tool(
            state["action"],
            state["action_input"],
            timeout=TOOL_TIMEOUT_SECONDS
        )
        return {"observation": result, "error": None}

    except TimeoutError:
        return {
            "observation": None,
            "error": "도구 실행 시간 초과",
            "should_fallback": True
        }

    except Exception as e:
        return {
            "observation": None,
            "error": str(e),
            "should_fallback": True
        }
```

---

## 6. 비용 관리 전략

### 6.1 LLM 호출 비용 비교

| 시나리오 | 호출 횟수 | 예상 비용 |
|----------|----------|----------|
| 기존 (단순 응답) | 1회 | 기준 |
| ReAct (평균) | 3회 | 3배 |
| ReAct (최대) | 5회 | 5배 |

### 6.2 비용 절감 방안

1. **조건부 에이전트 사용**: 복잡한 질문에만 ReAct 적용
2. **MAX_STEPS 제한**: 4회로 제한
3. **캐싱**: 동일 도구 호출 결과 캐싱 (선택)
4. **모니터링**: 에이전트 사용률 추적

---

## 7. 구현 일정

| 단계 | 작업 | 예상 시간 | 산출물 |
|------|------|----------|--------|
| 1 | state.py 작성 | 2시간 | AgentState 정의 |
| 2 | tools.py + 단위 테스트 | 4시간 | 4개 도구 + 테스트 |
| 3 | prompts.py 작성 | 3시간 | ReAct 프롬프트 |
| 4 | career_agent.py + 테스트 | 6시간 | LangGraph 구현 |
| 5 | agent_router.py | 2시간 | 라우팅 로직 |
| 6 | 에러 핸들링 구체화 | 2시간 | fallback 로직 |
| 7 | chat_service 연동 | 3시간 | 기존 서비스 통합 |
| 8 | 통합 테스트 | 4시간 | E2E 테스트 |

**총 예상: 26시간 (3~4일)**

---

## 8. 테스트 계획

### 8.1 단위 테스트 (test_tools.py)

```python
# 각 도구별 테스트
def test_search_mentoring_sessions():
    result = search_mentoring_sessions("UX 디자이너")
    assert "sessions" in result
    assert isinstance(result["sessions"], list)

def test_get_learning_path():
    result = get_learning_path("백엔드 개발자")
    assert "topics" in result
    assert len(result["topics"]) > 0
```

### 8.2 에이전트 테스트 (test_career_agent.py)

```python
# ReAct 루프 테스트
async def test_agent_finds_mentoring():
    state = create_initial_state("UX 디자이너 되고 싶은데 어떻게 해야해?")
    result = await career_agent.ainvoke(state)

    assert result["final_answer"] is not None
    assert any("mentoring" in t["tool_name"] for t in result["tool_history"])

async def test_agent_respects_max_steps():
    # 복잡한 질문으로 MAX_STEPS 테스트
    state = create_initial_state("모든 개발자 직업 비교해줘")
    result = await career_agent.ainvoke(state)

    assert result["current_step"] <= MAX_STEPS
```

### 8.3 통합 테스트 (test_integration.py)

```python
# 실제 API 흐름 테스트
async def test_full_conversation_flow():
    # 1. 일반 인사 → 에이전트 안 씀
    response1 = await route_message("안녕!")
    assert response1["used_agent"] == False

    # 2. 진로 질문 → 에이전트 사용
    response2 = await route_message("개발자 되고 싶어")
    assert response2["used_agent"] == True
```

---

## 9. 기존 코드 통합 전략

### 9.1 병행 운영

```
agent_integration.py (기존)
├── 역할: 단순 트리거 판단, fallback 용
├── 상태: 유지 (수정 최소화)
└── 사용: 에이전트 실패 시 대체

career_agent.py (신규)
├── 역할: 복잡한 멀티스텝 처리
├── 상태: 신규 개발
└── 사용: should_use_agent() == True 일 때
```

### 9.2 chat_service.py 수정

```python
# 기존 코드 유지하면서 에이전트 옵션 추가
async def process_message(session_id, message, user_id=None):
    # 에이전트 라우팅
    from services.agents.agent_router import route_message, should_use_agent

    if should_use_agent(message):
        try:
            return await route_message(message, user_id, session_id)
        except Exception as e:
            logger.error(f"에이전트 실패, fallback: {e}")
            # 기존 로직으로 fallback

    # 기존 로직 실행
    return await existing_chat_logic(session_id, message)
```

---

## 10. 성공 기준

| 항목 | 기준 |
|------|------|
| 기능 | 4개 도구 모두 정상 동작 |
| 성능 | 응답 시간 30초 이내 |
| 안정성 | 에러 시 graceful fallback |
| 정확도 | 도구 선택 정확도 80% 이상 |
| 비용 | 에이전트 사용률 30% 이하 유지 |

---

## 11. 향후 확장 계획 (Phase 2)

- [ ] web_search 도구 추가 (Tavily API)
- [ ] 멘토링 질문 준비 도구
- [ ] 대화 요약 도구
- [ ] LangSmith 연동 (모니터링)
- [ ] 프롬프트 A/B 테스트

---

## 12. 참고 자료

- [LangGraph 공식 문서](https://langchain-ai.github.io/langgraph/)
- [ReAct 논문](https://arxiv.org/abs/2210.03629)
- [LangChain Tools 가이드](https://python.langchain.com/docs/modules/tools/)

---

**문서 버전**: v1.0
**최종 수정**: 2024-12-02
