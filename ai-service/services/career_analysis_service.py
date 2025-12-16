"""
진로 분석 서비스
대화 내용을 기반으로 감정, 성향, 흥미를 분석하고 진로를 추천합니다.
"""
import json
from typing import List, Optional
from services.openai_service import OpenAIService
from services.database_service import DatabaseService


class CareerAnalysisService:
    """진로 분석 서비스"""
    
    def __init__(self, openai_service: OpenAIService, db_service: Optional[DatabaseService] = None):
        self.openai_service = openai_service
        self.db_service = db_service or DatabaseService()
    
    async def analyze_session(
        self, 
        session_id: str, 
        conversation_history: str
    ) -> dict:
        """
        세션의 대화 내용을 종합적으로 분석합니다.
        
        Args:
            session_id: 세션 ID
            conversation_history: 대화 내용
        
        Returns:
            분석 결과 딕셔너리
        """
        # 감정 분석
        emotion_analysis = await self.analyze_emotion(conversation_history)
        
        # 성향 분석
        personality_analysis = await self.analyze_personality(conversation_history)
        
        # 흥미 분석
        interest_analysis = await self.analyze_interest(conversation_history)
        
        # 종합 분석
        comprehensive_analysis = await self.generate_comprehensive_analysis(
            emotion_analysis, personality_analysis, interest_analysis
        )
        
        # 진로 추천
        career_recommendations = await self.generate_career_recommendations(
            emotion_analysis, personality_analysis, interest_analysis
        )

        analysis_result = {
            "sessionId": session_id,
            "emotion": emotion_analysis,
            "personality": personality_analysis,
            "interest": interest_analysis,
            "comprehensiveAnalysis": comprehensive_analysis,
            "recommendedCareers": career_recommendations
        }
        
        # DB 저장
        try:
            self.db_service.save_career_analysis(
                session_identifier=session_id,
                user_id=None,
                analysis_data=analysis_result
            )
            print(f"[CareerAnalysisService] 분석 결과 저장 완료 (sessionId={session_id})")
        except Exception as e:
            print(f"[CareerAnalysisService] 분석 결과 저장 실패 (sessionId={session_id}): {e}")
        
        return analysis_result
    
    async def analyze_emotion(self, conversation_history: str) -> dict:
        """감정 분석"""
        prompt = f"""
다음 대화 내용을 바탕으로 학생의 감정 상태를 분석해주세요.

대화 내용:
{conversation_history}

다음 형식의 JSON으로 응답해주세요:
{{
    "description": "감정 분석 상세 설명",
    "score": 1-100 사이의 점수 (긍정적일수록 높음),
    "emotionalState": "긍정적/중립적/부정적/혼합"
}}
"""
        
        messages = [
            {"role": "system", "content": "당신은 심리 분석 전문가입니다. JSON 형식으로만 응답해주세요."},
            {"role": "user", "content": prompt}
        ]
        
        # 동기 함수를 비동기로 실행
        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            self.openai_service.get_analysis, 
            messages, 
            "emotion"
        )
        return self._parse_emotion_analysis(response)
    
    async def analyze_personality(self, conversation_history: str) -> dict:
        """성향 분석"""
        prompt = f"""
다음 대화 내용을 바탕으로 학생의 성향을 분석해주세요.

대화 내용:
{conversation_history}

다음 형식의 JSON으로 응답해주세요:
{{
    "description": "성향 분석 상세 설명",
    "type": "성격 유형 (예: 외향적, 내향적, 분석적 등)",
    "strengths": ["강점1", "강점2", "강점3"],
    "growthAreas": ["발전영역1", "발전영역2"],
    "big_five": {{
        "openness": 50,
        "conscientiousness": 50,
        "extraversion": 50,
        "agreeableness": 50,
        "neuroticism": 50
    }}
}}
(big_five 점수는 1-100 사이의 정수로 입력해주세요)
"""
        
        messages = [
            {"role": "system", "content": "당신은 성격 분석 전문가입니다. JSON 형식으로만 응답해주세요."},
            {"role": "user", "content": prompt}
        ]
        
        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            self.openai_service.get_analysis,
            messages,
            "personality"
        )
        return self._parse_personality_analysis(response)

    def _parse_personality_analysis(self, response: str) -> dict:
        """성향 분석 JSON 파싱"""
        try:
            json_str = self.openai_service.extract_json(response)
            data = json.loads(json_str)

            # Sanitize Big Five to ensure integers
            big_five = data.get("big_five", {})
            sanitized_big_five = {}
            for key in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
                val = big_five.get(key, 50)
                # Handle nested dict if LLM returns it (e.g. {"score": 80})
                if isinstance(val, dict):
                     val = val.get("score", 50)
                
                try:
                    sanitized_big_five[key] = int(float(val))
                except:
                    sanitized_big_five[key] = 50

            return {
                "description": data.get("description", "분석 중 오류가 발생했습니다."),
                "type": data.get("type", "미분류"),
                "strengths": data.get("strengths", []),
                "growthAreas": data.get("growthAreas", []),
                "big_five": sanitized_big_five
            }
        except Exception as e:
            return {
                "description": "분석 중 오류가 발생했습니다.",
                "type": "미분류",
                "strengths": [],
                "growthAreas": [],
                "big_five": {}
            }
    
    async def analyze_interest(self, conversation_history: str) -> dict:
        """흥미 분석"""
        prompt = f"""
다음 대화 내용을 바탕으로 학생의 흥미 분야를 분석해주세요.

대화 내용:
{conversation_history}

다음 형식의 JSON으로 응답해주세요:
{{
    "description": "흥미 분석 상세 설명",
    "areas": [
        {{"name": "분야명1", "level": 1-10, "description": "설명1"}},
        {{"name": "분야명2", "level": 1-10, "description": "설명2"}}
    ]
}}
"""
        
        messages = [
            {"role": "system", "content": "당신은 진로 상담 전문가입니다. JSON 형식으로만 응답해주세요."},
            {"role": "user", "content": prompt}
        ]
        
        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            self.openai_service.get_analysis,
            messages,
            "interest"
        )
        return self._parse_interest_analysis(response)
    
    async def generate_comprehensive_analysis(
        self, 
        emotion: dict, 
        personality: dict, 
        interest: dict
    ) -> str:
        """종합 분석 생성"""
        prompt = f"""
다음 분석 결과를 종합하여 학생에게 따뜻하고 격려하는 종합 분석을 작성해주세요.

감정 분석: {emotion.get('description', '')} (점수: {emotion.get('score', 0)}, 상태: {emotion.get('emotionalState', '')})
성향 분석: {personality.get('description', '')} (유형: {personality.get('type', '')})
흥미 분석: {interest.get('description', '')}

학생이 자신을 더 잘 이해하고 진로 방향을 설정하는 데 도움이 되는 
따뜻하고 구체적인 조언을 포함해주세요.
"""
        
        messages = [
            {"role": "system", "content": "당신은 친근한 진로 상담 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.openai_service.get_analysis,
            messages,
            "comprehensive"
        )
    
    async def generate_career_recommendations(
        self, 
        emotion: dict, 
        personality: dict, 
        interest: dict
    ) -> List[dict]:
        """진로 추천 생성"""
        strengths_str = ", ".join(personality.get('strengths', []))
        
        prompt = f"""
다음 분석 결과를 바탕으로 학생에게 적합한 진로를 3-5개 추천해주세요.

감정 분석: {emotion.get('description', '')} (점수: {emotion.get('score', 0)}, 상태: {emotion.get('emotionalState', '')})
성향 분석: {personality.get('description', '')} (유형: {personality.get('type', '')}, 강점: {strengths_str})
흥미 분야: {interest.get('description', '')}

다음 형식의 JSON 배열로 응답해주세요:
[
    {{
        "careerName": "진로명",
        "description": "진로 설명",
        "matchScore": 1-100,
        "reasons": ["추천 이유1", "추천 이유2", "추천 이유3"]
    }}
]
"""
        
        messages = [
            {"role": "system", "content": "당신은 진로 추천 전문가입니다. JSON 형식으로만 응답해주세요."},
            {"role": "user", "content": prompt}
        ]
        
        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            self.openai_service.get_analysis,
            messages,
            "career_recommendation"
        )
        return self._parse_career_recommendations(response)
    
    # JSON 파싱 헬퍼 메서드들
    def _parse_emotion_analysis(self, response: str) -> dict:
        """감정 분석 JSON 파싱"""
        try:
            json_str = self.openai_service.extract_json(response)
            data = json.loads(json_str)
            return {
                "description": data.get("description", "분석 중 오류가 발생했습니다."),
                "score": data.get("score", 50),
                "emotionalState": data.get("emotionalState", "중립적")
            }
        except Exception as e:
            return {
                "description": "분석 중 오류가 발생했습니다.",
                "score": 50,
                "emotionalState": "중립적"
            }
    
    def _parse_personality_analysis(self, response: str) -> dict:
        """성향 분석 JSON 파싱"""
        try:
            json_str = self.openai_service.extract_json(response)
            data = json.loads(json_str)
            return {
                "description": data.get("description", "분석 중 오류가 발생했습니다."),
                "type": data.get("type", "미분류"),
                "strengths": data.get("strengths", []),
                "growthAreas": data.get("growthAreas", []),
                "big_five": data.get("big_five", {})
            }
        except Exception as e:
            return {
                "description": "분석 중 오류가 발생했습니다.",
                "type": "미분류",
                "strengths": [],
                "growthAreas": []
            }
    
    def _parse_interest_analysis(self, response: str) -> dict:
        """흥미 분석 JSON 파싱"""
        try:
            json_str = self.openai_service.extract_json(response)
            data = json.loads(json_str)
            return {
                "description": data.get("description", "분석 중 오류가 발생했습니다."),
                "areas": data.get("areas", [])
            }
        except Exception as e:
            return {
                "description": "분석 중 오류가 발생했습니다.",
                "areas": []
            }
    
    def _parse_career_recommendations(self, response: str) -> List[dict]:
        """진로 추천 JSON 파싱"""
        try:
            json_str = self.openai_service.extract_json(response)
            data = json.loads(json_str)
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            return []
