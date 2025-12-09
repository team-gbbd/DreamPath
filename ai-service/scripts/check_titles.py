"""DB 제목 확인"""
import sys
sys.path.insert(0, 'C:/Users/301/dev/qwer/DreamPath/ai-service')
from dotenv import load_dotenv
load_dotenv('C:/Users/301/dev/qwer/DreamPath/ai-service/.env')
from services.database_service import DatabaseService

db = DatabaseService()
results = db.execute_query('SELECT site_name, title, company FROM job_listings ORDER BY created_at DESC LIMIT 15')
print("=== 최근 저장된 채용 공고 ===\n")
for i, r in enumerate(results, 1):
    site = r["site_name"]
    title = r["title"][:60] if r["title"] else "(없음)"
    company = r["company"][:30] if r["company"] else "(없음)"
    print(f"{i}. [{site}]")
    print(f"   제목: {title}")
    print(f"   회사: {company}")
    print()
