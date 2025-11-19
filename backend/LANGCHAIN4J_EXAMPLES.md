# LangChain4j 예제 모음

## 기본 채팅 예제

### 1. 간단한 대화

```bash
# 세션 시작
curl -X POST http://localhost:8080/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# 응답:
{
  "sessionId": "abc-123-def-456",
  "message": "안녕하세요! LangChain4j 기반 진로 상담을 시작하겠습니다..."
}
```

### 2. 대화 진행

```bash
# 첫 번째 메시지
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def-456",
    "userId": "user123",
    "message": "안녕하세요! 진로 고민이 있어요."
  }'

# 두 번째 메시지 (메모리가 자동으로 유지됨)
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def-456",
    "userId": "user123",
    "message": "저는 예술과 기술에 관심이 많아요."
  }'

# 세 번째 메시지
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def-456",
    "userId": "user123",
    "message": "어떤 진로가 저에게 맞을까요?"
  }'
```

### 3. 대화 이력 조회

```bash
curl -X GET http://localhost:8080/api/chat/history/abc-123-def-456
```

응답:
```json
[
  {
    "sessionId": "abc-123-def-456",
    "message": "안녕하세요! 진로 고민이 있어요.",
    "role": "user",
    "timestamp": 1699876543210
  },
  {
    "sessionId": "abc-123-def-456",
    "message": "안녕하세요! 진로에 대한 고민을 들려주셔서 감사합니다...",
    "role": "assistant",
    "timestamp": 1699876544310
  }
]
```

## 진로 분석 예제

### 충분한 대화 후 분석 실행

```bash
curl -X POST http://localhost:8080/api/analysis/abc-123-def-456
```

응답 예시:
```json
{
  "sessionId": "abc-123-def-456",
  "emotion": {
    "description": "학생은 진로에 대한 불안과 동시에 새로운 가능성에 대한 기대를 보입니다...",
    "score": 65,
    "emotionalState": "혼합"
  },
  "personality": {
    "description": "창의적이고 호기심이 많은 성향을 보입니다...",
    "type": "창의적-분석적",
    "strengths": ["창의력", "문제해결", "열린 사고"],
    "growthAreas": ["실행력", "시간관리"]
  },
  "interest": {
    "description": "예술과 기술의 융합 분야에 큰 관심을 보입니다...",
    "areas": [
      {
        "name": "디지털 아트",
        "level": 9,
        "description": "그래픽 디자인과 코딩의 융합"
      },
      {
        "name": "게임 개발",
        "level": 8,
        "description": "창의성과 기술의 조합"
      }
    ]
  },
  "comprehensiveAnalysis": "당신은 예술적 감성과 기술적 역량을 동시에 가진 특별한 재능을 가지고 있습니다...",
  "recommendedCareers": [
    {
      "careerName": "UX/UI 디자이너",
      "description": "사용자 경험을 디자인하는 창의적인 직업",
      "matchScore": 92,
      "reasons": [
        "예술적 감각과 기술적 이해가 모두 필요",
        "사용자 중심적 사고 필요",
        "끊임없는 학습과 성장 가능"
      ]
    },
    {
      "careerName": "게임 디자이너",
      "description": "게임의 기획과 디자인을 담당",
      "matchScore": 88,
      "reasons": [
        "창의력과 스토리텔링 능력 활용",
        "기술과 예술의 융합",
        "다양한 도전과 혁신 기회"
      ]
    }
  ]
}
```

## Legacy API 사용 (기존 방식)

기존 OpenAI 서비스를 직접 사용하는 방식도 여전히 사용 가능합니다:

```bash
# Legacy 채팅
curl -X POST http://localhost:8080/api/chat/legacy \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def-456",
    "userId": "user123",
    "message": "안녕하세요!"
  }'

# Legacy 분석
curl -X POST http://localhost:8080/api/analysis/legacy/abc-123-def-456
```

## JavaScript/TypeScript 예제

### Axios 사용

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// 세션 시작
async function startSession(userId: string) {
  const response = await axios.post(`${API_BASE_URL}/chat/start`, {
    userId
  });
  return response.data.sessionId;
}

// 메시지 전송
async function sendMessage(sessionId: string, userId: string, message: string) {
  const response = await axios.post(`${API_BASE_URL}/chat`, {
    sessionId,
    userId,
    message
  });
  return response.data;
}

// 분석 요청
async function analyzeSession(sessionId: string) {
  const response = await axios.post(`${API_BASE_URL}/analysis/${sessionId}`);
  return response.data;
}

