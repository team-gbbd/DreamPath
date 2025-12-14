"""기존 saramin, jobkorea 크롤링 데이터 삭제 (일회성)"""
import sys
sys.path.insert(0, 'C:/Users/301/dev/qwer/DreamPath/ai-service')

from services.database_service import DatabaseService

db = DatabaseService()

# 삭제 전 개수 확인
results = db.execute_query("SELECT site_name, COUNT(*) as cnt FROM job_listings GROUP BY site_name")
print('삭제 전:')
for row in results:
    print(f'  {row["site_name"]}: {row["cnt"]}개')

# saramin, jobkorea 데이터 삭제 (with 구문 사용)
with db.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("DELETE FROM job_listings WHERE site_name IN ('saramin', 'jobkorea')")
    deleted = cursor.rowcount
    conn.commit()
    cursor.close()

print(f'\n삭제 완료: {deleted}개')

# 삭제 후 개수 확인
results = db.execute_query("SELECT site_name, COUNT(*) as cnt FROM job_listings GROUP BY site_name")
print('\n삭제 후:')
if results:
    for row in results:
        print(f'  {row["site_name"]}: {row["cnt"]}개')
else:
    print('  (데이터 없음)')

print('\n완료!')
