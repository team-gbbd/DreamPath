"""
정체성 분석 서비스
LangChain을 사용하여 실시간 정체성 분석을 수행합니다.
"""
import json
import asyncio
from typing import Dict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from services.database_service import DatabaseService
from config import settings


class IdentityAnalysisService:
    """LangChain을 사용한 정체성 분석 서비스"""

    def __init__(self, api_key: str, model: str = None):
        model = model or settings.OPENAI_MODEL
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=1,
            max_completion_tokens=2000
        )
        self._db_service = None

    def _get_db_service(self) -> DatabaseService:
        """DatabaseService 싱글톤"""
        if self._db_service is None:
            self._db_service = DatabaseService()
        return self._db_service

    def _get_full_conversation(self, conversation_history: str, session_id: Optional[str] = None) -> str:
        """
        현재 세션의 대화 기록만 반환합니다.
        (이전 세션의 대화는 포함하지 않음 - 새 상담 시 정체성 초기화를 위해)
        """
        # 이전 세션 대화 조회 비활성화 - 새 상담마다 정체성을 새로 시작
        return conversation_history
    
    async def assess_clarity(self, conversation_history: str, session_id: Optional[str] = None) -> Dict:
        """
        정체성 명확도를 평가합니다.
        session_id가 있으면 해당 세션의 전체 대화 기록으로 분석합니다.

        Returns:
            {
                "clarity": 0-100,
                "reason": "평가 이유"
            }
        """
        # sessionId가 있으면 전체 대화 기록 포함
        full_history = self._get_full_conversation(conversation_history, session_id)
        system_prompt = """
대화 내용을 분석하여 학생의 진로 정체성이 얼마나 명확해졌는지 평가하세요.

평가 기준:
- 0-20: 아직 탐색 초기, 표면적인 대화
- 21-40: 흥미나 성향의 단서가 보이기 시작
- 41-60: 구체적인 패턴과 선호가 드러남
- 61-80: 가치관과 방향성이 명확해짐
- 81-100: 정체성이 확립되어 진로 연결 가능

JSON 형식으로만 응답하세요:
{{
  "clarity": 숫자 (0-100),
  "reason": "평가 이유"
}}
"""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"대화 내용:\n{full_history}")
        ]

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )

        return self._parse_clarity_response(response)

    async def extract_identity(self, conversation_history: str, session_id: Optional[str] = None) -> Dict:
        """
        정체성 특징을 추출합니다.
        session_id가 있으면 해당 세션의 전체 대화 기록으로 분석합니다.

        Returns:
            {
                "identityCore": "핵심 정체성",
                "confidence": 0-100,
                "traits": [...],
                "insights": [...],
                "nextFocus": "..."
            }
        """
        # sessionId가 있으면 전체 대화 기록 포함
        full_history = self._get_full_conversation(conversation_history, session_id)

        system_prompt = """
대화에서 드러난 학생의 정체성 특징을 추출하세요.

다음 형식의 JSON으로 응답하세요:
{{
  "identityCore": "핵심 정체성 한 문장 (예: 창작을 통해 사람들과 연결되는 사람)",
  "confidence": 확신도 (0-100),
  "traits": [
    {{
      "category": "성향|가치관|흥미|재능",
      "trait": "특징",
      "evidence": "대화에서의 근거"
    }}
  ],
  "insights": [
    "인사이트1: 대화에서 발견한 중요한 패턴",
    "인사이트2: ..."
  ],
  "nextFocus": "다음에 더 탐색해야 할 부분"
}}

중요: 아직 명확하지 않으면 identityCore를 "탐색 중..."으로 설정하세요.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"대화 내용:\n{full_history}")
        ]

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )

        return self._parse_identity_response(response)
    
    async def generate_insight(
        self, 
        recent_messages: str, 
        previous_context: str
    ) -> Dict:
        """
        최근 대화에서 발견한 인사이트를 생성합니다.
        
        Returns:
            {
                "hasInsight": true/false,
                "insight": "인사이트",
                "type": "성향|가치관|흥미|재능"
            }
        """
        system_prompt = """
방금 전 대화에서 중요한 정체성 단서를 발견했다면 알려주세요.

다음 형식의 JSON으로 응답하세요:
{{
  "hasInsight": true/false,
  "insight": "발견한 인사이트 (짧게, 1-2문장)",
  "type": "성향|가치관|흥미|재능"
}}

