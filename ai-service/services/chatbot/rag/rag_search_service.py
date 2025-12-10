import os
import httpx
from typing import List, Dict, Any


class RagSearchService:
    def __init__(self):
        self.pinecone_api_key = os.getenv("PINECONE_FAQ_API_KEY", "dummykey")
        self.pinecone_host = os.getenv("PINECONE_FAQ_HOST", "dummy-host.pinecone.io")

    def search(self, vector: List[float], user_type: str = "guest", top_k: int = 5) -> List[Dict[str, Any]]:
        """Pinecone에서 벡터 검색 (user_type 필터링 포함)"""
        # Pinecone이 설정되지 않았으면 빈 배열 반환
        if self.pinecone_api_key == "dummykey" or self.pinecone_host == "dummy-host.pinecone.io":
            return []

        try:
            url = f"https://{self.pinecone_host}/query"
            headers = {
                "Api-Key": self.pinecone_api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "vector": vector,
                "topK": top_k,
                "includeMetadata": True,
                "filter": {
                    "user_type": {"$in": [user_type, "both"]}
                }
            }

            with httpx.Client() as client:
                response = client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                return data.get("matches", [])

        except Exception as e:
            # Pinecone 검색 실패 시 빈 배열 반환 (서비스는 계속 동작)
            print(f"Pinecone 검색 실패: {str(e)}")
            return []
