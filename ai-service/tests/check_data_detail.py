"""
데이터 상세 확인
"""
import psycopg2
from psycopg2.extras import RealDictCursor

config = {
    'host': 'aws-1-ap-northeast-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ssindowhjsowftiglvsz',
    'password': 'dreampath1118',
    'sslmode': 'require'
}

print("Connecting to Supabase...")
conn = psycopg2.connect(**config, cursor_factory=RealDictCursor)
cur = conn.cursor()

print("\n=== Total Count ===")
cur.execute("SELECT COUNT(*) as count FROM job_listings")
print(f"Total: {cur.fetchone()['count']}")

print("\n=== Count by Site ===")
cur.execute("""
    SELECT site_name, COUNT(*) as count 
    FROM job_listings 
    GROUP BY site_name
    ORDER BY count DESC
""")
for row in cur.fetchall():
    print(f"  {row['site_name']}: {row['count']}")

print("\n=== Recent 5 Records ===")
cur.execute("""
    SELECT id, site_name, job_id, title, company, created_at
    FROM job_listings
    ORDER BY created_at DESC
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"  [{row['id']}] {row['site_name']} - {row['title'][:50]}... ({row['company']})")

print("\n=== Check for Python keyword ===")
cur.execute("""
    SELECT COUNT(*) as count
    FROM job_listings
    WHERE search_keyword = 'python' OR title LIKE '%python%' OR title LIKE '%Python%'
""")
print(f"Python related: {cur.fetchone()['count']}")

cur.close()
conn.close()
print("\nDone!")

