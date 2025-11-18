"""
DreamPath 진로 분석 AI 서비스
Python FastAPI를 사용한 진로 분석 마이크로서비스
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv

from services.career_analysis_service import CareerAnalysisService
from services.openai_service import OpenAIService
from services.identity_analysis_service import IdentityAnalysisService
from services.chat_service import ChatService
from services.job_site_service import JobSiteService
from services.web_crawler_service import WebCrawlerService
from services.database_service import DatabaseService

# 환경 변수 로드
load_dotenv()

app = FastAPI(
    title="DreamPath Career Analysis AI Service",
    description="AI 기반 진로 분석, 정체성 분석 및 대화형 상담 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 초기화
api_key = os.getenv("OPENAI_API_KEY", "")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

openai_service = OpenAIService()
analysis_service = CareerAnalysisService(openai_service)
identity_service = IdentityAnalysisService(api_key, model) if api_key else None
chat_service = ChatService(api_key, model) if api_key else None
job_site_service = JobSiteService()
web_crawler_service = WebCrawlerService()
database_service = DatabaseService()


# 요청/응답 모델
class ConversationMessage(BaseModel):
    role: str  # USER, ASSISTANT, SYSTEM
    content: str


class AnalysisRequest(BaseModel):
    sessionId: str
    conversationHistory: List[ConversationMessage]


class EmotionAnalysis(BaseModel):
    description: str
    score: int  # 1-100
    emotionalState: str  # 긍정적, 중립적, 부정적, 혼합


class PersonalityAnalysis(BaseModel):
    description: str
    type: str
    strengths: List[str]
    growthAreas: List[str]


class InterestArea(BaseModel):
    name: str
    level: int  # 1-10
    description: str


class InterestAnalysis(BaseModel):
    description: str
    areas: List[InterestArea]


class CareerRecommendation(BaseModel):
    careerName: str
    description: str
    matchScore: int  # 1-100
    reasons: List[str]


class AnalysisResponse(BaseModel):
    sessionId: str
    emotion: EmotionAnalysis
    personality: PersonalityAnalysis
    interest: InterestAnalysis
    comprehensiveAnalysis: str
    recommendedCareers: List[CareerRecommendation]


@app.get("/")
async def root():
    return {"message": "DreamPath Career Analysis AI Service", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_career(request: AnalysisRequest):
    """
    대화 내용을 기반으로 진로 분석을 수행합니다.
    
    - 감정 분석
    - 성향 분석
    - 흥미 분석
    - 종합 분석
    - 진로 추천
    """
    try:
        # 대화 내용을 문자열로 변환
        conversation_text = "\n\n".join([
            f"{msg.role}: {msg.content}" 
            for msg in request.conversationHistory
        ])
        
        # 분석 수행
        result = await analysis_service.analyze_session(
            session_id=request.sessionId,
            conversation_history=conversation_text
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")


# 정체성 분석 요청 모델
class ClarityRequest(BaseModel):
    conversationHistory: str


class IdentityRequest(BaseModel):
    conversationHistory: str


class InsightRequest(BaseModel):
    recentMessages: str
    previousContext: str


class ProgressRequest(BaseModel):
    conversationHistory: str
    currentStage: str


# 정체성 분석 응답 모델
class ClarityResponse(BaseModel):
    clarity: int
    reason: str


class IdentityTrait(BaseModel):
    category: str
    trait: str
    evidence: str


class IdentityResponse(BaseModel):
    identityCore: str
    confidence: int
    traits: List[IdentityTrait]
    insights: List[str]
    nextFocus: str


class InsightResponse(BaseModel):
    hasInsight: bool
    insight: Optional[str] = None
    type: Optional[str] = None


class ProgressResponse(BaseModel):
    readyToProgress: bool
    reason: str
    recommendation: str


@app.post("/api/identity/clarity", response_model=ClarityResponse)
async def assess_clarity(request: ClarityRequest):
    """정체성 명확도 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_clarity(request.conversationHistory)
        return ClarityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"명확도 평가 실패: {str(e)}")


@app.post("/api/identity/extract", response_model=IdentityResponse)
async def extract_identity(request: IdentityRequest):
    """정체성 특징 추출"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.extract_identity(request.conversationHistory)
        # traits 변환
        traits = [IdentityTrait(**t) for t in result.get("traits", [])]
        return IdentityResponse(
            identityCore=result.get("identityCore", "탐색 중..."),
            confidence=result.get("confidence", 0),
            traits=traits,
            insights=result.get("insights", []),
            nextFocus=result.get("nextFocus", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정체성 추출 실패: {str(e)}")


@app.post("/api/identity/insight", response_model=InsightResponse)
async def generate_insight(request: InsightRequest):
    """최근 인사이트 생성"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.generate_insight(
            request.recentMessages,
            request.previousContext
        )
        return InsightResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인사이트 생성 실패: {str(e)}")


