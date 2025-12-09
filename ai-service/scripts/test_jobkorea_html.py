"""잡코리아 HTML 구조 분석"""
import sys
sys.path.insert(0, 'C:/Users/301/dev/qwer/DreamPath/ai-service')
import httpx
from bs4 import BeautifulSoup
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

url = "https://www.jobkorea.co.kr/recruit/joblist?menucode=local"

with httpx.Client(headers=headers, follow_redirects=True, timeout=30) as client:
    response = client.get(url)
    soup = BeautifulSoup(response.text, 'lxml')

    # 잡코리아 채용공고 아이템 찾기
    job_items = soup.find_all("li", class_=re.compile(r".*list-item.*|.*devloopArea.*", re.I))

    if not job_items:
        job_items = soup.find_all("li", {"data-gno": True})

    print(f"찾은 job_items 수: {len(job_items)}")

    if job_items:
        for idx, item in enumerate(job_items[:2]):
            print(f"\n\n{'='*60}")
            print(f"=== 아이템 {idx+1} ===")
            print(f"{'='*60}")
            print(f"HTML (앞 2000자):\n{str(item)[:2000]}")

            # 제목 요소 찾기 (현재 로직)
            title_elem = None
            if not title_elem:
                title_elem = item.find("a", href=re.compile(r"/Recruit/GI_Read"))
            if not title_elem:
                title_elem = item.find("a", class_=re.compile(r".*title.*|.*subject.*|.*job.*title.*", re.I))
            if not title_elem:
                strong = item.find("strong")
                if strong:
                    title_elem = strong.find("a")
            if not title_elem:
                title_elem = item.find("h2") or item.find("h3")
            if not title_elem:
                title_elem = item.find("a", href=True)

            if title_elem:
                print(f"\n--- title_elem ---")
                print(f"tag: {title_elem.name}, class: {title_elem.get('class')}")
                print(f"HTML: {str(title_elem)[:800]}")
                print(f"get_text(): {title_elem.get_text(strip=True)}")

                # 직접 텍스트 추출 분석
                print(f"\n--- children 분석 ---")
                for content in title_elem.children:
                    if isinstance(content, str):
                        text = content.strip()
                        if text:
                            print(f"  STR: '{text}'")
                    elif hasattr(content, 'name'):
                        print(f"  TAG: <{content.name} class={content.get('class')}> = '{content.get_text(strip=True)[:80]}'")
