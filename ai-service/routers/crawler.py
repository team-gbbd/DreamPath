"""
웹 크롤링 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import (
    CrawlRequest,
    CrawlWantedRequest,
    CrawlMultipleSitesRequest,
    CrawlResponse,
    CrawlMultipleSitesResponse,
    JobListing
)
from services.web_crawler_service import WebCrawlerService
from dependencies import get_web_crawler_service

router = APIRouter(prefix="/api/job-sites", tags=["crawler"])


@router.post("/crawl", response_model=CrawlResponse)
async def crawl_job_site(
    request: CrawlRequest,
    web_crawler_service: WebCrawlerService = Depends(get_web_crawler_service)
):
    """
    MCP 브라우저 서버를 활용하여 취업 사이트에서 실제 채용 정보를 크롤링합니다.
    원티드, 잡코리아, 사람인 등 주요 취업 사이트를 지원합니다.
    """
    try:
        # maxResults가 0이면 모든 결과 가져오기, None이면 기본값 10
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
            # reward가 딕셔너리인 경우 문자열로 변환
            reward = job.get("reward")
            if isinstance(reward, dict):
                reward = reward.get("formatted_total") or reward.get("formatted_recommender") or str(reward)
            elif reward is not None:
                reward = str(reward)

            job_data = {
                "title": job.get("title", ""),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "url": job.get("url", ""),
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


@router.post("/crawl/wanted", response_model=CrawlResponse)
async def crawl_wanted(
    request: CrawlWantedRequest,
    web_crawler_service: WebCrawlerService = Depends(get_web_crawler_service)
):
    """
    원티드(https://www.wanted.co.kr) 사이트에서 채용 정보를 크롤링합니다.
    """
    try:
        # maxResults가 0이면 모든 결과 가져오기, None이면 기본값 10
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


@router.post("/crawl/multiple", response_model=CrawlMultipleSitesResponse)
async def crawl_multiple_sites(
    request: CrawlMultipleSitesRequest,
    web_crawler_service: WebCrawlerService = Depends(get_web_crawler_service)
):
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
            job_listings = []
            for job in site_result.get("jobListings", []):
                # reward가 딕셔너리인 경우 문자열로 변환
                reward = job.get("reward")
                if isinstance(reward, dict):
                    reward = reward.get("formatted_total") or reward.get("formatted_recommender") or str(reward)
                elif reward is not None:
                    reward = str(reward)

                job_data = {
                    "title": job.get("title", ""),
                    "company": job.get("company"),
                    "location": job.get("location"),
                    "description": job.get("description"),
                    "url": job.get("url", ""),
                    "id": job.get("id"),
                    "reward": reward
                }
                try:
                    job_listings.append(JobListing(**job_data))
                except Exception as e:
                    print(f"JobListing 변환 실패: {job_data}, 에러: {str(e)}")
                    continue

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


@router.post("/cache/clear")
async def clear_cache(
    web_crawler_service: WebCrawlerService = Depends(get_web_crawler_service)
):
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


@router.post("/cache/clear-expired")
async def clear_expired_cache(
    web_crawler_service: WebCrawlerService = Depends(get_web_crawler_service)
):
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

