"""
DreamPath 진로 분석 AI 서비스
Python FastAPI를 사용한 진로 분석 마이크로서비스
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

from services.career import CareerAnalysisService, ChatService, IdentityAnalysisService
from services.common import OpenAIService
from services.learning import QuestionGeneratorService, AnswerEvaluatorService, CodeExecutorService

# 환경 변수 로드
load_dotenv()

app = FastAPI(
    title="DreamPath Career Analysis AI Service",
    description="AI 기반 진로 분석, 정체성 분석 및 대화형 상담 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 초기화
api_key = os.getenv("OPENAI_API_KEY", "")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

openai_service = OpenAIService()
analysis_service = CareerAnalysisService(openai_service)
identity_service = IdentityAnalysisService(api_key, model) if api_key else None
chat_service = ChatService(api_key, model) if api_key else None

# Learning Path 서비스 초기화
question_generator = QuestionGeneratorService() if api_key else None
answer_evaluator = AnswerEvaluatorService() if api_key else None
code_executor = CodeExecutorService()


# 요청/응답 모델
class ConversationMessage(BaseModel):
    role: str  # USER, ASSISTANT, SYSTEM
    content: str


class AnalysisRequest(BaseModel):
    sessionId: str
    conversationHistory: List[ConversationMessage]


class EmotionAnalysis(BaseModel):
    description: str
    score: int  # 1-100
    emotionalState: str  # 긍정적, 중립적, 부정적, 혼합


class PersonalityAnalysis(BaseModel):
    description: str
    type: str
    strengths: List[str]
    growthAreas: List[str]


class InterestArea(BaseModel):
    name: str
    level: int  # 1-10
    description: str


class InterestAnalysis(BaseModel):
    description: str
    areas: List[InterestArea]


class CareerRecommendation(BaseModel):
    careerName: str
    description: str
    matchScore: int  # 1-100
    reasons: List[str]


class AnalysisResponse(BaseModel):
    sessionId: str
    emotion: EmotionAnalysis
    personality: PersonalityAnalysis
    interest: InterestAnalysis
    comprehensiveAnalysis: str
    recommendedCareers: List[CareerRecommendation]


@app.get("/")
async def root():
    return {"message": "DreamPath Career Analysis AI Service", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_career(request: AnalysisRequest):
    """
    대화 내용을 기반으로 진로 분석을 수행합니다.
    
    - 감정 분석
    - 성향 분석
    - 흥미 분석
    - 종합 분석
    - 진로 추천
    """
    try:
        # 대화 내용을 문자열로 변환
        conversation_text = "\n\n".join([
            f"{msg.role}: {msg.content}" 
            for msg in request.conversationHistory
        ])
        
        # 분석 수행
        result = await analysis_service.analyze_session(
            session_id=request.sessionId,
            conversation_history=conversation_text
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")


# 정체성 분석 요청 모델
class ClarityRequest(BaseModel):
    conversationHistory: str


class IdentityRequest(BaseModel):
    conversationHistory: str


class InsightRequest(BaseModel):
    recentMessages: str
    previousContext: str


class ProgressRequest(BaseModel):
    conversationHistory: str
    currentStage: str


# 정체성 분석 응답 모델
class ClarityResponse(BaseModel):
    clarity: int
    reason: str


class IdentityTrait(BaseModel):
    category: str
    trait: str
    evidence: str


class IdentityResponse(BaseModel):
    identityCore: str
    confidence: int
    traits: List[IdentityTrait]
    insights: List[str]
    nextFocus: str


class InsightResponse(BaseModel):
    hasInsight: bool
    insight: Optional[str] = None
    type: Optional[str] = None


class ProgressResponse(BaseModel):
    readyToProgress: bool
    reason: str
    recommendation: str


@app.post("/api/identity/clarity", response_model=ClarityResponse)
async def assess_clarity(request: ClarityRequest):
    """정체성 명확도 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_clarity(request.conversationHistory)
        return ClarityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"명확도 평가 실패: {str(e)}")


