"""
Pydantic 모델 패키지
모든 모델을 한 곳에서 export
"""
# 공통 모델
from .common import ConversationMessage

# 진로 분석 모델
from .analysis import (
    AnalysisRequest,
    AnalysisResponse,
    EmotionAnalysis,
    PersonalityAnalysis,
    InterestArea,
    InterestAnalysis,
    CareerRecommendation
)

# 정체성 분석 모델
from .identity import (
    ClarityRequest,
    ClarityResponse,
    IdentityRequest,
    IdentityResponse,
    IdentityTrait,
    InsightRequest,
    InsightResponse,
    ProgressRequest,
    ProgressResponse
)

# 채팅 모델
from .chat import (
    ChatRequest,
    ChatResponse
)

# 취업 사이트 모델
from .job_sites import (
    JobSiteRecommendationRequest,
    JobSiteRecommendation,
    JobSiteRecommendationResponse,
    JobSiteSearchRequest,
    JobSiteInfo,
    JobSiteSearchResponse,
    JobSiteExplorationRequest,
    JobSiteExplorationResult,
    JobSiteExplorationResponse
)

# 크롤링 모델
from .crawler import (
    JobListing,
    CrawlRequest,
    CrawlWantedRequest,
    CrawlMultipleSitesRequest,
    CrawlResponse,
    CrawlMultipleSitesResponse,
    JobListingsQueryRequest
)

__all__ = [
    # 공통
    "ConversationMessage",
    
    # 진로 분석
    "AnalysisRequest",
    "AnalysisResponse",
    "EmotionAnalysis",
    "PersonalityAnalysis",
    "InterestArea",
    "InterestAnalysis",
    "CareerRecommendation",
    
    # 정체성 분석
    "ClarityRequest",
    "ClarityResponse",
    "IdentityRequest",
    "IdentityResponse",
    "IdentityTrait",
    "InsightRequest",
    "InsightResponse",
    "ProgressRequest",
    "ProgressResponse",
    
    # 채팅
    "ChatRequest",
    "ChatResponse",
    
    # 취업 사이트
    "JobSiteRecommendationRequest",
    "JobSiteRecommendation",
    "JobSiteRecommendationResponse",
    "JobSiteSearchRequest",
    "JobSiteInfo",
    "JobSiteSearchResponse",
    "JobSiteExplorationRequest",
    "JobSiteExplorationResult",
    "JobSiteExplorationResponse",
    
    # 크롤링
    "JobListing",
    "CrawlRequest",
    "CrawlWantedRequest",
    "CrawlMultipleSitesRequest",
    "CrawlResponse",
    "CrawlMultipleSitesResponse",
    "JobListingsQueryRequest",
]
