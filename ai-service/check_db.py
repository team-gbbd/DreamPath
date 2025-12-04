"""DB 채용공고 현황 확인 스크립트"""
from dotenv import load_dotenv
load_dotenv()

from services.database_service import DatabaseService

db = DatabaseService()

# 전체 공고 수
total = db.execute_query('SELECT COUNT(*) as cnt FROM job_listings')
print(f'=== 전체 채용공고 수: {total[0]["cnt"]}개 ===')

# 30일 이내 공고 수
recent = db.execute_query("SELECT COUNT(*) as cnt FROM job_listings WHERE crawled_at >= NOW() - INTERVAL '30 days'")
print(f'30일 이내 공고: {recent[0]["cnt"]}개')

# 사이트별 공고 수
sites = db.execute_query('SELECT site_name, COUNT(*) as cnt FROM job_listings GROUP BY site_name')
print(f'\n=== 사이트별 공고 수 ===')
for site in sites:
    print(f'  {site["site_name"]}: {site["cnt"]}개')

# 최근 크롤링 날짜
dates = db.execute_query('SELECT MAX(crawled_at) as max_date, MIN(crawled_at) as min_date FROM job_listings')
print(f'\n=== 크롤링 날짜 ===')
print(f'최신: {dates[0]["max_date"]}')
print(f'가장 오래된: {dates[0]["min_date"]}')

# 샘플 공고 5개
samples = db.execute_query('SELECT title, company, site_name FROM job_listings ORDER BY crawled_at DESC LIMIT 5')
print(f'\n=== 최근 공고 샘플 ===')
for s in samples:
    title = (s["title"] or "N/A")[:40]
    company = s["company"] or "N/A"
    site = s["site_name"] or "N/A"
    print(f'  - {title} | {company} | {site}')

# 키워드별 공고 수
keywords = ['백엔드', '프론트엔드', '데이터', 'Python', 'Java', '개발']
print(f'\n=== 키워드별 공고 수 ===')
for kw in keywords:
    count = db.execute_query(f"SELECT COUNT(*) as cnt FROM job_listings WHERE title ILIKE '%{kw}%' OR description ILIKE '%{kw}%'")
    print(f'  {kw}: {count[0]["cnt"]}개')
