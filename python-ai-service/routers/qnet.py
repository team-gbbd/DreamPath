"""
Q-net (한국산업인력공단) API 라우터

국가기술자격 정보 및 시험 일정을 제공합니다.
"""
from fastapi import APIRouter, HTTPException
from models.qnet import (
    QualificationListRequest,
    QualificationListResponse,
    QualificationInfo,
    ExamScheduleRequest,
    ExamScheduleResponse,
    ExamScheduleInfo,
    QnetContentRequest,
    QnetContentResponse,
    QnetContentInfo,
    JobCertificationRequest,
    JobCertificationResponse,
    CertificationDetailRequest,
    CertificationDetailResponse,
)
from services.qnet_api_service import QnetApiService, SERIES_CODES

router = APIRouter(prefix="/api/qnet", tags=["qnet-certification"])

# 서비스 인스턴스
qnet_service = QnetApiService()


@router.get("/series-codes")
async def get_series_codes():
    """
    계열 코드 목록 조회
    자격증 검색 시 seriesCode 파라미터에 사용
    """
    return {
        "success": True,
        "seriesCodes": [
            {"code": code, "name": name}
            for code, name in SERIES_CODES.items()
        ]
    }


@router.post("/qualifications", response_model=QualificationListResponse)
async def get_qualifications(request: QualificationListRequest):
    """
    국가기술자격 종목 목록 조회

    - seriesCode: 계열코드 (01-기계, 02-금속, 05-정보통신 등)
    - qualificationName: 자격명 검색어 (예: "정보처리", "기계")
    """
    try:
        result = await qnet_service.get_qualification_list(
            series_code=request.seriesCode,
            qualification_name=request.qualificationName,
            page_no=request.pageNo,
            num_of_rows=request.numOfRows
        )

        if not result.get("success"):
            return QualificationListResponse(
                success=False,
                message=result.get("message", "조회 실패"),
                totalCount=0,
                items=[]
            )

        items = [QualificationInfo(**item) for item in result.get("items", [])]

        return QualificationListResponse(
            success=True,
            totalCount=result.get("totalCount", len(items)),
            items=items
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 조회 실패: {str(e)}")


@router.post("/exam-schedule", response_model=ExamScheduleResponse)
async def get_exam_schedule(request: ExamScheduleRequest):
    """
    국가기술자격 시험 일정 조회

    - examType: 시험 유형 ("e": 기사/산업기사, "pe": 기능사, "mc": 서비스분야, "all": 전체)
    """
    try:
        result = await qnet_service.get_exam_schedule(
            exam_type="all",
            page_no=request.pageNo,
            num_of_rows=request.numOfRows
        )

        if not result.get("success"):
            return ExamScheduleResponse(
                success=False,
                message=result.get("message", "조회 실패"),
                totalCount=0,
                items=[]
            )

        items = [ExamScheduleInfo(**item) for item in result.get("items", [])]

        return ExamScheduleResponse(
            success=True,
            totalCount=result.get("totalCount", len(items)),
            items=items
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시험 일정 조회 실패: {str(e)}")


@router.post("/content", response_model=QnetContentResponse)
async def get_qnet_content(request: QnetContentRequest):
    """
    Q-net 컨텐츠 정보 조회
    """
    try:
        result = await qnet_service.get_qnet_content(
            content_type=request.contentType,
            keyword=request.keyword,
            page_no=request.pageNo,
            num_of_rows=request.numOfRows
        )

        if not result.get("success"):
            return QnetContentResponse(
                success=False,
                message=result.get("message", "조회 실패"),
                totalCount=0,
                items=[]
            )

        items = [QnetContentInfo(**item) for item in result.get("items", [])]

        return QnetContentResponse(
            success=True,
            totalCount=result.get("totalCount", len(items)),
            items=items
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"컨텐츠 조회 실패: {str(e)}")


@router.post("/certifications-for-job", response_model=JobCertificationResponse)
async def get_certifications_for_job(request: JobCertificationRequest):
    """
    직업/직무 키워드 기반 관련 자격증 추천

    예시:
    - ["백엔드", "개발자"] -> 정보처리기사, 정보보안기사 등
    - ["데이터", "분석"] -> 빅데이터분석기사, SQL개발자 등
    - ["전기", "기술자"] -> 전기기사, 전기공사기사 등
    """
    try:
        result = await qnet_service.search_certifications_for_job(
            job_keywords=request.jobKeywords
        )

        if not result.get("success"):
            return JobCertificationResponse(
                success=False,
                message=result.get("message", "조회 실패"),
                totalCount=0,
                certifications=[]
            )

        certifications = [
            QualificationInfo(**cert)
            for cert in result.get("certifications", [])
        ]

        return JobCertificationResponse(
            success=True,
            totalCount=len(certifications),
            certifications=certifications
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 추천 실패: {str(e)}")


@router.post("/certification-detail", response_model=CertificationDetailResponse)
async def get_certification_detail(request: CertificationDetailRequest):
    """
    자격증 상세 정보 + 시험 일정 통합 조회

    자격증 이름으로 기본 정보와 2025년 시험 일정을 함께 조회합니다.
    """
    try:
        result = await qnet_service.get_certification_with_schedule(
            qualification_name=request.qualificationName
        )

        if not result.get("success"):
            return CertificationDetailResponse(
                success=False,
                message=result.get("message", "조회 실패")
            )

        certification = None
        if result.get("certification"):
            certification = QualificationInfo(**result["certification"])

        exam_schedules = [
            ExamScheduleInfo(**schedule)
            for schedule in result.get("examSchedules", [])
        ]

        return CertificationDetailResponse(
            success=True,
            certification=certification,
            examSchedules=exam_schedules
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 상세 조회 실패: {str(e)}")


@router.get("/search/{keyword}")
async def quick_search(keyword: str):
    """
    자격증 빠른 검색 (키워드)

    예: /api/qnet/search/정보처리
    """
    try:
        result = await qnet_service.get_qualification_list(
            qualification_name=keyword,
            num_of_rows=20
        )

        if not result.get("success"):
            return {
                "success": False,
                "message": result.get("message", "검색 실패"),
                "items": []
            }

        return {
            "success": True,
            "keyword": keyword,
            "totalCount": result.get("totalCount", 0),
            "items": result.get("items", [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"검색 실패: {str(e)}")
