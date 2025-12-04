# DreamPath AI 에이전트 설계 문서

## 1. 개요

### 1.1 목표
기존 진로 상담 채팅에 AI 에이전트를 통합하여, 대화 흐름을 분석하고 적절한 시점에 멘토링/학습 경로 등을 **프로액티브하게 제안**

### 1.2 핵심 컨셉
- **별도 페이지 X** → 기존 `/career-chat`에 통합
- **AI가 끼어듦** → 대화 분석 후 적절한 시점에 제안
- **자연스러운 흐름** → 상담 맥락을 유지하면서 행동 제안

### 1.3 사용자 시나리오

```
[기존 진로 상담 흐름]

사용자: "요즘 디자인에 관심이 생겼어요"
AI: "어떤 계기로 관심이 생기셨나요?"
사용자: "친구가 만든 앱 UI 보고 나도 해보고 싶다는 생각이..."
AI: "직접 만들어보고 싶은 마음도 있으신가요?"
사용자: "네, 근데 뭘 어떻게 시작해야 할지..."

... (대화가 쌓이면서 UX 디자이너 방향이 윤곽 잡힘) ...

[AI 에이전트가 끼어듦]

AI: "💡 대화를 보니 UX 디자인 쪽에 관심이 있으시네요!

    마침 이번 주에 관련 멘토링 세션이 있어요:

    ┌─────────────────────────────────────┐
    │ 📅 김멘토님 (카카오 UX 디자이너)     │
    │    목요일 오후 7시                   │
    │    주제: 비전공자의 UX 전환 스토리   │
    └─────────────────────────────────────┘

    참여해보실래요?

    [예약하기] [다른 세션 보기] [계속 대화하기]"

사용자: (예약하기 클릭)

AI: "✅ 목요일 오후 7시 멘토링 예약했어요!
    하루 전에 알림 보내드릴게요.

    멘토님께 물어볼 질문 미리 준비해드릴까요?

    [질문 준비해줘] [괜찮아요]"
```

---

## 2. 시스템 아키텍처

### 2.1 통합 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│                /pages/career-chat/page.tsx                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  기존 채팅 UI + 에이전트 확장                        │    │
│  │                                                      │    │
│  │  - 기존 메시지 (user/assistant)                      │    │
│  │  - [NEW] 에이전트 카드 (멘토링 제안, 학습 경로 등)   │    │
│  │  - [NEW] 액션 버튼 (예약하기, 더 보기 등)           │    │
│  │  - [NEW] 실시간 처리 표시 (검색 중, 예약 중...)     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Spring Boot)                       │
│                                                              │
│  CareerChatController (기존)                                 │
│  - POST /api/chat                                            │
│                                                              │
│  [NEW] 에이전트 트리거 로직                                  │
│  - 응답에 agent_action 포함 여부 확인                        │
│  - agent_action이 있으면 프론트에 전달                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Python AI Service (FastAPI)                   │
│                                                              │
│  ChatService (기존) + AgentIntegration (NEW)                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  대화 분석 → 트리거 감지 → 에이전트 액션             │    │
│  │                                                      │    │
│  │  1. 사용자 메시지 + 대화 히스토리 분석               │    │
│  │  2. 직업 관심사가 윤곽 잡혔는지 판단                 │    │
│  │  3. 윤곽 잡히면 → 멘토링/학습경로 검색               │    │
│  │  4. 일반 응답 + agent_action 함께 반환               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Tools (에이전트가 사용):                                    │
│  ├── search_mentoring_sessions  # 멘토링 세션 검색          │
│  ├── create_mentoring_booking   # 멘토링 예약               │
│  ├── search_learning_paths      # 학습 경로 검색            │
│  ├── create_learning_path       # 학습 경로 생성            │
│  └── search_job_postings        # 채용공고 검색             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 기존 vs 변경

