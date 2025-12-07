"""
LangGraph 워크플로우 정의
"""

import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from langgraph.graph import StateGraph, END

from .state import JobResearchState
from .nodes import crawl_jobs, analyze_jobs, generate_report


def create_job_research_graph() -> StateGraph:
    """
    채용 리서치 그래프 생성

    워크플로우:
    1. crawl_jobs: 채용 공고 수집 (DB 또는 크롤링)
    2. analyze_jobs: 데이터 분석 (기술 스택, 자격증, 경력 등)
    3. generate_report: MD 리포트 생성
    """
    # 그래프 생성
    workflow = StateGraph(JobResearchState)

    # 노드 추가
    workflow.add_node("crawl", crawl_jobs)
    workflow.add_node("analyze", analyze_jobs)
    workflow.add_node("report", generate_report)

    # 엣지 정의 (순차 실행)
    workflow.set_entry_point("crawl")
    workflow.add_edge("crawl", "analyze")
    workflow.add_edge("analyze", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


# 싱글톤 그래프 인스턴스
_graph = None


def get_graph():
    """그래프 싱글톤"""
    global _graph
    if _graph is None:
        _graph = create_job_research_graph()
    return _graph


async def run_job_research(
    keyword: str,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    채용 리서치 실행 (비동기)

    Args:
        keyword: 검색 키워드 (예: "백엔드 개발자", "프론트엔드", "데이터 분석")
        user_id: 사용자 ID (선택)

    Returns:
        {
            "success": bool,
            "report_path": str,  # MD 파일 경로
            "report_markdown": str,  # MD 내용
            "total_postings": int,
            "error": str (실패 시)
        }
    """
    try:
        graph = get_graph()

        # 초기 상태
        initial_state: JobResearchState = {
            "keyword": keyword,
            "user_id": user_id,
            "job_postings": [],
            "crawl_errors": [],
            "tech_stack_analysis": [],
            "certifications": [],
            "salary_analysis": {},
            "experience_distribution": {},
            "company_stats": {},
            "ai_insights": "",
            "strategy_recommendations": [],
            "report_markdown": "",
            "report_path": "",
            "created_at": datetime.now().isoformat(),
            "total_postings": 0,
            "sites_crawled": []
        }

        # 그래프 실행
        result = await asyncio.to_thread(graph.invoke, initial_state)

        return {
            "success": True,
            "report_path": result.get("report_path", ""),
            "report_markdown": result.get("report_markdown", ""),
            "total_postings": result.get("total_postings", 0),
            "keyword": keyword
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def run_job_research_sync(
    keyword: str,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    채용 리서치 실행 (동기)

    Args:
        keyword: 검색 키워드
        user_id: 사용자 ID (선택)

    Returns:
        리서치 결과
    """
    try:
        graph = get_graph()

        # 초기 상태
        initial_state: JobResearchState = {
            "keyword": keyword,
            "user_id": user_id,
            "job_postings": [],
            "crawl_errors": [],
            "tech_stack_analysis": [],
            "certifications": [],
            "salary_analysis": {},
            "experience_distribution": {},
            "company_stats": {},
            "ai_insights": "",
            "strategy_recommendations": [],
            "report_markdown": "",
            "report_path": "",
            "created_at": datetime.now().isoformat(),
            "total_postings": 0,
            "sites_crawled": []
        }

        # 그래프 실행
        result = graph.invoke(initial_state)

        return {
            "success": True,
            "report_path": result.get("report_path", ""),
            "report_markdown": result.get("report_markdown", ""),
            "total_postings": result.get("total_postings", 0),
            "keyword": keyword
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


# CLI 테스트용
if __name__ == "__main__":
    import sys

    keyword = sys.argv[1] if len(sys.argv) > 1 else "백엔드 개발자"
    print(f"🔍 '{keyword}' 채용 리서치 시작...")

    result = run_job_research_sync(keyword)

    if result["success"]:
        print(f"✅ 리포트 생성 완료!")
        print(f"📄 파일: {result['report_path']}")
        print(f"📊 분석 공고 수: {result['total_postings']}건")
    else:
        print(f"❌ 오류: {result['error']}")
