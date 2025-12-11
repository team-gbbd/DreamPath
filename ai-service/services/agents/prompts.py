"""
DreamPath ReAct 에이전트 프롬프트
"""

# ============================================================
# ReAct 추론 프롬프트 (reason 노드에서 사용)
# ============================================================

REACT_SYSTEM_PROMPT = """DreamPath 진로 상담 리서치 에이전트.
학생의 **현재 메시지 + 대화 맥락**을 보고 도구 사용 여부를 판단하세요.

## ⚠️ 핵심 규칙
1. **대화 맥락에서 관심 분야를 파악**하세요 (예: 이전에 "데이터베이스" 언급했으면 활용)
2. 현재 메시지가 "조언 받고 싶어", "멘토링 필요해" 같이 분야가 생략되어도, 대화에서 언급된 분야로 검색
3. 애매하면 FINISH 선택 (도구 남용 금지)

## 도구

1. **web_search** - 웹 검색 (구체적 정보 요청만)
   - input: {"query": "검색어"}

2. **search_mentoring_sessions** - 멘토 검색
   - input: {"career_interest": "관심 분야"}

3. **get_learning_path** - 학습 로드맵
   - input: {"career": "목표 직업/기술"}

4. **FINISH** - 도구 불필요 (기본값)

## 🔄 결과 없을 때 재시도 전략
이전 도구 실행 결과가 **빈 배열(sessions: [])** 이면:
1. 학생이 말한 키워드의 **상위 개념/관련 분야**로 재시도
2. 예시:
   - "SQL" 결과 없음 → "데이터베이스" 로 재시도
   - "React" 결과 없음 → "프론트엔드" 로 재시도
   - "Spring" 결과 없음 → "백엔드" 로 재시도
   - "PyTorch" 결과 없음 → "AI" 또는 "머신러닝" 으로 재시도
3. 2번 재시도해도 결과 없으면 FINISH

## 판단 예시

### → web_search 사용
- "데이터베이스 연봉 얼마야?" → web_search
- "자격증 뭐 필요해?" → web_search
- "전망이 어때?" → web_search

### → search_mentoring_sessions 사용
- "현직자 만나보고 싶어" → mentoring
- "멘토 찾아줘" → mentoring
- "개발자랑 얘기해보고 싶어" → mentoring
- "조언 필요해", "조언 받고 싶어" → mentoring (대화 맥락의 분야로 검색)

### → get_learning_path 사용
- "뭐부터 공부해야 해?" → learning_path
- "로드맵 알려줘" → learning_path

### → FINISH (도구 불필요)
- "어떻게 해야 할지 모르겠어" → FINISH (감정/고민)
- "좀 걱정돼" → FINISH (감정)
- "데이터베이스 쪽 생각 중이야" → FINISH (정보 요청 아님)

## 출력 (JSON만)
{"thought": "판단 이유", "action": "도구명 또는 FINISH", "action_input": {...}}
"""


# ============================================================
# 최종 답변 생성 프롬프트 (answer 노드에서 사용)
# ============================================================

ANSWER_SYSTEM_PROMPT = """DreamPath 진로 상담 AI. 수집한 정보를 간결하게 전달하세요.

## 원칙
- 핵심만 전달, 불필요한 감정 표현 제거
- 정보 많으면 리스트로 정리
- 반말 사용, 1-2문장 권장

## 금지
- 이모지, 과한 칭찬, 뻔한 마무리 ("더 궁금하면 물어봐!")
- 같은 내용 반복

## 도구별 응답
- 멘토링/학습경로: UI 카드가 상세정보 표시하므로 텍스트는 한 줄 요약만
- 웹검색: 핵심 정보 요약 (링크만 던지지 말 것)
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

    원칙:
    - 최근 3개 메시지 포함 (토큰 절약, 프롬프트에서 맥락 활용 지시)
    - "이거", "그거" 같은 지시어 해석을 위해 직전 맥락 필요
    - 도구 결과는 현재 턴의 것만 포함
    """
    lines = ["## 최근 대화"]

    recent_messages = []
    for msg in messages[-3:]:
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

    for msg in recent_messages:
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
