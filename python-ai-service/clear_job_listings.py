"""
job_listings 테이블의 모든 데이터 삭제
"""
import psycopg2

config = {
    'host': 'aws-1-ap-northeast-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ssindowhjsowftiglvsz',
    'password': 'dreampath1118',
    'sslmode': 'require'
}

print("Supabase 연결 중...")
conn = psycopg2.connect(**config)
cur = conn.cursor()

# 삭제 전 개수 확인
cur.execute("SELECT COUNT(*) FROM job_listings")
before_count = cur.fetchone()[0]
print(f"\n삭제 전 공고 수: {before_count}개")

# 모든 데이터 삭제
if before_count > 0:
    print("\n모든 공고를 삭제하는 중...")
    cur.execute("DELETE FROM job_listings")
    conn.commit()
    
    # 삭제 후 확인
    cur.execute("SELECT COUNT(*) FROM job_listings")
    after_count = cur.fetchone()[0]
    print(f"삭제 후 공고 수: {after_count}개")
    print(f"✅ {before_count}개의 공고가 삭제되었습니다!")
else:
    print("삭제할 공고가 없습니다.")

cur.close()
conn.close()
print("\n완료!")

