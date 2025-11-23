"""
API 라우터 패키지
모든 라우터를 한 곳에서 관리
"""
from fastapi import APIRouter
from . import analysis, identity, chat, job_sites, crawler, database, agent

# 전체 API 라우터 생성
api_router = APIRouter()

# 각 라우터 포함
api_router.include_router(analysis.router)
api_router.include_router(identity.router)
api_router.include_router(chat.router)
api_router.include_router(job_sites.router)
api_router.include_router(crawler.router)
api_router.include_router(database.router)
api_router.include_router(agent.router)  # AI 에이전트

__all__ = [
    "api_router",
    "analysis",
    "identity",
    "chat",
    "job_sites",
    "crawler",
    "database",
    "agent",
]
