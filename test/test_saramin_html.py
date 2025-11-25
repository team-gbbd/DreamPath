import asyncio
import httpx
from bs4 import BeautifulSoup

async def test_saramin_html():
    """사람인 기업 페이지 HTML 구조 확인"""
    # 예시 company_id (실제 크롤링 결과에서 가져온 것)
    company_id = "100"  # 임시 ID

    # 사람인 기업 상세 URL
    company_url = f"https://www.saramin.co.kr/zf_user/company-info/view?csn={company_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"\n사람인 기업 페이지 크롤링: {company_url}")
        response = await client.get(company_url)

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # 기업 정보 테이블 찾기
            print("\n=== table 구조 찾기 ===")
            tables = soup.find_all('table')
            print(f"총 {len(tables)}개의 table 태그 발견\n")

            for idx, table in enumerate(tables[:3]):  # 처음 3개만
                print(f"\n--- Table #{idx + 1} ---")
                rows = table.find_all('tr')
                for row in rows[:10]:  # 각 테이블의 처음 10개 row
                    ths = row.find_all('th')
                    tds = row.find_all('td')

                    if ths and tds:
                        for th, td in zip(ths, tds):
                            th_text = th.get_text(strip=True)
                            td_text = td.get_text(strip=True)
                            print(f"{th_text}: {td_text}")

            # dl/dt/dd 구조도 확인
            print("\n\n=== dl/dt/dd 구조 ===")
            info_sections = soup.find_all('dl')
            print(f"총 {len(info_sections)}개의 dl 태그 발견\n")

            for idx, dl in enumerate(info_sections[:5]):  # 처음 5개만
                print(f"\n--- dl #{idx + 1} ---")
                dt_tags = dl.find_all('dt')
                dd_tags = dl.find_all('dd')

                for dt, dd in zip(dt_tags, dd_tags):
                    dt_text = dt.get_text(strip=True)
                    dd_text = dd.get_text(strip=True)
                    if dt_text and dd_text:
                        print(f"{dt_text}: {dd_text}")

            # div with specific classes
            print("\n\n=== 기타 정보 구조 ===")
            info_divs = soup.find_all('div', class_=lambda x: x and ('info' in x.lower() or 'detail' in x.lower()))
            print(f"info/detail div: {len(info_divs)}개")

        else:
            print(f"에러 ({response.status_code})")

if __name__ == "__main__":
    asyncio.run(test_saramin_html())
