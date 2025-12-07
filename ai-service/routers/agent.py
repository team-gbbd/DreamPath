"""
AI 에이전트 API 라우터
"""
from fastapi import APIRouter, HTTPException
from models import (
    # 채용 공고 추천
    JobRecommendationRequest,
    JobRecommendationResponse,
    RealTimeRecommendationRequest,

    # 채용 공고 + 기술/자격증 추천
    JobWithRequirementsRequest,
    JobWithRequirementsResponse,

    # 지원 현황 추적
    ApplicationAnalysisRequest,
    ApplicationAnalysisResponse,
    ApplicationTrackingRequest,
    ApplicationTrackingResponse,

    # 커리어 성장
    CareerGapRequest,
    CareerGapResponse,
    SkillDevelopmentRequest,
    SkillDevelopmentResponse,
    GrowthTimelineRequest,
    GrowthTimelineResponse,
    MarketTrendsRequest,
    MarketTrendsResponse,

    # 이력서 최적화
    ResumeOptimizationRequest,
    ResumeOptimizationResponse,
    ResumeQualityRequest,
    ResumeQualityResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    KeywordSuggestionRequest,
    KeywordSuggestionResponse,
)

from services.agents.job_recommendation_agent import JobRecommendationAgent
from services.agents.application_tracker_agent import ApplicationTrackerAgent
from services.agents.career_growth_agent import CareerGrowthAgent
from services.agents.resume_optimizer_agent import ResumeOptimizerAgent

router = APIRouter(prefix="/api/agent", tags=["ai-agent"])

# 에이전트 인스턴스
job_recommendation_agent = JobRecommendationAgent()
application_tracker_agent = ApplicationTrackerAgent()
career_growth_agent = CareerGrowthAgent()
resume_optimizer_agent = ResumeOptimizerAgent()


# ============== 1. 채용 공고 추천 ==============

@router.post("/job-recommendations", response_model=JobRecommendationResponse)
async def get_job_recommendations(request: JobRecommendationRequest):
    """
    사용자에게 맞는 채용 공고 추천
    """
    try:
        recommendations = await job_recommendation_agent.get_recommendations(
            user_id=request.userId,
            career_analysis=request.careerAnalysis,
            user_profile=request.userProfile,
            limit=request.limit
        )

        return JobRecommendationResponse(
            recommendations=recommendations,
            totalCount=len(recommendations)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채용 공고 추천 실패: {str(e)}")


@router.post("/job-recommendations/realtime", response_model=JobRecommendationResponse)
async def get_realtime_recommendations(request: RealTimeRecommendationRequest):
    """
    실시간 채용 공고 추천 (키워드 기반)
    """
    try:
        recommendations = await job_recommendation_agent.get_real_time_recommendations(
            user_id=request.userId,
            career_keywords=request.careerKeywords,
            limit=request.limit
        )

        return JobRecommendationResponse(
            recommendations=recommendations,
            totalCount=len(recommendations)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"실시간 추천 실패: {str(e)}")


@router.post("/job-recommendations/with-requirements", response_model=JobWithRequirementsResponse)
async def get_recommendations_with_requirements(request: JobWithRequirementsRequest):
    """
    채용 공고 추천 + 필요 기술/자격증 분석

    사용자의 프로필과 스킬을 기반으로 채용 공고를 추천하고,
    각 공고에 필요한 기술 스택과 자격증, 학습 자료를 함께 제공합니다.
    """
    try:
        result = await job_recommendation_agent.get_recommendations_with_requirements(
            user_id=request.userId,
            career_analysis=request.careerAnalysis,
            user_profile=request.userProfile,
            user_skills=request.userSkills or [],
            limit=request.limit
        )

        return JobWithRequirementsResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 실패: {str(e)}")


# ============== 2. 지원 현황 추적 ==============

@router.post("/applications/analyze", response_model=ApplicationAnalysisResponse)
async def analyze_applications(request: ApplicationAnalysisRequest):
    """
    사용자의 전체 지원 현황 분석
    """
    try:
        analysis = await application_tracker_agent.analyze_applications(
            user_id=request.userId
        )

        return ApplicationAnalysisResponse(**analysis)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지원 현황 분석 실패: {str(e)}")


@router.post("/applications/track", response_model=ApplicationTrackingResponse)
async def track_application(request: ApplicationTrackingRequest):
    """
    특정 지원 건의 상태 추적 및 조언
    """
    try:
        advice = await application_tracker_agent.track_application_status(
            user_id=request.userId,
            application_id=request.applicationId,
            current_status=request.currentStatus.value
        )

        return ApplicationTrackingResponse(advice=advice)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지원 추적 실패: {str(e)}")


# ============== 3. 커리어 성장 제안 ==============

@router.post("/career/gap-analysis", response_model=CareerGapResponse)
async def analyze_career_gap(request: CareerGapRequest):
    """
    현재 위치와 목표 포지션 간의 갭 분석
    """
    try:
        result = await career_growth_agent.analyze_career_gap(
            current_position=request.currentPosition,
            target_position=request.targetPosition,
            current_skills=request.currentSkills,
            career_analysis=request.careerAnalysis
        )

        return CareerGapResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"커리어 갭 분석 실패: {str(e)}")