// 사용 예제
async function main() {
  try {
    // 1. 세션 시작
    const sessionId = await startSession('user123');
    console.log('세션 ID:', sessionId);
    
    // 2. 대화 진행
    await sendMessage(sessionId, 'user123', '안녕하세요! 진로 고민이 있어요.');
    await sendMessage(sessionId, 'user123', '저는 예술과 기술에 관심이 많아요.');
    await sendMessage(sessionId, 'user123', '창의적인 일을 하고 싶어요.');
    
    // 3. 분석 요청
    const analysis = await analyzeSession(sessionId);
    console.log('분석 결과:', analysis);
    
  } catch (error) {
    console.error('오류:', error);
  }
}

main();
```

### Fetch API 사용

```javascript
// 세션 시작
async function startSession() {
  const response = await fetch('http://localhost:8080/api/chat/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: 'user123' })
  });
  const data = await response.json();
  return data.sessionId;
}

// 메시지 전송
async function sendMessage(sessionId, message) {
  const response = await fetch('http://localhost:8080/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      userId: 'user123',
      message
    })
  });
  return await response.json();
}

// 분석 요청
async function analyzeSession(sessionId) {
  const response = await fetch(
    `http://localhost:8080/api/analysis/${sessionId}`,
    { method: 'POST' }
  );
  return await response.json();
}
```

## React 컴포넌트 예제

```typescript
import { useState } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatComponent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 세션 시작
  const startSession = async () => {
    const response = await axios.post('/api/chat/start', {
      userId: 'user123'
    });
    setSessionId(response.data.sessionId);
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    setLoading(true);
    
    // 사용자 메시지 추가
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await axios.post('/api/chat', {
        sessionId,
        userId: 'user123',
        message: input
      });

      // AI 응답 추가
      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.message
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 분석 요청
  const requestAnalysis = async () => {
    if (!sessionId) return;
    
    try {
      const response = await axios.post(`/api/analysis/${sessionId}`);
      console.log('분석 결과:', response.data);
      // 분석 결과 UI에 표시
    } catch (error) {
      console.error('분석 실패:', error);
    }
  };

  return (
    <div className="chat-container">
      {!sessionId ? (
        <button onClick={startSession}>대화 시작</button>
      ) : (
        <>
          <div className="messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading}>
              전송
            </button>
          </div>
          
          <button onClick={requestAnalysis}>
            진로 분석하기
          </button>
        </>
      )}
    </div>
  );
}
```

## 에러 처리 예제

```typescript
async function sendMessageWithErrorHandling(
  sessionId: string,
  message: string
) {
  try {
    const response = await axios.post('/api/chat', {
      sessionId,
      userId: 'user123',
      message
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      
      if (error.response?.status === 500) {
        return {
          success: false,
          error: errorData?.message || '서버 오류가 발생했습니다.'
        };
      } else if (error.response?.status === 400) {
        return {
          success: false,
          error: '잘못된 요청입니다.'
        };
      }
    }
    
    return {
      success: false,
      error: '알 수 없는 오류가 발생했습니다.'
    };
  }
}
```

## 테스트 시나리오

### 시나리오 1: 예술적 성향 학생

```bash
# 1. 세션 시작
SESSION_ID=$(curl -s -X POST http://localhost:8080/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1"}' | jq -r '.sessionId')

# 2. 대화 진행
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user1\",\"message\":\"안녕하세요! 저는 그림 그리는 것을 정말 좋아해요.\"}"

curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user1\",\"message\":\"디지털 아트도 배우고 싶고, 웹사이트 만드는 것도 재미있어 보여요.\"}"

curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user1\",\"message\":\"사람들에게 아름다운 경험을 제공하는 일을 하고 싶어요.\"}"

# 3. 분석
curl -X POST "http://localhost:8080/api/analysis/$SESSION_ID"
```

### 시나리오 2: 분석적 성향 학생

```bash
# 1. 세션 시작
SESSION_ID=$(curl -s -X POST http://localhost:8080/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user2"}' | jq -r '.sessionId')

# 2. 대화 진행
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user2\",\"message\":\"수학과 과학을 좋아합니다.\"}"

curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user2\",\"message\":\"문제를 분석하고 해결하는 과정이 재미있어요.\"}"

curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"userId\":\"user2\",\"message\":\"데이터를 다루는 일에 관심이 있습니다.\"}"

# 3. 분석
curl -X POST "http://localhost:8080/api/analysis/$SESSION_ID"
```

## 추가 리소스

- [LangChain4j 공식 문서](https://docs.langchain4j.dev/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Spring Boot 문서](https://spring.io/projects/spring-boot)

