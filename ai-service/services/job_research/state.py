"""
LangGraph 상태 정의
"""

from typing import TypedDict, List, Dict, Optional, Any
from datetime import datetime


class JobPosting(TypedDict):
    """채용 공고 데이터"""
    id: str
    title: str
    company: str
    location: Optional[str]
    url: str
    description: str
    site_name: str  # wanted, saramin, jobkorea
    tech_stack: List[str]
    required_skills: List[str]
    experience: Optional[str]
    salary: Optional[str]
    crawled_at: str


class CertificationInfo(TypedDict):
    """자격증 정보"""
    name: str
    mention_count: int
    difficulty: str
    recommendation: str


class TechStackAnalysis(TypedDict):
    """기술 스택 분석"""
    name: str
    count: int
    percentage: float


class JobResearchState(TypedDict):
    """채용 리서치 상태"""
    # 입력
    keyword: str
    user_id: Optional[int]

    # 크롤링 결과
    job_postings: List[JobPosting]
    crawl_errors: List[str]

    # 분석 결과
    tech_stack_analysis: List[TechStackAnalysis]
    certifications: List[CertificationInfo]
    salary_analysis: Dict[str, Any]
    experience_distribution: Dict[str, int]
    company_stats: Dict[str, int]

    # AI 분석 결과
    ai_insights: str
    strategy_recommendations: List[str]

    # 리포트
    report_markdown: str
    report_path: str

    # 메타데이터
    created_at: str
    total_postings: int
    sites_crawled: List[str]
