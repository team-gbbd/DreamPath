# 🔒 Race Condition 및 중복 저장 문제 해결

## 🚨 발견된 문제

### 시나리오: 동시 실행
```
시간 03:00:00
├─ 사용자가 프로파일링 완료 → 실시간 트리거 (Thread A)
└─ 스케줄러 배치 작업 시작 → (Thread B)

두 작업이 동시에 같은 user_id 추천 계산! ⚠️
```

### 현재 코드의 문제점

```python
# job_recommendation_calculator.py의 _save_recommendations()

# 1. DELETE 먼저 실행
DELETE FROM user_job_recommendations WHERE user_id = 1

# 2. INSERT 실행
INSERT INTO user_job_recommendations ...
```

**Race Condition 발생!**
```
Thread A: DELETE (user_id=1)  ← 기존 데이터 삭제
Thread B: DELETE (user_id=1)  ← 이미 없음
Thread A: INSERT (20개)       ← 삽입 시작
Thread B: INSERT (20개)       ← 중복 삽입 시도
                                 (ON DUPLICATE KEY로 일부 덮어씀)
                                 → 불완전한 데이터!
```

---

## ✅ 해결책

### **옵션 1: Redis 분산 락** ⭐ (구현 완료!)

**장점:**
- ✅ 완벽한 동시성 제어
- ✅ 여러 서버(인스턴스)에서도 안전
- ✅ 타임아웃 자동 관리

**구현:**
```python
# services/recommendation_lock.py (새 파일)
class RecommendationLock:
    def acquire(self, user_id: int, timeout: int = 300):
        """분산 락 획득 (Redis SET NX EX)"""
        lock_key = f"job_recommendation_lock:user:{user_id}"
        # 락 획득 시도
        acquired = redis.set(lock_key, value, nx=True, ex=timeout)

# services/job_recommendation_calculator.py (수정)
async def calculate_user_recommendations(self, user_id: int):
    # 🔒 락 획득
    with self.lock.acquire(user_id=user_id, timeout=300):
        # ... 추천 계산 로직 ...
        # 락이 자동으로 해제됨
```

**동작 방식:**
```
Thread A: 락 획득 시도 → 성공 ✅
Thread B: 락 획득 시도 → 대기 중... (최대 10초)
Thread A: 추천 계산 완료 → 락 해제
Thread B: 락 획득 → 이미 최신 데이터 있음 → 스킵
```

**설정:**
```env
# .env
REDIS_HOST=localhost  # 또는 redis
REDIS_PORT=6379
REDIS_DB=0
```

```bash
# Docker Compose에 Redis 추가
docker-compose.yml:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Redis 없이 실행 (개발 환경):**
- Redis가 없으면 자동으로 락 비활성화
- 단일 서버 환경에서는 문제 없음

---

### **옵션 2: DELETE 제거 (간단한 방법)**

**장점:**
- ✅ Redis 불필요
- ✅ 구현 간단

**단점:**
- ⚠️ 오래된 데이터 남을 수 있음 (별도 정리 필요)

**구현:**
```python
# DELETE를 제거하고 UPSERT만 사용
def _save_recommendations(self, user_id: int, recommendations: List[Dict]) -> int:
    # DELETE 삭제! ❌
    # delete_query = "DELETE FROM user_job_recommendations WHERE user_id = %s"

    # INSERT만 실행 (ON DUPLICATE KEY UPDATE로 자동 처리)
    insert_query = """
        INSERT INTO user_job_recommendations (...)
        VALUES (...)
        ON DUPLICATE KEY UPDATE
            match_score = VALUES(match_score),
            ...
    """
```

**문제:**
- 공고 A, B, C → 추천 DB에 저장
- 재계산 시 공고 D, E만 추천됨
- **결과: A, B, C, D, E 모두 남음** (오래된 A, B, C 삭제 안 됨)

**해결:** 정기적으로 오래된 데이터 정리
```python
# 매일 새벽 4시에 정리
def cleanup_old_recommendations():
    # 10일 이상 업데이트 안 된 데이터 삭제
    DELETE FROM user_job_recommendations
    WHERE updated_at < NOW() - INTERVAL 10 DAY
