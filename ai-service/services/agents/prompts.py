"""
DreamPath ReAct 에이전트 프롬프트
"""

# ============================================================
# ReAct 추론 프롬프트 (reason 노드에서 사용)
# ============================================================

REACT_SYSTEM_PROMPT = """당신은 DreamPath 진로 상담 플랫폼의 리서치 에이전트입니다.
학생의 진로 관련 질문을 분석하고, 필요하면 도구를 사용해 정보를 수집합니다.

## 사용 가능한 도구

1. **search_mentoring_sessions** - 현직자 멘토에게 직접 조언받기
   - 실제 현직자와 1:1 상담 예약 (조언, 상담, 경험담 등)
   - "조언 받고 싶어", "현직자한테 물어보고 싶어" 같은 요청에 적합
   - action_input: {"career_interest": "관심 분야"}

2. **get_learning_path** - 학습 커리큘럼 조회
   - 혼자 공부할 수 있는 단계별 학습 로드맵 제공
   - "공부하고 싶어", "배우고 싶어", "어떻게 공부해?", "뭘 배워야 해?" 같은 요청에 적합
   - action_input: {"career": "목표 직업 또는 기술"}

3. **web_search** - 실시간 웹 검색
   - 연봉, 전망, 트렌드, 자격증 등 최신 정보 검색
   - "연봉 얼마야?", "전망 어때?", "자격증 뭐가 있어?" 같은 요청에 적합
   - action_input: {"query": "검색어"}

4. **FINISH** - 도구 없이 직접 대화
   - 학생이 명확한 정보를 요청하지 않은 경우
   - 일상 대화, 감정 표현, 막연한 고민 상담
   - 이미 이전에 도구로 정보를 수집한 후
   - 예: "뭐하지", "모르겠어", "고민이야", "그냥 물어본 거야"

## 판단 기준

학생이 **구체적인 정보**를 요청했는가?
- YES → 적절한 도구 사용
- NO → FINISH로 공감하며 대화

## 도구 결과 활용

- 멘토링 검색 결과가 없으면 → 상위 분야나 영어로 재검색 시도 (예: 리액트 없으면 → 프론트엔드로 검색, 그래도 없으면 → frontend로 검색)
- 같은 검색어로 같은 도구를 다시 호출하면 안 됨 → 다른 검색어로 시도하거나 FINISH

## 출력 형식 (JSON)

```json
{
  "thought": "상황 분석 및 판단 이유",
  "action": "도구명 또는 FINISH",
  "action_input": {"key": "value"}
}
```
"""


# ============================================================
# 최종 답변 생성 프롬프트 (answer 노드에서 사용)
# ============================================================

ANSWER_SYSTEM_PROMPT = """당신은 DreamPath 진로 상담 AI입니다.
수집한 정보를 바탕으로 **간결하고 핵심적인** 답변을 작성하세요.

## 답변 원칙

1. **정보 중심**: 불필요한 감정 표현 없이 핵심만 전달
2. **간결함**: 짧고 명확하게. 쓸데없는 말 금지
3. **구조화**: 정보가 많으면 리스트/불릿으로 정리
4. **반말 사용**: 친근하지만 군더더기 없이

## 금지 사항 ❌

- 이모지 사용 금지
- "정말 좋은 선택이야!", "대단해!" 같은 과한 칭찬 금지
- "혹시 더 궁금한 점 있으면 언제든 물어봐!" 같은 뻔한 마무리 금지
- 같은 내용 반복 금지

## 좋은 예시

❌ 나쁜 예:
"파이썬에 대해 궁금한 거구나! 😊 파이썬은 정말 많은 장점이 있어. 1. 간결하고 쉬운 문법..."

✅ 좋은 예:
"파이썬 장점:
- 문법이 간결해서 배우기 쉬움
- 개발 속도가 빠름
- 다양한 플랫폼 지원, 다른 언어와 연동 용이"

## 정보 활용

- **관련성 필터링**: 질문과 직접 관련된 정보만 포함
- **멘토링 추천**: 사담 없이 바로 멘토 정보 전달. UI 카드가 별도로 표시되므로 텍스트에서 상세 정보 반복 금지
- **학습 경로 추천**: 사담 없이 바로 학습 정보 전달. UI 카드가 별도로 표시되므로 텍스트에서 상세 정보 반복 금지
- **웹 검색**: 핵심 정보만 요약. 링크만 던지지 말 것

## 형식

- 1-2문장 권장 (도구 사용 시 UI 카드가 정보를 보여주므로 텍스트는 최소화)
- 마무리 인사나 추가 질문 유도 불필요
"""


# ============================================================
# 대화 컨텍스트 포맷 (LLM 입력용)
# ============================================================

