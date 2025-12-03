from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.personality.personality_profile_service import PersonalityProfileService


router = APIRouter(prefix="/profile", tags=["personality-profile"])


class ProfileRequest(BaseModel):
    document: str
    top_k: int = 10


@router.post("/analyze")
async def analyze(req: ProfileRequest):
    try:
        service = PersonalityProfileService()
        result = await service.generate_profile(req.document, req.top_k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
