"""
FastAPI 의존성 주입
"""
from fastapi import HTTPException
from services.career_analysis_service import CareerAnalysisService
from services.openai_service import OpenAIService
from services.identity_analysis_service import IdentityAnalysisService
from services.chat_service import ChatService
from services.job_site_service import JobSiteService
from services.web_crawler_service import WebCrawlerService
from services.database_service import DatabaseService
from config import settings

# 서비스 인스턴스 (싱글톤)
_openai_service = None
_career_analysis_service = None
_identity_service = None
_chat_service = None
_job_site_service = None
_web_crawler_service = None
_database_service = None

def get_db() -> DatabaseService:
    """요청 단위 DB 세션 제공"""
    db = DatabaseService()
    try:
        yield db
    finally:
        db.cleanup()

def get_openai_service() -> OpenAIService:
    """OpenAI 서비스 인스턴스 반환"""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service


def get_career_analysis_service() -> CareerAnalysisService:
    """진로 분석 서비스 인스턴스 반환"""
    global _career_analysis_service
    if _career_analysis_service is None:
        _career_analysis_service = CareerAnalysisService(get_openai_service())
    return _career_analysis_service


def get_identity_service() -> IdentityAnalysisService:
    """정체성 분석 서비스 인스턴스 반환"""
    global _identity_service
    if _identity_service is None:
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API 키가 설정되지 않았습니다."
            )
        _identity_service = IdentityAnalysisService(
            settings.OPENAI_API_KEY,
            settings.OPENAI_MODEL
        )
    return _identity_service


def get_chat_service() -> ChatService:
    """채팅 서비스 인스턴스 반환"""
    global _chat_service
    if _chat_service is None:
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API 키가 설정되지 않았습니다."
            )
        _chat_service = ChatService(
            settings.OPENAI_API_KEY,
            settings.OPENAI_MODEL
        )
    return _chat_service


def get_job_site_service() -> JobSiteService:
    """취업 사이트 서비스 인스턴스 반환"""
    global _job_site_service
    if _job_site_service is None:
        _job_site_service = JobSiteService()
    return _job_site_service


def get_web_crawler_service() -> WebCrawlerService:
    """웹 크롤러 서비스 인스턴스 반환"""
    global _web_crawler_service
    if _web_crawler_service is None:
        _web_crawler_service = WebCrawlerService()
    return _web_crawler_service


def get_database_service() -> DatabaseService:
    """데이터베이스 서비스 인스턴스 반환"""
    global _database_service
    if _database_service is None:
        _database_service = DatabaseService()
    return _database_service
