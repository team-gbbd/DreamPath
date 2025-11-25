"""
채용 공고 분석 API 라우터
"""
from fastapi import APIRouter, HTTPException
from models import (
    MarketTrendAnalysisRequest,
    MarketTrendAnalysisResponse,
    SkillRequirementsRequest,
    SkillRequirementsResponse,
    SalaryTrendsRequest,
    SalaryTrendsResponse,
    PersonalizedInsightsRequest,
    PersonalizedInsightsResponse,
    JobComparisonRequest,
    JobComparisonResponse,
    TopItem,
    SkillDetail,
    ExperienceLevel,
    SalaryRange,
    CareerInsight,
    JobComparisonInfo,
    ComparisonDetail
)
from services.agents.job_analysis_agent import JobAnalysisAgent

router = APIRouter(prefix="/api/job-analysis", tags=["job-analysis"])


@router.post("/market-trends", response_model=MarketTrendAnalysisResponse)
async def analyze_market_trends(request: MarketTrendAnalysisRequest):
    """
    채용 시장 트렌드 분석

    특정 직무 분야 또는 전체 시장의 채용 트렌드를 분석합니다.
    - 채용 공고 수 통계
    - 상위 채용 기업
    - 인기 지역
    - 트렌딩 스킬
    - 성장하는 분야
    """
    try:
        agent = JobAnalysisAgent()
        result = await agent.analyze_market_trends(
            career_field=request.careerField,
            days=request.days
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "분석할 데이터가 없습니다.")
            )

        return MarketTrendAnalysisResponse(
            success=result["success"],
            period=result["period"],
            careerField=result["careerField"],
            totalJobs=result["totalJobs"],
            topCompanies=[TopItem(**item) for item in result["topCompanies"]],
            topLocations=[TopItem(**item) for item in result["topLocations"]],
            insights=result["insights"],
            trendingSkills=result["trendingSills"],
            growingFields=result["growingFields"],
            summary=result["summary"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"트렌드 분석 실패: {str(e)}"
        )


@router.post("/skill-requirements", response_model=SkillRequirementsResponse)
async def analyze_skill_requirements(request: SkillRequirementsRequest):
    """
    직무별 필요 스킬 분석

    특정 직무에서 요구하는 스킬과 우대사항을 AI로 분석합니다.
    - 필수 스킬
    - 우대 스킬
    - 떠오르는 스킬
    - 경력 요구사항
    - 학습 추천
    """
    try:
        agent = JobAnalysisAgent()
        result = await agent.analyze_skill_requirements(
            career_field=request.careerField,
            days=request.days
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "분석할 데이터가 없습니다.")
            )

        return SkillRequirementsResponse(
            success=result["success"],
            careerField=result["careerField"],
            analyzedJobs=result["analyzedJobs"],
            requiredSkills=[SkillDetail(**skill) for skill in result["requiredSkills"]],
            preferredSkills=result["preferredSkills"],
            emergingSkills=result["emergingSkills"],
            experienceLevel=ExperienceLevel(**result["experienceLevel"]),
            recommendations=result["recommendations"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"스킬 분석 실패: {str(e)}"
        )


@router.post("/salary-trends", response_model=SalaryTrendsResponse)
async def analyze_salary_trends(request: SalaryTrendsRequest):
    """
    연봉 및 보상 트렌드 분석

    채용 공고에서 연봉 정보와 복리후생을 AI로 추출하고 분석합니다.
    - 연봉 범위 (최소/최대/평균)
    - 주요 복리후생
    - 인사이트
    """
    try:
        agent = JobAnalysisAgent()
        result = await agent.analyze_salary_trends(
            career_field=request.careerField,
            days=request.days
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "분석할 데이터가 없습니다.")
            )

        return SalaryTrendsResponse(
            success=result["success"],
            careerField=result["careerField"],
            analyzedJobs=result["analyzedJobs"],
            salaryRange=SalaryRange(**result["salaryRange"]),
            benefits=result["benefits"],
            insights=result["insights"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"연봉 분석 실패: {str(e)}"
        )


@router.post("/personalized-insights", response_model=PersonalizedInsightsResponse)
async def get_personalized_insights(request: PersonalizedInsightsRequest):
    """
    사용자 맞춤형 채용 시장 인사이트

    사용자의 프로필과 커리어 분석 결과를 바탕으로
    추천 직업별 맞춤형 인사이트를 제공합니다.
    - 스킬 갭 분석
    - 학습 경로 추천
    - 경쟁력 평가
    - 개인별 추천사항
    """
    try:
        agent = JobAnalysisAgent()
        result = await agent.get_personalized_insights(
            user_profile=request.userProfile,
            career_analysis=request.careerAnalysis
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "분석할 데이터가 없습니다.")
            )

        return PersonalizedInsightsResponse(
            success=result["success"],
            insights=[CareerInsight(**insight) for insight in result["insights"]],
            overallRecommendation=result["overallRecommendation"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"맞춤형 인사이트 생성 실패: {str(e)}"
        )


@router.post("/compare-jobs", response_model=JobComparisonResponse)
async def compare_job_postings(request: JobComparisonRequest):
    """
    채용 공고 비교 분석

    여러 채용 공고를 AI로 비교하여
    유사점, 차이점, 장단점을 분석합니다.
    """
    try:
        agent = JobAnalysisAgent()
        result = await agent.compare_job_postings(job_ids=request.jobIds)

        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "비교할 공고를 찾을 수 없습니다.")
            )

        return JobComparisonResponse(
            success=result["success"],
            jobs=[JobComparisonInfo(**job) for job in result["jobs"]],
            comparison=ComparisonDetail(**result["comparison"]),
            recommendation=result["recommendation"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"공고 비교 실패: {str(e)}"
        )
