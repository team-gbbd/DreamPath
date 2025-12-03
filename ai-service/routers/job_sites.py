"""
취업 사이트 추천/검색/탐색 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import (
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
from services.job_site_service import JobSiteService
from dependencies import get_job_site_service

router = APIRouter(prefix="/api/job-sites", tags=["job-sites"])


@router.post("/recommend", response_model=JobSiteRecommendationResponse)
async def recommend_job_sites(
    request: JobSiteRecommendationRequest,
    job_site_service: JobSiteService = Depends(get_job_site_service)
):
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


@router.post("/search", response_model=JobSiteSearchResponse)
async def search_job_sites(
    request: JobSiteSearchRequest,
    job_site_service: JobSiteService = Depends(get_job_site_service)
):
    """키워드로 취업 사이트 검색"""
    try:
        sites = job_site_service.search_job_sites_by_keyword(request.keyword)
        site_infos = [JobSiteInfo(**site) for site in sites]
        return JobSiteSearchResponse(sites=site_infos)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 검색 실패: {str(e)}")


@router.get("/all", response_model=JobSiteSearchResponse)
async def get_all_job_sites(
    job_site_service: JobSiteService = Depends(get_job_site_service)
):
    """모든 주요 취업 사이트 목록 조회"""
    try:
        sites = job_site_service.get_all_job_sites()
        site_infos = [JobSiteInfo(**site) for site in sites]
        return JobSiteSearchResponse(sites=site_infos)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"취업 사이트 목록 조회 실패: {str(e)}")


@router.post("/explore", response_model=JobSiteExplorationResponse)
async def explore_job_sites(
    request: JobSiteExplorationRequest,
    job_site_service: JobSiteService = Depends(get_job_site_service)
):
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
