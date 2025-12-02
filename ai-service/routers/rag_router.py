from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rag.rag_service import RAGService

router = APIRouter(prefix="/api/rag", tags=["rag"])

class RagTopMatchRequest(BaseModel):
    userVectorId: str
    top_k: int = 5

class RagAnalyzeRequest(BaseModel):
    userVectorId: str
    top_k: int = 20


# ---------------------------
# ① Top-K 벡터 유사도
# ---------------------------
@router.post("/top-match")
async def top_match(req: RagTopMatchRequest):
    try:
        service = RAGService()
        result = await service.search_by_user_vector(
            vector_id=req.userVectorId,
            top_k=req.top_k
        )
        return {"matches": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# ② RAG 기반 성향 분석
# ---------------------------
@router.post("/analyze-profile")
async def analyze_profile(req: RagAnalyzeRequest):
    try:
        service = RAGService()
        result = await service.analyze_profile_rag(
            vector_id=req.userVectorId,
            top_k=req.top_k
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
