import asyncio
import httpx
from bs4 import BeautifulSoup

async def test_wanted_html():
    """원티드 기업 페이지 HTML 구조 확인"""
    company_id = "104"  # SM엔터테인먼트
    web_url = f"https://www.wanted.co.kr/company/{company_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"\n원티드 기업 페이지 크롤링: {web_url}")
        response = await client.get(web_url)

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # dl/dt/dd 구조 찾기
            print("\n=== dl/dt/dd 구조 ===")
            info_sections = soup.find_all('dl')
            print(f"총 {len(info_sections)}개의 dl 태그 발견\n")

            for idx, dl in enumerate(info_sections):
                print(f"\n--- dl #{idx + 1} ---")
                dt_tags = dl.find_all('dt')
                dd_tags = dl.find_all('dd')

                for dt, dd in zip(dt_tags, dd_tags):
                    dt_text = dt.get_text(strip=True)
                    dd_text = dd.get_text(strip=True)
                    print(f"{dt_text}: {dd_text}")

            # 다른 가능한 구조도 확인
            print("\n\n=== 기타 정보 구조 ===")
            # table 구조
            tables = soup.find_all('table')
            print(f"table 태그: {len(tables)}개")

            # div with class containing 'info' or 'detail'
            info_divs = soup.find_all('div', class_=lambda x: x and ('info' in x.lower() or 'detail' in x.lower()))
            print(f"info/detail div: {len(info_divs)}개")

        else:
            print(f"에러 ({response.status_code})")

if __name__ == "__main__":
    asyncio.run(test_wanted_html())
