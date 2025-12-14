"""
크롤링 노드 - 채용 공고 수집
현재는 DB에서 데이터를 가져오고, 추후 실제 크롤링으로 확장
"""

import json
from datetime import datetime
from typing import Dict, Any
from ..state import JobResearchState


def crawl_jobs(state: JobResearchState) -> Dict[str, Any]:
    """
    채용 공고 크롤링/수집 노드

    현재: DB에서 기존 데이터 조회
    TODO: 실제 크롤러 구현 (원티드, 사람인, 잡코리아)
    """
    keyword = state["keyword"]
    job_postings = []
    crawl_errors = []
    sites_crawled = []

    db = None
    try:
        # DB에서 채용 공고 조회
        from services.database_service import DatabaseService
        db = DatabaseService()

        query = """
            SELECT id, title, company, location, url, description,
                   site_name, tech_stack, required_skills, crawled_at
            FROM job_listings
            WHERE (title ILIKE %s OR description ILIKE %s)
            AND crawled_at >= NOW() - INTERVAL '7 days'
            ORDER BY crawled_at DESC
            LIMIT 100
        """
        pattern = f"%{keyword}%"
        results = db.execute_query(query, (pattern, pattern))

        for row in results:
            tech_stack = row[7]
            if tech_stack and isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack] if tech_stack else []

            required_skills = row[8]
            if required_skills and isinstance(required_skills, str):
                try:
                    required_skills = json.loads(required_skills)
                except:
                    required_skills = [required_skills] if required_skills else []

            job_postings.append({
                "id": str(row[0]),
                "title": row[1] or "",
                "company": row[2] or "",
                "location": row[3],
                "url": row[4] or "",
                "description": row[5] or "",
                "site_name": row[6] or "unknown",
                "tech_stack": tech_stack or [],
                "required_skills": required_skills or [],
                "experience": None,
                "salary": None,
                "crawled_at": row[9].isoformat() if row[9] else datetime.now().isoformat()
            })

            # 사이트별 집계
            site = row[6] or "unknown"
            if site not in sites_crawled:
                sites_crawled.append(site)

    except Exception as e:
        crawl_errors.append(f"DB 조회 오류: {str(e)}")
    finally:
        # DB 연결 정리 (연결 누수 방지)
        if db:
            db.cleanup()

    return {
        "job_postings": job_postings,
        "crawl_errors": crawl_errors,
        "sites_crawled": sites_crawled,
        "total_postings": len(job_postings)
    }
