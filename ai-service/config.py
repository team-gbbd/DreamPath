"""
애플리케이션 설정 및 구성
"""
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()


class Settings:
    """애플리케이션 설정"""
    
    # API 설정
    API_TITLE = "DreamPath Career Analysis AI Service"
    API_DESCRIPTION = "AI 기반 진로 분석, 정체성 분석 및 대화형 상담 서비스"
    API_VERSION = "1.0.0"
    
    # CORS 설정 (credentials 사용 시 명시적 origin 필수)
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:3002",
        "https://dreampathai.link",
        "https://www.dreampathai.link",
    ]
    CORS_CREDENTIALS = True
    CORS_METHODS = ["*"]
    CORS_HEADERS = ["*"]
    
    # OpenAI 설정
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    
    # 서버 설정
    HOST = "0.0.0.0"
    PORT = 8000


settings = Settings()