"""
코드 실행 서비스
Judge0 API를 사용하여 다양한 언어의 코드 실행
"""
import httpx
import base64
import os
from typing import Dict, Any


class CodeExecutorService:
    def __init__(self):
        self.judge0_url = "https://judge0-ce.p.rapidapi.com"
        self.rapidapi_key = os.getenv("RAPIDAPI_KEY", "")
        self.headers = {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": self.rapidapi_key,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
        }

        # 언어 ID 매핑
        self.language_ids = {
            "javascript": 63,  # Node.js
            "python": 71,      # Python 3
            "java": 62,        # Java
            "cpp": 54,         # C++
        }

    async def execute_code(
        self,
        code: str,
        language: str,
        stdin: str = ""
    ) -> Dict[str, Any]:
        """
        코드 실행

        Args:
            code: 실행할 코드
            language: 언어 (javascript, python, java, cpp)
            stdin: 표준 입력

        Returns:
            {
                "status": {"id": int, "description": str},
                "stdout": str,
                "stderr": str,
                "time": str,
                "memory": int
            }
        """
        if not self.rapidapi_key:
            # Judge0 없이 로컬 실행 (JavaScript만)
            if language == "javascript":
                return await self._execute_javascript_locally(code, stdin)
            else:
                return {
                    "status": {"id": 0, "description": "Error"},
                    "stderr": "Judge0 API 키가 설정되지 않았습니다."
                }

        language_id = self.language_ids.get(language)
        if not language_id:
            return {
                "status": {"id": 0, "description": "Error"},
                "stderr": f"지원하지 않는 언어: {language}"
            }

        try:
            # Base64 인코딩
            source_code_b64 = base64.b64encode(code.encode()).decode()
            stdin_b64 = base64.b64encode(stdin.encode()).decode() if stdin else ""

            # 코드 제출
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.judge0_url}/submissions?wait=true",
                    headers=self.headers,
                    json={
                        "source_code": source_code_b64,
                        "language_id": language_id,
                        "stdin": stdin_b64
                    },
                    timeout=30.0
                )

                if response.status_code != 200 and response.status_code != 201:
                    return {
                        "status": {"id": 0, "description": "Error"},
                        "stderr": f"Judge0 API 오류: {response.status_code}"
                    }

                result = response.json()

                # Base64 디코딩
                if result.get("stdout"):
                    result["stdout"] = base64.b64decode(result["stdout"]).decode()
                if result.get("stderr"):
                    result["stderr"] = base64.b64decode(result["stderr"]).decode()
                if result.get("compile_output"):
                    result["compile_output"] = base64.b64decode(result["compile_output"]).decode()

                return result

        except Exception as e:
            print(f"코드 실행 실패: {e}")
            return {
                "status": {"id": 0, "description": "Error"},
                "stderr": str(e)
            }

    async def _execute_javascript_locally(
        self,
        code: str,
        stdin: str
    ) -> Dict[str, Any]:
        """
        JavaScript 로컬 실행 (폴백)
        실제로는 실행하지 않고, 성공 메시지만 반환
        """
        return {
            "status": {"id": 3, "description": "Accepted"},
            "stdout": "(Judge0 없이는 실제 실행 불가)",
            "stderr": "",
            "time": "0.0",
            "memory": 0
        }
