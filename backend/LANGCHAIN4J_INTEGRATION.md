# LangChain4j 통합 가이드

## 개요

DreamPath 프로젝트에 **LangChain4j**를 통합하여 더 강력하고 유지보수가 쉬운 LLM 애플리케이션을 구축했습니다.

## LangChain4j란?

LangChain4j는 Java 기반의 LLM 애플리케이션 프레임워크로, 다음과 같은 기능을 제공합니다:

- 🎯 **AI Services**: Type-safe한 방법으로 AI와 상호작용
- 💬 **Chat Memory**: 대화 컨텍스트 자동 관리
- 📝 **Prompt Templates**: 재사용 가능한 프롬프트 템플릿
- 🔗 **Chains**: 여러 단계의 LLM 호출 체인화
- 🧠 **Embeddings & RAG**: 벡터 임베딩 및 검색 증강 생성

## 주요 변경 사항

### 1. 의존성 추가

```xml
<!-- LangChain4j 핵심 라이브러리 -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j</artifactId>
    <version>0.34.0</version>
</dependency>

<!-- OpenAI 통합 -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-open-ai</artifactId>
    <version>0.34.0</version>
</dependency>

<!-- 임베딩 모델 -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-embeddings-all-minilm-l6-v2</artifactId>
    <version>0.34.0</version>
</dependency>
```

### 2. AI Services 정의

#### CareerAssistant (진로 상담 어시스턴트)

```java
public interface CareerAssistant {
    @SystemMessage("""
        당신은 친근하고 공감적인 진로 상담 전문가입니다.
        ...
    """)
    String chat(@MemoryId String sessionId, @UserMessage String userMessage);
}
```

#### CareerAnalysisAssistant (진로 분석 어시스턴트)

```java
public interface CareerAnalysisAssistant {
    String analyzeEmotion(@UserMessage String conversationHistory);
    String analyzePersonality(@UserMessage String conversationHistory);
    String analyzeInterests(@UserMessage String conversationHistory);
}
```

### 3. 설정 클래스

`LangChainConfig`에서 모든 LangChain4j 빈을 구성합니다:

- **ChatLanguageModel**: 대화용 OpenAI 모델 (temperature 0.7)
- **AnalysisModel**: 분석용 OpenAI 모델 (temperature 0.5)
- **ChatMemoryStore**: 세션별 대화 메모리 저장소
- **AI Services**: CareerAssistant, CareerAnalysisAssistant 빈 등록

### 4. 서비스 계층

#### LangChainCareerChatService

기존 `CareerChatService`의 LangChain4j 버전:

```java
@Service
public class LangChainCareerChatService {
    private final CareerAssistant careerAssistant;
    
    public ChatResponse chat(ChatRequest request) {
        // LangChain4j AI Service를 통해 응답 생성
        // 메모리가 자동으로 관리됨
        String aiResponse = careerAssistant.chat(
            session.getSessionId(), 
            request.getMessage()
        );
        // ...
    }
}
```

**장점:**
- 메모리 관리 자동화 (최근 10개 메시지 유지)
- 코드가 간결하고 읽기 쉬움
- Type-safe한 인터페이스

#### LangChainCareerAnalysisService

기존 `CareerAnalysisService`의 LangChain4j 버전:

```java
@Service
public class LangChainCareerAnalysisService {
    private final CareerAnalysisAssistant analysisAssistant;
    
    public AnalysisResponse analyzeSession(String sessionId) {
        String emotionJson = analysisAssistant.analyzeEmotion(conversationHistory);
        String personalityJson = analysisAssistant.analyzePersonality(conversationHistory);
        String interestJson = analysisAssistant.analyzeInterests(conversationHistory);
        // ...
    }
}
```

**장점:**
- 각 분석 타입별로 명확히 분리된 메서드
- 프롬프트가 인터페이스에 정의되어 관리 용이
- 재사용 가능한 분석 컴포넌트

### 5. API 엔드포인트

#### 기본 엔드포인트 (LangChain4j 사용)

- `POST /api/chat` - LangChain4j 기반 채팅
- `POST /api/chat/start` - 새 세션 시작
- `GET /api/chat/history/{sessionId}` - 대화 이력
- `POST /api/analysis/{sessionId}` - LangChain4j 기반 분석

#### Legacy 엔드포인트 (기존 방식)

- `POST /api/chat/legacy` - 기존 OpenAI 서비스 채팅
- `POST /api/analysis/legacy/{sessionId}` - 기존 분석