예시:
- "방금 말한 것에서 사용자 경험에 대한 깊은 관심이 보여요"
- "사람들에게 긍정적 영향을 주는 게 정말 중요한 가치구나"

중요: 정말 의미있는 발견이 있을 때만 hasInsight를 true로 하세요.
"""
        
        context = f"""
이전 대화 맥락:
{previous_context}

최근 메시지:
{recent_messages}
"""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=context)
        ]
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )
        
        return self._parse_insight_response(response)
    
    async def assess_stage_progress(
        self,
        conversation_history: str,
        current_stage: str,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        현재 단계에서 다음 단계로 넘어갈 준비가 되었는지 평가합니다.
        session_id가 있으면 해당 세션의 전체 대화 기록으로 분석합니다.

        Returns:
            {
                "readyToProgress": true/false,
                "reason": "판단 이유",
                "recommendation": "추천사항"
            }
        """
        # sessionId가 있으면 전체 대화 기록 포함
        full_history = self._get_full_conversation(conversation_history, session_id)

        system_prompt = f"""
현재 대화 단계: {current_stage}

이 단계에서 충분히 탐색이 이루어졌는지 평가하세요.

다음 형식의 JSON으로 응답하세요:
{{
  "readyToProgress": true/false,
  "reason": "판단 이유",
  "recommendation": "더 탐색해야 할 부분 또는 다음 단계 제안"
}}

평가 기준:
- PRESENT: 현재 감정과 고민이 명확히 드러났는가?
- PAST: 의미있는 경험과 몰입 순간을 찾았는가?
- VALUES: 핵심 가치관이 드러났는가?
- FUTURE: 지향하는 미래 모습이 그려졌는가?
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"대화 내용:\n{full_history}")
        ]

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.llm.invoke(messages).content
        )
        
        return self._parse_progress_response(response)
    
    def _parse_clarity_response(self, response: str) -> Dict:
        """명확도 응답 파싱"""
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            return {
                "clarity": data.get("clarity", 0),
                "reason": data.get("reason", "")
            }
        except Exception as e:
            return {
                "clarity": 0,
                "reason": "분석 중 오류가 발생했습니다."
            }
    
    def _parse_identity_response(self, response: str) -> Dict:
        """정체성 응답 파싱"""
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            return {
                "identityCore": data.get("identityCore", "탐색 중..."),
                "confidence": data.get("confidence", 0),
                "traits": data.get("traits", []),
                "insights": data.get("insights", []),
                "nextFocus": data.get("nextFocus", "")
            }
        except Exception as e:
            return {
                "identityCore": "탐색 중...",
                "confidence": 0,
                "traits": [],
                "insights": [],
                "nextFocus": "대화를 계속해주세요"
            }
    
    def _parse_insight_response(self, response: str) -> Dict:
        """인사이트 응답 파싱"""
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            return {
                "hasInsight": data.get("hasInsight", False),
                "insight": data.get("insight", ""),
                "type": data.get("type", "")
            }
        except Exception as e:
            return {
                "hasInsight": False,
                "insight": "",
                "type": ""
            }
    
    def _parse_progress_response(self, response: str) -> Dict:
        """진행 평가 응답 파싱"""
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            return {
                "readyToProgress": data.get("readyToProgress", False),
                "reason": data.get("reason", ""),
                "recommendation": data.get("recommendation", "")
            }
        except Exception as e:
            return {
                "readyToProgress": False,
                "reason": "평가 중 오류 발생",
                "recommendation": ""
            }
    
    def _extract_json(self, text: str) -> str:
        """텍스트에서 JSON 추출"""
        import re
        # JSON 코드 블록에서 추출
        json_match = re.search(r'```json\s*(\{.*?\}|\[.*?\])\s*```', text, re.DOTALL)
        if json_match:
            return json_match.group(1).strip()
        
        # 일반 코드 블록에서 추출
        code_match = re.search(r'```\s*(\{.*?\}|\[.*?\])\s*```', text, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()
        
        # JSON 객체 직접 찾기
        json_obj_match = re.search(r'\{.*\}|\[.*\]', text, re.DOTALL)
        if json_obj_match:
            return json_obj_match.group(0).strip()
        
        return text.strip()

