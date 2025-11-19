"""
직접 INSERT 테스트
"""
import psycopg2
from datetime import datetime

config = {
    'host': 'aws-1-ap-northeast-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ssindowhjsowftiglvsz',
    'password': 'dreampath1118',
    'sslmode': 'require'
}

print("Connecting to Supabase...")
conn = psycopg2.connect(**config)
cur = conn.cursor()

print("\n=== Inserting test job listing ===")
try:
    cur.execute("""
        INSERT INTO job_listings (
            site_name, site_url, job_id, title, company,
            location, url, crawled_at, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
    """, (
        '테스트',
        'https://test.com',
        'test123',
        '테스트 채용 공고',
        '테스트 회사',
        '서울',
        'https://test.com/job/test123',
        datetime.now(),
        datetime.now(),
        datetime.now()
    ))
    conn.commit()
    print("✅ INSERT 성공!")
    
    # 확인
    cur.execute("SELECT COUNT(*) FROM job_listings")
    count = cur.fetchone()[0]
    print(f"✅ Total rows: {count}")
    
except Exception as e:
    print(f"❌ INSERT 실패: {e}")
    conn.rollback()

cur.close()
conn.close()
print("\nDone!")

