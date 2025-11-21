"""
데이터베이스 조회 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from models import JobListingsQueryRequest, CrawlResponse, JobListing
from services.database_service import DatabaseService
from dependencies import get_database_service

router = APIRouter(prefix="/api/job-sites", tags=["database"])


@router.post("/listings/query", response_model=CrawlResponse)
async def query_job_listings(
    request: JobListingsQueryRequest,
    database_service: DatabaseService = Depends(get_database_service)
):
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

