import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.vector.bigfive import analyze_bigfive
from services.vector.mbti import analyze_mbti
from services.embedding.embedding_service import EmbeddingService

router = APIRouter()
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Lazy-load EmbeddingService to avoid startup failures."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


class VectorRequest(BaseModel):
    userId: int
    document: str


@router.post('/vectors/analyze')
async def analyze(req: VectorRequest):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY 설정이 필요합니다.")

    try:
        svc = get_embedding_service()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        emb = svc.client.embeddings.create(
            model=svc.model,
            input=req.document
        )
        vector = emb.data[0].embedding
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"임베딩 생성 실패: {exc}") from exc

    # 2) Pinecone 저장
    vector_id = f'user-{req.userId}'
    metadata = {
        "userId": req.userId,
        "type": "user_profile",
        "length": len(req.document)
    }
    try:
        svc.vector.upsert_vector(
            vector_id=vector_id,
            embedding=vector,
            metadata=metadata
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pinecone 저장 실패: {exc}") from exc

    try:
        bigfive = analyze_bigfive(req.document)
        mbti = analyze_mbti(bigfive, req.document)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        'userId': req.userId,
        'vectorDbId': vector_id,
        'vector': vector,
        'bigfive': bigfive,
        'mbti': mbti,
        'dimension': len(vector)
    }
