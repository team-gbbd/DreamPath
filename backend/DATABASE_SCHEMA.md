# DreamPath 데이터베이스 스키마 설계

## 📋 목차
1. [개요](#개요)
2. [테이블 구조](#테이블-구조)
3. [엔티티 관계도](#엔티티-관계도)
4. [상세 스키마](#상세-스키마)
5. [인덱스 전략](#인덱스-전략)
6. [데이터 타입 설명](#데이터-타입-설명)

---

## 개요

DreamPath는 AI 기반 진로 상담 플랫폼으로, 다음과 같은 핵심 기능을 지원합니다:
- 사용자 인증 및 관리
- 진로 상담 대화 세션 관리
- AI 기반 진로 분석 결과 저장

### 데이터베이스 정보
- **지원 DB**: MySQL 8.0+, PostgreSQL 12+
- **인코딩**: UTF-8 (utf8mb4)
- **스키마 생성**: JPA `ddl-auto: update` 또는 수동 SQL 실행

---

## 테이블 구조

### 전체 테이블 목록

| 테이블명 | 설명 | 주요 용도 |
|---------|------|----------|
| `users` | 사용자 정보 | 회원가입, 로그인, 소셜 로그인 |
| `email_verification_tokens` | 이메일 인증 토큰 | 이메일 인증 관리 |
| `career_sessions` | 진로 상담 세션 | 대화 세션 관리 |
| `chat_messages` | 채팅 메시지 | 대화 내용 저장 |
| `career_analyses` | 진로 분석 결과 | AI 분석 결과 저장 |

---

## 엔티티 관계도

```
┌─────────────────────┐
│      users          │
│  (사용자 정보)       │
└──────────┬──────────┘
           │
           │ (1:N)
           │ user_id
           │
           ▼
┌─────────────────────┐
│ career_sessions     │
│  (진로 상담 세션)    │
└──────┬──────────┬───┘
       │          │
       │ (1:N)    │ (1:1)
       │          │
       ▼          ▼
┌──────────┐  ┌──────────────┐
│chat_     │  │career_       │
│messages  │  │analyses      │
│(채팅     │  │(분석 결과)    │
│ 메시지)  │  │              │
└──────────┘  └──────────────┘

┌─────────────────────┐
│email_verification_  │
│tokens              │
│(이메일 인증)        │
└─────────────────────┘
```

### 관계 설명

1. **users ↔ career_sessions**: 1:N
   - 한 사용자는 여러 상담 세션을 가질 수 있음
   - `user_id`로 연결 (현재 String, 향후 FK 가능)

2. **career_sessions ↔ chat_messages**: 1:N
   - 한 세션은 여러 메시지를 가짐
   - CASCADE DELETE: 세션 삭제 시 메시지 자동 삭제

3. **career_sessions ↔ career_analyses**: 1:1
   - 한 세션은 하나의 분석 결과만 가짐
   - UNIQUE 제약, CASCADE DELETE

---

## 상세 스키마

### 1. users (사용자)

**목적**: 시스템 사용자 정보 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `user_id` | BIGINT | PK, AUTO_INCREMENT | 사용자 고유 ID |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 로그인 아이디 |
| `password` | VARCHAR(255) | NOT NULL | 비밀번호 (BCrypt 해시) |
| `name` | VARCHAR(100) | NOT NULL | 사용자 이름 |
| `phone` | VARCHAR(20) | UNIQUE | 전화번호 |
| `email` | VARCHAR(255) | UNIQUE | 이메일 주소 |
| `birth` | DATE | | 생년월일 |
| `provider` | VARCHAR(20) | | 소셜 로그인 제공자 (google, kakao 등) |
| `provider_id` | VARCHAR(100) | | 소셜 로그인 제공자의 사용자 ID |
| `role` | VARCHAR(10) | NOT NULL, DEFAULT 'USER' | 사용자 역할 (USER, MENTOR) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 계정 활성화 여부 |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성 시간 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정 시간 |

**인덱스**:
- `idx_username`: username
- `idx_email`: email
- `idx_provider`: provider, provider_id (복합)

---

### 2. email_verification_tokens (이메일 인증 토큰)

**목적**: 이메일 인증을 위한 임시 토큰 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 토큰 ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 인증할 이메일 주소 |
| `token` | VARCHAR(10) | NOT NULL | 인증 코드 (6-10자리) |
| `expires_at` | TIMESTAMP | NOT NULL | 토큰 만료 시간 |
| `verified` | BOOLEAN | NOT NULL, DEFAULT FALSE | 인증 완료 여부 |

**인덱스**:
- `idx_email`: email
- `idx_token`: token
- `idx_expires_at`: expires_at

---

### 3. career_sessions (진로 상담 세션)

**목적**: 진로 상담 대화 세션 관리

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 세션 ID |
| `session_id` | VARCHAR(255) | UNIQUE, NOT NULL | 세션 고유 식별자 (UUID) |
| `user_id` | VARCHAR(255) | | 사용자 ID (users 참조) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | 세션 상태 (ACTIVE, COMPLETED, ARCHIVED) |
| `conversation_stage` | VARCHAR(20) | NOT NULL, DEFAULT 'PRESENT' | 현재 대화 단계 |
| `stage_message_count` | INT | NOT NULL, DEFAULT 0 | 현재 단계의 메시지 수 |
| `survey_completed` | BOOLEAN | DEFAULT FALSE | 설문조사 완료 여부 |
| `survey_data` | TEXT | | 설문조사 응답 데이터 (JSON 형식) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 생성 시간 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정 시간 |

**대화 단계 (conversation_stage)**:
- `PRESENT`: 현재 상태 파악
- `PAST`: 과거 경험 탐색
- `VALUES`: 가치관 탐색
- `FUTURE`: 미래 상상
- `IDENTITY`: 정체성 확립 및 진로 연결

**설문조사 데이터 (survey_data) JSON 형식**:
```json
{
  "name": "홍길동",
  "age": 17,
  "interests": ["프로그래밍", "디자인"],
  "favoriteSubjects": ["수학", "과학"],
  "difficultSubjects": ["영어"],
  "hasDreamCareer": "모호함",
  "careerPressure": "높음",
  "concern": "진로가 불확실함"
}
```

**인덱스**:
- `idx_session_id`: session_id (가장 빈번한 조회)
- `idx_user_id`: user_id
- `idx_status`: status
- `idx_conversation_stage`: conversation_stage
- `idx_sessions_user_status`: user_id, status (복합)

---

### 4. chat_messages (채팅 메시지)

**목적**: 진로 상담 대화 메시지 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 메시지 ID |
| `session_id` | BIGINT | FK, NOT NULL | 세션 ID (career_sessions.id) |
| `role` | VARCHAR(20) | NOT NULL | 메시지 역할 (USER, ASSISTANT, SYSTEM) |
| `content` | TEXT | NOT NULL | 메시지 내용 |
| `timestamp` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 메시지 생성 시간 |

**외래키**:
- `session_id` → `career_sessions.id` (ON DELETE CASCADE)

**인덱스**:
- `idx_session_id`: session_id
- `idx_timestamp`: timestamp
- `idx_role`: role
- `idx_messages_session_timestamp`: session_id, timestamp (복합)

---

### 5. career_analyses (진로 분석 결과)

**목적**: AI 분석 결과 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | 분석 ID |
| `session_id` | BIGINT | FK, UNIQUE, NOT NULL | 세션 ID (career_sessions.id) |
| `emotion_analysis` | TEXT | | 감정 분석 결과 |
| `emotion_score` | INT | | 감정 점수 (1-100) |
| `personality_analysis` | TEXT | | 성향 분석 결과 |
| `personality_type` | VARCHAR(50) | | 성향 유형 (MBTI 등) |
| `interest_analysis` | TEXT | | 흥미 분석 결과 |
| `interest_areas` | TEXT | | 흥미 분야 (JSON 형식) |
| `comprehensive_analysis` | TEXT | | 종합 분석 |
| `recommended_careers` | TEXT | | 추천 진로 (JSON 형식) |
| `analyzed_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 분석 시간 |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 수정 시간 |

**외래키**:
- `session_id` → `career_sessions.id` (ON DELETE CASCADE, UNIQUE)

**인덱스**:
- `idx_session_id`: session_id
- `idx_analyzed_at`: analyzed_at

**JSON 형식 예시**:

```json
// interest_areas
[
  {
    "name": "프로그래밍",
    "level": 8,
    "description": "코딩에 대한 높은 관심"
  }
]

// recommended_careers
[
  {
    "careerName": "소프트웨어 엔지니어",
    "description": "설명...",
    "matchScore": 85,
    "reasons": ["이유1", "이유2"]
  }
]
```

---

## 인덱스 전략

### 주요 인덱스 목적

1. **조회 성능 최적화**
   - `session_id`: 가장 빈번한 조회 (세션별 메시지 조회)
   - `user_id`: 사용자별 세션 조회
   - `email`, `username`: 로그인/인증 조회

2. **시간 기반 조회**
   - `timestamp`: 메시지 시간순 정렬
   - `created_at`: 세션 생성 시간순 정렬

3. **필터링 최적화**
   - `status`: 세션 상태별 필터링
   - `conversation_stage`: 단계별 필터링
   - `role`: 메시지 역할별 필터링

4. **복합 인덱스**
   - `(user_id, status)`: 사용자별 활성 세션 조회
   - `(session_id, timestamp)`: 세션별 메시지 시간순 조회

---

## 데이터 타입 설명

### 선택 이유

| 타입 | 사용 위치 | 이유 |
|------|----------|------|
| **BIGINT** | 모든 ID | 자동 증가, 장기적 확장성 |
| **VARCHAR(255)** | 이메일, URL | 가변 길이, 충분한 공간 |
| **VARCHAR(50)** | username | 적절한 길이 제한 |
| **TEXT** | 분석 결과, 메시지 | 긴 텍스트 저장 |
| **TIMESTAMP** | 모든 시간 필드 | 시간 정보 저장 및 인덱싱 최적화 |
| **BOOLEAN** | 플래그 값 | 단순 true/false |
| **VARCHAR(20)** | Enum 값 | JPA EnumType.STRING과 호환 |

### JSON 저장

`interest_areas`와 `recommended_careers`는 JSON 형식으로 저장합니다:
- **장점**: 유연한 구조, 스키마 변경 없이 확장 가능
- **단점**: 쿼리 복잡도 증가 (MySQL 5.7+, PostgreSQL 9.3+ JSON 함수 사용)

---

## 성능 고려사항

### 1. CASCADE DELETE
- 세션 삭제 시 관련 메시지와 분석 결과 자동 삭제
- 데이터 정합성 보장

### 2. 인덱스 최적화
- 자주 조회되는 컬럼에 인덱스 생성
- 복합 인덱스로 쿼리 성능 향상

### 3. 타임스탬프 관리
- `created_at`, `updated_at` 자동 관리
- PostgreSQL: 트리거 사용
- MySQL: ON UPDATE CURRENT_TIMESTAMP 사용

### 4. 텍스트 저장
- 긴 텍스트는 TEXT 타입 사용
- JSON 데이터는 TEXT로 저장하여 유연성 확보

---

## 향후 개선 사항

1. **외래키 제약조건**
   - `career_sessions.user_id`를 `users.user_id`를 참조하는 FK로 변경 고려

2. **파티셔닝**
   - 대용량 데이터 시 `chat_messages` 테이블 파티셔닝 고려

3. **아카이빙**
   - 오래된 세션 데이터 아카이빙 전략 수립

4. **JSON 인덱싱**
   - MySQL 5.7+ / PostgreSQL 9.3+ JSON 인덱스 활용

---

## 스키마 생성 방법

### JPA 자동 생성 (개발 환경)
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

### 수동 SQL 실행 (프로덕션)

**MySQL**:
```bash
mysql -u username -p database_name < schema.sql
```

**PostgreSQL**:
```bash
psql -U username -d database_name -f schema-postgresql.sql
```

---

## 참고사항

- 프로덕션 환경에서는 `ddl-auto: validate` 또는 `none` 사용 권장
- 스키마 변경 시 마이그레이션 스크립트 작성 필수
- 백업 후 스키마 변경 작업 수행

