from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rag.rag_service import RAGService
from services.vector.embedding_service import create_embedding

router = APIRouter(prefix="/api/rag")

class RAGQuery(BaseModel):
    document: str
    top_k: int = 5

@router.post("/search")
async def rag_search(req: RAGQuery):
    try:
        embedding = create_embedding(req.document)
        service = RAGService()
        results = await service.search(embedding, req.top_k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
