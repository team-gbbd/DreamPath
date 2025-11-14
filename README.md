# DreamPath - 정체성 중심 진로 발견 플랫폼

**"너는 어떤 사람이야?"**

직업 추천이 아닌, 진로 정체성 확립을 목표로 하는 AI 기반 커리어 코칭 서비스입니다.  
4단계 대화 프로세스를 통해 학생들이 스스로를 발견하고, 진짜 자신에게 맞는 진로를 찾도록 돕습니다.

## 🌟 핵심 특징

### 1. 4단계 대화 프로세스
- **현재**: 지금의 감정과 고민 파악
- **과거**: 의미있는 경험과 몰입의 순간 탐색
- **가치관**: 삶에서 중요한 것 발견
- **미래**: 되고 싶은 모습 그리기
- **정체성**: "진짜 나" 확립 및 진로 연결

### 2. 실시간 정체성 분석
- 대화하는 동안 정체성이 점진적으로 명확해짐
- 매 응답마다 명확도(0-100%) 업데이트
- 즉각적인 인사이트 제공

### 3. 자동 단계 진행
- AI가 탐색 충분도를 판단하여 자연스럽게 다음 단계로
- 학생은 단계를 의식하지 않고 대화만 하면 됨

## 🚀 시작하기

### 필수 요구사항

- Java 17 이상
- Node.js 22.21.0 이상
- Maven 3.6 이상
- OpenAI API 키 (필수)

### 1. OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/)에 가입/로그인
2. API Keys 메뉴에서 새 API 키 생성
3. 발급받은 키를 안전하게 보관

### 2. 백엔드 설정

#### 환경변수 설정 (권장)

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="your-actual-api-key-here"
```

**Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=your-actual-api-key-here
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY="your-actual-api-key-here"
```

또는 `backend/src/main/resources/application.yml` 파일에서 직접 설정:
```yaml
openai:
  api:
    key: your-actual-api-key-here  # 여기에 실제 API 키 입력
    model: gpt-4o-mini
```

#### 백엔드 실행

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

백엔드는 http://localhost:8080 에서 실행됩니다.

### 3. 프론트엔드 설정

#### 환경변수 설정 (선택사항)

`frontend/.env.local` 파일 생성:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

#### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

#### 프로덕션 빌드

```bash
npm run build
npm run start
```

## 🔧 문제 해결

### 500 Internal Server Error 발생 시

1. **OpenAI API 키 확인**
   - 환경변수 `OPENAI_API_KEY`가 설정되어 있는지 확인
   - API 키가 유효한지 확인 (OpenAI Platform에서 확인)
   - 백엔드 로그에서 "OpenAI API 키가 설정되지 않았습니다" 메시지 확인

2. **백엔드 로그 확인**
   - 콘솔에서 상세한 에러 메시지 확인
   - `logs/spring.log` 파일 확인 (있는 경우)

3. **CORS 오류**
   - `application.yml`의 `cors.allowed-origins` 설정 확인
   - 프론트엔드 포트(3000)가 허용 목록에 있는지 확인

### 백엔드 연결 실패 시

1. 백엔드가 8080 포트에서 실행 중인지 확인: http://localhost:8080
2. 프론트엔드 API URL 설정 확인 (`frontend/.env.local` 또는 `next.config.js`)
3. 방화벽 설정 확인

## 📁 프로젝트 구조

```
DreamPath/
├── backend/                # Spring Boot 백엔드
│   ├── src/main/java/com/dreampath/
│   │   ├── controller/    # REST API 컨트롤러
│   │   ├── service/       # 비즈니스 로직
│   │   ├── entity/        # 데이터베이스 엔티티
│   │   ├── repository/    # JPA 레포지토리
│   │   └── config/        # 설정 (CORS 등)
│   └── src/main/resources/
│       └── application.yml # 백엔드 설정
├── frontend/              # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React 컴포넌트
│   │   ├── lib/          # API 서비스 및 유틸리티
│   │   └── types/        # TypeScript 타입 정의
│   ├── next.config.js    # Next.js 설정
│   └── tsconfig.json     # TypeScript 설정
├── docker-compose.yml    # Docker 구성
└── README.md
```

## 🛠️ 기술 스택

### 백엔드
- Spring Boot 3.x
- Spring Data JPA
- H2 Database (개발), MySQL/PostgreSQL (프로덕션)
- **LangChain4j** - AI 애플리케이션 프레임워크
- OpenAI API (GPT-4o-mini)
- Lombok

### 프론트엔드
- Next.js 16.0.1
- React 19
- TypeScript 5.9.3
- Node.js 22.21.0
- Axios
- Recharts (데이터 시각화)
- Lucide React (아이콘)

## 📝 API 엔드포인트

### 채팅 API
- `POST /api/chat/start` - 새 세션 시작
- `POST /api/chat` - 메시지 전송 (실시간 정체성 포함)
- `GET /api/chat/history/{sessionId}` - 대화 이력 조회

### 정체성 API
- `GET /api/identity/{sessionId}` - 실시간 정체성 상태 조회
- `POST /api/identity/{sessionId}/progress` - 단계 진행 확인

### 분석 API
- `POST /api/analysis/{sessionId}` - 최종 진로 분석 및 추천

## 🎯 정체성 중심 접근

### 기존 방식 vs DreamPath

| 기존 진로 상담 | DreamPath |
|--------------|-----------|
| "흥미가 뭐예요?" | "언제 가장 나다웠어?" |
| 직업 적성 검사 | 정체성 발견 여정 |
| 1회성 분석 | 지속적 진화 |
| 직업 리스트 제시 | "너는 ~한 사람" 확립 |

### 대화 예시

```
AI: "방금 말한 게 흥미로운데, 창작을 통해 사람들과 
     연결되는 게 너에게 정말 중요한 것 같아"

학생: "맞아요! 혼자 그림 그리는 것도 좋지만, 
       사람들이 봐주고 반응해줄 때 더 뿌듯해요"

AI: "그렇다면 너는 '창작을 통해 사람들과 연결되는 사람'이야.
     이런 정체성을 가진 너에게는..."
```

## 🤖 LangChain4j 통합

이 프로젝트는 **LangChain4j**를 활용하여 더 강력하고 유지보수가 쉬운 AI 기능을 제공합니다.

### 주요 AI Services
- **CareerAssistant**: 4단계 대화 프로세스 가이드
- **IdentityAnalyzer**: 실시간 정체성 분석
- **CareerAnalysisAssistant**: 최종 진로 분석 및 추천

### 상세 가이드
- [정체성 중심 시스템 가이드](backend/IDENTITY_DRIVEN_CAREER_GUIDE.md) ⭐
- [LangChain4j 통합 가이드](backend/LANGCHAIN4J_INTEGRATION.md)
- [아키텍처 문서](backend/ARCHITECTURE.md)

## 🔒 보안 주의사항

- OpenAI API 키를 절대 GitHub에 커밋하지 마세요
- 프로덕션 환경에서는 환경변수를 사용하세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다

## 📄 라이선스

MIT License

## 💡 기여하기

이슈와 풀 리퀘스트는 언제나 환영합니다!
