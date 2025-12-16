"""
채용공고 AI 에이전트 API 라우터

OpenAI Agents SDK 기반 채용공고 에이전트 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import json
import asyncio

from services.agents.job_agent import run_job_agent
from services.agents.job_recommendation_agent import JobRecommendationAgent
from services.job_recommendation_calculator import JobRecommendationCalculator
from services.job_fitness_service import get_job_fitness_service
from services.job_listing_service import get_job_listing_service, JobListingService

router = APIRouter(prefix="/api/job-agent", tags=["job-agent"])


# ==================== Request/Response Models ====================

class AgentRequest(BaseModel):
    message: str = Field(..., description="사용자 메시지")
    user_id: Optional[int] = Field(None, description="사용자 ID")
    agent_type: str = Field("main", description="에이전트 타입: main, recommendation, analysis")


class AgentResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    agent: Optional[str] = None
    error: Optional[str] = None


class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[Dict]
    totalCount: int
    cached: bool = False
    calculatedAt: Optional[str] = None
    error: Optional[str] = None


class ComprehensiveAnalysisRequest(BaseModel):
    career_analysis: Dict = Field(..., description="커리어 분석 결과")
    user_profile: Optional[Dict] = None
    user_skills: Optional[List[str]] = None
    limit: int = Field(10, ge=1, le=20)


# ==================== Agent Chat Endpoints ====================

@router.post("/chat", response_model=AgentResponse)
async def chat_with_agent(request: AgentRequest):
    """채용공고 에이전트와 대화"""
    try:
        result = await run_job_agent(
            user_request=request.message,
            user_id=request.user_id,
            agent_type=request.agent_type
        )
        return AgentResponse(
            success=result.get("success", False),
            response=result.get("response"),
            agent=result.get("agent"),
            error=result.get("error")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"에이전트 실행 실패: {str(e)}")


@router.post("/recommend", response_model=AgentResponse)
async def recommend_jobs(request: AgentRequest):
    """채용공고 추천 (recommendation 에이전트)"""
    request.agent_type = "recommendation"
    return await chat_with_agent(request)


@router.post("/analyze", response_model=AgentResponse)
async def analyze_market(request: AgentRequest):
    """채용 시장 분석 (analysis 에이전트)"""
    request.agent_type = "analysis"
    return await chat_with_agent(request)


# ==================== Recommendation Endpoints ====================

@router.get("/recommendations/fast/{user_id}", response_model=RecommendationResponse)
async def get_cached_recommendations(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    min_score: float = Query(0, ge=0, le=100)
):
    """미리 계산된 채용공고 추천 조회 (빠른 응답)"""
    try:
        service = get_job_listing_service()

        # 1. 캐시된 추천 조회 시도
        cached = service.get_cached_recommendations(user_id, limit, min_score)

        if cached:
            recommendations = _format_cached_recommendations(cached)
            calculated_at = _extract_calculated_at(cached[0]) if cached else None
            return RecommendationResponse(
                success=True,
                recommendations=recommendations,
                totalCount=len(recommendations),
                cached=True,
                calculatedAt=calculated_at
            )

        # 2. 캐시 없으면 최신 공고로 fallback
        jobs = service.get_latest_jobs(limit)
        if not jobs:
            return RecommendationResponse(
                success=True,
                recommendations=[],
                totalCount=0,
                cached=False,
                error="채용공고 데이터가 없습니다."
            )

        recommendations = [
            {**service.format_job_to_recommendation(job), "comprehensiveAnalysis": JobListingService.generate_default_analysis(job)}
            for job in jobs
        ]
        recommendations.sort(key=lambda x: x.get("matchScore", 0), reverse=True)

        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            totalCount=len(recommendations),
            cached=False
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"추천 조회 실패: {str(e)}")


@router.post("/recommendations/calculate/{user_id}")
async def trigger_recommendation_calculation(
    user_id: int,
    background: bool = Query(False, description="백그라운드 실행 여부")
):
    """특정 사용자의 추천 계산 수동 트리거"""
    try:
        calculator = JobRecommendationCalculator()

        if background:
            asyncio.create_task(calculator.calculate_user_recommendations(user_id, max_recommendations=50))
            return {"success": True, "message": f"사용자 {user_id}의 추천 계산이 백그라운드에서 시작되었습니다.", "background": True}

        result = await calculator.calculate_user_recommendations(user_id=user_id, max_recommendations=50)
        return {
            "success": result.get("success", False),
            "savedCount": result.get("saved_count", 0),
            "userId": user_id,
            "error": result.get("error")
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"추천 계산 실패: {str(e)}")


@router.get("/recommendations/by-careers/{user_id}")
async def get_recommendations_by_career_analysis(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    use_ai_analysis: bool = Query(True, description="AI 종합 분석 사용 여부"),
    force_refresh: bool = Query(False, description="캐시 무시하고 새로 계산")
):
    """진로상담 직업추천 결과 기반 채용공고 추천"""
    try:
        listing_service = get_job_listing_service()

        # 0. 캐시된 추천 먼저 확인 (force_refresh가 아닐 때)
        if not force_refresh:
            cached = listing_service.get_cached_recommendations(user_id, limit)
            if cached and len(cached) > 0:
                print(f"[JobRecommendation] 캐시 히트! user_id={user_id}, count={len(cached)}")
                recommendations = []
                for row in cached:
                    rec = {
                        "id": row.get("job_listing_id"),
                        "title": row.get("title", ""),
                        "company": row.get("company", ""),
                        "location": row.get("location"),
                        "url": row.get("url", ""),
                        "description": row.get("description"),
                        "siteName": row.get("site_name", ""),
                        "matchScore": int(row.get("match_score", 0)),
                        "matchReason": row.get("match_reason", ""),
                        "techStack": row.get("tech_stack"),
                        "requiredSkills": row.get("required_skills"),
                    }
                    # recommendation_data에 저장된 추가 정보 복원
                    if row.get("recommendation_data"):
                        try:
                            extra = json.loads(row["recommendation_data"]) if isinstance(row["recommendation_data"], str) else row["recommendation_data"]
                            rec.update({
                                "reasons": extra.get("reasons", []),
                                "strengths": extra.get("strengths", []),
                                "concerns": extra.get("concerns", []),
                                "comprehensiveAnalysis": extra.get("comprehensiveAnalysis"),
                            })
                        except:
                            pass
                    recommendations.append(rec)

                return {
                    "success": True,
                    "recommendations": recommendations,
                    "totalCount": len(recommendations),
                    "cached": True,
                    "calculatedAt": str(cached[0].get("calculated_at")) if cached else None
                }

        # 1. 추천 직업 조회
        career_names, data_source, career_analysis_data = listing_service.get_user_career_names(user_id)

        if not career_names:
            return {
                "success": False,
                "error": "추천 직업 정보가 없습니다. 진로상담을 먼저 진행해주세요.",
                "recommendations": [],
                "totalCount": 0
            }

        print(f"[JobRecommendation] 직업 조회 ({data_source}): {career_names}")

        # 2. 키워드 추출 및 채용공고 검색
        calculator = JobRecommendationCalculator()
        all_keywords = []
        career_to_keywords = {}

        for career_name in career_names:
            keywords = calculator._extract_keywords(career_name)
            career_to_keywords[career_name] = keywords
            all_keywords.extend(keywords)

        unique_keywords = list(set(all_keywords))
        print(f"[JobRecommendation] AI 생성 키워드: {unique_keywords}")

        job_results = listing_service.search_jobs_by_keywords(unique_keywords, limit)

        # 3. AI 적합도 평가 (병렬 배치 처리)
        jobs_for_ai = [{"title": j.get("title") or "", "description": j.get("description") or ""} for j in job_results]

        fitness_service = get_job_fitness_service()
        ai_results_map = await fitness_service.evaluate_jobs(career_names, jobs_for_ai)

        # 4. 결과 포맷팅
        recommendations = []
        for idx, job in enumerate(job_results):
            ai_result = ai_results_map.get(idx)

            if ai_result:
                rec = listing_service.format_job_to_recommendation(job, ai_result)
            else:
                # AI 미평가 시 키워드 기반 점수
                rec = _format_with_keyword_match(job, career_to_keywords)

            recommendations.append(rec)

        # 5. 필터링 및 정렬
        recommendations = [r for r in recommendations if r.get("matchScore", 0) >= 30]
        recommendations.sort(key=lambda x: x.get("matchScore", 0), reverse=True)
        recommendations = recommendations[:limit]

        # 6. AI 종합 분석 (선택적)
        if use_ai_analysis and recommendations and career_analysis_data:
            await _add_comprehensive_analysis(recommendations, career_analysis_data)
        else:
            for rec in recommendations:
                rec["comprehensiveAnalysis"] = JobListingService.generate_default_analysis(rec)

        # 7. 캐시에 저장 (다음 요청 시 빠르게 조회)
        if recommendations:
            try:
                saved = calculator._save_recommendations(user_id, recommendations)
                print(f"[JobRecommendation] 캐시 저장 완료: user_id={user_id}, count={saved}")
            except Exception as save_err:
                print(f"[JobRecommendation] 캐시 저장 실패: {save_err}")

        return {
            "success": True,
            "recommendations": recommendations,
            "totalCount": len(recommendations),
            "careerNames": career_names,
            "aiGeneratedKeywords": unique_keywords,
            "dataSource": data_source,
            "cached": False,
            "calculatedAt": str(datetime.now()),
            "aiAnalyzed": use_ai_analysis
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"추천 조회 실패: {str(e)}", "recommendations": [], "totalCount": 0}


@router.post("/recommendations/comprehensive/{user_id}")
async def get_comprehensive_recommendations(user_id: int, request: ComprehensiveAnalysisRequest):
    """6가지 종합 채용 분석 + 맞춤 추천"""
    try:
        agent = JobRecommendationAgent()
        result = await agent.get_comprehensive_job_analysis(
            user_id=user_id,
            career_analysis=request.career_analysis,
            user_profile=request.user_profile,
            user_skills=request.user_skills or [],
            limit=request.limit
        )
        return {"success": True, "data": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/analysis/job/{job_id}")
async def analyze_single_job(
    job_id: str,
    career_analysis: Dict,
    user_profile: Optional[Dict] = None,
    user_skills: Optional[List[str]] = None
):
    """단일 채용공고 종합 분석"""
    try:
        service = get_job_listing_service()

        # 채용공고 조회
        query = """
            SELECT id, title, company, location, url, description,
                   tech_stack, required_skills, site_name
            FROM job_listings WHERE id = %s
        """
        results = service.db.execute_query(query, (job_id,))

        if not results:
            raise HTTPException(status_code=404, detail="채용공고를 찾을 수 없습니다.")

        job = results[0]
        job_data = _parse_job_data(job)

        # 종합 분석
        agent = JobRecommendationAgent()
        external_data = await agent._fetch_external_company_data(job.get("company", ""))
        analysis = await agent._perform_comprehensive_analysis(
            job=job_data,
            external_data=external_data,
            career_analysis=career_analysis,
            user_profile=user_profile,
            user_skills=user_skills or []
        )

        return {"success": True, "jobInfo": job_data, "comprehensiveAnalysis": analysis}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")


# ==================== Helper Functions ====================

def _format_cached_recommendations(cached: List[Dict]) -> List[Dict]:
    """캐시된 추천 결과 포맷팅"""
    recommendations = []
    for row in cached:
        rec_data = row.get("recommendation_data")
        if isinstance(rec_data, str):
            try:
                rec_data = json.loads(rec_data)
            except:
                rec_data = {}
        rec_data = rec_data or {}

        rec = {
            "id": row.get("job_listing_id"),
            "title": row.get("title"),
            "company": row.get("company"),
            "location": row.get("location"),
            "url": row.get("url"),
            "description": (row.get("description") or "")[:300],
            "siteName": row.get("site_name"),
            "techStack": row.get("tech_stack"),
            "requiredSkills": row.get("required_skills"),
            "matchScore": float(row.get("match_score", 0)),
            "matchReason": row.get("match_reason") or rec_data.get("matchReason", ""),
        }

        # 추가 데이터 병합
        for k, v in rec_data.items():
            if k not in rec and v is not None:
                rec[k] = v

        recommendations.append(rec)
    return recommendations


def _extract_calculated_at(row: Dict) -> Optional[str]:
    """계산 시간 추출"""
    calc_time = row.get("calculated_at")
    if calc_time:
        return calc_time.isoformat() if hasattr(calc_time, 'isoformat') else str(calc_time)
    return None


def _format_with_keyword_match(job: Dict, career_to_keywords: Dict) -> Dict:
    """키워드 기반 매칭 점수 계산"""
    title = (job.get("title") or "").lower()
    desc = (job.get("description") or "").lower()

    keyword_match_count = 0
    matched_careers = []

    for career_name, keywords in career_to_keywords.items():
        for kw in keywords:
            if kw.lower() in title or kw.lower() in desc:
                keyword_match_count += 1
                if career_name not in matched_careers:
                    matched_careers.append(career_name)
                break

    return {
        "id": job.get("id"),
        "title": job.get("title") or "",
        "company": job.get("company") or "기업",
        "location": job.get("location"),
        "url": job.get("url"),
        "description": (job.get("description") or "")[:300],
        "siteName": job.get("site_name"),
        "experience": job.get("experience"),
        "matchScore": 40 + min(keyword_match_count * 5, 30),
        "matchReason": "키워드 기반 추천 (AI 미평가)",
        "matchedCareers": matched_careers,
        "requiredSkills": [],
        "skillMatch": [],
        "crawledAt": str(job.get("crawled_at")) if job.get("crawled_at") else None,
    }


async def _add_comprehensive_analysis(recommendations: List[Dict], career_analysis_data: Dict):
    """추천 목록에 AI 종합 분석 추가 (병렬 처리)"""
    print(f"[AI Analysis] {len(recommendations)}개 공고에 대해 AI 종합 분석 시작...")
    try:
        agent = JobRecommendationAgent()

        # 외부 데이터 병렬 fetch
        company_names = [rec.get("company", "") for rec in recommendations]
        external_data_tasks = [agent._fetch_external_company_data(name) for name in company_names]
        external_data_list = await asyncio.gather(*external_data_tasks, return_exceptions=True)

        jobs_with_data = [
            {"job": rec, "external_data": ext if not isinstance(ext, Exception) else {}}
            for rec, ext in zip(recommendations, external_data_list)
        ]

        # 배치 종합 분석
        analyses = await agent._perform_comprehensive_analysis_batch(
            jobs_with_data, career_analysis_data, None, []
        )

        for i, rec in enumerate(recommendations):
            rec["comprehensiveAnalysis"] = analyses[i] if i < len(analyses) else agent._get_default_comprehensive_analysis()

        print("[AI Analysis] 종합 분석 완료")

    except Exception as e:
        print(f"[AI Analysis] 종합 분석 실패: {e}")
        for rec in recommendations:
            rec["comprehensiveAnalysis"] = JobListingService.generate_default_analysis(rec)


def _parse_job_data(job: Dict) -> Dict:
    """DB row를 job_data 형식으로 변환"""
    tech_stack = job.get("tech_stack")
    if isinstance(tech_stack, str):
        try:
            tech_stack = json.loads(tech_stack)
        except:
            tech_stack = []

    required_skills = job.get("required_skills")
    if isinstance(required_skills, str):
        try:
            required_skills = json.loads(required_skills)
        except:
            required_skills = []

    return {
        "jobId": str(job.get("id")),
        "title": job.get("title"),
        "company": job.get("company"),
        "location": job.get("location"),
        "url": job.get("url"),
        "description": job.get("description"),
        "siteName": job.get("site_name"),
        "techStack": tech_stack or [],
        "requiredSkills": required_skills or []
    }