| 구분 | 기존 | 변경 후 |
|------|------|---------|
| 채팅 응답 | `{ message, identityStatus }` | `{ message, identityStatus, agentAction? }` |
| AI 역할 | 진로 상담만 | 진로 상담 + 프로액티브 제안 |
| 멘토링 연결 | 사용자가 직접 찾아감 | AI가 적절한 시점에 제안 |

---

## 3. 에이전트 트리거 로직

### 3.1 트리거 조건

AI가 대화를 분석하여 다음 조건을 감지:

```python
TRIGGER_CONDITIONS = {
    "mentoring_suggestion": {
        "description": "멘토링 세션 제안",
        "conditions": [
            "특정 직업/분야에 대한 관심이 3회 이상 언급됨",
            "정체성 명확도가 50% 이상",
            "사용자가 '어떻게 시작해야 할지', '뭘 해야 할지' 등 방향성 질문"
        ]
    },
    "learning_path_suggestion": {
        "description": "학습 경로 제안",
        "conditions": [
            "직업이 구체화됨 (예: UX 디자이너)",
            "사용자가 학습/준비에 대해 언급",
            "정체성 명확도가 70% 이상"
        ]
    },
    "job_posting_suggestion": {
        "description": "채용공고 제안",
        "conditions": [
            "직업이 확정됨",
            "사용자가 취업/이직 언급",
            "학습 경로 진행률 50% 이상"
        ]
    }
}
```

### 3.2 트리거 판단 프롬프트

```python
TRIGGER_ANALYSIS_PROMPT = """
당신은 진로 상담 AI의 에이전트입니다.
대화 내용을 분석하여 사용자에게 도움이 될 행동을 제안할 시점인지 판단하세요.

## 현재 대화 상태
- 정체성 명확도: {identity_clarity}%
- 현재 단계: {current_stage}
- 감지된 관심 분야: {detected_interests}

## 최근 대화
{conversation_history}

## 판단 기준
1. 사용자가 특정 직업/분야에 대해 구체적인 관심을 보이는가?
2. 방향성에 대한 고민을 표현했는가? (어떻게 시작해야 할지, 뭘 배워야 할지 등)
3. 현재 시점에 제안을 하는 것이 대화 흐름에 자연스러운가?

## 응답 형식
{
    "should_trigger": true/false,
    "trigger_type": "mentoring_suggestion" | "learning_path_suggestion" | "job_posting_suggestion" | null,
    "reason": "제안 이유 (사용자에게 보여줄 문구)",
    "detected_career": "감지된 직업/분야",
    "confidence": 0.0-1.0
}
"""
```

---

## 4. 응답 구조 설계

### 4.1 기존 응답 (변경 없음)

```json
{
    "sessionId": "uuid",
    "message": "어떤 계기로 관심이 생기셨나요?",
    "identityStatus": {
        "clarity": 45,
        "traits": ["창의성", "시각적 감각"],
        "insights": ["디자인 분야에 관심"]
    }
}
```

### 4.2 에이전트 액션 포함 응답 (NEW)

```json
{
    "sessionId": "uuid",
    "message": "UX 디자인에 관심이 있으시네요! 마침 관련 멘토링 세션이 있어요.",
    "identityStatus": { ... },
    "agentAction": {
        "type": "mentoring_suggestion",
        "reason": "대화를 보니 UX 디자인 쪽에 관심이 있으시네요",
        "data": {
            "sessions": [
                {
                    "id": 123,
                    "mentorName": "김멘토",
                    "mentorTitle": "카카오 UX 디자이너",
                    "topic": "비전공자의 UX 전환 스토리",
                    "datetime": "2024-01-15T19:00:00",
                    "availableSlots": 3
                }
            ]
        },
        "actions": [
            { "id": "book", "label": "예약하기", "primary": true },
            { "id": "more", "label": "다른 세션 보기" },
            { "id": "skip", "label": "계속 대화하기" }
        ]
    }
}
```

### 4.3 AgentAction 타입 정의

