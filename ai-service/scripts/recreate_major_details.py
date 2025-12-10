"""
Supabase major_details 테이블 재생성 스크립트
- 기존 테이블 삭제
- TEXT 타입으로 재생성
- 데이터 재수집 가이드
"""

print("="*80)
print("major_details 테이블 재생성 가이드")
print("="*80)

# 1. 기존 테이블 삭제
print("\n[1단계] 기존 테이블 삭제")
drop_sql = "DROP TABLE IF EXISTS major_details CASCADE;"
print(f"SQL: {drop_sql}")
print("⚠️ Supabase Dashboard에서 직접 실행해주세요:")
print("   https://supabase.com/dashboard/project/YOUR_PROJECT/sql")

# 2. 새 테이블 생성 (TEXT 타입)
print("\n[2단계] 새 테이블 생성 (TEXT 타입)")
create_sql = """
CREATE TABLE IF NOT EXISTS major_details (
    major_id BIGINT PRIMARY KEY,
    major_name TEXT,
    summary TEXT,
    interest TEXT,
    property TEXT,
    job TEXT,
    salary TEXT,
    employment TEXT,
    raw_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""
print(f"SQL:\n{create_sql}")
print("⚠️ Supabase Dashboard에서 직접 실행해주세요")

# 3. 데이터 재수집
print("\n[3단계] 데이터 재수집")
print("테이블 생성 후, 다음 명령어 실행:")
print("  cd /Users/kkj/Desktop/DreamPath/ai-service")
print("  python3 -m services.ingest.ingest_career_major")
print("\n(참고: University 및 College 데이터를 모두 수집하도록 스크립트가 수정되었습니다.)")
print("="*80)
