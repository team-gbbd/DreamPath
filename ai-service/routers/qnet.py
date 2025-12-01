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
from services.database_service import DatabaseService

router = APIRouter(prefix="/api/qnet", tags=["qnet-certification"])

# 데이터베이스 서비스 인스턴스
try:
    db_service = DatabaseService()
except Exception as e:
    print(f"DB 연결 실패 (자격증 저장 기능 비활성화): {str(e)}")
    db_service = None

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


# ============== 자격증 데이터 수집 및 DB 저장 ==============

@router.post("/sync-to-db")
async def sync_certifications_to_db(series_code: str = None):
    """
    Q-net API에서 자격증 정보를 수집하여 데이터베이스에 저장

    - series_code: 특정 계열만 수집 (없으면 전체 계열 수집)
    """
    if not db_service:
        raise HTTPException(status_code=500, detail="데이터베이스 서비스가 비활성화되어 있습니다.")

    try:
        all_certifications = []
        series_to_fetch = [series_code] if series_code else list(SERIES_CODES.keys())

        results_summary = {}

        for code in series_to_fetch:
            try:
                result = await qnet_service.get_qualification_list(
                    series_code=code,
                    num_of_rows=500
                )

                if result.get("success"):
                    items = result.get("items", [])
                    # 계열 코드/이름 추가
                    for item in items:
                        item["seriesCode"] = code
                        item["seriesName"] = SERIES_CODES.get(code, "")
                    all_certifications.extend(items)
                    results_summary[code] = len(items)
                else:
                    results_summary[code] = 0
            except Exception as e:
                print(f"계열 {code} 조회 실패: {str(e)}")
                results_summary[code] = 0

        # DB에 저장
        saved_count = db_service.save_certifications(all_certifications)

        return {
            "success": True,
            "message": f"총 {saved_count}개의 자격증 정보가 저장되었습니다.",
            "totalCollected": len(all_certifications),
            "savedCount": saved_count,
            "bySeriesCode": results_summary
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 동기화 실패: {str(e)}")


@router.get("/db/certifications")
async def get_certifications_from_db(
    series_code: str = None,
    keyword: str = None,
    limit: int = 100,
    offset: int = 0
):
    """
    데이터베이스에서 자격증 정보 조회
    """
    if not db_service:
        raise HTTPException(status_code=500, detail="데이터베이스 서비스가 비활성화되어 있습니다.")

    try:
        certifications = db_service.get_certifications(
            series_code=series_code,
            keyword=keyword,
            limit=limit,
            offset=offset
        )
        total_count = db_service.count_certifications(series_code)

        return {
            "success": True,
            "totalCount": total_count,
            "items": certifications
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 조회 실패: {str(e)}")


@router.post("/db/seed-popular")
async def seed_popular_certifications():
    """
    주요 인기 자격증 데이터를 DB에 일괄 등록
    Q-net API가 불안정할 때 사용
    """
    if not db_service:
        raise HTTPException(status_code=500, detail="데이터베이스 서비스가 비활성화되어 있습니다.")

    # 주요 자격증 데이터 (IT, 전기전자, 경영, 건설 등)
    popular_certifications = [
        # IT/정보통신 (05)
        {"code": "1320", "name": "정보처리기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보기술"},
        {"code": "1321", "name": "정보처리산업기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보기술"},
        {"code": "1322", "name": "정보처리기능사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보기술"},
        {"code": "1323", "name": "정보보안기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보보안"},
        {"code": "1324", "name": "정보보안산업기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보보안"},
        {"code": "1325", "name": "빅데이터분석기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "데이터"},
        {"code": "1326", "name": "데이터분석전문가(ADP)", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "데이터"},
        {"code": "1327", "name": "데이터분석준전문가(ADsP)", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "데이터"},
        {"code": "1328", "name": "SQL개발자(SQLD)", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "데이터베이스"},
        {"code": "1329", "name": "SQL전문가(SQLP)", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "데이터베이스"},
        {"code": "1330", "name": "네트워크관리사1급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "네트워크"},
        {"code": "1331", "name": "네트워크관리사2급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "네트워크"},
        {"code": "1332", "name": "리눅스마스터1급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "시스템"},
        {"code": "1333", "name": "리눅스마스터2급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "시스템"},
        {"code": "1334", "name": "정보통신기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보통신"},
        {"code": "1335", "name": "정보통신산업기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "정보통신"},
        {"code": "1336", "name": "무선설비기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "무선통신"},
        {"code": "1337", "name": "전파통신기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "전파통신"},
        {"code": "1338", "name": "전파전자통신기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "전파통신"},
        {"code": "1339", "name": "방송통신기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "방송통신"},
        {"code": "1340", "name": "컴퓨터활용능력1급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "사무자동화"},
        {"code": "1341", "name": "컴퓨터활용능력2급", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "사무자동화"},
        {"code": "1342", "name": "워드프로세서", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "사무자동화"},
        {"code": "1343", "name": "웹디자인기능사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "웹디자인"},
        {"code": "1344", "name": "멀티미디어콘텐츠제작전문가", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "멀티미디어"},
        {"code": "1345", "name": "그래픽기술사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "그래픽"},
        {"code": "1346", "name": "전자계산기기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "전자계산"},
        {"code": "1347", "name": "전자계산기조직응용기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "전자계산"},
        {"code": "1348", "name": "임베디드기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "임베디드"},
        {"code": "1349", "name": "사무자동화산업기사", "seriesCode": "05", "seriesName": "정보통신", "obligFldName": "사무자동화"},

        # 전기전자 (06)
        {"code": "2001", "name": "전기기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전기"},
        {"code": "2002", "name": "전기산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전기"},
        {"code": "2003", "name": "전기기능사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전기"},
        {"code": "2004", "name": "전기공사기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전기공사"},
        {"code": "2005", "name": "전기공사산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전기공사"},
        {"code": "2006", "name": "전자기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전자"},
        {"code": "2007", "name": "전자산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전자"},
        {"code": "2008", "name": "전자기기기능사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전자"},
        {"code": "2009", "name": "전자계산기기능사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "전자"},
        {"code": "2010", "name": "반도체설계기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "반도체"},
        {"code": "2011", "name": "반도체설계산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "반도체"},
        {"code": "2012", "name": "전기철도기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "철도"},
        {"code": "2013", "name": "전기철도산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "철도"},
        {"code": "2014", "name": "승강기기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "승강기"},
        {"code": "2015", "name": "승강기산업기사", "seriesCode": "06", "seriesName": "전기전자", "obligFldName": "승강기"},

        # 경영/회계 (10)
        {"code": "3001", "name": "경영지도사", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "경영"},
        {"code": "3002", "name": "사회조사분석사1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "조사분석"},
        {"code": "3003", "name": "사회조사분석사2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "조사분석"},
        {"code": "3004", "name": "전산회계1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "회계"},
        {"code": "3005", "name": "전산회계2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "회계"},
        {"code": "3006", "name": "전산세무1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "세무"},
        {"code": "3007", "name": "전산세무2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "세무"},
        {"code": "3008", "name": "재경관리사", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "재무"},
        {"code": "3009", "name": "회계관리1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "회계"},
        {"code": "3010", "name": "회계관리2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "회계"},
        {"code": "3011", "name": "ERP정보관리사회계1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "ERP"},
        {"code": "3012", "name": "ERP정보관리사회계2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "ERP"},
        {"code": "3013", "name": "ERP정보관리사인사1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "ERP"},
        {"code": "3014", "name": "ERP정보관리사인사2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "ERP"},
        {"code": "3015", "name": "유통관리사1급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "유통"},
        {"code": "3016", "name": "유통관리사2급", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "유통"},
        {"code": "3017", "name": "물류관리사", "seriesCode": "10", "seriesName": "경영회계", "obligFldName": "물류"},

        # 건설/안전 (03)
        {"code": "4001", "name": "건축기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "건축"},
        {"code": "4002", "name": "건축산업기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "건축"},
        {"code": "4003", "name": "토목기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "토목"},
        {"code": "4004", "name": "토목산업기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "토목"},
        {"code": "4005", "name": "산업안전기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "안전"},
        {"code": "4006", "name": "산업안전산업기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "안전"},
        {"code": "4007", "name": "건설안전기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "안전"},
        {"code": "4008", "name": "건설안전산업기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "안전"},
        {"code": "4009", "name": "소방설비기사(전기)", "seriesCode": "03", "seriesName": "건설", "obligFldName": "소방"},
        {"code": "4010", "name": "소방설비기사(기계)", "seriesCode": "03", "seriesName": "건설", "obligFldName": "소방"},
        {"code": "4011", "name": "위험물산업기사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "위험물"},
        {"code": "4012", "name": "위험물기능사", "seriesCode": "03", "seriesName": "건설", "obligFldName": "위험물"},

        # 화학/환경 (04)
        {"code": "5001", "name": "화학분석기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "화학분석"},
        {"code": "5002", "name": "화공기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "화공"},
        {"code": "5003", "name": "환경기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},
        {"code": "5004", "name": "대기환경기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},
        {"code": "5005", "name": "수질환경기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},
        {"code": "5006", "name": "폐기물처리기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},
        {"code": "5007", "name": "소음진동기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},
        {"code": "5008", "name": "온실가스관리기사", "seriesCode": "04", "seriesName": "화학", "obligFldName": "환경"},

        # 식품/조리 (16)
        {"code": "6001", "name": "식품기사", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "식품"},
        {"code": "6002", "name": "식품산업기사", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "식품"},
        {"code": "6003", "name": "조리기능사(한식)", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "조리"},
        {"code": "6004", "name": "조리기능사(양식)", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "조리"},
        {"code": "6005", "name": "조리기능사(중식)", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "조리"},
        {"code": "6006", "name": "조리기능사(일식)", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "조리"},
        {"code": "6007", "name": "제과기능사", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "제과"},
        {"code": "6008", "name": "제빵기능사", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "제빵"},
        {"code": "6009", "name": "바리스타", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "음료"},
        {"code": "6010", "name": "위생사", "seriesCode": "16", "seriesName": "서비스", "obligFldName": "위생"},
    ]

    try:
        saved_count = db_service.save_certifications(popular_certifications)

        return {
            "success": True,
            "message": f"총 {saved_count}개의 인기 자격증이 등록되었습니다.",
            "totalProvided": len(popular_certifications),
            "savedCount": saved_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 등록 실패: {str(e)}")


@router.get("/db/count")
async def get_certification_count():
    """
    데이터베이스의 자격증 개수 조회
    """
    if not db_service:
        raise HTTPException(status_code=500, detail="데이터베이스 서비스가 비활성화되어 있습니다.")

    try:
        total = db_service.count_certifications()
        by_series = {}

        for code in SERIES_CODES.keys():
            count = db_service.count_certifications(series_code=code)
            if count > 0:
                by_series[code] = {
                    "name": SERIES_CODES[code],
                    "count": count
                }

        return {
            "success": True,
            "totalCount": total,
            "bySeriesCode": by_series
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자격증 카운트 조회 실패: {str(e)}")
