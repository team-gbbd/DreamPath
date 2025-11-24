import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test_saramin_list():
    """사람인 리스트 페이지 테스트"""
    url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic?searchword=개발자"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)

            print(f"상태 코드: {response.status_code}")
            print(f"URL: {response.url}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')

                # 채용공고 아이템 찾기
                job_items = soup.find_all(['div', 'article', 'li'], class_=re.compile(r'.*recruit.*|.*item.*|.*list.*', re.I))

                print(f"\n발견된 아이템 수: {len(job_items)}")

                # 처음 3개 아이템 분석
                for idx, item in enumerate(job_items[:3]):
                    print(f"\n=== 아이템 {idx + 1} ===")

                    # 제목 찾기
                    title_elem = (
                        item.find("a", class_=re.compile(r".*job_tit.*|.*title.*", re.I)) or
                        item.find("h2") or
                        item.find("h3")
                    )
                    if title_elem:
                        print(f"제목: {title_elem.get_text(strip=True)[:100]}")

                    # 회사명 찾기
                    company_elem = (
                        item.find("a", class_=re.compile(r".*company.*|.*corp.*", re.I)) or
                        item.find("strong", class_=re.compile(r".*company.*", re.I))
                    )
                    if company_elem:
                        print(f"회사명: {company_elem.get_text(strip=True)}")

                    # URL 찾기
                    link = item.find("a", href=re.compile(r"/zf_user/jobs"))
                    if link:
                        href = link.get('href')
                        print(f"링크: {href[:100] if href else 'None'}")

                # 실제 채용공고 개수 확인
                actual_jobs = soup.find_all("div", class_=re.compile(r"item_recruit", re.I))
                print(f"\n실제 채용공고 (item_recruit): {len(actual_jobs)}개")

    except Exception as e:
        print(f"오류: {e}")

if __name__ == "__main__":
    asyncio.run(test_saramin_list())
