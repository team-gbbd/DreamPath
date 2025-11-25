import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test_saramin_list():
    """사람인 목록 페이지 HTML 구조 확인"""
    url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        print(f"\n사람인 목록 페이지 크롤링: {url}")
        response = await client.get(url)

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # 공고 아이템 찾기
            print("\n=== 공고 아이템 찾기 ===")

            # 다양한 패턴으로 공고 아이템 찾기
            job_items = []

            patterns = [
                {'name': 'recruit_info', 'find': lambda s: s.find_all('div', class_=re.compile(r'recruit_info|item_recruit'))},
                {'name': 'list_item', 'find': lambda s: s.find_all('div', class_=re.compile(r'list_item|job_item'))},
                {'name': 'data-recruit-no', 'find': lambda s: s.find_all(attrs={'data-recruit-no': True})}
            ]

            for pattern in patterns:
                items = pattern['find'](soup)
                if items:
                    print(f"\n{pattern['name']} 패턴: {len(items)}개 발견")
                    if len(items) > 0:
                        job_items = items
                        print(f"✓ 이 패턴 사용")
                        break

            if not job_items:
                print("공고 아이템을 찾을 수 없습니다.")
                return

            # 첫 번째 공고 아이템 분석
            print(f"\n=== 첫 번째 공고 아이템 분석 ===")
            item = job_items[0]

            print(f"\n클래스: {item.get('class')}")
            print(f"data-recruit-no: {item.get('data-recruit-no')}")

            # 제목 찾기
            print("\n--- 제목 찾기 ---")
            title_patterns = [
                item.find("a", class_=re.compile(r"job_tit|title|subject", re.I)),
                item.find("h2", class_=re.compile(r"job_tit|title", re.I)),
                item.find("a", href=re.compile(r"/zf_user/jobs/relay/view")),
            ]
            for idx, elem in enumerate(title_patterns):
                if elem:
                    print(f"패턴 {idx+1}: {elem.get_text(strip=True)[:50]}")
                    break

            # 회사명 찾기 - 여러 패턴 시도
            print("\n--- 회사명 찾기 ---")
            company_patterns = [
                ('class=company', item.find("a", class_=re.compile(r"company|corp", re.I))),
                ('class=corp_name', item.find("span", class_=re.compile(r"corp_name|company_name", re.I))),
                ('strong.company', item.find("strong", class_=re.compile(r"company", re.I))),
                ('span.company', item.find("span", class_=re.compile(r"company", re.I))),
                ('div.company', item.find("div", class_=re.compile(r"company", re.I))),
                ('text "회사"', item.find("dt", string=re.compile(r"회사"))),
            ]

            for name, elem in company_patterns:
                if elem:
                    text = elem.get_text(strip=True)
                    print(f"{name}: {text}")

            # 전체 텍스트에서 회사명 패턴 찾기
            print("\n--- 전체 텍스트 출력 (처음 500자) ---")
            full_text = item.get_text(separator=' | ', strip=True)
            print(full_text[:500])

            # 모든 하위 요소 출력
            print("\n--- 모든 a 태그 ---")
            for a in item.find_all("a")[:5]:
                print(f"  href: {a.get('href')[:50] if a.get('href') else 'None'}")
                print(f"  class: {a.get('class')}")
                print(f"  text: {a.get_text(strip=True)[:50]}")
                print()

        else:
            print(f"에러 ({response.status_code})")

if __name__ == "__main__":
    asyncio.run(test_saramin_list())
