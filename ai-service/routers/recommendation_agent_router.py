from fastapi import APIRouter
from services.agents.recommendation.recommendation_pipeline import RecommendationPipeline

router = APIRouter(prefix="/api/agent/recommendation")
pipeline = RecommendationPipeline()

@router.post("")
async def run_recommendation(payload: dict):
    """
    payload must include:
    {
      "summary": "...",
      "goals": [...],
      "values": [...],
      "personality": {...},
      "strengths": [...],
      "risks": [...],
      ...
    }
    """
    return await pipeline.run(payload)