@app.post("/api/identity/extract", response_model=IdentityResponse)
async def extract_identity(request: IdentityRequest):
    """정체성 특징 추출"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.extract_identity(request.conversationHistory)
        # traits 변환
        traits = [IdentityTrait(**t) for t in result.get("traits", [])]
        return IdentityResponse(
            identityCore=result.get("identityCore", "탐색 중..."),
            confidence=result.get("confidence", 0),
            traits=traits,
            insights=result.get("insights", []),
            nextFocus=result.get("nextFocus", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정체성 추출 실패: {str(e)}")


@app.post("/api/identity/insight", response_model=InsightResponse)
async def generate_insight(request: InsightRequest):
    """최근 인사이트 생성"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.generate_insight(
            request.recentMessages,
            request.previousContext
        )
        return InsightResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인사이트 생성 실패: {str(e)}")


@app.post("/api/identity/progress", response_model=ProgressResponse)
async def assess_progress(request: ProgressRequest):
    """단계 진행 평가"""
    if not identity_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        result = await identity_service.assess_stage_progress(
            request.conversationHistory,
            request.currentStage
        )
        return ProgressResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진행 평가 실패: {str(e)}")


# 채팅 요청/응답 모델
class ChatRequest(BaseModel):
    sessionId: str
    userMessage: str
    currentStage: str  # PRESENT, PAST, VALUES, FUTURE, IDENTITY
    conversationHistory: List[ConversationMessage]
    surveyData: Optional[dict] = None  # 설문조사 정보


