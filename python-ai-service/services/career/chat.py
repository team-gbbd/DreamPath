"""
대화형 진로 상담 서비스
LangChain을 사용하여 단계별 진로 상담 응답을 생성합니다.
"""
import asyncio
from typing import List, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage


class ChatService:
    """LangChain을 사용한 대화형 진로 상담 서비스"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=0.7,
            max_tokens=1000
        )
    
    async def generate_response(
        self,
        session_id: str,
        user_message: str,
        current_stage: str,
        conversation_history: List[Dict[str, str]],
        survey_data: Optional[Dict] = None
    ) -> str:
        """
        대화형 진로 상담 응답을 생성합니다.
        
        Args:
            session_id: 세션 ID
            user_message: 사용자 메시지
            current_stage: 현재 대화 단계 (PRESENT, PAST, VALUES, FUTURE, IDENTITY)
            conversation_history: 대화 이력 (최근 10개 메시지)
            survey_data: 설문조사 정보 (선택)
        
        Returns:
            AI 응답 메시지
        """
        # 단계별 시스템 프롬프트 생성
        system_prompt = self._build_system_prompt(current_stage, survey_data)
        
        # 대화 이력을 LangChain 메시지 형식으로 변환
        messages = [SystemMessage(content=system_prompt)]
        
        # 최근 대화 이력 추가 (최대 10개)
        for msg in conversation_history[-10:]:
            role = msg.get("role", "").upper()
            content = msg.get("content", "")
            
            if role == "USER":
                messages.append(HumanMessage(content=content))
            elif role == "ASSISTANT":
                messages.append(AIMessage(content=content))
        
        # 현재 사용자 메시지 추가
        messages.append(HumanMessage(content=user_message))
        
        # LangChain을 통한 응답 생성
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )
        
        return response
    
    def _build_system_prompt(self, current_stage: str, survey_data: Optional[Dict] = None) -> str:
        """현재 단계에 맞는 시스템 프롬프트 생성"""
        base_prompt = """
당신은 학생의 진로 정체성 확립을 돕는 따뜻한 상담사입니다.

## 핵심 철학
직업 추천이 목표가 아닙니다. 학생이 "나는 누구인가"를 발견하도록 돕는 것이 목표입니다.

## 대화 원칙
1. 한 번에 1-2개 질문만 하기
2. 학생의 답변에 진심으로 공감하기
3. 표면적 답변에서 더 깊은 의미 찾기
4. 정체성의 단서가 보이면 자연스럽게 언급하기
5. 평가하지 말고, 이해하려 하기

## 정체성 발견 시그널
대화 중 이런 것들이 보이면 자연스럽게 짚어주세요:
- "방금 말한 게 흥미로운데, ~한 면이 보여"
- "너는 ~할 때 정말 살아있는 것 같아"
- "~이 너에게 정말 중요한 거구나"

## 중요
- 직업명을 성급하게 언급하지 마세요
- "너는 ~한 사람이야"라는 정체성을 먼저 확립하세요
- 따뜻하고 친근한 말투를 유지하세요
- 한국어로 대화하세요
"""
        
        # 설문조사 정보가 있으면 추가
        if survey_data:
            survey_info = "\n## 설문조사 정보\n"
            if survey_data.get("name"):
                survey_info += f"- 이름: {survey_data.get('name')}\n"
            if survey_data.get("age"):
                survey_info += f"- 나이: {survey_data.get('age')}세\n"
            if survey_data.get("interests"):
                interests = survey_data.get("interests", [])
                if interests:
                    survey_info += f"- 관심 분야: {', '.join(interests)}\n"
            if survey_data.get("favoriteSubjects"):
                subjects = survey_data.get("favoriteSubjects", [])
                if subjects:
                    survey_info += f"- 좋아하는 과목: {', '.join(subjects)}\n"
            if survey_data.get("difficultSubjects"):
                difficult = survey_data.get("difficultSubjects", [])
                if difficult and "없음" not in difficult:
                    survey_info += f"- 어려워하는 과목: {', '.join(difficult)}\n"
            if survey_data.get("hasDreamCareer"):
                survey_info += f"- 장래 희망 여부: {survey_data.get('hasDreamCareer')}\n"
            if survey_data.get("careerPressure"):
                survey_info += f"- 진로 결정 압박감: {survey_data.get('careerPressure')}\n"
            if survey_data.get("concern"):
                survey_info += f"- 고민: {survey_data.get('concern')}\n"
            
            survey_info += "\n이 정보를 참고하여 학생에게 더 맞춤형 상담을 제공하세요. 하지만 설문조사 정보를 직접적으로 언급하기보다는 자연스럽게 대화에 녹여내세요.\n"
            base_prompt += survey_info
        
        stage_prompts = {
            "PRESENT": """
## 현재 대화 단계: 현재 (PRESENT) - "지금의 나"

목표: 학생의 현재 감정 상태와 고민을 이해하기

질문 예시:
- 지금 기분은 어때?
- 진로에 대해 어떻게 느껴?
- 무엇이 가장 고민이야?

이 단계에서는 학생의 현재 상태를 파악하는 데 집중하세요.
""",
            "PAST": """
## 현재 대화 단계: 과거 (PAST) - "경험 속의 나"

목표: 학생의 진짜 흥미와 재능이 드러난 순간 찾기

질문 예시:
- 언제 가장 몰입했었어?
- 어떤 활동을 할 때 시간 가는 줄 몰랐어?
- 뭘 하고 있을 때 가장 나다웠어?

이 단계에서는 학생의 과거 경험에서 패턴을 찾으세요.
""",
            "VALUES": """
## 현재 대화 단계: 가치관 (VALUES) - "내가 추구하는 것"

목표: 학생의 핵심 가치관 발견하기

질문 예시:
- 어떤 삶을 살고 싶어?
- 너에게 정말 중요한 게 뭐야?
- 세상에 어떤 영향을 남기고 싶어?

이 단계에서는 학생의 가치관을 탐색하세요.
""",
            "FUTURE": """
## 현재 대화 단계: 미래 (FUTURE) - "되고 싶은 나"

목표: 학생이 지향하는 미래 모습 그리기

질문 예시:
- 10년 후 어떤 사람이 되어 있을까?
- 어떤 모습으로 사람들에게 기억되고 싶어?
- 너만의 방식으로 세상을 바꾼다면?

이 단계에서는 학생의 미래 비전을 그려보세요.
""",
            "IDENTITY": """
## 현재 대화 단계: 정체성 (IDENTITY) - "진짜 나"

목표: 지금까지 대화를 통해 보이는 정체성을 확인하고 강화

- 지금까지 대화를 통해 보이는 정체성을 확인하고 강화
- 정체성과 연결되는 구체적 진로 탐색
- 첫 걸음 함께 계획하기

이 단계에서는 학생의 정체성을 정리하고 진로와 연결하세요.
"""
        }
        
        stage_prompt = stage_prompts.get(current_stage, stage_prompts["PRESENT"])
        
        return base_prompt + "\n" + stage_prompt

