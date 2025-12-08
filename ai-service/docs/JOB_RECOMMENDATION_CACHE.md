# 채용공고 추천 캐싱 시스템

백그라운드에서 미리 채용공고 추천을 계산하여 빠른 응답을 제공하는 시스템입니다.

## 📋 목차
- [개요](#개요)
- [시스템 구조](#시스템-구조)
- [설치 및 설정](#설치-및-설정)
- [API 사용법](#api-사용법)
- [테스트 방법](#테스트-방법)
- [FAQ](#faq)

---

## 개요

### 문제점
기존에는 사용자가 채용공고 페이지에 접속할 때마다 AI 에이전트를 실행하여 추천을 계산했습니다.
- **느린 응답 시간**: AI 모델 실행에 5-10초 소요
- **API 비용 증가**: 매번 Claude API 호출
- **서버 부하**: 동시 사용자 증가 시 성능 저하

### 해결 방법
백그라운드에서 **미리 추천을 계산**하고 DB에 저장하여, 사용자가 접속하면 즉시 조회합니다.
- **빠른 응답**: DB 조회만 하므로 50-100ms 이내
- **비용 절감**: 하루 1회만 AI 실행
- **성능 향상**: 동시 사용자 수에 무관

---

## 시스템 구조

```
┌───────────────────────────────────────────────────────────────┐
│                  실시간 트리거 (중요!)                         │
│  사용자 프로파일링 완료 → 즉시 추천 계산 ⚡                    │
└───────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────┐
    │ 1. 커리어 분석 완료                  │
    │    (Backend CareerAnalysisService)  │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 2. 추천 계산 API 호출 (비동기)      │
    │    POST /calculate/{user_id}?background=true
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 3. AI 에이전트 실행                  │
    │    (사용자 프로필 + 채용공고 매칭)   │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 4. DB 저장 (user_job_recommendations)│
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 5. 사용자 접속 시 즉시 조회 가능!   │
    │    GET /recommendations/fast/{user_id}
    └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              백그라운드 스케줄러 (매일 새벽 3시)         │
│              모든 사용자 추천 재계산                      │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴─────────────────┐
         │                                   │
    ┌────▼─────┐                       ┌────▼─────┐
    │ 크롤링    │                       │ 추천 계산 │
    │ (신규공고)│                       │ (AI 실행) │
    └────┬─────┘                       └────┬─────┘
         │                                   │
         │          ┌────────────────────────┘
         │          │
         ▼          ▼
    ┌─────────────────┐
    │  MySQL/Postgres │
    │  ┌───────────┐  │
    │  │job_listings│ │
    │  └───────────┘  │
    │  ┌───────────┐  │
    │  │user_job_  │  │
    │  │recommendations│
    │  └───────────┘  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  FastAPI        │
    │  GET /recommendations/fast/{user_id}
    │  (50-100ms 응답)│
    └─────────────────┘
```

---

## 설치 및 설정

### 1. 데이터베이스 마이그레이션

새로운 테이블 `user_job_recommendations`을 생성합니다.

```bash
# ai-service 디렉토리에서 실행
cd ai-service
python db/run_migrations.py
```

**수동 실행 (선택사항)**
```bash
# MySQL
mysql -u dreamuser -p dreampath < db/migrations/002_create_user_job_recommendations_table.sql

# PostgreSQL (Supabase)
psql -U postgres -d dreampath -f db/migrations/002_create_user_job_recommendations_table.sql
```

### 2. 환경 변수 확인

`.env` 파일에 다음 설정이 있는지 확인:

```env
# 스케줄러 활성화 여부
SCHEDULER_ENABLED=true

# 데이터베이스 설정
DB_TYPE=mysql  # 또는 postgres
DB_HOST=localhost
DB_PORT=3306
DB_USER=dreamuser
DB_PASSWORD=dreampass
DB_NAME=dreampath
```

### 3. 서버 재시작

스케줄러가 자동으로 시작됩니다.

```bash
# Docker Compose 사용 시
docker-compose restart ai-service

# 직접 실행 시
python main.py
```

---

## API 사용법

### 1. 빠른 추천 조회 (캐시된 데이터)

**엔드포인트**: `GET /api/job-agent/recommendations/fast/{user_id}`

**파라미터**:
- `user_id` (path): 사용자 ID
- `limit` (query, optional): 조회 개수 (기본값: 20, 최대: 100)
- `min_score` (query, optional): 최소 매칭 점수 (기본값: 0, 범위: 0-100)

**예시 요청**:
```bash
# 기본 요청
curl http://localhost:8000/api/job-agent/recommendations/fast/1

# 매칭 점수 70 이상, 최대 10개
curl "http://localhost:8000/api/job-agent/recommendations/fast/1?limit=10&min_score=70"
```

**응답 예시**:
```json
{
  "success": true,
  "recommendations": [
    {
      "id": 12345,
      "title": "백엔드 개발자 (Python/FastAPI)",
      "company": "드림컴퍼니",
      "location": "서울 강남구",
      "url": "https://...",
      "description": "...",
      "siteName": "원티드",
      "techStack": ["Python", "FastAPI", "PostgreSQL"],
      "matchScore": 92.5,
      "matchReason": "귀하의 Python 경험과 FastAPI 기술이 잘 매칭됩니다."
    }
  ],
  "totalCount": 20,
  "cached": true,
  "calculatedAt": "2025-12-06T03:30:00Z"
}
```

### 2. 추천 재계산 (수동 트리거)

**엔드포인트**: `POST /api/job-agent/recommendations/calculate/{user_id}`

커리어 분석이 업데이트되었을 때 수동으로 추천을 재계산합니다.

**예시 요청**:
```bash
curl -X POST http://localhost:8000/api/job-agent/recommendations/calculate/1
```

**응답 예시**:
```json
{
  "success": true,
  "message": "사용자 1의 추천이 계산되었습니다.",
  "savedCount": 45,
  "userId": 1
}
```

### 3. 기존 API (실시간 계산)

기존 API는 그대로 사용 가능합니다.

```bash
# 채팅 방식 (AI 에이전트 실행)
curl -X POST http://localhost:8000/api/job-agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "백엔드 개발자 추천해줘", "user_id": 1}'
```

---

## 테스트 방법

### 1. 마이그레이션 확인

테이블이 정상적으로 생성되었는지 확인:

```sql
-- MySQL
SHOW TABLES LIKE 'user_job_recommendations';
DESCRIBE user_job_recommendations;

-- PostgreSQL
\dt user_job_recommendations
\d user_job_recommendations
```

### 2. 수동 추천 계산 테스트

특정 사용자의 추천을 수동으로 계산:

```bash
curl -X POST http://localhost:8000/api/job-agent/recommendations/calculate/1
```

### 3. 캐시된 추천 조회 테스트

계산된 추천 조회:

```bash
curl http://localhost:8000/api/job-agent/recommendations/fast/1
```

### 4. 스케줄러 수동 실행

전체 사용자 추천 계산:

```bash
curl -X POST http://localhost:8000/api/scheduler/trigger
```

---

## FAQ

### Q1: 추천이 언제 업데이트되나요?
**A**:
1. **실시간**: 커리어 분석(성향 프로파일링) 완료 시 자동으로 계산됩니다. ⚡
2. **정기**: 매일 새벽 3시에 크롤링 후 전체 재계산됩니다.
3. **수동**: API를 통해 언제든지 재계산 가능합니다.

### Q2: 캐시된 데이터가 없으면 어떻게 되나요?
**A**: 빈 리스트를 반환합니다. 프론트엔드에서 이 경우 수동 계산을 트리거하거나 기존 API를 사용할 수 있습니다.

```javascript
// 프론트엔드 예시
const response = await fetch(`/api/job-agent/recommendations/fast/${userId}`);
const data = await response.json();

if (data.totalCount === 0 && !data.cached) {
  // 캐시 없음 → 수동 계산 트리거
  await fetch(`/api/job-agent/recommendations/calculate/${userId}`, { method: 'POST' });

  // 잠시 후 다시 조회
  setTimeout(async () => {
    const newData = await fetch(`/api/job-agent/recommendations/fast/${userId}`);
    // ...
  }, 3000);
}
```

### Q3: 스케줄러를 비활성화하려면?
**A**: `.env` 파일에서 `SCHEDULER_ENABLED=false`로 설정하고 서버를 재시작합니다.

### Q4: 특정 사용자만 추천을 재계산하려면?
**A**: `POST /api/job-agent/recommendations/calculate/{user_id}` API를 사용합니다.

### Q5: 오래된 추천 데이터는 자동으로 삭제되나요?
**A**: 현재는 덮어쓰기 방식입니다. 필요시 `JobRecommendationCalculator.cleanup_old_recommendations(days=30)` 함수를 스케줄러에 추가할 수 있습니다.

### Q6: 성능은 얼마나 개선되나요?
**A**:
- **기존**: AI 실행 5-10초
- **개선**: DB 조회 50-100ms
- **약 50-100배 빠름!**

### Q7: AI 비용은 얼마나 절감되나요?
**A**:
- **기존**: 사용자 접속마다 API 호출 (1000회/일 = $50/일)
- **개선**: 하루 1회 배치 실행 (100명 × 1회 = $5/일)
- **약 90% 비용 절감!**

---

## 추가 개선 사항 (선택)

### 1. 실시간 트리거 추가

커리어 분석 완료 시 자동으로 추천 계산:

```python
# routers/analysis.py 등에서
from services.job_recommendation_calculator import calculate_user_recommendations_sync

@router.post("/career-analysis")
async def analyze_career(user_id: int):
    # ... 커리어 분석 실행 ...

    # 분석 완료 후 백그라운드에서 추천 계산
    import threading
    threading.Thread(
        target=calculate_user_recommendations_sync,
        args=(user_id,)
    ).start()

    return result
```

### 2. 캐시 만료 시간 추가

오래된 추천 자동 삭제:

```python
# scheduler.py
scheduler.add_job(
    lambda: JobRecommendationCalculator().cleanup_old_recommendations(days=30),
    CronTrigger(hour=4, minute=0),  # 새벽 4시에 정리
    id="cleanup_old_recommendations"
)
```

### 3. 모니터링 대시보드

추천 계산 현황 확인:

```python
@router.get("/recommendations/stats")
async def get_recommendation_stats():
    db = DatabaseService()
    query = """
        SELECT
            COUNT(DISTINCT user_id) as total_users,
            COUNT(*) as total_recommendations,
            AVG(match_score) as avg_score,
            MAX(calculated_at) as last_calculated
        FROM user_job_recommendations
    """
    result = db.execute_query(query)
    return result[0]
```

---

## 문의 및 지원

문제가 발생하면 다음을 확인해주세요:
1. 데이터베이스 연결 상태
2. 스케줄러 활성화 여부 (`SCHEDULER_ENABLED`)
3. 로그 파일 (`ai-service.log`)
4. 커리어 분석 데이터 존재 여부

추가 질문은 개발팀에 문의하세요.