class ChatResponse(BaseModel):
    sessionId: str
    message: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """대화형 진로 상담 응답 생성"""
    if not chat_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
    
    try:
        # 대화 이력을 딕셔너리 리스트로 변환
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]
        
        # 채팅 응답 생성
        response_message = await chat_service.generate_response(
            session_id=request.sessionId,
            user_message=request.userMessage,
            current_stage=request.currentStage,
            conversation_history=history,
            survey_data=request.surveyData
        )
        
        return ChatResponse(
            sessionId=request.sessionId,
            message=response_message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 응답 생성 실패: {str(e)}")


# ===== Learning Path API =====

class GenerateQuestionsRequest(BaseModel):
    domain: str
    weekNumber: int
    count: int = 5


class EvaluateAnswerRequest(BaseModel):
    questionType: str
    questionText: str
    userAnswer: str
    correctAnswer: str
    maxScore: int


class ExecuteCodeRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""


class GenerateCodingProblemRequest(BaseModel):
    difficulty: str  # EASY, MEDIUM, HARD


class CodingHelpRequest(BaseModel):
    question: str
    problemTitle: str
    problemDescription: str
    currentCode: str
    language: str


@app.post("/api/learning/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    """문제 생성"""
    if not question_generator:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")

    try:
        questions = await question_generator.generate_questions(
            domain=request.domain,
            week_number=request.weekNumber,
            count=request.count
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


@app.post("/api/learning/evaluate-answer")
async def evaluate_answer(request: EvaluateAnswerRequest):
    """답안 채점"""
    if not answer_evaluator:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")

    try:
        result = await answer_evaluator.evaluate_answer(
            question_type=request.questionType,
            question_text=request.questionText,
            user_answer=request.userAnswer,
            correct_answer=request.correctAnswer,
            max_score=request.maxScore
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"답안 채점 실패: {str(e)}")


@app.post("/api/learning/execute-code")
async def execute_code(request: ExecuteCodeRequest):
    """코드 실행"""
    try:
        result = await code_executor.execute_code(
            code=request.code,
            language=request.language,
            stdin=request.stdin
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"코드 실행 실패: {str(e)}")


@app.post("/api/learning/generate-coding-problem")
async def generate_coding_problem(request: GenerateCodingProblemRequest):
    """코딩 테스트 문제 생성 (난이도별)"""
    if not openai_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")

    try:
        difficulty = request.difficulty.upper()

        # 난이도별 프롬프트 설정 (진로 체험용 - 매우 쉽게!)
        difficulty_prompts = {
            "EASY": """중학생도 쉽게 이해할 수 있는 아주 기초적인 문제를 만들어주세요.
            예:
            - 두 수의 합 구하기 (10 + 20 = 30 출력)
            - 이름 출력하기 (name = "철수" → "안녕, 철수!" 출력)
            - 숫자 곱하기 (5 * 3 = 15 출력)
            - 배열의 첫 번째 요소 찾기 ([1,2,3] → 1 출력)

            **중요: 실행하면 구체적인 값이 출력되어야 합니다!**
            프로그래밍이 재미있다는 느낌을 주는 문제여야 합니다.""",
            "MEDIUM": """고등학생 수준의 간단한 문제를 만들어주세요.
            예:
            - 배열에서 최댓값 찾기 ([5,2,8,1] → 8 출력)
            - 짝수만 세기 ([1,2,3,4,5,6] → 3 출력)
            - 문자열 길이 구하기 ("Hello" → 5 출력)

            **중요: 실행하면 명확한 결과값이 출력되어야 합니다!**
            조금만 생각하면 풀 수 있는 수준이어야 합니다.""",
            "HARD": """대학 1학년 수준의 문제를 만들어주세요.
            예:
            - 배열 정렬 후 중간값 ([3,1,2] → [1,2,3] 또는 2 출력)
            - 중복 제거 ([1,2,2,3] → [1,2,3] 또는 3 출력)
            - 문자 개수 세기 ("hello" → {'h':1,'e':1,'l':2,'o':1} 출력)

            **중요: 실행하면 처리된 결과가 명확히 출력되어야 합니다!**
            알고리즘 기초 개념을 이해하면 풀 수 있는 수준이어야 합니다."""
        }

        prompt = f"""당신은 진로 체험을 위한 코딩 문제 출제 전문가입니다.
학생들이 프로그래밍에 흥미를 느끼고 개발자라는 직업에 긍정적인 경험을 가질 수 있도록 문제를 만들어주세요.

난이도: {difficulty}
{difficulty_prompts.get(difficulty, difficulty_prompts["EASY"])}

다음 JSON 형식으로 응답해주세요:
{{
    "title": "간결한 문제 제목 (예: 두 수의 합 구하기)",
    "description": "문제 설명을 1-2문장으로 간결하게 작성하세요.\n예: '두 정수 a, b가 주어질 때, a + b의 결과를 반환하는 add 함수를 완성하세요.\\n(※ 이 문제는 빈칸 채우기 문제입니다.)'",
    "functionDescription": "함수 설명 (예: 'add(a, b) → a와 b를 더한 값을 반환합니다.')",
    "difficulty": "{difficulty}",
    "constraints": ["1-2개의 간단한 제약사항만 (선택)"],
    "examples": [
        {{"call": "multiply(5, 3)", "returns": "15", "explanation": "5 × 3 = 15"}},
        {{"call": "multiply(10, 2)", "returns": "20", "explanation": "10 × 2 = 20"}}
    ],
    "hints": [
        "힌트1: 어떤 연산을 해야 하는지 (은은하게)",
        "힌트2: 어떤 문법이나 함수를 사용하는지 (구체적으로)",
        "힌트3: 거의 정답 (예: 'a + b를 사용하세요')"
    ],
    "starterCode": {{
        "javascript": "JavaScript 빈칸 코드",
        "python": "Python 빈칸 코드",
        "java": "Java 빈칸 코드"
    }},
    "solutionCode": {{
        "javascript": "JavaScript 정답 코드 (주석 포함)",
        "python": "Python 정답 코드 (주석 포함)",
        "java": "Java 정답 코드 (주석 포함)"
    }},
    "timeLimit": "제한 없음",
    "memoryLimit": "제한 없음"
}}

**핵심 규칙:**
1. 문제 설명에 "입력받는다", "Scanner", "input()" 같은 표현 절대 사용 금지
2. 함수의 매개변수와 호출 예시를 명확히 구분하세요
   - 설명: "add(a, b) 함수를 완성하세요. a와 b를 더한 결과를 return합니다"
   - 예시: "add(10, 20)을 호출하면 30이 출력됩니다"
3. 입출력 예시는 함수 호출 형태로 (예: "add(5, 3) → 8")
4. 빈칸 채우기에 집중! 함수 구조는 이미 완성되어 있음
5. **반드시 console.log/print/System.out.println으로 결과를 출력하는 코드 포함**
6. 예시는 2개 이상 제공하세요

**starterCode 작성 예시:**
JavaScript:
```
function add(a, b) {{
  const total = ___; // TODO: a와 b를 더하세요
  return total;
}}
console.log(add(10, 20));
```

Python:
```
def add(a, b):
  total = ___ # TODO: a와 b를 더하세요
  return total
print(add(10, 20))
```

Java:
```
public class Main {{
  public static int add(int a, int b) {{
    int total = ___; // TODO: a와 b를 더하세요
    return total;
  }}

  public static void main(String[] args) {{
    System.out.println(add(10, 20));
  }}
}}
```

**중요: Java는 반드시 Main 클래스와 main 메서드를 포함해야 합니다!**

- JSON만 출력하세요 (다른 설명 없이)
"""

        # OpenAI API 호출
        response = openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )

        # JSON 파싱
        import json
        content = response.choices[0].message.content

        # JSON 추출 (마크다운 코드 블록 제거)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        problem = json.loads(content)

        return {"problem": problem}

    except json.JSONDecodeError as e:
        import traceback
        print(f"JSON 파싱 에러: {str(e)}")
        print(f"응답 내용: {content}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"문제 생성 실패 (JSON 파싱 오류): {str(e)}")
    except Exception as e:
        import traceback
        print(f"문제 생성 에러: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


@app.post("/api/learning/coding-help")
async def coding_help(request: CodingHelpRequest):
    """코딩 도우미 챗봇"""
    if not openai_service:
        raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")

    try:
        prompt = f"""당신은 친근한 선배 코더입니다. 처음 코딩을 배우는 학생과 대화하고 있습니다.

문제: {request.problemTitle}
문제 설명: {request.problemDescription}

학생의 현재 코드 ({request.language}):
```
{request.currentCode}
```

학생의 질문: "{request.question}"

답변 가이드:

1. **코드를 먼저 확인하세요! (최우선)**
   - 빈칸(___/TODO)이 아직 있나요? → "아직 빈칸을 채워야 해!"
   - 빈칸을 채웠나요? → 코드를 보고 맞는지 확인
   - "a * b", "a - b", "a + b" 같은 정답 코드가 있나요? → "응, 맞아! 잘했어"

2. **질문 분석 (중요!)**
   "{request.question}"을 먼저 읽고 무엇을 원하는지 정확히 파악하세요.

   - "a * b?", "a + b?", "이거 맞아?" → **코드 확인** (정답이면 "응, 맞아!")
   - "힌트만 줘", "답 알려주지 마", "살짝만" → **은은한 힌트만** (정답 코드 절대 금지!)
   - "개념", "원리", "어떤 거야" → **개념 설명**
   - "어려워", "힘들어", "어떻게 공부" → **공감 + 격려**
   - "모르겠어", "어떡해?" → **단계별 힌트** (정답 X)

2. **힌트 수준별 답변 (중요!)**

   🔸 Level 1 (은은한 힌트) - "힌트만 줘", "답 알려주지 마"
   - "어떤 연산이 필요한지 생각해봐"
   - "두 수를 어떻게 처리해야 할까?"
   - "곱셈을 생각해봐"
   ❌ 절대 금지: "a * b를 써봐" (이건 정답임!)

   🔸 Level 2 (중간 힌트) - "모르겠어", "도와줘"
   - "빈칸에 a와 b를 곱하는 식을 넣어봐"
   - "곱셈 기호(*)를 사용해봐"
   ❌ 금지: "a * b" (아직 정답 주지 마세요)

   🔸 Level 3 (강한 힌트) - "정말 모르겠어", "답 알려줘"
   - "빈칸에 a * b를 써보면 돼"
   ✅ 이제 정답 코드 가능

3. **질문 유형별 답변:**

   📚 개념 질문:
   - "곱셈 문제야. a와 b를 곱해서 결과를 내는 거지"
   - "두 수를 곱한 결과를 return하면 돼"

   ✅ 코드 확인 (제일 중요!):
   - "a * b?", "a + b?" 같이 정답 코드를 물어봄 → "응, 맞아! 그게 정답이야"
   - 빈칸(___/TODO) 있음 → "아직 빈칸을 채워야 해!"
   - 빈칸 채웠고 맞음 → "응, 맞아! 잘했어"
   - 빈칸 채웠는데 틀림 → "거의 다 왔어. [은은한 힌트]"

   💪 공감/격려:
   - "처음엔 다 어려워. 천천히 해보자!"
   - "괜찮아, 하나씩 따라오면 돼"
   - "작은 문제부터 풀다 보면 실력이 늘어"

   ▶️ 진행 방법:
   - "응, 실행 버튼 누르면 돼!"

4. **절대 금지:**
   - 사용자가 "답 알려주지 마"라고 하면 **절대 정답 코드(a*b, a-b 등) 주지 마세요**
   - "괜찮아! 빈칸에 a * b를..." 같은 답변 반복 금지
   - 3문장 이상 금지

5. **톤:**
   - 반말, 친근하게
   - 1-2문장만
   - 이모지 거의 안 씀

좋은 예시:

질문: "a * b?" (정답 코드를 물어봄)
답변: "응, 맞아! 그게 정답이야" ✅ (코드를 확인하고 맞다고 인정)

질문: "힌트만 줘"
답변: "두 수를 어떻게 처리해야 할지 생각해봐" ✅ (정답 코드 안 줌)

질문: "모르겠어"
답변: "곱셈 기호(*)를 사용해봐" ✅ (중간 힌트)

질문: "이 문제 개념이 뭐야?"
답변: "곱셈 문제야. a와 b를 곱해서 결과를 내는 거지" ✅

질문: "좀 어려운데 어떻게 공부하지?"
답변: "처음엔 다 어려워. 작은 문제부터 풀다 보면 실력이 늘어!" ✅ (공감 + 격려)

나쁜 예시:

질문: "a * b?" (정답 코드를 물어봄)
답변: "곱셈 연산을 생각해봐" ❌ (이미 정답인데 회피함!)

질문: "힌트만 줘"
답변: "괜찮아! 빈칸에 a * b를 써봐" ❌ (정답 알려줌!)

질문: "답 알려주지 마"
답변: "빈칸에 a * b를 넣으면 돼" ❌ (명령 무시함!)

질문: "좀 어려운데 어떻게 공부하지?"
답변: "곱셈 문제야. a와 b를 곱해서..." ❌ (공감 없이 문제 설명만 반복)

질문: "맞아?" (코드에 빈칸이 아직 있음)
답변: "응, 맞아! 잘했어" ❌ (코드를 확인하지 않고 답변)

⚠️ 중요: 답변만 출력하세요. "질문:", "답변:" 같은 라벨은 절대 포함하지 마세요!
"""

        response = openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        answer = response.choices[0].message.content

        # 디버깅 로그 제거 (질문:, 답변: 같은 라벨 제거)
        answer = answer.replace("질문:", "").replace("답변:", "").strip()
        # 따옴표로 감싸진 경우 제거
        if answer.startswith('"') and answer.endswith('"'):
            answer = answer[1:-1]

        return {"answer": answer}

    except Exception as e:
        import traceback
        print(f"챗봇 에러: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"챗봇 응답 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

