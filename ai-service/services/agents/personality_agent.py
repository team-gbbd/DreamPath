from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Mapping, MutableMapping

from .tools.profile_document_tool import ProfileDocumentTool
from .tools.summarizer_tool import ConversationHistory, SummarizerTool
from services.bigfive.bigfive_service import BigFiveService
from services.mbti.mbti_service import MBTIService

try:  # pragma: no cover - depends on OpenAI Agents SDK availability
    from openai.agents import OpenAIAgent  # type: ignore[attr-defined]
except Exception:  # pragma: no cover - fallback for current dependency versions

    class OpenAIAgent:  # type: ignore[override]
        """
        Minimal fallback so that we always expose the expected configuration object.
        """

        def __init__(
            self,
            *,
            instructions: str,
            tools: List[Dict[str, Any]],
            model: str,
            config: Dict[str, Any] | None = None,
        ) -> None:
            self.instructions = instructions
            self.tools = tools
            self.model = model
            self.config = config or {}


@dataclass
class PersonalityAgentInput:
    conversation_history: ConversationHistory
    user_profile: Mapping[str, Any] | None = None
    survey_data: Mapping[str, Any] | None = None
    session_id: str | None = None


@dataclass
class PersonalityAgentOutput:
    summary: str
    big_five: Dict[str, Any]
    mbti: str
    strengths: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    goals: List[str] = field(default_factory=list)
    values: List[str] = field(default_factory=list)

    def document_payload(self) -> Dict[str, Any]:
        payload = asdict(self)
        return payload


class PersonalityAgent:
    """
    Agent #1 implementation that orchestrates summarization, Big Five, MBTI, and document building.
    """

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model
        self.summarizer_tool = SummarizerTool(model=model)
        self.profile_document_tool = ProfileDocumentTool()
        self.bigfive = BigFiveService()
        self.mbti = MBTIService()

        self.agent = OpenAIAgent(
            instructions=(
                "You are Personality Agent #1 for DreamPath. Follow the deterministic pipeline:\n"
                "1) SummarizerTool\n2) Big Five analysis\n3) MBTI conversion\n"
                "4) ProfileDocumentTool\n5) Return structured JSON response."
            ),
            tools=[self.summarizer_tool.definition(), self.profile_document_tool.definition()],
            model=self.model,
            config={"parallel_tool_calls": False},
        )

    async def run(self, bundle: PersonalityAgentInput) -> Dict[str, Any]:
        summary_result = await self.summarizer_tool.run(
            conversation_history=bundle.conversation_history,
            survey_data=bundle.survey_data or {},
            user_profile=bundle.user_profile or {},
        )

        summary_text = summary_result.get("summary", "").strip()
        document = self._build_analysis_document(bundle, summary_result, summary_text)

        big_five_raw = await self.bigfive.analyze_bigfive(document)
        big_five = self._safe_json(big_five_raw)
        
        # Ensure scores are integers
        big_five = self._sanitize_big_five(big_five)

        mbti_result = await self.mbti.convert_bigfive_to_mbti(
            self._extract_score(big_five, "openness"),
            self._extract_score(big_five, "conscientiousness"),
            self._extract_score(big_five, "extraversion"),
            self._extract_score(big_five, "agreeableness"),
            self._extract_score(big_five, "neuroticism"),
        )

        output = PersonalityAgentOutput(
            summary=summary_text,
            big_five=big_five,
            mbti=mbti_result.get("mbti", ""),
            strengths=self._ensure_list(summary_result.get("strengths")),
            risks=self._ensure_list(summary_result.get("risks")),
            goals=self._ensure_list(summary_result.get("goals")),
            values=self._ensure_list(summary_result.get("values")),
        )

        embedding_doc = self.profile_document_tool.build_document(output.document_payload())

        return {
            "summary": output.summary,
            "big_five": output.big_five,
            "mbti": output.mbti,
            "strengths": output.strengths,
            "risks": output.risks,
            "goals": output.goals,
            "values": output.values,
            "embedding_document": embedding_doc,
        }

    def _build_analysis_document(
        self,
        bundle: PersonalityAgentInput,
        summary_result: Mapping[str, Any],
        summary_text: str,
    ) -> str:
        sections: List[str] = [
            f"Session ID: {bundle.session_id or 'unknown'}",
            "",
            "### Structured Summary",
            summary_text,
            "",
            "### Goals",
            ", ".join(self._ensure_list(summary_result.get("goals"))) or "명시된 목표 없음",
            "",
            "### Core Values",
            ", ".join(self._ensure_list(summary_result.get("values"))) or "명시된 가치 없음",
            "",
            "### User Profile",
            self._stringify(bundle.user_profile),
            "",
            "### Survey Data",
            self._stringify(bundle.survey_data),
        ]
        return "\n".join(sections).strip()

    def _sanitize_big_five(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure all Big Five scores are strictly integers."""
        validated = {}
        for trait in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
            # Use existing extraction logic which handles casting and defaults
            score = self._extract_score(params, trait)
            
            # Preserve the original structure structure if it was a dict, or create one
            original_value = params.get(trait)
            reason = ""
            if isinstance(original_value, dict):
                reason = original_value.get("reason", "")
            
            validated[trait] = {
                "score": score,
                "reason": reason
            }
        return validated

    def _safe_json(self, raw: str) -> Dict[str, Any]:
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _extract_score(self, big_five: Mapping[str, Any], trait: str) -> int:
        value = big_five.get(trait) or {}
        if isinstance(value, Mapping):
            return int(value.get("score", 50))
        try:
            return int(value)
        except (TypeError, ValueError):
            return 50

    def _ensure_list(self, data: Any) -> List[str]:
        if isinstance(data, list):
            return [str(item).strip() for item in data if str(item).strip()]
        if isinstance(data, str):
            return [segment.strip() for segment in data.split("\n") if segment.strip()]
        return []

    def _stringify(self, payload: Mapping[str, Any] | None) -> str:
        if not payload:
            return "없음"
        if isinstance(payload, MutableMapping):
            try:
                return json.dumps(payload, ensure_ascii=False, indent=2)
            except (ValueError, TypeError):
                return str(dict(payload))
        return json.dumps(payload, ensure_ascii=False)
