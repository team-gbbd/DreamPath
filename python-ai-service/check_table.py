"""
테이블 확인 스크립트
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

print("Connecting to Supabase...")
conn = psycopg2.connect(**config)
cur = conn.cursor()

print("\n=== Checking job_listings table ===")
cur.execute("""
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='job_listings'
""")
count = cur.fetchone()[0]
print(f"Table exists: {count > 0}")

if count > 0:
    print("\n=== Table Structure ===")
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='job_listings'
        ORDER BY ordinal_position
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")
    
    cur.execute("SELECT COUNT(*) FROM job_listings")
    row_count = cur.fetchone()[0]
    print(f"\n=== Row Count: {row_count} ===")

cur.close()
conn.close()
print("\nDone!")

