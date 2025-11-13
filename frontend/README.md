# DreamPath Frontend

Next.js 16 + TypeScript 5.9.3 기반의 대화형 진로 분석 프론트엔드

## 기술 스택

- **Next.js**: 16.0.1
- **React**: 19.0.0
- **TypeScript**: 5.9.3
- **Node.js**: 22.21.0 이상 권장

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정 (선택사항)

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 애플리케이션이 실행됩니다.

### 4. 프로덕션 빌드

```bash
npm run build
npm run start
```

## 프로젝트 구조

```
src/
├── app/              # Next.js App Router
│   ├── layout.tsx    # 루트 레이아웃
│   ├── page.tsx      # 홈페이지 (채팅)
│   ├── globals.css   # 글로벌 스타일
│   └── analysis/     # 분석 페이지
├── components/       # React 컴포넌트
│   ├── ChatPage.tsx
│   └── AnalysisPage.tsx
├── lib/             # 유틸리티 및 API
│   └── api.ts       # API 서비스
└── types/           # TypeScript 타입
    └── index.ts
```

## Docker 빌드

```bash
docker build -t dreampath-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8080/api dreampath-frontend
```

## 주요 기능

- 🎯 AI 기반 진로 상담 채팅
- 📊 대화 분석 및 시각화
- 💼 맞춤형 진로 추천
- 📱 반응형 디자인

## 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NEXT_PUBLIC_API_URL | 백엔드 API URL | http://localhost:8080/api |
| NODE_ENV | 환경 모드 | development |

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run type-check` - TypeScript 타입 체크

