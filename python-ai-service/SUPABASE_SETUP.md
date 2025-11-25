# Supabase 데이터베이스 설정 가이드

## 개요

이 프로젝트는 이미 Supabase를 사용할 수 있는 구조로 되어 있습니다. `database_service.py`가 PostgreSQL을 지원하며, Supabase는 PostgreSQL 기반이므로 환경 변수만 설정하면 바로 사용할 수 있습니다.

## 설정 방법

### 1단계: .env 파일 생성 또는 수정

`python-ai-service` 디렉토리에 `.env` 파일을 생성하거나, 기존 파일을 아래 내용으로 업데이트하세요:

```env
# Supabase Database 설정
DB_TYPE=postgres
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.ssindowhjsowftiglvsz
DB_PASSWORD=dreampath1118
DB_SSLMODE=require

# OpenAI API 설정
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**참고:** `.env.example` 파일을 복사하여 사용할 수도 있습니다:
```powershell
# PowerShell
Copy-Item .env.example .env

# Bash
cp .env.example .env
```

### 2단계: 필수 패키지 확인

Supabase 연결에 필요한 `psycopg2-binary` 패키지는 이미 `requirements.txt`에 포함되어 있습니다.

만약 설치되지 않았다면:
```bash
pip install psycopg2-binary
```

### 3단계: 서비스 실행

```bash
cd python-ai-service
python main.py
```

서비스가 시작되면 자동으로 다음 작업이 수행됩니다:
1. Supabase 데이터베이스에 연결
2. `job_listings` 테이블이 없으면 자동 생성
3. 필요한 인덱스 생성

## 테이블 구조

`job_listings` 테이블은 다음과 같은 구조로 자동 생성됩니다:

```sql
CREATE TABLE IF NOT EXISTS job_listings (
    id BIGSERIAL PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    site_url VARCHAR(500) NOT NULL,
    job_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    url VARCHAR(1000) NOT NULL,
    reward VARCHAR(255),
    experience VARCHAR(255),
    search_keyword VARCHAR(255),
    crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (site_name, job_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_site_name ON job_listings (site_name);
CREATE INDEX IF NOT EXISTS idx_search_keyword ON job_listings (search_keyword);
CREATE INDEX IF NOT EXISTS idx_company ON job_listings (company);
CREATE INDEX IF NOT EXISTS idx_crawled_at ON job_listings (crawled_at);
CREATE INDEX IF NOT EXISTS idx_site_job_id ON job_listings (site_name, job_id);
```

## 데이터베이스 기능

### 1. 채용 공고 저장

웹 크롤링 서비스(`web_crawler_service.py`)는 자동으로 크롤링한 채용 공고를 Supabase에 저장합니다:

```python
# 원티드 크롤링 예시
result = await web_crawler_service.crawl_wanted(
    search_keyword="백엔드 개발자",
    max_results=50
)
# 자동으로 Supabase에 저장됨
```

### 2. 채용 공고 조회

데이터베이스에서 저장된 채용 공고를 조회할 수 있습니다:

```python
# 특정 사이트의 공고 조회
job_listings = database_service.get_job_listings(
    site_name="원티드",
    search_keyword="개발자",
    limit=100,
    offset=0
)

# 전체 공고 개수 조회
total_count = database_service.count_job_listings(
    site_name="원티드",
    search_keyword="개발자"
)
```

### 3. API 엔드포인트

FastAPI를 통해 다음 엔드포인트를 사용할 수 있습니다:

#### 웹 크롤링 (자동으로 DB 저장)
```bash
POST /api/job-sites/crawl/wanted
{
  "searchKeyword": "백엔드 개발자",
  "maxResults": 50
}
```

#### DB 조회
```bash
POST /api/job-sites/listings/query
{
  "siteName": "원티드",
  "searchKeyword": "개발자",
  "limit": 100,
  "offset": 0
}
```

## 연결 테스트

Supabase 연결을 테스트하려면:

```bash
python test_supabase_connection.py
```

또는 직접 테스트:

```python
from services.database_service import DatabaseService

try:
    db = DatabaseService()
    print("✅ Supabase 연결 성공!")
    
    # 테스트 조회
    count = db.count_job_listings()
    print(f"저장된 채용 공고 수: {count}개")
except Exception as e:
    print(f"❌ 연결 실패: {e}")
```

## Supabase 대시보드에서 확인

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. **Table Editor** 메뉴에서 `job_listings` 테이블 확인
4. 저장된 데이터를 직접 확인하고 관리할 수 있습니다

## 주요 기능

### 중복 방지
- `(site_name, job_id)` UNIQUE 제약 조건으로 동일한 채용 공고가 중복 저장되지 않습니다
- 이미 존재하는 공고는 자동으로 건너뜁니다

### 캐싱
- 크롤링 결과는 메모리에 24시간 캐시됩니다
- 동시에 Supabase에도 영구 저장됩니다
- 캐시가 만료되면 자동으로 새로 크롤링합니다

### 자동 타임스탬프
- `crawled_at`: 크롤링 시간
- `created_at`: 데이터 생성 시간
- `updated_at`: 데이터 수정 시간 (자동 업데이트)

## 트러블슈팅

### 연결 실패
1. `.env` 파일의 DB 설정이 올바른지 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. 네트워크 방화벽 설정 확인

### SSL 오류
`.env` 파일에 다음 설정 추가:
```env
DB_SSLMODE=require
```

### 테이블 생성 실패
Supabase 대시보드의 SQL Editor에서 수동으로 테이블 생성:
```sql
-- SUPABASE_SETUP.md의 테이블 구조 참고
```

## 기존 MySQL에서 마이그레이션

기존에 MySQL을 사용하고 있었다면:

1. MySQL에서 데이터 백업
2. `.env` 파일에서 `DB_TYPE`을 `postgres`로 변경
3. Supabase 연결 정보 입력
4. 서비스 재시작 (테이블 자동 생성)
5. 필요시 데이터 마이그레이션 스크립트 실행

## 보안 권장사항

1. **비밀번호 관리**: 실제 배포 시에는 환경 변수나 시크릿 관리 도구 사용
2. **Connection Pooling**: 프로덕션에서는 Supabase의 Transaction mode (port 6543) 사용 권장
3. **Row Level Security (RLS)**: Supabase 대시보드에서 RLS 정책 설정 가능

## 성능 최적화

1. **인덱스 활용**: 자주 조회하는 컬럼에 인덱스가 자동으로 생성됩니다
2. **페이지네이션**: `limit`과 `offset`을 사용하여 페이지네이션 구현
3. **캐싱**: 메모리 캐시와 데이터베이스를 함께 활용하여 성능 최적화

## 지원

문제가 발생하면:
1. `SUPABASE_CONFIG.md` 참고
2. Supabase 공식 문서: https://supabase.com/docs
3. 프로젝트 이슈 트래커에 문의