## 사용 예시

### 1. 채팅 시작

```bash
curl -X POST http://localhost:8080/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

응답:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "안녕하세요! LangChain4j 기반 진로 상담을 시작하겠습니다. 편하게 이야기해주세요."
}
```

### 2. 대화 전송

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "message": "저는 예술에 관심이 많고 사람들과 소통하는 것을 좋아해요."
  }'
```

### 3. 진로 분석

```bash
curl -X POST http://localhost:8080/api/analysis/550e8400-e29b-41d4-a716-446655440000
```

## LangChain4j의 장점

### 1. 자동 메모리 관리

```java
// 기존 방식
List<ChatMessage> messages = new ArrayList<>();
messages.add(new ChatMessage("system", SYSTEM_PROMPT));
// 수동으로 대화 히스토리 관리...

// LangChain4j 방식
String response = careerAssistant.chat(sessionId, userMessage);
// 메모리가 자동으로 관리됨!
```

### 2. Type-Safe 인터페이스

```java
// 기존 방식
String response = openAIService.getChatCompletion(messages); // String 반환

// LangChain4j 방식
interface CareerAssistant {
    @SystemMessage("...")
    String chat(@MemoryId String sessionId, @UserMessage String message);
}
// 컴파일 타임 타입 체크
```

### 3. 프롬프트 템플릿 관리

```java
// 프롬프트가 어노테이션으로 명확히 정의됨
@SystemMessage("""
    당신은 친근한 진로 상담 전문가입니다.
    ...
""")
String chat(@MemoryId String sessionId, @UserMessage String userMessage);
```

### 4. 확장성

향후 다음과 같은 기능을 쉽게 추가할 수 있습니다:

- **RAG (Retrieval-Augmented Generation)**: 진로 정보 데이터베이스 검색
- **다중 LLM**: OpenAI, Anthropic, Cohere 등 쉽게 교체
- **스트리밍 응답**: 실시간 응답 생성
- **Function Calling**: 외부 API 호출 통합

## 환경 설정

기존과 동일하게 `application.yml`에 OpenAI API 키를 설정:

```yaml
openai:
  api:
    key: ${OPENAI_API_KEY:your-api-key-here}
    model: gpt-4o-mini
```

환경변수로 설정 권장:
```bash
export OPENAI_API_KEY="sk-..."
```

## 성능 비교

| 항목 | 기존 방식 | LangChain4j |
|------|----------|-------------|
| 코드 라인 수 | ~100줄 | ~50줄 |
| 메모리 관리 | 수동 | 자동 |
| 타입 안정성 | 낮음 | 높음 |
| 유지보수성 | 중간 | 높음 |
| 확장성 | 중간 | 높음 |

## 마이그레이션 체크리스트

- [x] LangChain4j 의존성 추가
- [x] AI Services 인터페이스 정의
- [x] LangChain 설정 클래스 작성
- [x] LangChain 서비스 클래스 구현
- [x] 컨트롤러 업데이트
- [x] 기존 코드 호환성 유지 (legacy 엔드포인트)
- [ ] 통합 테스트 작성
- [ ] 성능 테스트 및 비교

## 추가 개선 아이디어

### 1. RAG 구현

```java
@Bean
public EmbeddingStore<TextSegment> embeddingStore() {
    return new InMemoryEmbeddingStore<>();
}

// 진로 정보 문서를 임베딩하여 저장
// 질문에 관련된 정보를 검색하여 컨텍스트 제공
```

### 2. 스트리밍 응답

```java
interface StreamingCareerAssistant {
    TokenStream chat(@MemoryId String sessionId, @UserMessage String message);
}
```

### 3. Function Calling

```java
@Tool("학과 정보를 검색합니다")
List<Major> searchMajors(String keyword) {
    // 데이터베이스에서 학과 정보 검색
}
```

### 4. 다중 에이전트

```java
// 전문 분야별 에이전트
interface EmotionExpert { ... }
interface PersonalityExpert { ... }
interface InterestExpert { ... }

// 에이전트 조율자
interface AgentCoordinator { ... }
```

## 참고 자료

- [LangChain4j 공식 문서](https://github.com/langchain4j/langchain4j)
- [LangChain4j 예제](https://github.com/langchain4j/langchain4j-examples)
- [OpenAI Integration](https://docs.langchain4j.dev/integrations/language-models/openai)

## 문의사항

LangChain4j 통합과 관련된 질문이나 문제가 있다면 이슈를 열어주세요.