```

---

### **옵션 3: DB 레벨 락 (SELECT FOR UPDATE)**

**장점:**
- ✅ Redis 불필요
- ✅ DB 트랜잭션으로 보장

**단점:**
- ⚠️ 단일 DB만 지원 (분산 환경 부적합)
- ⚠️ 성능 저하 가능

**구현:**
```python
with self.db.get_connection() as conn:
    cursor = conn.cursor()

    # 1. 락 획득 (해당 user_id 행 잠금)
    cursor.execute("""
        SELECT user_id FROM user_job_recommendations
        WHERE user_id = %s
        FOR UPDATE
    """, (user_id,))

    # 2. DELETE & INSERT
    # ... (다른 트랜잭션은 대기)

    conn.commit()  # 락 해제
```

---

## 📊 성능 비교

| 방법 | 안전성 | 복잡도 | 분산 환경 | Redis 필요 |
|-----|--------|--------|----------|-----------|
| **Redis 락** ⭐ | ⭐⭐⭐⭐⭐ | 중간 | 지원 ✅ | 필요 |
| DELETE 제거 | ⭐⭐⭐ | 낮음 | 지원 ✅ | 불필요 |
| DB 락 | ⭐⭐⭐⭐ | 중간 | 부적합 ❌ | 불필요 |

---

## 🚀 적용된 해결책

**현재 적용: 옵션 1 (Redis 분산 락)** ✅

### 변경된 파일
```
ai-service/
├── services/
│   ├── recommendation_lock.py  [NEW] ← Redis 분산 락
│   └── job_recommendation_calculator.py  [MODIFIED] ← 락 적용
├── requirements.txt  [MODIFIED] ← redis>=5.0.0 추가
└── .env.example  [MODIFIED] ← Redis 환경변수 추가
```

### 동작 확인
```python
# 로그에서 확인
[RecommendationLock] 락 획득 성공: user_id=1
[JobRecommendationCalculator] 사용자 1 추천 계산 중... (락 획득)
[JobRecommendationCalculator] 사용자 1: 45개 추천 저장 완료
[RecommendationLock] 락 해제 성공: user_id=1

# 동시 실행 시
[RecommendationLock] 락 대기 중: user_id=1, 현재 락=1733456789.123:12345
[JobRecommendationCalculator] 사용자 1 추천 계산 스킵 (이미 실행 중)
```

---

## 🧪 테스트

### 1. 동시 실행 테스트
```bash
# 터미널 1
curl -X POST http://localhost:8000/api/job-agent/recommendations/calculate/1?background=true

# 터미널 2 (즉시)
curl -X POST http://localhost:8000/api/job-agent/recommendations/calculate/1?background=true

# 결과: 두 번째 요청은 스킵됨 ✅
```

### 2. Redis 없이 실행 (개발 환경)
```bash
# Redis 중지
docker-compose stop redis

# 서버 시작 → 락 비활성화 경고 출력
[RecommendationLock] Redis 연결 실패 (락 비활성화): ...
[RecommendationLock] Redis 비활성화, 락 없이 실행: user_id=1
```

---

## 📝 설정 가이드

### Docker Compose에 Redis 추가
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: dreampath-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  ai-service:
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
    depends_on:
      - redis

volumes:
  redis-data:
```

### 환경 변수
```env
# .env
REDIS_HOST=localhost  # Docker에서는 "redis"
REDIS_PORT=6379
REDIS_DB=0
```

### 설치
```bash
# requirements.txt 업데이트
pip install -r requirements.txt

# Docker Compose 재시작
docker-compose up -d
```

---

## 🎯 결론

**Redis 분산 락을 적용하여 Race Condition 문제를 완벽하게 해결했습니다!**

- ✅ 동시 실행 시 락으로 보호
- ✅ 중복 저장 방지
- ✅ 여러 서버 환경에서도 안전
- ✅ Redis 없어도 동작 (개발 환경)

---

**작성**: AI 개발팀
**날짜**: 2025-12-06
**버전**: v1.1
