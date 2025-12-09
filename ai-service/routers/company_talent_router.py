"""
목표 기업 인재상 분석 API 라우터

기업의 인재상, 채용 기준, 핵심 역량을 분석하는 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from services.agents.company_talent_agent import CompanyTalentAgent

router = APIRouter(prefix="/api/company-talent", tags=["company-talent"])

# 에이전트 인스턴스 (싱글톤)
_agent: Optional[CompanyTalentAgent] = None


def get_agent() -> CompanyTalentAgent:
    """에이전트 인스턴스 가져오기"""
    global _agent
    if _agent is None:
        _agent = CompanyTalentAgent()
    return _agent


# ==================== 요청/응답 모델 ====================

class CompanyAnalysisRequest(BaseModel):
    """기업 인재상 분석 요청"""
    company_name: str = Field(..., description="분석할 기업명", min_length=1)
    user_profile: Optional[Dict] = Field(None, description="사용자 프로필 (매칭 분석용)")
    career_analysis: Optional[Dict] = Field(None, description="커리어 분석 결과 (매칭 분석용)")


class CompanyAnalysisResponse(BaseModel):
    """기업 인재상 분석 응답"""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


class JobPostingAnalysisRequest(BaseModel):
    """채용공고 분석 요청"""
    job_id: Optional[str] = Field(None, description="채용공고 ID")
    job_url: Optional[str] = Field(None, description="채용공고 URL")
    job_data: Optional[Dict] = Field(None, description="채용공고 데이터 (직접 제공)")


class CompareCompaniesRequest(BaseModel):
    """기업 비교 요청"""
    company_names: List[str] = Field(..., description="비교할 기업명 목록 (최대 5개)", min_length=2, max_length=5)
    user_profile: Optional[Dict] = Field(None, description="사용자 프로필")
    career_analysis: Optional[Dict] = Field(None, description="커리어 분석 결과")


class SearchCompaniesRequest(BaseModel):
    """기업 검색 요청"""
    industry: Optional[str] = Field(None, description="산업/업종")
    company_type: Optional[str] = Field(None, description="기업유형 (대기업, 중소기업, 스타트업 등)")
    location: Optional[str] = Field(None, description="위치")
    tech_stack: Optional[List[str]] = Field(None, description="기술스택")


# ==================== API 엔드포인트 ====================

@router.post("/analyze", response_model=CompanyAnalysisResponse)
async def analyze_company_talent(request: CompanyAnalysisRequest):
    """
    기업 인재상 종합 분석

    기업명을 입력하면 해당 기업의 인재상, 채용 기준, 문화 등을 분석합니다.
    사용자 프로필이나 커리어 분석 결과를 함께 제공하면 매칭 분석도 수행합니다.

    ## 요청 예시

    ### 기본 분석
    ```json
    {
        "company_name": "카카오"
    }
    ```

    ### 매칭 분석 포함
    ```json
    {
        "company_name": "카카오",
        "user_profile": {
            "skills": ["Python", "React", "AWS"],
            "experience": "3년차",
            "education": "컴퓨터공학 학사"
        },
        "career_analysis": {
            "recommendedCareers": [{"careerName": "백엔드 개발자"}],
            "strengths": ["문제해결력", "협업능력"],
            "values": ["성장", "도전"]
        }
    }
    ```

    ## 응답 구조
    - **companyInfo**: 기업 기본 정보
    - **talentAnalysis**: 인재상 분석 결과
      - idealCandidate: 원하는 인재상
      - requirements: 필수/우대 요건
      - companyCulture: 기업문화
      - hiringTrends: 채용 트렌드
      - interviewTips: 면접 팁
    - **userMatching**: 사용자 매칭 분석 (프로필 제공 시)
    - **jobPostings**: 최근 채용공고 목록
    """
    try:
        agent = get_agent()
        result = await agent.analyze_company_talent(
            company_name=request.company_name,
            user_profile=request.user_profile,
            career_analysis=request.career_analysis
        )

        return CompanyAnalysisResponse(
            success=True,
            data=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"기업 인재상 분석 실패: {str(e)}"
        )


@router.get("/analyze/{company_name}", response_model=CompanyAnalysisResponse)
async def analyze_company_talent_get(
    company_name: str,
    include_matching: bool = Query(False, description="사용자 매칭 분석 포함 여부")
):
    """
    기업 인재상 분석 (GET 방식)

    간단히 기업명만으로 인재상을 분석합니다.

    ## 요청 예시
    ```
    GET /api/company-talent/analyze/카카오
    GET /api/company-talent/analyze/네이버?include_matching=true
    ```
    """
    try:
        agent = get_agent()
        result = await agent.analyze_company_talent(
            company_name=company_name
        )

        return CompanyAnalysisResponse(
            success=True,
            data=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"기업 인재상 분석 실패: {str(e)}"
        )


@router.post("/analyze-job", response_model=CompanyAnalysisResponse)
async def analyze_job_posting(request: JobPostingAnalysisRequest):
    """
    특정 채용공고 상세 분석

    채용공고 ID나 데이터를 제공하면 해당 포지션의 요구사항을 상세 분석합니다.

    ## 요청 예시

    ### ID로 분석
    ```json
    {
        "job_id": "12345"
    }
    ```

    ### 데이터 직접 제공
    ```json
    {
        "job_data": {
            "title": "백엔드 개발자",
            "company": "카카오",
            "description": "Spring Boot, Kotlin...",
            "techStack": ["Java", "Kotlin", "Spring"],
            "requiredSkills": ["REST API", "Database"]
        }
    }
    ```

    ## 응답 구조
    - **positionSummary**: 포지션 요약
    - **keyResponsibilities**: 주요 업무
    - **mustHave**: 필수 역량
    - **niceToHave**: 우대 역량
    - **expectedExperience**: 예상 경력
    - **preparationTips**: 준비 팁
    - **questionsToPrepare**: 예상 면접 질문
    """
    try:
        if not any([request.job_id, request.job_url, request.job_data]):
            raise HTTPException(
                status_code=400,
                detail="job_id, job_url, job_data 중 하나는 필수입니다."
            )

        agent = get_agent()
        result = await agent.analyze_job_posting(
            job_id=request.job_id,
            job_url=request.job_url,
            job_data=request.job_data
        )

        return CompanyAnalysisResponse(
            success=True,
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"채용공고 분석 실패: {str(e)}"
        )


@router.post("/compare", response_model=CompanyAnalysisResponse)
async def compare_companies(request: CompareCompaniesRequest):
    """
    여러 기업 인재상 비교 분석

    최대 5개 기업의 인재상을 비교 분석합니다.
    사용자 프로필을 제공하면 어느 기업이 더 적합한지도 분석합니다.

    ## 요청 예시
    ```json
    {
        "company_names": ["카카오", "네이버", "라인"],
        "user_profile": {
            "skills": ["Python", "React"],
            "experience": "3년차"
        }
    }
    ```

    ## 응답 구조
    - **companies**: 각 기업별 상세 분석
    - **comparison**: 비교 분석 결과
      - comparisonTable: 항목별 비교표
      - similarities: 공통점
      - differences: 차이점
    - **recommendation**: 추천 기업 및 이유
    """
    try:
        agent = get_agent()
        result = await agent.compare_companies(
            company_names=request.company_names,
            user_profile=request.user_profile,
            career_analysis=request.career_analysis
        )

        return CompanyAnalysisResponse(
            success=True,
            data=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"기업 비교 분석 실패: {str(e)}"
        )


@router.post("/search", response_model=CompanyAnalysisResponse)
async def search_companies(request: SearchCompaniesRequest):
    """
    조건에 맞는 기업 검색

    산업, 기업유형, 위치 등의 조건으로 기업을 검색합니다.

    ## 요청 예시
    ```json
    {
        "industry": "IT",
        "company_type": "대기업",
        "location": "서울"
    }
    ```
    """
    try:
        agent = get_agent()
        criteria = {
            "industry": request.industry,
            "companyType": request.company_type,
            "location": request.location,
            "techStack": request.tech_stack
        }
        # None 값 제거
        criteria = {k: v for k, v in criteria.items() if v is not None}

        result = await agent.search_companies_by_criteria(criteria)

        return CompanyAnalysisResponse(
            success=True,
            data={"companies": result, "count": len(result)}
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"기업 검색 실패: {str(e)}"
        )


@router.get("/search", response_model=CompanyAnalysisResponse)
async def search_companies_get(
    industry: Optional[str] = Query(None, description="산업/업종"),
    company_type: Optional[str] = Query(None, description="기업유형"),
    location: Optional[str] = Query(None, description="위치")
):
    """
    조건에 맞는 기업 검색 (GET 방식)

    ## 요청 예시
    ```
    GET /api/company-talent/search?industry=IT&location=서울
    ```
    """
    try:
        agent = get_agent()
        criteria = {}
        if industry:
            criteria["industry"] = industry
        if company_type:
            criteria["companyType"] = company_type
        if location:
            criteria["location"] = location

        result = await agent.search_companies_by_criteria(criteria)

        return CompanyAnalysisResponse(
            success=True,
            data={"companies": result, "count": len(result)}
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"기업 검색 실패: {str(e)}"
        )


# ==================== 헬스체크 ====================

@router.get("/health")
async def health_check():
    """API 헬스체크"""
    return {"status": "healthy", "service": "company-talent-agent"}
