from typing import Any, Dict

from .personality_agent import PersonalityAgent, PersonalityAgentInput


class PersonalityPipeline:
    """
    Prepares the payload for PersonalityAgent and triggers the deterministic run order.
    """

    def __init__(self) -> None:
        self.agent = PersonalityAgent()

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        print("PYTHON pipeline sessionId:", payload.get("session_id") or payload.get("sessionId"))
        history = payload.get("conversation_history") or payload.get("conversationHistory") or []
        history_count = len(history) if isinstance(history, list) else 0
        print("PYTHON pipeline history count:", history_count)
        history = payload.get("conversation_history") or payload.get("conversationHistory") or []
        if isinstance(history, list):
            message_count = len(history)
            token_count = sum(len(str(msg.get("content", ""))) for msg in history) / 4
        else:
            message_count = 0
            token_count = 0

        if message_count < 12 and token_count < 1500:
            return {
                "status": "not_triggered",
                "reason": "insufficient conversation length",
                "message_count": message_count,
                "token_count": token_count,
            }

        bundle = PersonalityAgentInput(
            conversation_history=payload.get("conversation_history")
            or payload.get("conversationHistory")
            or "",
            user_profile=payload.get("user_profile") or payload.get("userProfile") or {},
            survey_data=payload.get("survey_data") or payload.get("surveyData") or {},
            session_id=payload.get("session_id") or payload.get("sessionId"),
        )
        return await self.agent.run(bundle)
