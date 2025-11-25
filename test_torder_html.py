import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test_torder():
    """티오더 페이지 확인 - job_id 324360"""
    job_id = "324360"

    # Step 1: job API로 company_id 가져오기
    job_api_url = f"https://www.wanted.co.kr/api/v4/jobs/{job_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        print(f"\n1. Job API 호출: {job_api_url}")
        job_response = await client.get(job_api_url)

        if job_response.status_code == 200:
            job_data = job_response.json()
            company_id = job_data.get('job', {}).get('company', {}).get('id')
            print(f"company_id: {company_id}")

            if company_id:
                # Step 2: company 페이지 크롤링
                web_url = f"https://www.wanted.co.kr/company/{company_id}"
                print(f"\n2. Company 페이지 크롤링: {web_url}")

                web_response = await client.get(web_url)

                if web_response.status_code == 200:
                    soup = BeautifulSoup(web_response.text, 'html.parser')

                    # dl/dt/dd 구조 찾기
                    print("\n=== dl/dt/dd 구조 ===")
                    info_sections = soup.find_all('dl')
                    print(f"총 {len(info_sections)}개의 dl 태그 발견\n")

                    for idx, dl in enumerate(info_sections):
                        dt_tags = dl.find_all('dt')
                        dd_tags = dl.find_all('dd')

                        for dt, dd in zip(dt_tags, dd_tags):
                            dt_text = dt.get_text(strip=True)
                            dd_text = dd.get_text(strip=True)
                            print(f"[{idx+1}] {dt_text}: {dd_text}")

                            # 매칭 테스트
                            if '자본금' in dt_text:
                                print(f"  -> capital 매칭!")
                            if '기업형태' in dt_text:
                                print(f"  -> company_type 매칭!")
                            if '매출액' in dt_text:
                                print(f"  -> revenue 매칭!")
                            if '대표' in dt_text and '대표산업' not in dt_text:
                                print(f"  -> ceo_name 매칭!")
                            if '평균연봉' in dt_text or '연봉' in dt_text:
                                print(f"  -> average_salary 매칭!")

                else:
                    print(f"Company 페이지 에러 ({web_response.status_code})")
        else:
            print(f"Job API 에러 ({job_response.status_code})")

if __name__ == "__main__":
    asyncio.run(test_torder())
