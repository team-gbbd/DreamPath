"""
Q-net API 관련 Pydantic 모델
"""
from pydantic import BaseModel
from typing import List, Optional


# ============== 자격증 기본 정보 ==============

class QualificationInfo(BaseModel):
    """국가기술자격 종목 정보"""
    code: Optional[str] = None  # 종목코드
    name: Optional[str] = None  # 종목명
    engName: Optional[str] = None  # 영문명
    seriesCode: Optional[str] = None  # 계열코드
    seriesName: Optional[str] = None  # 계열명
    obligFldName: Optional[str] = None  # 직무분야명
    implNm: Optional[str] = None  # 시행기관명
    instiNm: Optional[str] = None  # 출제기관명
    summary: Optional[str] = None  # 요약
    career: Optional[str] = None  # 관련 진로
    job: Optional[str] = None  # 직무내용
    trend: Optional[str] = None  # 동향
    hist: Optional[str] = None  # 변천이력


class QualificationListRequest(BaseModel):
    """자격증 목록 조회 요청"""
    seriesCode: Optional[str] = None  # 계열코드
    qualificationName: Optional[str] = None  # 자격명 (검색어)
    pageNo: int = 1
    numOfRows: int = 100


class QualificationListResponse(BaseModel):
    """자격증 목록 조회 응답"""
    success: bool
    message: Optional[str] = None
    totalCount: int = 0
    items: List[QualificationInfo] = []


# ============== 시험 일정 정보 ==============

class ExamScheduleInfo(BaseModel):
    """시험 일정 정보"""
    description: Optional[str] = None  # 설명 (예: 기사(2025년도 제1회))
    examCategory: Optional[str] = None  # 시험 카테고리 (기사/산업기사, 기능사, 서비스)
    # 필기 시험
    docRegStartDt: Optional[str] = None  # 필기 접수 시작일
    docRegEndDt: Optional[str] = None  # 필기 접수 종료일
    docExamDt: Optional[str] = None  # 필기 시험일
    docPassDt: Optional[str] = None  # 필기 합격 발표일
    docSubmitStartDt: Optional[str] = None  # 응시자격 서류제출 시작일
    docSubmitEndDt: Optional[str] = None  # 응시자격 서류제출 종료일
    # 실기 시험
    pracRegStartDt: Optional[str] = None  # 실기 접수 시작일
    pracRegEndDt: Optional[str] = None  # 실기 접수 종료일
    pracExamStartDt: Optional[str] = None  # 실기 시험 시작일
    pracExamEndDt: Optional[str] = None  # 실기 시험 종료일
    pracPassDt: Optional[str] = None  # 실기 합격 발표일


class ExamScheduleRequest(BaseModel):
    """시험 일정 조회 요청"""
    qualificationCode: Optional[str] = None  # 종목코드
    qualificationName: Optional[str] = None  # 자격명
    year: Optional[str] = None  # 시험년도
    pageNo: int = 1
    numOfRows: int = 50


class ExamScheduleResponse(BaseModel):
    """시험 일정 조회 응답"""
    success: bool
    message: Optional[str] = None
    totalCount: int = 0
    items: List[ExamScheduleInfo] = []


# ============== Q-net 컨텐츠 ==============

class QnetContentInfo(BaseModel):
    """Q-net 컨텐츠 정보"""
    ctsId: Optional[str] = None  # 컨텐츠 ID
    ctsNm: Optional[str] = None  # 컨텐츠명
    deptNm: Optional[str] = None  # 부서명
    pubYnCcd: Optional[str] = None  # 공개여부
    title: Optional[str] = None  # 제목


class QnetContentRequest(BaseModel):
    """Q-net 컨텐츠 조회 요청"""
    contentType: Optional[str] = None
    keyword: Optional[str] = None
    pageNo: int = 1
    numOfRows: int = 50


class QnetContentResponse(BaseModel):
    """Q-net 컨텐츠 조회 응답"""
    success: bool
    message: Optional[str] = None
    totalCount: int = 0
    items: List[QnetContentInfo] = []


# ============== 직업 기반 자격증 추천 ==============

class JobCertificationRequest(BaseModel):
    """직업 기반 자격증 추천 요청"""
    jobKeywords: List[str]  # 직업 관련 키워드


class JobCertificationResponse(BaseModel):
    """직업 기반 자격증 추천 응답"""
    success: bool
    message: Optional[str] = None
    totalCount: int = 0
    certifications: List[QualificationInfo] = []


# ============== 자격증 상세 + 시험 일정 통합 ==============

class CertificationDetailRequest(BaseModel):
    """자격증 상세 정보 요청"""
    qualificationName: str


class CertificationDetailResponse(BaseModel):
    """자격증 상세 정보 + 시험 일정 응답"""
    success: bool
    message: Optional[str] = None
    certification: Optional[QualificationInfo] = None
    examSchedules: List[ExamScheduleInfo] = []
