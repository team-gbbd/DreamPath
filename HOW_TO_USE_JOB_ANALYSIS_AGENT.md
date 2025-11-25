# 채용 공고 분석 AI 에이전트 사용 가이드

## 개요

채용 공고 분석 AI 에이전트는 DB에 저장된 채용 공고를 AI로 분석하여 다음과 같은 인사이트를 제공합니다:

- **시장 트렌드 분석**: 채용 동향, 인기 기업/지역, 트렌딩 스킬
- **스킬 요구사항 분석**: 필수/우대 스킬, 경력 요구사항
- **연봉 트렌드 분석**: 연봉 범위, 복리후생
- **맞춤형 인사이트**: 사용자 프로필 기반 스킬 갭 분석 및 학습 경로 추천
- **채용 공고 비교**: 여러 공고의 장단점 비교

## 사용 방법

### 1단계: Python AI Service 시작

```bash
cd python-ai-service
python main.py
```

서비스는 `http://localhost:8000`에서 실행됩니다.

### 2단계: 채용 공고 데이터 수집 (크롤링)

분석하려면 먼저 채용 공고 데이터가 DB에 있어야 합니다.

**간단한 크롤링 스크립트 실행:**

```bash
python crawl_jobs_simple.py
```

**또는 API 직접 호출:**

```bash
curl -X POST http://localhost:8000/api/job-sites/crawl/wanted \
  -H "Content-Type: application/json" \
  -d '{
    "searchKeyword": "개발자",
    "maxResults": 20,
    "forceRefresh": true
  }'
```

여러 키워드로 크롤링하는 것을 권장합니다:
- "개발자", "백엔드", "프론트엔드", "데이터 분석", "디자이너" 등

### 3단계: 분석 에이전트 사용

**방법 1: 테스트 스크립트 사용**

```bash
python use_job_analysis_agent.py
```

**방법 2: API 직접 호출**

#### A. 시장 트렌드 분석

```bash
curl -X POST http://localhost:8000/api/job-analysis/market-trends \
  -H "Content-Type: application/json" \
  -d '{
    "careerField": "개발자",
    "days": 30
  }'
```

응답 예시:
```json
{
  "success": true,
  "period": "최근 30일",
  "careerField": "개발자",
  "totalJobs": 150,
  "topCompanies": [
    {"name": "네이버", "count": 25},
    {"name": "카카오", "count": 20}
  ],
  "topLocations": [
    {"name": "서울", "count": 100},
    {"name": "경기", "count": 30}
  ],
  "trendingSkills": ["Python", "React", "Kubernetes"],
  "growingFields": ["백엔드 개발", "데이터 엔지니어링"],
  "summary": "...",
  "insights": ["..."]
}
```

#### B. 스킬 요구사항 분석

```bash
curl -X POST http://localhost:8000/api/job-analysis/skill-requirements \
  -H "Content-Type: application/json" \
  -d '{
    "careerField": "백엔드 개발자",
    "days": 30
  }'
```

응답 예시:
```json
{
  "success": true,
  "careerField": "백엔드 개발자",
  "analyzedJobs": 50,
  "requiredSkills": [
    {
      "skill": "Java",
      "frequency": "높음",
      "importance": "필수"
    },
    {
      "skill": "Spring Boot",
      "frequency": "높음",
      "importance": "필수"
    }
  ],
  "preferredSkills": ["Docker", "Kubernetes", "AWS"],
  "emergingSkills": ["GraphQL", "gRPC"],
  "experienceLevel": {
    "entry": "0-2년",
    "mid": "3-5년",
    "senior": "5년+"
  },
  "recommendations": ["..."]
}
```

#### C. 연봉 트렌드 분석

```bash
curl -X POST http://localhost:8000/api/job-analysis/salary-trends \
  -H "Content-Type: application/json" \
  -d '{
    "careerField": "개발자",
    "days": 30
  }'
```

#### D. 맞춤형 인사이트

