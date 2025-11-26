# Docker로 Supabase 사용하기

## 🚀 빠른 시작

### 1단계: .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하세요:

```bash
# .env.example 파일 복사
cp .env.example .env
```

`.env` 파일에 OpenAI API 키를 입력:
```env
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

### 2단계: Docker 빌드 및 실행

```bash
# Supabase 설정으로 빌드 및 실행
docker-compose -f docker-compose.supabase.yml up --build -d
```

### 3단계: 확인

```bash
# 컨테이너 상태 확인
docker-compose -f docker-compose.supabase.yml ps

# 로그 확인
docker-compose -f docker-compose.supabase.yml logs -f ai-service
```

서비스가 정상적으로 시작되면:
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:8080
- ✅ AI Service: http://localhost:8000

## 📋 docker-compose.supabase.yml 구조

```yaml
services:
  frontend:
    # React 프론트엔드
    ports: 3000:80

  backend:
    # Spring Boot 백엔드
    ports: 8080:8080
    environment:
      - SPRING_PROFILES_ACTIVE: postgres
      - DB_HOST: aws-1-ap-northeast-1.pooler.supabase.com
      - DB_PORT: 5432
      - DB_NAME: postgres
      - DB_USER: postgres.ssindowhjsowftiglvsz
      - DB_PASSWORD: dreampath1118

  ai-service:
    # Python AI 서비스
    ports: 8000:8000
    environment:
      - DB_TYPE: postgres
      - DB_HOST: aws-1-ap-northeast-1.pooler.supabase.com
      - DB_PORT: 5432
      - DB_NAME: postgres
      - DB_USER: postgres.ssindowhjsowftiglvsz
      - DB_PASSWORD: dreampath1118
      - DB_SSLMODE: require
```

## 🎯 자동으로 수행되는 작업

### Python AI Service 시작 시
1. Supabase 연결
2. `job_listings` 테이블 자동 생성 (없는 경우)
3. 필요한 인덱스 자동 생성
4. 웹 크롤링 서비스 시작

### 웹 크롤링 시
1. 채용 사이트 크롤링 (원티드, 잡코리아, 사람인)
2. 메모리 캐시 저장 (24시간)
3. **Supabase DB에 자동 저장** ✨
4. 중복 체크 (UNIQUE 제약)

## 🔍 작동 확인

### 1. 헬스 체크
```bash
curl http://localhost:8000/health
```

### 2. 웹 크롤링 테스트 (자동으로 Supabase에 저장)
```bash
curl -X POST http://localhost:8000/api/job-sites/crawl/wanted \
  -H "Content-Type: application/json" \
  -d '{"searchKeyword": "백엔드 개발자", "maxResults": 50}'
```

### 3. Supabase에서 데이터 확인
- [Supabase Dashboard](https://app.supabase.com) 접속
- Table Editor → `job_listings` 테이블 확인

### 4. API로 저장된 데이터 조회
```bash
curl -X POST http://localhost:8000/api/job-sites/listings/query \
  -H "Content-Type: application/json" \
  -d '{"siteName": "원티드", "limit": 10}'
```

## 🛠️ 주요 명령어

### 전체 재빌드
```bash
docker-compose -f docker-compose.supabase.yml up --build -d
```

### 특정 서비스만 재빌드
```bash
# AI Service만 재빌드
docker-compose -f docker-compose.supabase.yml up --build -d ai-service

# Backend만 재빌드
docker-compose -f docker-compose.supabase.yml up --build -d backend
```

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose -f docker-compose.supabase.yml logs -f

# AI Service 로그만
docker-compose -f docker-compose.supabase.yml logs -f ai-service

# Backend 로그만
docker-compose -f docker-compose.supabase.yml logs -f backend
```

### 중지 및 제거
```bash
# 중지
docker-compose -f docker-compose.supabase.yml stop

# 중지 및 컨테이너 제거
docker-compose -f docker-compose.supabase.yml down

# 볼륨까지 제거 (주의: 데이터 삭제됨)
docker-compose -f docker-compose.supabase.yml down -v
```

### 컨테이너 내부 접속
```bash
# AI Service 컨테이너 접속
docker exec -it dreampath-ai-service bash

# Backend 컨테이너 접속
docker exec -it dreampath-backend bash
```

## 📊 데이터 흐름

```
┌─────────────────┐
│   Frontend      │
│  (Port 3000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Backend      │
│  (Port 8080)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  AI Service     │─────▶│  Supabase DB     │
│  (Port 8000)    │      │  (PostgreSQL)    │
└─────────────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Job Sites      │
│  (원티드, 잡코리아, │
│   사람인)        │
└─────────────────┘
```

## 🔒 보안 권장사항

### 프로덕션 환경
1. **.env 파일 관리**
   - `.env` 파일을 Git에 커밋하지 마세요
   - 환경별로 다른 `.env` 파일 사용

2. **비밀번호 변경**
   - Supabase 대시보드에서 DB 비밀번호 변경
   - `docker-compose.supabase.yml` 업데이트

3. **네트워크 격리**
   ```yaml
   networks:
     dreampath-network:
       driver: bridge
   ```

## ❓ 문제 해결

### 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker-compose -f docker-compose.supabase.yml logs ai-service

# 컨테이너 상태 확인
docker-compose -f docker-compose.supabase.yml ps
```

### Supabase 연결 실패
1. 네트워크 연결 확인
2. Supabase 대시보드에서 Database 활성 상태 확인
3. DB 비밀번호 확인

### 테이블이 생성되지 않음
컨테이너 로그를 확인하여 에러 메시지 확인:
```bash
docker-compose -f docker-compose.supabase.yml logs ai-service | grep -i error
```

### 포트 충돌
다른 서비스가 포트를 사용 중인 경우:
```yaml
# docker-compose.supabase.yml에서 포트 변경
ports:
  - "8001:8000"  # 8001로 변경
```

## 📖 관련 문서

- `ai-service/QUICK_START.md` - 로컬 개발 가이드
- `ai-service/SUPABASE_SETUP.md` - 상세 설정 가이드
- `ai-service/SUPABASE_CONFIG.md` - 기존 설정 문서

## 🎉 완료!

이제 Docker로 Supabase를 사용하여 전체 시스템을 실행할 수 있습니다!

**한 번만 빌드하면 끝:**
```bash
docker-compose -f docker-compose.supabase.yml up --build -d
```

**재시작:**
```bash
docker-compose -f docker-compose.supabase.yml restart
```

모든 크롤링 데이터가 자동으로 Supabase에 저장됩니다! 🚀

