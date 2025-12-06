"""
채용공고 AI 에이전트 API 라우터

OpenAI Agents SDK 기반 채용공고 에이전트 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import json
from services.agents.job_agent import run_job_agent
from services.database_service import DatabaseService
from services.job_recommendation_calculator import calculate_user_recommendations_sync

router = APIRouter(prefix="/api/job-agent", tags=["job-agent"])


class AgentRequest(BaseModel):
    """에이전트 요청 모델"""
    message: str = Field(..., description="사용자 메시지")
    user_id: Optional[int] = Field(None, description="사용자 ID (프로필 기반 추천 시 필요)")
    agent_type: str = Field(
        "main",
        description="에이전트 타입: main(자동 라우팅), recommendation(추천), analysis(분석)"
    )


class AgentResponse(BaseModel):
    """에이전트 응답 모델"""
    success: bool
    response: Optional[str] = None
    agent: Optional[str] = None
    error: Optional[str] = None


@router.post("/chat", response_model=AgentResponse)
async def chat_with_agent(request: AgentRequest):
    """
    채용공고 에이전트와 대화

    - **message**: 사용자 메시지 (예: "백엔드 개발자 채용 추천해줘")
    - **user_id**: 사용자 ID (프로필 기반 추천 시 필요)
    - **agent_type**: 에이전트 타입
        - `main`: 자동으로 적절한 에이전트에게 라우팅
        - `recommendation`: 채용공고 추천 전문
        - `analysis`: 채용 시장 분석 전문

    ## 예시 요청

    ### 채용공고 추천
    ```json
    {
        "message": "백엔드 개발자 채용공고 추천해줘",
        "user_id": 1
    }
    ```

    ### 프로필 기반 추천
    ```json
    {
        "message": "내 프로필에 맞는 채용공고 찾아줘",
        "user_id": 1
    }
    ```

    ### 기술 트렌드 분석
    ```json
    {
        "message": "프론트엔드 개발자에게 요구되는 기술 스택 분석해줘",
        "agent_type": "analysis"
    }
    ```

    ### 자격증 추천
    ```json
    {
        "message": "데이터 분석가에게 필요한 자격증 알려줘"
    }
    ```
    """
    try:
        result = await run_job_agent(
            user_request=request.message,
            user_id=request.user_id,
            agent_type=request.agent_type
        )

        if result.get("success"):
            return AgentResponse(
                success=True,
                response=result.get("response"),
                agent=result.get("agent")
            )
        else:
            return AgentResponse(
                success=False,
                error=result.get("error")
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"에이전트 실행 실패: {str(e)}")


@router.post("/recommend", response_model=AgentResponse)
async def recommend_jobs(request: AgentRequest):
    """
    채용공고 추천 (recommendation 에이전트 직접 호출)

    추천 에이전트를 직접 호출하여 채용공고를 추천받습니다.
    """
    try:
        result = await run_job_agent(
            user_request=request.message,
            user_id=request.user_id,
            agent_type="recommendation"
        )

        if result.get("success"):
            return AgentResponse(
                success=True,
                response=result.get("response"),
                agent=result.get("agent")
            )
        else:
            return AgentResponse(
                success=False,
                error=result.get("error")
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 에이전트 실행 실패: {str(e)}")


@router.post("/analyze", response_model=AgentResponse)
async def analyze_market(request: AgentRequest):
    """
    채용 시장 분석 (analysis 에이전트 직접 호출)

    분석 에이전트를 직접 호출하여 채용 시장을 분석합니다.
    """
    try:
        result = await run_job_agent(
            user_request=request.message,
            user_id=request.user_id,
            agent_type="analysis"
        )

        if result.get("success"):
            return AgentResponse(
                success=True,
                response=result.get("response"),
                agent=result.get("agent")
            )
        else:
            return AgentResponse(
                success=False,
                error=result.get("error")
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 에이전트 실행 실패: {str(e)}")


class RecommendationResponse(BaseModel):
    """추천 응답 모델"""
    success: bool
    recommendations: List[Dict]
    totalCount: int
    cached: bool = Field(default=False, description="캐시된 데이터 여부")
    calculatedAt: Optional[str] = Field(None, description="마지막 계산 시간")
    error: Optional[str] = None


@router.get("/recommendations/fast/{user_id}", response_model=RecommendationResponse)
async def get_cached_recommendations(
    user_id: int,
    limit: int = Query(20, ge=1, le=100, description="조회할 추천 개수"),
    min_score: float = Query(0, ge=0, le=100, description="최소 매칭 점수")
):
    """
    미리 계산된 채용공고 추천 조회 (빠른 응답)

    백그라운드에서 미리 계산된 추천 결과를 DB에서 조회합니다.
    AI 에이전트를 실행하지 않으므로 매우 빠르게 응답합니다.

    - **user_id**: 사용자 ID
    - **limit**: 조회할 추천 개수 (기본값: 20)
    - **min_score**: 최소 매칭 점수 (기본값: 0)

    ## 예시 요청
    ```
    GET /api/job-agent/recommendations/fast/1?limit=20&min_score=70
    ```

    ## 응답
    - 캐시된 데이터가 있으면 즉시 반환
    - 없으면 빈 리스트 반환 (또는 실시간 계산 트리거)
    """
    try:
        db = DatabaseService()

        # 1. DB에서 미리 계산된 추천 조회
        query = """
            SELECT
                ujr.id,
                ujr.user_id,
                ujr.job_listing_id,
                ujr.match_score,
                ujr.match_reason,
                ujr.recommendation_data,
                ujr.calculated_at,
                jl.title,
                jl.company,
                jl.location,
                jl.url,
                jl.description,
                jl.site_name,
                jl.tech_stack,
                jl.required_skills
            FROM user_job_recommendations ujr
            INNER JOIN job_listings jl ON ujr.job_listing_id = jl.id
            WHERE ujr.user_id = %s
            AND ujr.match_score >= %s
            ORDER BY ujr.match_score DESC
            LIMIT %s
        """

        results = db.execute_query(query, (user_id, min_score, limit))

        if not results:
            # 캐시된 데이터가 없으면 빈 결과 반환
            return RecommendationResponse(
                success=True,
                recommendations=[],
                totalCount=0,
                cached=False
            )

        # 2. 결과 포맷팅
        recommendations = []
        calculated_at = None

        for row in results:
            # recommendation_data가 JSON 문자열이면 파싱
            rec_data = row.get("recommendation_data")
            if isinstance(rec_data, str):
                try:
                    rec_data = json.loads(rec_data)
                except:
                    rec_data = {}
            elif rec_data is None:
                rec_data = {}

            # 기본 구조로 통합
            recommendation = {
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

            # recommendation_data에 추가 정보가 있으면 병합
            if rec_data:
                recommendation.update({
                    k: v for k, v in rec_data.items()
                    if k not in recommendation and v is not None
                })

            recommendations.append(recommendation)

            # 계산 시간 추출 (첫 번째 레코드)
            if calculated_at is None:
                calculated_at = row.get("calculated_at")

        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            totalCount=len(recommendations),
            cached=True,
            calculatedAt=calculated_at
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"추천 조회 실패: {str(e)}"
        )


@router.post("/recommendations/calculate/{user_id}")
async def trigger_recommendation_calculation(
    user_id: int,
    background: bool = Query(False, description="백그라운드에서 비동기 실행 여부")
):
    """
    특정 사용자의 추천 계산 수동 트리거

    백그라운드에서 해당 사용자의 추천을 다시 계산합니다.
    커리어 분석이 업데이트되었거나 새로운 추천이 필요할 때 사용합니다.

    - **user_id**: 사용자 ID
    - **background**: true면 즉시 응답하고 백그라운드에서 실행 (기본값: false)

    ## 예시 요청
    ```
    POST /api/job-agent/recommendations/calculate/1
    POST /api/job-agent/recommendations/calculate/1?background=true
    ```
    """
    try:
        if background:
            # 백그라운드에서 비동기 실행 (즉시 응답)
            import threading
            threading.Thread(
                target=calculate_user_recommendations_sync,
                args=(user_id,),
                kwargs={"max_recommendations": 50},
                daemon=True
            ).start()

            return {
                "success": True,
                "message": f"사용자 {user_id}의 추천 계산이 백그라운드에서 시작되었습니다.",
                "userId": user_id,
                "background": True
            }
        else:
            # 동기적으로 실행 (완료될 때까지 대기)
            result = calculate_user_recommendations_sync(user_id=user_id, max_recommendations=50)

            if result.get("success"):
                return {
                    "success": True,
                    "message": f"사용자 {user_id}의 추천이 계산되었습니다.",
                    "savedCount": result.get("saved_count", 0),
                    "userId": user_id,
                    "background": False
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "알 수 없는 오류"),
                    "userId": user_id
                }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"추천 계산 실패: {str(e)}"
        )
