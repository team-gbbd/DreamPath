"""
채용공고 AI 에이전트 API 라우터

OpenAI Agents SDK 기반 채용공고 에이전트 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from services.agents.job_agent import run_job_agent

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