```typescript
interface AgentAction {
    type: 'mentoring_suggestion' | 'learning_path_suggestion' | 'job_posting_suggestion'
    reason: string  // "대화를 보니 UX 디자인 쪽에 관심이..."
    data: MentoringSuggestionData | LearningPathData | JobPostingData
    actions: ActionButton[]
}

interface MentoringSuggestionData {
    sessions: MentoringSession[]
}

interface LearningPathData {
    career: string
    estimatedWeeks: number
    topics: string[]
}

interface JobPostingData {
    jobs: JobPosting[]
}

interface ActionButton {
    id: string
    label: string
    primary?: boolean
    params?: Record<string, any>
}
```

---

## 5. Tool 설계

### 5.1 Tool 목록

| Tool | 설명 | 트리거 시점 |
|------|------|-------------|
| `search_mentoring_sessions` | 관련 멘토링 세션 검색 | 직업 관심사 형성 시 |
| `create_mentoring_booking` | 멘토링 예약 | 사용자가 예약 버튼 클릭 |
| `search_learning_paths` | 학습 경로 템플릿 검색 | 학습 의지 표현 시 |
| `create_learning_path` | 학습 경로 생성 | 사용자가 시작 버튼 클릭 |
| `search_job_postings` | 채용공고 검색 | 취업 의지 표현 시 |
| `prepare_questions` | 멘토링 질문 준비 | 예약 완료 후 |

### 5.2 Tool 구현

```python
from langchain.tools import tool
from typing import List, Optional
import httpx

@tool
async def search_mentoring_sessions(
    career_interest: str,
    limit: int = 3
) -> dict:
    """
    사용자의 관심 분야와 관련된 멘토링 세션을 검색합니다.

    Args:
        career_interest: 관심 직업/분야 (예: "UX 디자이너", "백엔드 개발자")
        limit: 검색 결과 수

    Returns:
        dict: 멘토링 세션 목록
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BACKEND_URL}/api/mentoring-sessions/available",
            params={"career": career_interest, "limit": limit}
        )
        return response.json()


@tool
async def create_mentoring_booking(
    user_id: int,
    session_id: int,
    reason: Optional[str] = None
) -> dict:
    """
    멘토링 세션을 예약합니다.

    Args:
        user_id: 사용자 ID
        session_id: 멘토링 세션 ID
        reason: 상담 희망 이유

    Returns:
        dict: 예약 결과 (booking_id, status, datetime)
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_URL}/api/mentoring-bookings",
            json={
                "menteeId": user_id,
                "sessionId": session_id,
                "reason": reason
            }
        )
        return response.json()


@tool
async def prepare_mentoring_questions(
    career_interest: str,
    user_background: str,
    mentor_expertise: str
) -> dict:
    """
    멘토링에서 물어볼 질문을 AI가 준비합니다.

    Args:
        career_interest: 관심 직업
        user_background: 사용자 배경 (전공, 경험 등)
        mentor_expertise: 멘토 전문 분야

    Returns:
        dict: 추천 질문 목록
    """
    # LLM으로 질문 생성
    ...
```

---

## 6. Frontend 변경 사항

### 6.1 기존 career-chat 수정

```
/pages/career-chat/
├── page.tsx                    # 기존 + agentAction 처리 추가
├── components/
│   ├── MessageList.tsx         # 기존
│   ├── MessageItem.tsx         # 기존
│   ├── [NEW] AgentCard.tsx     # 에이전트 제안 카드
│   ├── [NEW] MentoringCard.tsx # 멘토링 세션 카드
│   ├── [NEW] ActionButtons.tsx # 액션 버튼 그룹
│   └── [NEW] ProcessingIndicator.tsx # 처리 중 표시
└── hooks/
    └── [NEW] useAgentAction.ts # 에이전트 액션 처리
```

### 6.2 AgentCard 컴포넌트

