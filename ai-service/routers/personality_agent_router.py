from typing import Any, Dict, List, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.agents.personality_pipeline import PersonalityPipeline

router = APIRouter(prefix="/api/agent", tags=["personality-agent"])
pipeline = PersonalityPipeline()


class PersonalityAgentRequest(BaseModel):
    session_id: str = Field(..., alias="session_id", description="Career session identifier.")
    conversation_history: Union[str, List[Dict[str, Any]]] = Field(
        default_factory=list,
        alias="conversation_history",
        description="Conversation messages in chronological order.",
    )
    user_profile: Dict[str, Any] = Field(
        default_factory=dict,
        alias="user_profile",
        description="Structured user profile document.",
    )
    survey_data: Dict[str, Any] = Field(
        default_factory=dict,
        alias="survey_data",
        description="Survey responses captured during onboarding.",
    )
    metadata: Dict[str, Any] | None = Field(
        default=None,
        description="Optional metadata that is forwarded but not interpreted.",
    )

    model_config = {"populate_by_name": True}


@router.post("/personality")
async def run_personality_agent(request: PersonalityAgentRequest):
    """
    Lightweight router that validates the payload and forwards it to the pipeline.
    """
    try:
        payload = request.model_dump(by_alias=True)
        print("PYTHON router sessionId:", payload.get("session_id"))
        history = payload.get("conversation_history") or []
        print("PYTHON router history count:", len(history) if isinstance(history, list) else "n/a")
        return await pipeline.run(payload)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - surface clean error to client
        raise HTTPException(status_code=500, detail=str(exc)) from exc
