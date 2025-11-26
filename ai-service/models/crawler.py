"""
웹 크롤링 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Union, Any


class JobListing(BaseModel):
    """채용 공고 모델"""
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    id: Optional[str] = None
    reward: Optional[str] = None  # 라우터에서 dict → str 변환 처리됨


class CrawlRequest(BaseModel):
    """일반 크롤링 요청"""
    siteName: str
    siteUrl: str
    searchKeyword: Optional[str] = None
    maxResults: Optional[int] = 10
    forceRefresh: Optional[bool] = False  # 캐시 무시하고 강제 새로고침


class CrawlWantedRequest(BaseModel):
    """원티드 크롤링 요청"""
    searchKeyword: Optional[str] = None
    maxResults: Optional[int] = 10
    forceRefresh: Optional[bool] = False


class CrawlMultipleSitesRequest(BaseModel):
    """다중 사이트 크롤링 요청"""
    siteUrls: List[Dict[str, str]]  # [{"name": "원티드", "url": "https://www.wanted.co.kr"}, ...]
    searchKeyword: Optional[str] = None
    maxResultsPerSite: Optional[int] = 5
    forceRefresh: Optional[bool] = False


class CrawlResponse(BaseModel):
    """크롤링 응답"""
    success: bool
    site: str
    searchKeyword: Optional[str] = None
    totalResults: int
    jobListings: List[JobListing]
    searchUrl: Optional[str] = None
    error: Optional[str] = None
    message: Optional[str] = None
    fromCache: Optional[bool] = False  # 캐시에서 가져온 데이터인지 여부
    cachedAt: Optional[str] = None  # 캐시된 시간


class CrawlMultipleSitesResponse(BaseModel):
    """다중 사이트 크롤링 응답"""
    success: bool
    searchKeyword: Optional[str] = None
    sites: List[CrawlResponse]


class JobListingsQueryRequest(BaseModel):
    """DB 조회 요청"""
    siteName: Optional[str] = None
    searchKeyword: Optional[str] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