```tsx
interface AgentCardProps {
    action: AgentAction
    onAction: (actionId: string, params?: any) => void
    isProcessing: boolean
}

export function AgentCard({ action, onAction, isProcessing }: AgentCardProps) {
    return (
        <div className="agent-card">
            {/* 제안 이유 */}
            <div className="agent-reason">
                <span className="icon">💡</span>
                <span>{action.reason}</span>
            </div>

            {/* 컨텐츠 (타입별 다른 렌더링) */}
            <div className="agent-content">
                {action.type === 'mentoring_suggestion' && (
                    <MentoringSessionList sessions={action.data.sessions} />
                )}
                {action.type === 'learning_path_suggestion' && (
                    <LearningPathPreview data={action.data} />
                )}
                {action.type === 'job_posting_suggestion' && (
                    <JobPostingList jobs={action.data.jobs} />
                )}
            </div>

            {/* 액션 버튼 */}
            <div className="agent-actions">
                {action.actions.map(btn => (
                    <button
                        key={btn.id}
                        className={btn.primary ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => onAction(btn.id, btn.params)}
                        disabled={isProcessing}
                    >
                        {isProcessing && btn.primary ? <Spinner /> : btn.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
```

### 6.3 MentoringCard 컴포넌트

```tsx
interface MentoringSession {
    id: number
    mentorName: string
    mentorTitle: string
    topic: string
    datetime: string
    availableSlots: number
}

export function MentoringSessionList({ sessions }: { sessions: MentoringSession[] }) {
    return (
        <div className="mentoring-sessions">
            {sessions.map(session => (
                <div key={session.id} className="session-card">
                    <div className="session-header">
                        <span className="mentor-name">{session.mentorName}</span>
                        <span className="mentor-title">{session.mentorTitle}</span>
                    </div>
                    <div className="session-topic">{session.topic}</div>
                    <div className="session-meta">
                        <span className="datetime">
                            📅 {formatDateTime(session.datetime)}
                        </span>
                        <span className="slots">
                            {session.availableSlots}자리 남음
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}
```

---

## 7. Backend 변경 사항

### 7.1 ChatResponse DTO 수정

```java
public record ChatResponse(
    String sessionId,
    String message,
    IdentityStatusDto identityStatus,
    AgentActionDto agentAction  // NEW - nullable
) {}

public record AgentActionDto(
    String type,
    String reason,
    Object data,
    List<ActionButtonDto> actions
) {}

public record ActionButtonDto(
    String id,
    String label,
    Boolean primary,
    Map<String, Object> params
) {}
```

### 7.2 Python AI Service 호출 수정

```java
@Service
public class CareerChatService {

    public ChatResponse chat(ChatRequest request) {
        // 기존 로직
        PythonChatResponse pythonResponse = pythonChatService.chat(request);

        // 에이전트 액션이 있으면 포함
        AgentActionDto agentAction = null;
        if (pythonResponse.getAgentAction() != null) {
            agentAction = mapToAgentActionDto(pythonResponse.getAgentAction());
        }

        return new ChatResponse(
            request.getSessionId(),
            pythonResponse.getMessage(),
            pythonResponse.getIdentityStatus(),
            agentAction
        );
    }
}
```

---

## 8. Python AI Service 변경 사항

### 8.1 ChatService 수정

```python
# services/chat_service.py

class ChatService:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini")
        self.agent_integration = AgentIntegration()

    async def generate_response(
        self,
        session_id: str,
        user_message: str,
        conversation_history: list,
        identity_status: dict
    ) -> dict:
        # 1. 기존 응답 생성
        response_message = await self._generate_chat_response(...)

        # 2. 에이전트 트리거 분석 (NEW)
        agent_action = await self.agent_integration.analyze_and_trigger(
            conversation_history=conversation_history,
            identity_status=identity_status,
            current_message=user_message
        )

        return {
            "message": response_message,
            "agent_action": agent_action  # None이면 생략
        }
```

