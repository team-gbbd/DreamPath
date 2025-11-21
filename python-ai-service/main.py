"""
DreamPath 진로 분석 AI 서비스
Python FastAPI를 사용한 진로 분석 마이크로서비스
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import api_router
# from routers.vector_router import router as vector_router  # 경진님 추가 기능 - 임시 비활성화 (Pinecone 설정 필요)

# FastAPI 앱 초기화
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# API 라우터 등록
app.include_router(api_router)  # 사용자님: chat, identity, analysis, job_sites, etc.
# app.include_router(vector_router, prefix="/api")  # 경진님: vector 분석 (MBTI, BigFive) - 임시 비활성화


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {"message": "DreamPath Career Analysis AI Service", "status": "running"}


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
