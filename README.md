# DreamPath - 대화형 진로 분석 시스템

개인 맞춤형 AI 커리어 코칭 서비스입니다. 학생들과의 자연스러운 대화를 통해 감정, 성향, 흥미를 분석하고 적합한 진로를 추천합니다.

## 🚀 시작하기

### 필수 요구사항

- Java 17 이상
- Node.js 18 이상
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

`frontend/.env.development` 파일 생성:
```env
VITE_API_URL=http://localhost:8080/api
```

#### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

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
2. 프론트엔드 API URL 설정 확인 (`frontend/src/services/dw/api.js`)
3. 방화벽 설정 확인

### React Router 경고

이는 정상적인 경고로, React Router v7 관련 기능 안내입니다. 애플리케이션 동작에는 영향이 없습니다.

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
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── pages/        # 페이지 컴포넌트
│   │   └── services/     # API 호출 서비스
│   └── vite.config.js    # Vite 설정
└── README.md
```

## 🛠️ 기술 스택

### 백엔드
- Spring Boot 3.x
- Spring Data JPA
- H2 Database (개발), MySQL/PostgreSQL (프로덕션)
- OpenAI API (GPT-4o-mini)
- Lombok

### 프론트엔드
- React 18
- Vite
- Axios
- React Router
- Recharts (데이터 시각화)
- Lucide React (아이콘)

## 📝 API 엔드포인트

### 채팅 API
- `POST /api/chat/start` - 새 세션 시작
- `POST /api/chat` - 메시지 전송
- `GET /api/chat/history/{sessionId}` - 대화 이력 조회

### 분석 API
- `POST /api/analysis/{sessionId}` - 세션 분석 및 진로 추천

## 🔒 보안 주의사항

- OpenAI API 키를 절대 GitHub에 커밋하지 마세요
- 프로덕션 환경에서는 환경변수를 사용하세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다

## 📄 라이선스

MIT License

## 💡 기여하기

이슈와 풀 리퀘스트는 언제나 환영합니다!
