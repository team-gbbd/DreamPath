from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.bigfive.bigfive_service import BigFiveService

router = APIRouter(prefix='/bigfive', tags=['bigfive'])


class BigFiveRequest(BaseModel):
    document: str


@router.post('/analyze')
async def analyze_bigfive(req: BigFiveRequest):
    try:
        service = BigFiveService()
        result = await service.analyze_bigfive(req.document)
        return {"bigfive": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
