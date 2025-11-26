# Supabase 빠른 시작 가이드

## 🚀 3단계로 Supabase DB 설정하기

현재 프로젝트는 이미 Supabase를 사용할 수 있는 구조로 되어 있습니다!

### 방법 1: 자동 설정 스크립트 사용 (추천)

#### Windows (PowerShell)
```powershell
cd ai-service
.\setup_supabase_env.ps1
```

#### Linux/Mac (Bash)
```bash
cd ai-service
chmod +x setup_supabase_env.sh
./setup_supabase_env.sh
```

### 방법 2: 수동으로 .env 파일 생성

`ai-service/.env` 파일을 생성하고 다음 내용을 입력하세요:

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
OPENAI_API_KEY=여기에_OpenAI_API_키를_입력하세요
OPENAI_MODEL=gpt-4o-mini
```

### 연결 테스트

```bash
cd ai-service
python test_supabase_connection.py
```

### 서비스 실행

```bash
cd ai-service
python main.py
```

서비스가 시작되면:
- ✅ Supabase에 자동 연결
- ✅ `job_listings` 테이블 자동 생성
- ✅ 필요한 인덱스 자동 생성

## 📊 작동 확인

### 1. 웹 크롤링 테스트 (자동으로 Supabase에 저장됨)

API 호출:
```bash
curl -X POST http://localhost:8000/api/job-sites/crawl/wanted \
  -H "Content-Type: application/json" \
  -d '{"searchKeyword": "백엔드 개발자", "maxResults": 50}'
```

### 2. Supabase에서 데이터 확인

- [Supabase Dashboard](https://app.supabase.com) 접속
- 프로젝트 선택
- **Table Editor** → `job_listings` 테이블 확인

### 3. API로 저장된 데이터 조회

```bash
curl -X POST http://localhost:8000/api/job-sites/listings/query \
  -H "Content-Type: application/json" \
  -d '{"siteName": "원티드", "limit": 10}'
```

## 🎯 주요 기능

### 자동 저장
웹 크롤링을 실행하면 자동으로 Supabase에 저장됩니다:
- ✅ 원티드 크롤링 → 자동 저장
- ✅ 잡코리아 크롤링 → 자동 저장
- ✅ 사람인 크롤링 → 자동 저장

### 중복 방지
동일한 채용 공고는 자동으로 건너뜁니다 (UNIQUE 제약).

### 캐싱
- 메모리 캐시: 24시간
- DB 저장: 영구 보관

## 📖 상세 문서

더 자세한 정보는 다음 문서를 참고하세요:
- `SUPABASE_SETUP.md` - 상세 설정 가이드
- `SUPABASE_CONFIG.md` - 기존 설정 문서
- `README.md` - 프로젝트 전체 문서

## ❓ 문제 해결

### 연결 실패
1. `.env` 파일이 `ai-service` 디렉토리에 있는지 확인
2. Supabase 대시보드에서 Database가 활성 상태인지 확인
3. 네트워크 방화벽 설정 확인

### 패키지 설치
```bash
pip install -r requirements.txt
```

### 테이블이 생성되지 않음
수동으로 생성:
```sql
-- Supabase Dashboard → SQL Editor에서 실행
-- SUPABASE_SETUP.md의 테이블 생성 SQL 참고
```

## 🎉 완료!

이제 Supabase를 사용하여 채용 공고 데이터를 저장하고 관리할 수 있습니다!

