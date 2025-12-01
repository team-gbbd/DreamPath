"""
Q-net API 빠른 테스트 (독립 실행)
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("QNET_API_KEY", "")
print(f"API Key 설정됨: {'예' if API_KEY else '아니오'}")

async def test():
    url = "http://openapi.q-net.or.kr/api/service/rest/InquiryQualInfo/getList"

    params = {
        "serviceKey": API_KEY,
        "pageNo": 1,
        "numOfRows": 5,
        "jmNm": "정보처리"
    }

    print(f"\n요청 URL: {url}")
    print(f"검색어: 정보처리")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)

        print(f"\n응답 코드: {response.status_code}")
        print(f"\n응답 내용 (처음 1000자):")
        print(response.text[:1000])

if __name__ == "__main__":
    asyncio.run(test())
