# -*- coding: utf-8 -*-
import httpx
from bs4 import BeautifulSoup
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test_jobkorea():
    url = "https://www.jobkorea.co.kr/recruit/joblist"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    print(f"잡코리아 페이지 가져오기: {url}")

    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        print(f"HTTP 상태: {response.status_code}")

        if response.status_code == 200:
            html = response.text
            soup = BeautifulSoup(html, "lxml")

            # 여러 패턴으로 공고 아이템 찾기
            patterns = [
                ("data-gno", soup.find_all("div", {"data-gno": True})),
                ("list-item 클래스", soup.find_all("div", class_=lambda x: x and 'list' in x.lower() and 'item' in x.lower())),
                ("recruit 관련", soup.find_all("div", class_=lambda x: x and 'recruit' in x.lower())),
            ]

            for pattern_name, items in patterns:
                print(f"\n[{pattern_name}] 발견된 아이템 수: {len(items)}")
                if items and len(items) > 0:
                    print(f"첫 번째 아이템 샘플 (처음 500자):")
                    print(str(items[0])[:500])
                    print("...")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_jobkorea())
