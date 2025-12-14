"""사람인 HTML 구조 분석"""
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

url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic"

with httpx.Client(headers=headers, follow_redirects=True, timeout=30) as client:
    response = client.get(url)
    soup = BeautifulSoup(response.text, 'lxml')

    # 1순위: data-recruit-no 속성
    job_items = soup.find_all("div", {"data-recruit-no": True})

    # 2순위
    if not job_items:
        job_items = soup.find_all("div", class_=re.compile(r".*item.*recruit.*|.*recruit.*item.*", re.I))

    # 3순위: 채용공고 링크 부모
    if not job_items:
        recruit_links = soup.find_all("a", href=re.compile(r"/zf_user/jobs/relay/view"))
        job_items = []
        for link in recruit_links:
            parent = link.find_parent("div") or link.find_parent("article") or link.find_parent("li")
            if parent and parent not in job_items:
                job_items.append(parent)

    print(f"찾은 job_items 수: {len(job_items)}")

    if job_items:
        for idx, item in enumerate(job_items[:3]):
            print(f"\n\n{'='*60}")
            print(f"=== 아이템 {idx+1} ===")
            print(f"{'='*60}")
            print(f"HTML (앞 1500자):\n{str(item)[:1500]}")

            # 제목 요소 찾기
            title_elem = (
                item.find("a", class_=re.compile(r".*job_tit.*|.*title.*|.*subject.*", re.I)) or
                item.find("h2", class_=re.compile(r".*job_tit.*|.*title.*", re.I)) or
                item.find("a", href=re.compile(r"/zf_user/jobs/relay/view")) or
                item.find("a", href=re.compile(r"/zf_user/jobs/recruit/view")) or
                item.find("h2") or item.find("h3")
            )

            if title_elem:
                print(f"\n--- title_elem ---")
                print(f"tag: {title_elem.name}, class: {title_elem.get('class')}")
                print(f"HTML: {str(title_elem)[:500]}")
                print(f"get_text(): {title_elem.get_text(strip=True)}")

                # 직접 텍스트 추출
                print(f"\n--- children 분석 ---")
                direct_text = ""
                for content in title_elem.children:
                    if isinstance(content, str):
                        text = content.strip()
                        if text:
                            direct_text += text + " "
                            print(f"  STR: '{text}'")
                    elif hasattr(content, 'name'):
                        print(f"  TAG: <{content.name} class={content.get('class')}> = '{content.get_text(strip=True)[:80]}'")

                print(f"\n직접 텍스트 결과: '{direct_text.strip()}'")
