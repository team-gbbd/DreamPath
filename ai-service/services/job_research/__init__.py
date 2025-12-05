"""
채용 딥리서치 에이전트
- LangGraph 기반 워크플로우
- 원티드, 사람인, 잡코리아 크롤링
- MD 파일 리포트 생성
"""

from .graph import run_job_research, run_job_research_sync

__all__ = ["run_job_research", "run_job_research_sync"]
