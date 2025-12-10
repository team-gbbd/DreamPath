"""
OpenAI API 서비스
"""
import os
import json
import re
from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class OpenAIService:
    """OpenAI API를 사용한 AI 서비스"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            # API 키가 없어도 서비스는 시작되지만, 실제 호출 시 에러 발생
            self.client = None
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        else:
            self.client = OpenAI(api_key=api_key)
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    def get_analysis(
        self, 
        messages: List[Dict[str, str]], 
        analysis_type: str = "general"
    ) -> str:
        """
        OpenAI API를 호출하여 분석을 수행합니다.
        
        Args:
            messages: 메시지 리스트 (system, user 메시지 포함)
            analysis_type: 분석 유형 (emotion, personality, interest 등)
        
        Returns:
            AI 응답 텍스트
        """
        if not self.client:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY를 설정해주세요.")
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=1,
                max_completion_tokens=2000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API 호출 실패: {str(e)}")
    
    def extract_json(self, text: str) -> str:
        """
        텍스트에서 JSON 부분을 추출합니다.
        """
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

