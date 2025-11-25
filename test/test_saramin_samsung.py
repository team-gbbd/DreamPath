import asyncio
import httpx
from bs4 import BeautifulSoup

async def test_saramin_samsung():
    """사람인 삼성전자 페이지 HTML 구조 확인"""
    company_id = "41355"  # 삼성전자
    company_url = f"https://www.saramin.co.kr/zf_user/company-info/view?csn={company_id}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        print(f"\n사람인 기업 페이지 크롤링: {company_url}")
        response = await client.get(company_url)

        print(f"Status: {response.status_code}")
        print(f"Final URL: {response.url}")

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # 기업 정보 테이블 찾기
            print("\n=== div.company_info_table 찾기 ===")
            info_div = soup.find('div', class_='company_info_table')
            if info_div:
                print("Found company_info_table div!")
                tables = info_div.find_all('table')
                print(f"테이블 개수: {len(tables)}")

                for idx, table in enumerate(tables):
                    print(f"\n--- Table #{idx + 1} ---")
                    rows = table.find_all('tr')
                    for row_idx, row in enumerate(rows):
                        ths = row.find_all('th')
                        tds = row.find_all('td')

                        if ths and tds:
                            for th, td in zip(ths, tds):
                                th_text = th.get_text(strip=True)
                                td_text = td.get_text(strip=True)
                                print(f"  {th_text}: {td_text}")
            else:
                print("company_info_table div NOT found")

                # 다른 방법으로 찾기
                print("\n=== 모든 table 찾기 ===")
                all_tables = soup.find_all('table')
                print(f"전체 table 개수: {len(all_tables)}")

                for idx, table in enumerate(all_tables[:3]):
                    print(f"\n--- Table #{idx + 1} ---")
                    print(f"Classes: {table.get('class')}")
                    rows = table.find_all('tr')[:5]
                    for row in rows:
                        print(f"  Row: {row.get_text(strip=True)[:100]}")

        else:
            print(f"에러 ({response.status_code})")

if __name__ == "__main__":
    asyncio.run(test_saramin_samsung())
