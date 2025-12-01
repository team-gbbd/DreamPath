from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.mbti.mbti_service import MBTIService

router = APIRouter()
svc = MBTIService()


class MBTIRequest(BaseModel):
    document: str


class BigFiveRequest(BaseModel):
    openness: int
    conscientiousness: int
    extraversion: int
    agreeableness: int
    neuroticism: int


@router.post('/mbti/analyze')
async def analyze_mbti(req: MBTIRequest):
    try:
        result = await svc.analyze_mbti(req.document)
        return {'mbti': result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/mbti/convert')
async def convert_bigfive(req: BigFiveRequest):
    try:
        result = await svc.convert_bigfive_to_mbti(
            req.openness,
            req.conscientiousness,
            req.extraversion,
            req.agreeableness,
            req.neuroticism
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
