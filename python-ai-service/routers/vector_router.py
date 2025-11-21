from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
from services.vector.bigfive import analyze_bigfive
from services.vector.mbti import analyze_mbti
from services.vector.pinecone_client import index

client = OpenAI()
router = APIRouter()

class VectorRequest(BaseModel):
    userId: int
    document: str

@router.post('/vectors/analyze')
def analyze(req: VectorRequest):

    # 1) 임베딩 생성
    emb = client.embeddings.create(
        model='text-embedding-3-large',
        input=req.document
    )
    vector = emb.data[0].embedding

    # 2) Pinecone 저장
    vector_id = f'profile_{req.userId}'
    index.upsert([
        {
            'id': vector_id,
            'values': vector,
            'metadata': {
                'userId': req.userId,
                'document': req.document
            }
        }
    ])

    # 3) Big Five 분석
    bigfive = analyze_bigfive(req.document)

    # 4) MBTI 분석
    mbti = analyze_mbti(bigfive, req.document)

    # 5) 반환
    return {
        'userId': req.userId,
        'vectorDbId': vector_id,
        'vector': vector,
        'bigfive': bigfive,
        'mbti': mbti,
        'dimension': len(vector)
    }