```bash
curl -X POST http://localhost:8000/api/job-analysis/personalized-insights \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "skills": ["Python", "FastAPI", "React"],
      "experience": "2년차 주니어 개발자"
    },
    "careerAnalysis": {
      "recommendedCareers": [
        {
          "careerName": "백엔드 개발자",
          "description": "서버 개발",
          "matchScore": 85,
          "reasons": ["Python 경험"]
        }
      ]
    }
  }'
```

응답 예시:
```json
{
  "success": true,
  "insights": [
    {
      "careerName": "백엔드 개발자",
      "jobCount": 50,
      "gapAnalysis": ["Kubernetes 경험 부족", "대규모 트래픽 처리 경험"],
      "learningPath": [
        "Docker 심화 학습",
        "Kubernetes 기초",
        "대용량 시스템 설계"
      ],
      "competitiveness": "중",
      "recommendations": ["..."]
    }
  ],
  "overallRecommendation": "..."
}
```

#### E. 채용 공고 비교

```bash
curl -X POST http://localhost:8000/api/job-analysis/compare-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": [1, 2, 3]
  }'
```

## API 엔드포인트 요약

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/job-analysis/market-trends` | POST | 시장 트렌드 분석 |
| `/api/job-analysis/skill-requirements` | POST | 스킬 요구사항 분석 |
| `/api/job-analysis/salary-trends` | POST | 연봉 트렌드 분석 |
| `/api/job-analysis/personalized-insights` | POST | 맞춤형 인사이트 |
| `/api/job-analysis/compare-jobs` | POST | 채용 공고 비교 |

## 주의사항

### DB 연결 설정

Python AI Service는 기본적으로 다음 환경 변수를 사용합니다:

```bash
# PostgreSQL (Supabase 사용 시 권장)
DB_TYPE=postgres
DB_HOST=your-supabase-url
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=postgres
DB_SSLMODE=require
```

`.env` 파일 또는 시스템 환경 변수로 설정하세요.

### 충분한 데이터 수집

의미 있는 분석을 위해서는 최소 50개 이상의 채용 공고가 필요합니다:
- 여러 키워드로 크롤링 (개발자, 백엔드, 프론트엔드, 데이터 등)
- 정기적으로 크롤링하여 최신 데이터 유지 권장

### OpenAI API 키

분석 에이전트는 OpenAI GPT-4o-mini를 사용하므로 `OPENAI_API_KEY` 환경 변수 필수:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # 기본값
```

## 프론트엔드 통합 예시

React에서 사용하는 예시:

```typescript
// 시장 트렌드 조회
const analyzeMarketTrends = async (careerField: string) => {
  const response = await fetch('/api/job-analysis/market-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      careerField,
      days: 30
    })
  });

  const data = await response.json();
  return data;
};

// 맞춤형 인사이트
const getPersonalizedInsights = async (userProfile, careerAnalysis) => {
  const response = await fetch('/api/job-analysis/personalized-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userProfile,
      careerAnalysis
    })
  });

  const data = await response.json();
  return data;
};
```

## 트러블슈팅

### "분석할 채용 공고가 없습니다" 오류

- DB에 데이터가 없거나 DB 연결 실패
- 해결: 크롤링을 먼저 실행하고 DB 연결 설정 확인

### DB 연결 실패

- 환경 변수 확인: `DB_TYPE`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`
- Supabase 사용 시: SSL 모드 설정 (`DB_SSLMODE=require`)

### OpenAI API 오류

- `OPENAI_API_KEY` 환경 변수 확인
- API 사용량 한도 확인

## 다음 단계

1. **스케줄러 설정**: 정기적으로 크롤링하여 최신 데이터 유지
2. **프론트엔드 UI**: 분석 결과를 시각화하는 대시보드 구축
3. **알림 기능**: 새로운 트렌드나 관심 공고 발견 시 알림
4. **더 많은 사이트**: 원티드 외에 잡코리아, 사람인 등 추가

## 참고 파일

- `services/agents/job_analysis_agent.py` - 핵심 분석 로직
- `routers/job_analysis.py` - API 엔드포인트
- `models/agent.py` - 요청/응답 모델
- `use_job_analysis_agent.py` - 사용 예제
- `test_job_analysis_agent.py` - 테스트 스크립트
