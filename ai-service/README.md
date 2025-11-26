# DreamPath 진로 분석 AI 서비스

Python FastAPI를 사용한 진로 분석 마이크로서비스입니다.

## 기능

- **감정 분석**: 대화 내용을 기반으로 학생의 감정 상태 분석
- **성향 분석**: 학생의 성격 유형 및 강점 분석
- **흥미 분석**: 학생의 관심 분야 분석
- **종합 분석**: 모든 분석 결과를 종합한 맞춤형 조언
- **진로 추천**: 분석 결과를 바탕으로 적합한 진로 추천

## 설치

```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

## 환경 변수 설정

`.env.example`을 참고하여 `.env` 파일을 생성하고 OpenAI API 키를 설정하세요.

```bash
cp .env.example .env
# .env 파일을 열어서 OPENAI_API_KEY를 설정
```

## 실행

```bash
# 개발 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 또는
python main.py
```

## API 엔드포인트

### POST /api/analyze

대화 내용을 기반으로 진로 분석을 수행합니다.

**요청 본문:**
```json
{
  "sessionId": "session-123",
  "conversationHistory": [
    {
      "role": "USER",
      "content": "저는 프로그래밍에 관심이 있어요"
    },
    {
      "role": "ASSISTANT",
      "content": "좋은 관심사네요! 어떤 프로그래밍 언어를 배우고 싶으신가요?"
    }
  ]
}
```

**응답:**
```json
{
  "sessionId": "session-123",
  "emotion": {
    "description": "긍정적인 감정 상태...",
    "score": 75,
    "emotionalState": "긍정적"
  },
  "personality": {
    "description": "분석적이고 호기심이 많은 성향...",
    "type": "분석적",
    "strengths": ["논리적 사고", "문제 해결 능력"],
    "growthAreas": ["협업 능력"]
  },
  "interest": {
    "description": "기술 분야에 높은 관심...",
    "areas": [
      {
        "name": "프로그래밍",
        "level": 9,
        "description": "매우 높은 관심도"
      }
    ]
  },
  "comprehensiveAnalysis": "종합 분석 내용...",
  "recommendedCareers": [
    {
      "careerName": "소프트웨어 개발자",
      "description": "설명...",
      "matchScore": 95,
      "reasons": ["이유1", "이유2", "이유3"]
    }
  ]
}
```

## Docker 실행

```bash
# 이미지 빌드
docker build -t dreampath-ai-service .

# 컨테이너 실행
docker run -p 8000:8000 --env-file .env dreampath-ai-service
```

## 프로젝트 구조

```
ai-service/
├── main.py                 # FastAPI 메인 애플리케이션
├── services/
│   ├── __init__.py
│   ├── openai_service.py   # OpenAI API 서비스
│   └── career_analysis_service.py  # 진로 분석 서비스
├── requirements.txt        # Python 의존성
├── Dockerfile              # Docker 이미지 설정
├── .env.example           # 환경 변수 예시
└── README.md              # 이 파일
```