# reason 노드에서 도구 결과 요약 표시용
def _summarize_tool_output(tool_name: str, output: dict) -> str:
    """도구 결과를 핵심만 요약"""
    if not output:
        return "결과 없음"

    if tool_name == "web_search":
        results = output.get("results", [])
        if not results:
            return "검색 결과 없음"
        summaries = []
        for r in results[:3]:
            title = r.get("title", "")
            snippet = r.get("snippet", "")[:100]
            summaries.append(f"  • {title}: {snippet}...")
        return f"검색어 '{output.get('query', '')}' - {len(results)}개 결과\n" + "\n".join(summaries)

    elif tool_name == "search_mentoring_sessions":
        sessions = output.get("sessions", [])
        if not sessions:
            return output.get("message", "관련 멘토 없음")
        mentors = [f"{s.get('mentorName', '')}({s.get('mentorTitle', '')})" for s in sessions[:2]]
        return f"멘토 {len(sessions)}명 발견: {', '.join(mentors)}"

    elif tool_name == "get_learning_path":
        if output.get("exists"):
            path = output.get("path", {})
            return f"'{path.get('career', '')}' 학습 경로 있음 (진행률 {path.get('progress', 0)}%)"
        elif output.get("canCreate"):
            return f"'{output.get('path', {}).get('career', '')}' 학습 경로 생성 가능"
        else:
            return output.get("message", "학습 경로 없음")

    else:
        return output.get("message", "완료")


# reason 노드용: 최근 대화 + 도구 실행 결과를 컨텍스트로 구성
def format_conversation_for_reasoning(messages: list, tool_history: list) -> str:
    """
    추론을 위한 대화 컨텍스트 포맷팅

    ReAct 원칙:
    - 최근 1-2턴만 포함 (전체 히스토리는 reasoning을 방해함)
    - "이거", "그거" 같은 지시어 해석을 위해 직전 맥락 필요
    - 도구 결과는 현재 턴의 것만 포함
    """
    lines = ["## 최근 대화"]

    recent_messages = []
    for msg in messages[-4:]:
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content", "")
        elif hasattr(msg, "type"):
            role = "user" if msg.type == "human" else "assistant"
            content = msg.content
        else:
            continue

        if content:
            role_label = "학생" if role == "user" else "AI"
            recent_messages.append(f"{role_label}: {content}")

    for msg in recent_messages[-3:]:
        lines.append(msg)

    if tool_history:
        lines.append("\n" + "━" * 40)
        lines.append("## 이전 도구 실행 결과")
        lines.append("━" * 40)

        for t in tool_history:
            tool_name = t.get("tool_name", "unknown")
            success = t.get("success", False)
            output = t.get("tool_output", {})

            status = "✅ 성공" if success else "❌ 실패"
            summary = _summarize_tool_output(tool_name, output)

            lines.append(f"\n[{tool_name}] {status}")
            lines.append(f"{summary}")

        lines.append("\n" + "━" * 40)

    return "\n".join(lines)


# answer 노드용: 도구 결과를 상세하게 포맷팅
def format_observation_for_answer(tool_history: list) -> str:
    """최종 답변을 위한 도구 결과 포맷팅"""
    if not tool_history:
        return "수집된 정보 없음"

    lines = []
    for t in tool_history:
        name = t["tool_name"]
        output = t.get("tool_output", {})

        if name == "search_mentoring_sessions" and output.get("sessions"):
            lines.append("### 멘토링 세션")
            for s in output["sessions"][:2]:
                lines.append(f"- {s.get('mentorName', '멘토')} ({s.get('mentorTitle', '')}): {s.get('topic', '')}")

        elif name == "get_learning_path":
            path = output.get("path", {})
            exists = output.get("exists", False)
            can_create = output.get("canCreate", False)

            if exists:
                # 기존 학습 경로가 있는 경우
                lines.append(f"### {path.get('career', '')} 학습 경로 (기존)")
                lines.append(f"- 진행률: {path.get('progress', 0)}%")
                lines.append(f"- 기간: {path.get('weeks', 4)}주")
                lines.append(f"- 상태: {path.get('status', '진행중')}")
                if path.get("topics"):
                    lines.append(f"- 주제: {', '.join(path.get('topics', [])[:4])}")
            elif can_create:
                # 생성 가능한 경우
                lines.append(f"### {path.get('career', '')} 학습 경로 (생성 가능)")
                lines.append(f"- 기간: {path.get('weeks', 4)}주 코스")
                lines.append(f"- 학습 페이지에서 시작 가능")
                lines.append(f"- URL: {output.get('createUrl', '/learning')}")
            else:
                # 지원하지 않는 경우
                lines.append(f"### 학습 경로 없음")
                lines.append(f"- '{path.get('career', '')}' 학습 경로는 아직 준비 중")
                if output.get("availableCareers"):
                    lines.append(f"- 가능한 직업: {', '.join(output.get('availableCareers', [])[:4])}")

        elif name == "book_mentoring" and output.get("success"):
            lines.append(f"### 예약 완료")
            lines.append(f"- 멘토: {output.get('mentorName', '')}")
            lines.append(f"- 일시: {output.get('sessionDate', '')}")

        elif name == "web_search" and output.get("results"):
            lines.append(f"### 웹 검색 결과 (쿼리: {output.get('query', '')})")
            for r in output["results"][:3]:
                title = r.get("title", "")
                snippet = r.get("snippet", "")
                lines.append(f"- **{title}**")
                lines.append(f"  {snippet}")

    return "\n".join(lines) if lines else "수집된 정보 없음"
