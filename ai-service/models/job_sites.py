"""
취업 사이트 추천/검색 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional
from .analysis import CareerRecommendation


class JobSiteRecommendationRequest(BaseModel):
    careerRecommendations: List[CareerRecommendation]
    userInterests: Optional[List[str]] = None
    userExperienceLevel: Optional[str] = None  # 신입, 경력, 인턴 등


class JobSiteRecommendation(BaseModel):
    name: str
    url: str
    description: str
    matchScore: int  # 1-100
    reasons: List[str]
    categories: List[str]


class JobSiteRecommendationResponse(BaseModel):
    recommendedSites: List[JobSiteRecommendation]


class JobSiteSearchRequest(BaseModel):
    keyword: str


class JobSiteInfo(BaseModel):
    name: str
    url: str
    description: str
    categories: List[str]


class JobSiteSearchResponse(BaseModel):
    sites: List[JobSiteInfo]


class JobSiteExplorationRequest(BaseModel):
    careerRecommendations: List[CareerRecommendation]
    maxSites: Optional[int] = 3


class JobSiteExplorationResult(BaseModel):
    siteName: str
    siteUrl: str
    isAccessible: bool
    statusCode: Optional[int] = None
    searchUrl: Optional[str] = None
    searchKeywords: List[str]
    matchScore: int
    reasons: List[str]
    note: Optional[str] = None
    error: Optional[str] = None


class JobSiteExplorationResponse(BaseModel):
    explorationResults: List[JobSiteExplorationResult]

