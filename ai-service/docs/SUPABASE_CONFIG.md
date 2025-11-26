# Supabase 연결 설정 가이드

## 환경 변수 설정

Python AI Service를 실행하기 전에 환경 변수를 설정하세요.

### Windows (PowerShell)
```powershell
$env:DB_TYPE="postgres"
$env:DB_HOST="aws-1-ap-northeast-1.pooler.supabase.com"
$env:DB_PORT="5432"
$env:DB_NAME="postgres"
$env:DB_USER="postgres.ssindowhjsowftiglvsz"
$env:DB_PASSWORD="dreampath1118"
$env:DB_SSLMODE="require"
$env:OPENAI_API_KEY="your-openai-api-key"

# Python AI Service 실행
python main.py
```

### Linux/Mac (Bash)
```bash
export DB_TYPE=postgres
export DB_HOST=db.ssindownjsowftiglvsz.supabase.co
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=dreampath1118
export DB_SSLMODE=require
export OPENAI_API_KEY=your-openai-api-key

# Python AI Service 실행
python main.py
```

### .env 파일 사용 (추천)
`ai-service/.env` 파일 생성:
```env
DB_TYPE=postgres
DB_HOST=db.ssindownjsowftiglvsz.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=dreampath1118
DB_SSLMODE=require
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

## Backend (Spring Boot) 실행

### 방법 1: application-postgres.yml 사용 (이미 설정됨)
```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=postgres'
```

### 방법 2: 환경 변수로 실행
```bash
cd backend
SPRING_PROFILES_ACTIVE=postgres ./gradlew bootRun
```

## 연결 테스트

### 1. PostgreSQL 패키지 설치
```bash
cd ai-service
pip install psycopg2-binary
```

### 2. 연결 테스트
```python
import psycopg2

try:
    conn = psycopg2.connect(
        host="db.ssindowhjsowftiglvsz.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password="dreampath1118"
    )
    print("✅ Supabase 연결 성공!")
    conn.close()
except Exception as e:
    print(f"❌ 연결 실패: {e}")
```

## 주의사항

1. **보안**: 실제 배포 시에는 비밀번호를 환경 변수나 시크릿으로 관리하세요
2. **Connection Pooling**: 프로덕션에서는 port 6543 (Transaction mode) 사용 권장
3. **SSL**: Supabase는 SSL이 기본 활성화되어 있습니다

## 트러블슈팅

### 연결 실패 시
1. Supabase 대시보드에서 Database가 활성화되어 있는지 확인
2. Network Restrictions 확인 (모든 IP 허용되어 있는지)
3. 비밀번호 재확인

### 테이블 생성
서비스 시작 시 `job_listings` 테이블이 자동으로 생성됩니다.
수동으로 생성하려면:
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
```

