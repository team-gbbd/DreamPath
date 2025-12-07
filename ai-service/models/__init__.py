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
    ChatResponse,
    AgentAction,
    ActionButton,
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

# AI 에이전트 모델
from .agent import (
    # 채용 공고 추천
    JobRecommendationRequest,
    JobRecommendation,
    JobRecommendationResponse,
    RealTimeRecommendationRequest,

    # 채용 공고 + 기술/자격증 추천
    RequiredTechnology,
    ExamSchedule,
    RequiredCertification,
    LearningResource,
    JobWithRequirements,
    JobWithRequirementsRequest,
    JobWithRequirementsResponse,

    # 지원 현황 추적
    Application,
    ApplicationStatus,
    ApplicationStatistics,
    NextAction,
    ApplicationAnalysisRequest,
    ApplicationAnalysisResponse,
    StatusAdvice,
    ApplicationTrackingRequest,
    ApplicationTrackingResponse,

    # 커리어 성장
    GapAnalysis,
    GrowthStep,
    RecommendedResource,
    CareerGapRequest,
    CareerGapResponse,
    SkillDevelopmentRequest,
    RequiredSkill,
    SkillDevelopmentResponse,
    GrowthTimelineRequest,
    TimelinePeriod,
    Milestone,
    GrowthTimelineResponse,
    MarketTrendsRequest,
    MarketTrendsResponse,

    # 이력서 최적화
    Resume,
    JobPosting,
    KeywordMatch,
    OptimizationSuggestion,
    ResumeOptimizationRequest,
    ResumeOptimizationResponse,
    ResumeQualityRequest,
    CategoryScores,
    ImprovementPriority,
    ResumeQualityResponse,
    CoverLetterRequest,
    CoverLetterStructure,
    CoverLetterResponse,
    KeywordSuggestionRequest,
    KeywordSuggestionResponse,

    # 채용 공고 분석
    MarketTrendAnalysisRequest,
    TopItem,
    MarketTrendAnalysisResponse,
    SkillRequirementsRequest,
    SkillDetail,
    ExperienceLevel,
    SkillRequirementsResponse,
    SalaryTrendsRequest,
    SalaryRange,
    SalaryTrendsResponse,
    PersonalizedInsightsRequest,
    CareerInsight,
    PersonalizedInsightsResponse,
    JobComparisonRequest,
    JobComparisonInfo,
    ProsCons,
    ComparisonDetail,
    JobComparisonResponse,

    # Enums
    DifficultyLevel,
    ResourceType,
    Priority,
    SkillLevel,
    ResumeSection
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
    "AgentAction",
    "ActionButton",
    
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

    # AI 에이전트 - 채용 공고 추천
    "JobRecommendationRequest",
    "JobRecommendation",
    "JobRecommendationResponse",
    "RealTimeRecommendationRequest",

    # AI 에이전트 - 채용 공고 + 기술/자격증 추천
    "RequiredTechnology",
    "ExamSchedule",
    "RequiredCertification",
    "LearningResource",
    "JobWithRequirements",
    "JobWithRequirementsRequest",
    "JobWithRequirementsResponse",

    # AI 에이전트 - 지원 현황 추적
    "Application",
    "ApplicationStatus",
    "ApplicationStatistics",
    "NextAction",
    "ApplicationAnalysisRequest",
    "ApplicationAnalysisResponse",
    "StatusAdvice",
    "ApplicationTrackingRequest",
    "ApplicationTrackingResponse",

    # AI 에이전트 - 커리어 성장
    "GapAnalysis",
    "GrowthStep",
    "RecommendedResource",
    "CareerGapRequest",
    "CareerGapResponse",
    "SkillDevelopmentRequest",
    "RequiredSkill",
    "SkillDevelopmentResponse",
    "GrowthTimelineRequest",
    "TimelinePeriod",
    "Milestone",
    "GrowthTimelineResponse",
    "MarketTrendsRequest",
    "MarketTrendsResponse",

    # AI 에이전트 - 이력서 최적화
    "Resume",
    "JobPosting",
    "KeywordMatch",
    "OptimizationSuggestion",
    "ResumeOptimizationRequest",
    "ResumeOptimizationResponse",
    "ResumeQualityRequest",
    "CategoryScores",
    "ImprovementPriority",
    "ResumeQualityResponse",
    "CoverLetterRequest",
    "CoverLetterStructure",
    "CoverLetterResponse",
    "KeywordSuggestionRequest",
    "KeywordSuggestionResponse",

    # AI 에이전트 - Enums
    "DifficultyLevel",
    "ResourceType",
    "Priority",
    "SkillLevel",
    "ResumeSection",

    # AI 에이전트 - 채용 공고 분석
    "MarketTrendAnalysisRequest",
    "TopItem",
    "MarketTrendAnalysisResponse",
    "SkillRequirementsRequest",
    "SkillDetail",
    "ExperienceLevel",
    "SkillRequirementsResponse",
    "SalaryTrendsRequest",
    "SalaryRange",
    "SalaryTrendsResponse",
    "PersonalizedInsightsRequest",
    "CareerInsight",
    "PersonalizedInsightsResponse",
    "JobComparisonRequest",
    "JobComparisonInfo",
    "ProsCons",
    "ComparisonDetail",
    "JobComparisonResponse",
]
