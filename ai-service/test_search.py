"""search_jobs 함수 직접 테스트"""
from dotenv import load_dotenv
load_dotenv()

from services.database_service import DatabaseService
import json

db = DatabaseService()

keyword = "백엔드"
limit = 10

query = """
    SELECT id, title, company, location, url, description,
           site_name, tech_stack, required_skills
    FROM job_listings
    WHERE (title ILIKE %s OR description ILIKE %s)
    AND crawled_at >= NOW() - INTERVAL '30 days'
    ORDER BY crawled_at DESC
    LIMIT %s
"""
pattern = f"%{keyword}%"

print(f"=== '{keyword}' 키워드로 검색 ===")
print(f"쿼리: {query}")
print(f"패턴: {pattern}")
print()

try:
    results = db.execute_query(query, (pattern, pattern, limit))
    print(f"검색 결과: {len(results)}개")
    print()

    for i, row in enumerate(results[:5]):
        print(f"[{i+1}] {row.get('title', 'N/A')[:50]}")
        print(f"    회사: {row.get('company', 'N/A')}")
        print(f"    사이트: {row.get('site_name', 'N/A')}")
        print()

except Exception as e:
    print(f"에러: {e}")
    import traceback
    traceback.print_exc()
