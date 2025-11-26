"""
Supabase PostgreSQL 연결 테스트
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Supabase 연결 정보 (Connection Pooler)
config = {
    'host': 'aws-1-ap-northeast-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.ssindowhjsowftiglvsz',
    'password': 'dreampath1118',
    'sslmode': 'require'
}

print("=" * 60)
print("Supabase PostgreSQL 연결 테스트")
print("=" * 60)

try:
    # 연결 시도
    print("\n[*] 연결 중...")
    conn = psycopg2.connect(**config, cursor_factory=RealDictCursor)
    print("[OK] Supabase 연결 성공!")
    
    # 버전 확인
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"\n[INFO] PostgreSQL Version:")
    print(f"   {version['version'][:80]}...")
    
    # 기존 테이블 확인
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    
    print(f"\n[INFO] Existing Tables ({len(tables)} tables):")
    if tables:
        for table in tables:
            print(f"   - {table['table_name']}")
    else:
        print("   (No tables)")
    
    # job_listings 테이블 확인
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'job_listings'
    """)
    result = cursor.fetchone()
    
    if result['count'] > 0:
        print("\n[OK] job_listings table already exists.")
        
        # 데이터 개수 확인
        cursor.execute("SELECT COUNT(*) as count FROM job_listings")
        count = cursor.fetchone()
        print(f"   Saved job listings: {count['count']} items")
    else:
        print("\n[WARN] job_listings table does not exist.")
        print("   It will be created automatically when Python AI Service starts.")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("[OK] All tests passed!")
    print("=" * 60)
    print("\nNext Steps:")
    print("1. Run Backend: cd backend && ./gradlew bootRun --args='--spring.profiles.active=postgres'")
    print("2. Run Python AI Service: Set environment variables and run python main.py")
    print("   (See SUPABASE_CONFIG.md for details)")
    
except psycopg2.Error as e:
    print(f"\n[ERROR] Database connection failed:")
    print(f"   Error code: {e.pgcode}")
    print(f"   Error message: {e.pgerror}")
    print(f"   Full error: {str(e)}")
    print("\nSolutions:")
    print("1. Check if Database is active in Supabase dashboard")
    print("2. Check Network Restrictions (allow all IPs)")
    print("3. Verify password is correct")
    
except Exception as e:
    print(f"\n[ERROR] Error occurred: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()