@router.post("/career/skill-development", response_model=SkillDevelopmentResponse)
async def suggest_skill_development(request: SkillDevelopmentRequest):
    """
    목표 포지션에 필요한 스킬 개발 제안
    """
    try:
        result = await career_growth_agent.suggest_skill_development(
            target_position=request.targetPosition,
            current_skills=request.currentSkills
        )

        return SkillDevelopmentResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스킬 개발 제안 실패: {str(e)}")


@router.post("/career/timeline", response_model=GrowthTimelineResponse)
async def create_growth_timeline(request: GrowthTimelineRequest):
    """
    커리어 성장 타임라인 생성
    """
    try:
        result = await career_growth_agent.create_growth_timeline(
            target_position=request.targetPosition,
            timeline_years=request.timelineYears
        )

        return GrowthTimelineResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"타임라인 생성 실패: {str(e)}")


@router.post("/career/market-trends", response_model=MarketTrendsResponse)
async def analyze_market_trends(request: MarketTrendsRequest):
    """
    목표 직업의 시장 트렌드 분석
    """
    try:
        result = await career_growth_agent.analyze_market_trends(
            target_career=request.targetCareer
        )

        return MarketTrendsResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시장 트렌드 분석 실패: {str(e)}")


# ============== 4. 이력서 최적화 ==============

@router.post("/resume/optimize", response_model=ResumeOptimizationResponse)
async def optimize_resume(request: ResumeOptimizationRequest):
    """
    특정 채용 공고에 맞춰 이력서 최적화
    """
    try:
        result = await resume_optimizer_agent.optimize_for_job(
            resume=request.resume.model_dump(),
            job_posting=request.jobPosting.model_dump()
        )

        return ResumeOptimizationResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 최적화 실패: {str(e)}")


@router.post("/resume/analyze", response_model=ResumeQualityResponse)
async def analyze_resume_quality(request: ResumeQualityRequest):
    """
    이력서 품질 전반적으로 분석
    """
    try:
        result = await resume_optimizer_agent.analyze_resume_quality(
            resume=request.resume.model_dump()
        )

        return ResumeQualityResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 품질 분석 실패: {str(e)}")


@router.post("/resume/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(request: CoverLetterRequest):
    """
    채용 공고에 맞춘 자기소개서 생성
    """
    try:
        result = await resume_optimizer_agent.generate_cover_letter(
            resume=request.resume.model_dump(),
            job_posting=request.jobPosting.model_dump(),
            user_motivation=request.userMotivation
        )

        return CoverLetterResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자기소개서 생성 실패: {str(e)}")


@router.post("/resume/keywords", response_model=KeywordSuggestionResponse)
async def suggest_keywords(request: KeywordSuggestionRequest):
    """
    포지션에 맞는 키워드 추천
    """
    try:
        keywords = await resume_optimizer_agent.suggest_keywords(
            target_position=request.targetPosition,
            industry=request.industry
        )

        return KeywordSuggestionResponse(keywords=keywords)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"키워드 추천 실패: {str(e)}")