@app.post("/api/identity/progress", response_model=ProgressResponse)
async def assess_progress(request: ProgressRequest):
    """단계 진행 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_stage_progress(
            request.conversationHistory,
            request.currentStage
        )
        return ProgressResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진행 평가 실패: {str(e)}")


# 채팅 요청/응답 모델
class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str  # PRESENT, PAST, VALUES, FUTURE, IDENTITY
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None  # 설문조사 정보


class ChatResponse(BaseModel):
    sessionId: str
    message: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """대화형 진로 상담 응답 생성"""
    if not chat_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        # 대화 이력을 딕셔너리 리스트로 변환
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]
        
        # 채팅 응답 생성
        response_message = await chat_service.generate_response(
            session_id=request.sessionId,
            user_message=request.userMessage,
            current_stage=request.currentStage,
            conversation_history=history,
            survey_data=request.surveyData
        )
        
        return ChatResponse(
            sessionId=request.sessionId,
            message=response_message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 응답 생성 실패: {str(e)}")


# 취업 사이트 추천 요청/응답 모델
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


@app.post("/api/job-sites/recommend", response_model=JobSiteRecommendationResponse)
async def recommend_job_sites(request: JobSiteRecommendationRequest):
    """
    직업 추천에 맞는 취업 사이트를 추천합니다.
    MCP 브라우저 서버를 활용하여 취업 사이트를 검색하고 추천합니다.
    """
    try:
        # 직업 추천을 딕셔너리 리스트로 변환
        career_recommendations = [
            {
                "careerName": career.careerName,
                "description": career.description,
                "matchScore": career.matchScore,
                "reasons": career.reasons
            }
            for career in request.careerRecommendations
        ]
        
        # 취업 사이트 추천
        recommended_sites = job_site_service.recommend_job_sites(
            career_recommendations=career_recommendations,
            user_interests=request.userInterests,
            user_experience_level=request.userExperienceLevel
        )
        
        # 응답 모델로 변환
        site_recommendations = [
            JobSiteRecommendation(**site) for site in recommended_sites
        ]
        
        return JobSiteRecommendationResponse(recommendedSites=site_recommendations)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 추천 실패: {str(e)}")


class JobSiteSearchRequest(BaseModel):
    keyword: str


class JobSiteInfo(BaseModel):
    name: str
    url: str
    description: str
    categories: List[str]


class JobSiteSearchResponse(BaseModel):
    sites: List[JobSiteInfo]


@app.post("/api/job-sites/search", response_model=JobSiteSearchResponse)
async def search_job_sites(request: JobSiteSearchRequest):
    """키워드로 취업 사이트 검색"""
    try:
        sites = job_site_service.search_job_sites_by_keyword(request.keyword)
        site_infos = [JobSiteInfo(**site) for site in sites]
        return JobSiteSearchResponse(sites=site_infos)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 검색 실패: {str(e)}")


@app.get("/api/job-sites/all", response_model=JobSiteSearchResponse)
async def get_all_job_sites():
    """모든 주요 취업 사이트 목록 조회"""
    try:
        sites = job_site_service.get_all_job_sites()
        site_infos = [JobSiteInfo(**site) for site in sites]
        return JobSiteSearchResponse(sites=site_infos)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 목록 조회 실패: {str(e)}")


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


@app.post("/api/job-sites/explore", response_model=JobSiteExplorationResponse)
async def explore_job_sites(request: JobSiteExplorationRequest):
    """
    MCP 브라우저 서버를 활용하여 취업 사이트를 탐색하고 실제 채용 정보를 수집합니다.
    추천된 직업에 맞는 취업 사이트를 실제로 탐색하여 검색 URL과 접근 가능 여부를 확인합니다.
    """
    try:
        # 직업 추천을 딕셔너리 리스트로 변환
        career_recommendations = [
            {
                "careerName": career.careerName,
                "description": career.description,
                "matchScore": career.matchScore,
                "reasons": career.reasons
            }
            for career in request.careerRecommendations
        ]
        
        # 취업 사이트 탐색
        exploration_results = await job_site_service.get_job_listings_info(
            career_recommendations=career_recommendations,
            max_sites=request.maxSites or 3
        )
        
        # 응답 모델로 변환
        results = [
            JobSiteExplorationResult(**result) for result in exploration_results
        ]
        
        return JobSiteExplorationResponse(explorationResults=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 탐색 실패: {str(e)}")


# 웹 크롤링 요청/응답 모델
class CrawlRequest(BaseModel):
    siteName: str
    siteUrl: str
    searchKeyword: Optional[str] = None
    maxResults: Optional[int] = 10
    forceRefresh: Optional[bool] = False  # 캐시 무시하고 강제 새로고침


class JobListing(BaseModel):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    id: Optional[str] = None
    reward: Optional[str] = None


class CrawlResponse(BaseModel):
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


@app.post("/api/job-sites/crawl", response_model=CrawlResponse)
async def crawl_job_site(request: CrawlRequest):
    """
    MCP 브라우저 서버를 활용하여 취업 사이트에서 실제 채용 정보를 크롤링합니다.
    원티드, 잡코리아, 사람인 등 주요 취업 사이트를 지원합니다.
    """
    try:
        # maxResults가 0이면 모든 결과 가져오기, None이면 기본값 10
        # Python에서 0 or 10은 10이 되므로, 명시적으로 처리 필요
        max_results = 0 if request.maxResults == 0 else (request.maxResults if request.maxResults is not None else 10)
        
        result = await web_crawler_service.crawl_job_site(
            site_name=request.siteName,
            site_url=request.siteUrl,
            search_keyword=request.searchKeyword,
            max_results=max_results,
            force_refresh=request.forceRefresh or False
        )
        
        # JobListing 모델로 변환 (모델에 없는 필드 제거)
        job_listings = []
        for job in result.get("jobListings", []):
            # JobListing 모델에 맞는 필드만 추출
            job_data = {
                "title": job.get("title", ""),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "url": job.get("url", ""),
                "id": job.get("id"),
                "reward": job.get("reward")
            }
            job_listings.append(JobListing(**job_data))
        
        return CrawlResponse(
            success=result.get("success", False),
            site=result.get("site", request.siteName),
            searchKeyword=result.get("searchKeyword"),
            totalResults=result.get("totalResults", 0),
            jobListings=job_listings,
            searchUrl=result.get("searchUrl"),
            error=result.get("error"),
            message=result.get("message"),
            fromCache=result.get("fromCache", False),
            cachedAt=result.get("cachedAt")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"크롤링 실패: {str(e)}")


class CrawlWantedRequest(BaseModel):
    searchKeyword: Optional[str] = None
    maxResults: Optional[int] = 10
    forceRefresh: Optional[bool] = False  # 캐시 무시하고 강제 새로고침


@app.post("/api/job-sites/crawl/wanted", response_model=CrawlResponse)
async def crawl_wanted(request: CrawlWantedRequest):
    """
    원티드(https://www.wanted.co.kr) 사이트에서 채용 정보를 크롤링합니다.
    """
    try:
        # maxResults가 0이면 모든 결과 가져오기, None이면 기본값 10
        # Python에서 0 or 10은 10이 되므로, 명시적으로 처리 필요
        max_results = 0 if request.maxResults == 0 else (request.maxResults if request.maxResults is not None else 10)
        
        result = await web_crawler_service.crawl_wanted(
            search_keyword=request.searchKeyword,
            max_results=max_results,
            force_refresh=request.forceRefresh or False
        )
        
        # JobListing 모델로 변환 (모델에 없는 필드 제거)
        job_listings = []
        for job in result.get("jobListings", []):
            # title과 url은 필수 필드이므로 기본값 설정
            title = job.get("title") or job.get("name") or "채용 공고"
            url = job.get("url") or result.get("searchUrl") or "https://www.wanted.co.kr"
            
            # reward가 딕셔너리인 경우 문자열로 변환
            reward = job.get("reward")
            if isinstance(reward, dict):
                # 원티드 API 응답 형식: {'formatted_total': '100만원', ...}
                reward = reward.get("formatted_total") or reward.get("formatted_recommender") or str(reward)
            elif reward is not None:
                reward = str(reward)
            
            # JobListing 모델에 맞는 필드만 추출
            job_data = {
                "title": title,
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "url": url,
                "id": job.get("id"),
                "reward": reward
            }
            try:
                job_listings.append(JobListing(**job_data))
            except Exception as e:
                print(f"JobListing 변환 실패: {job_data}, 에러: {str(e)}")
                continue
        
        return CrawlResponse(
            success=result.get("success", False),
            site=result.get("site", "원티드"),
            searchKeyword=result.get("searchKeyword"),
            totalResults=result.get("totalResults", 0),
            jobListings=job_listings,
            searchUrl=result.get("searchUrl"),
            error=result.get("error"),
            message=result.get("message"),
            fromCache=result.get("fromCache", False),
            cachedAt=result.get("cachedAt")
        )
        
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"원티드 크롤링 에러: {error_detail}")
        raise HTTPException(status_code=500, detail=f"원티드 크롤링 실패: {str(e)}")


class CrawlMultipleSitesRequest(BaseModel):
    siteUrls: List[Dict[str, str]]  # [{"name": "원티드", "url": "https://www.wanted.co.kr"}, ...]
    searchKeyword: Optional[str] = None
    maxResultsPerSite: Optional[int] = 5
    forceRefresh: Optional[bool] = False  # 캐시 무시하고 강제 새로고침


class CrawlMultipleSitesResponse(BaseModel):
    success: bool
    searchKeyword: Optional[str] = None
    sites: List[CrawlResponse]


@app.post("/api/job-sites/crawl/multiple", response_model=CrawlMultipleSitesResponse)
async def crawl_multiple_sites(request: CrawlMultipleSitesRequest):
    """
    여러 취업 사이트에서 동시에 채용 정보를 크롤링합니다.
    """
    try:
        result = await web_crawler_service.crawl_multiple_sites(
            site_urls=request.siteUrls,
            search_keyword=request.searchKeyword,
            max_results_per_site=request.maxResultsPerSite or 5,
            force_refresh=request.forceRefresh or False
        )
        
        # 각 사이트 결과를 CrawlResponse로 변환
        site_responses = []
        for site_result in result.get("sites", []):
            job_listings = [
                JobListing(**job) for job in site_result.get("jobListings", [])
            ]
            site_responses.append(
                CrawlResponse(
                    success=site_result.get("success", False),
                    site=site_result.get("site", ""),
                    searchKeyword=site_result.get("searchKeyword"),
                    totalResults=site_result.get("totalResults", 0),
                    jobListings=job_listings,
                    searchUrl=site_result.get("searchUrl"),
                    error=site_result.get("error"),
                    message=site_result.get("message"),
                    fromCache=site_result.get("fromCache", False),
                    cachedAt=site_result.get("cachedAt")
                )
            )
        
        return CrawlMultipleSitesResponse(
            success=result.get("success", True),
            searchKeyword=result.get("searchKeyword"),
            sites=site_responses
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"다중 사이트 크롤링 실패: {str(e)}")


@app.post("/api/job-sites/cache/clear")
async def clear_cache():
    """
    모든 캐시를 삭제합니다.
    다음 요청부터는 새로 크롤링된 데이터를 사용합니다.
    """
    try:
        web_crawler_service.clear_all_cache()
        return {
            "success": True,
            "message": "모든 캐시가 삭제되었습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캐시 삭제 실패: {str(e)}")


@app.post("/api/job-sites/cache/clear-expired")
async def clear_expired_cache():
    """
    만료된 캐시만 삭제합니다.
    """
    try:
        web_crawler_service.clear_expired_cache()
        return {
            "success": True,
            "message": "만료된 캐시가 삭제되었습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"캐시 정리 실패: {str(e)}")


class JobListingsQueryRequest(BaseModel):
    siteName: Optional[str] = None
    searchKeyword: Optional[str] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0


@app.post("/api/job-sites/listings/query", response_model=CrawlResponse)
async def query_job_listings(request: JobListingsQueryRequest):
    """
    데이터베이스에서 채용 공고를 조회합니다.
    """
    try:
        job_listings = database_service.get_job_listings(
            site_name=request.siteName,
            search_keyword=request.searchKeyword,
            limit=request.limit or 100,
            offset=request.offset or 0
        )
        
        # JobListing 모델로 변환
        listings = []
        for job in job_listings:
            job_data = {
                "title": job.get("title", ""),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "url": job.get("url", ""),
                "id": str(job.get("id", "")) if job.get("id") else job.get("job_id"),
                "reward": job.get("reward")
            }
            listings.append(JobListing(**job_data))
        
        total_count = database_service.count_job_listings(
            site_name=request.siteName,
            search_keyword=request.searchKeyword
        )
        
        return CrawlResponse(
            success=True,
            site=request.siteName or "전체",
            searchKeyword=request.searchKeyword,
            totalResults=total_count,
            jobListings=listings,
            fromCache=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채용 공고 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

