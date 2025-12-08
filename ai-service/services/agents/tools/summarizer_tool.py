import asyncio
import json
from typing import Any, Dict, List, Mapping, Sequence, Union

from openai import OpenAI


ConversationHistory = Union[str, Sequence[Mapping[str, Any]]]


class SummarizerTool:
    """
    Summarizes the counseling conversation and survey responses into a structured profile.
    """

    name = "personality_conversation_summarizer"
    description = (
        "Summarizes the coaching conversation and survey answers into a concise persona "
        "summary along with strengths, risks, goals, and core values."
    )
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "conversation_history": {
                "type": ["string", "array"],
                "description": "Prior conversation messages in chronological order.",
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["content"],
                },
            },
            "survey_data": {
                "type": ["object", "null"],
                "description": "Structured survey answers captured during onboarding.",
            },
            "user_profile": {
                "type": ["object", "null"],
                "description": "Optional previously stored profile values.",
            },
        },
        "required": ["conversation_history"],
    }

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.client = OpenAI()
        self.model = model

    def definition(self) -> Dict[str, Any]:
        """
        OpenAI tool protocol definition.
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    async def run(
        self,
        *,
        conversation_history: ConversationHistory,
        survey_data: Mapping[str, Any] | None = None,
        user_profile: Mapping[str, Any] | None = None,
    ) -> Dict[str, Any]:
        formatted_history = self._format_history(conversation_history)
        survey_block = self._format_structured_block("Survey Data", survey_data or {})
        profile_block = self._format_structured_block("Existing Profile", user_profile or {})

        prompt = f"""
다음은 진로 상담 대화 내용과 사용자의 설문 답변, 그리고 기존 프로필 정보입니다.
모든 정보를 검토하고 사용자의 현재 심리와 동기, 위험 신호를 요약하세요.

대화 내용:
{formatted_history}

설문 요약:
{survey_block}

기존 프로필:
{profile_block}

아래 JSON 스키마를 반드시 따르세요:
{{
  "summary": "짧은 요약",
  "strengths": ["강점1", "강점2"],
  "risks": ["위험1", "위험2"],
  "goals": ["목표1", "목표2"],
  "values": ["가치1", "가치2"]
}}
"""

        response = await asyncio.to_thread(
            self.client.chat.completions.create,
            model=self.model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": "You are a clinical psychologist specializing in teen career coaching.",
                },
                {"role": "user", "content": prompt},
            ],
        )

        raw_content = (response.choices[0].message.content or "").strip()
        return self._parse_summary(raw_content)

    def _format_history(self, history: ConversationHistory) -> str:
        if not history:
            return "대화 기록이 없습니다."

        if isinstance(history, str):
            return history.strip()

        lines: List[str] = []
        for message in history:
            role = (message.get("role") or message.get("speaker") or "user").strip()
            content = str(message.get("content") or message.get("message") or "").strip()
            if not content:
                continue
            normalized_role = "상담사" if role.lower() in {"assistant", "counselor"} else "학생"
            lines.append(f"{normalized_role}: {content}")
        return "\n".join(lines)

    def _format_structured_block(self, title: str, payload: Mapping[str, Any]) -> str:
        if not payload:
            return f"{title}: 정보 없음"
        try:
            return json.dumps(payload, ensure_ascii=False, indent=2)
        except (TypeError, ValueError):
            return f"{title}: {payload}"

    def _parse_summary(self, content: str) -> Dict[str, Any]:
        default = {
            "summary": content or "",
            "strengths": [],
            "risks": [],
            "goals": [],
            "values": [],
        }

        if not content:
            return default

        try:
            parsed = json.loads(content)
            return {
                "summary": parsed.get("summary") or default["summary"],
                "strengths": self._ensure_list(parsed.get("strengths")),
                "risks": self._ensure_list(parsed.get("risks")),
                "goals": self._ensure_list(parsed.get("goals")),
                "values": self._ensure_list(parsed.get("values")),
            }
        except json.JSONDecodeError:
            return default

    def _ensure_list(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value if item]
        if isinstance(value, str):
            return [v.strip() for v in value.split("\n") if v.strip()]
        return []