### 8.2 AgentIntegration 클래스

```python
# services/assistant/agent_integration.py

class AgentIntegration:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini")
        self.tools = [
            search_mentoring_sessions,
            search_learning_paths,
            search_job_postings
        ]

    async def analyze_and_trigger(
        self,
        conversation_history: list,
        identity_status: dict,
        current_message: str
    ) -> Optional[dict]:
        """대화 분석 후 에이전트 액션 트리거"""

        # 1. 트리거 조건 분석
        trigger_result = await self._analyze_trigger(
            conversation_history,
            identity_status
        )

        if not trigger_result["should_trigger"]:
            return None

        # 2. 트리거 타입에 따라 Tool 실행
        if trigger_result["trigger_type"] == "mentoring_suggestion":
            sessions = await search_mentoring_sessions(
                career_interest=trigger_result["detected_career"]
            )
            return {
                "type": "mentoring_suggestion",
                "reason": trigger_result["reason"],
                "data": {"sessions": sessions},
                "actions": [
                    {"id": "book", "label": "예약하기", "primary": True},
                    {"id": "more", "label": "다른 세션 보기"},
                    {"id": "skip", "label": "계속 대화하기"}
                ]
            }

        # ... 다른 트리거 타입 처리

        return None

    async def _analyze_trigger(self, conversation_history, identity_status) -> dict:
        """LLM으로 트리거 조건 분석"""
        prompt = TRIGGER_ANALYSIS_PROMPT.format(
            identity_clarity=identity_status.get("clarity", 0),
            current_stage=identity_status.get("stage", "PRESENT"),
            detected_interests=identity_status.get("traits", []),
            conversation_history=self._format_history(conversation_history)
        )

        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return json.loads(response.content)
```

---

## 9. 구현 순서

### Phase 1: Python AI Service
1. [ ] `services/assistant/agent_integration.py` - 에이전트 통합 클래스
2. [ ] `services/assistant/tools.py` - Tool 함수 구현
3. [ ] `services/chat_service.py` 수정 - 에이전트 연동
4. [ ] 트리거 분석 프롬프트 튜닝
5. [ ] 단위 테스트

### Phase 2: Backend
1. [ ] DTO 수정 (ChatResponse에 agentAction 추가)
2. [ ] CareerChatService 수정
3. [ ] 멘토링 세션 검색 API 확인/수정
4. [ ] 통합 테스트

### Phase 3: Frontend
1. [ ] AgentCard 컴포넌트
2. [ ] MentoringCard, LearningPathCard 등
3. [ ] useAgentAction 훅
4. [ ] career-chat 페이지 수정
5. [ ] 스타일링

### Phase 4: 고도화
1. [ ] 트리거 조건 튜닝
2. [ ] 에이전트 응답 품질 개선
3. [ ] 액션 실행 후 흐름 (예약 완료 → 질문 준비 제안)
4. [ ] 에러 핸들링

---

## 10. 기술 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 통합 방식 | 기존 채팅에 통합 | 자연스러운 UX, 별도 페이지 불필요 |
| 트리거 판단 | LLM 기반 | 규칙 기반보다 유연함 |
| Tool 실행 | 서버 사이드 | 보안, API 키 관리 |
| 실시간 표시 | 기존 응답에 포함 | SSE 추가 구현 불필요 |

---

## 11. 예상 일정

| Phase | 작업 |
|-------|------|
| Phase 1 | Python 에이전트 통합 |
| Phase 2 | Backend 수정 |
| Phase 3 | Frontend UI |
| Phase 4 | 고도화 & 튜닝 |

---

## 12. 참고 자료

- 기존 ChatService: `ai-service/services/chat_service.py`
- 기존 에이전트: `ai-service/services/agents/`
- 멘토링 API: `backend/.../MentoringBookingController.java`
- 프론트 채팅: `frontend/src/pages/career-chat/page.tsx`
