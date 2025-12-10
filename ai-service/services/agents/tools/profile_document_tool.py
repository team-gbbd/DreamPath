from typing import Any, Dict, List


class ProfileDocumentTool:
    """
    Converts structured analysis results into a plain-text embedding document.
    """

    name = "personality_profile_document_builder"
    description = (
        "Creates a single plain-text document that summarizes the user's personality "
        "findings. The document is optimized for embedding generation."
    )
    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "big_five": {"type": "object"},
            "mbti": {"type": "string"},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "risks": {"type": "array", "items": {"type": "string"}},
            "goals": {"type": "array", "items": {"type": "string"}},
            "values": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["summary", "big_five", "mbti"],
    }

    def definition(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

    def build_document(self, payload: Dict[str, Any]) -> str:
        big_five = payload.get("big_five") or {}
        strengths = self._stringify_list(payload.get("strengths"))
        risks = self._stringify_list(payload.get("risks"))
        goals = self._stringify_list(payload.get("goals"))
        values = self._stringify_list(payload.get("values"))

        lines: List[str] = [
            "## Summary",
            payload.get("summary", "").strip(),
            "",
            f"MBTI: {payload.get('mbti', '')}",
            "",
            "## Big Five Traits",
        ]

        for trait, info in big_five.items():
            if isinstance(info, dict):
                score = info.get("score")
                reason = info.get("reason") or ""
                lines.append(f"- {trait.title()}: {score} ({reason})")
            else:
                lines.append(f"- {trait.title()}: {info}")

        if strengths:
            lines.extend(["", "## Strengths"])
            lines.extend([f"- {item}" for item in strengths])

        if risks:
            lines.extend(["", "## Risks"])
            lines.extend([f"- {item}" for item in risks])

        if goals:
            lines.extend(["", "## Goals"])
            lines.extend([f"- {item}" for item in goals])

        if values:
            lines.extend(["", "## Core Values"])
            lines.extend([f"- {item}" for item in values])

        return "\n".join(line for line in lines if line is not None).strip()

    def _stringify_list(self, data: Any) -> List[str]:
        if isinstance(data, list):
            return [str(item).strip() for item in data if str(item).strip()]
        if isinstance(data, str):
            return [segment.strip() for segment in data.split("\n") if segment.strip()]
        return []

