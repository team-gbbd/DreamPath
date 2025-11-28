from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.vector.pinecone_client import index
from services.rag.profile_rag_service import ProfileRAGService
from services.common.openai_client import OpenAIService
import numpy as np

router = APIRouter()

class ProfileMatchResponse(BaseModel):
    jobId: str
    jobName: str
    score: float

@router.get('/profiles/search', response_model=List[ProfileMatchResponse])
async def search_profile_matches(profile_id: int, top_k: int = 5):

    if index is None:
        raise HTTPException(status_code=500, detail='Pinecone index가 활성화되지 않았습니다.')

    try:
        # 1) Pinecone에서 사용자 벡터 가져오기
        user_vector = index.fetch(ids=[str(profile_id)])
        if not user_vector or not user_vector.vectors:
            raise HTTPException(status_code=404, detail='사용자 벡터를 찾을 수 없습니다.')

        values = user_vector.vectors[str(profile_id)].values
        vector = np.array(values)

        # 2) Pinecone에서 job 벡터 유사도 검색
        result = index.query(vector=vector.tolist(), top_k=top_k, include_metadata=True)

        matches = []
        for match in result.matches:
            matches.append(ProfileMatchResponse(
                jobId=match.id,
                jobName=match.metadata.get('jobName', 'Unknown Job'),
                score=round(match.score, 4)
            ))

        # =========================
        # 3) RAG + LLM 해석
        # =========================
        openai = OpenAIService()
        rag = ProfileRAGService(openai)

        user_doc = "사용자의 성향, 가치관, 감정 패턴, 관심사 요약"

        enriched = await rag.enrich_with_rag(
            [m.dict() for m in matches],
            user_document=user_doc
        )

        enriched = sorted(enriched, key=lambda x: x["score"], reverse=True)

        return enriched

    except Exception as e:
        raise HTTPException(status_code=500, detail=f'매칭 실패: {str(e)}')
