import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from services.vector.bigfive import analyze_bigfive
from services.vector.mbti import analyze_mbti
from services.vector.pinecone_client import index
from services.vector.embedding_service import upload_vector_to_pinecone

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
router = APIRouter()

class VectorRequest(BaseModel):
    userId: int
    document: str

@router.post('/vectors/analyze')
async def analyze(req: VectorRequest):
    if client is None:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY 설정이 필요합니다.")
    if index is None:
        raise HTTPException(status_code=500, detail="Pinecone 구성이 필요합니다.")

    # 1) 임베딩 생성
    emb = client.embeddings.create(
        model='text-embedding-3-large',
        input=req.document
    )
    vector = emb.data[0].embedding

    # 2) Pinecone 저장
    vector_id = f'profile_{req.userId}'
    await upload_vector_to_pinecone(
        vector_id,
        vector,
        {
            "userId": req.userId,
            "type": "user_profile",
            "length": len(req.document)
        }
    )

    try:
        bigfive = analyze_bigfive(req.document)
        mbti = analyze_mbti(bigfive, req.document)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # 5) 반환
    return {
        'userId': req.userId,
        'vectorDbId': vector_id,
        'vector': vector,
        'bigfive': bigfive,
        'mbti': mbti,
        'dimension': len(vector)
    }
