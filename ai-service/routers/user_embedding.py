from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedding.embedding_service import EmbeddingService

router = APIRouter()


class EmbeddingRequest(BaseModel):
    document: str
    userId: str


class EmbeddingResponse(BaseModel):
    vectorId: str
    dimension: int


@router.post("/make-embedding", response_model=EmbeddingResponse)
def make_embedding(req: EmbeddingRequest):
    try:
        svc = EmbeddingService()
        vector_id = svc.create_user_embedding(req.userId, req.document)

        return EmbeddingResponse(
            vectorId=vector_id,
            dimension=svc.dimension
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
