"""수정된 제목 추출 로직 테스트"""
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

def test_jobkorea():
    print("=" * 60)
    print("=== 잡코리아 테스트 ===")
    print("=" * 60)

    url = "https://www.jobkorea.co.kr/recruit/joblist?menucode=local"
    with httpx.Client(headers=headers, follow_redirects=True, timeout=30) as client:
        response = client.get(url)
        soup = BeautifulSoup(response.text, 'lxml')

        job_items = soup.find_all("li", class_=re.compile(r".*devloopArea.*", re.I))
        print(f"찾은 아이템 수: {len(job_items)}")

        for idx, item in enumerate(job_items[:5]):
            # 수정된 제목 추출 로직
            title = ""

            # 방법 1: description 영역에서 text 클래스 찾기
            desc_div = item.find("div", class_=re.compile(r".*description.*", re.I))
            if desc_div:
                text_span = desc_div.find("span", class_=re.compile(r".*text.*", re.I))
                if text_span:
                    title = text_span.get_text(strip=True)

            # 방법 2: item에서 직접 text 클래스 찾기
            if not title:
                text_span = item.find("span", class_=re.compile(r"^text$", re.I))
                if text_span:
                    title = text_span.get_text(strip=True)

            # 회사명 추출
            company_elem = item.find("div", class_=re.compile(r".*company.*", re.I))
            company = ""
            if company_elem:
                name_span = company_elem.find("span", class_="name")
                if name_span:
                    link = name_span.find("a")
                    if link:
                        # 직접 텍스트만 추출 (logo span 제외)
                        for content in link.children:
                            if isinstance(content, str):
                                company += content.strip()

            print(f"\n{idx+1}. 제목: {title}")
            print(f"   회사: {company}")

def test_saramin():
    print("\n" + "=" * 60)
    print("=== 사람인 테스트 ===")
    print("=" * 60)

    url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic"
    with httpx.Client(headers=headers, follow_redirects=True, timeout=30) as client:
        response = client.get(url)
        soup = BeautifulSoup(response.text, 'lxml')

        # data-recruit-no 속성으로 찾기
        job_items = soup.find_all("div", {"data-recruit-no": True})

        # 없으면 채용공고 링크 부모로 찾기
        if not job_items:
            recruit_links = soup.find_all("a", href=re.compile(r"/zf_user/jobs/relay/view"))
            job_items = []
            for link in recruit_links:
                parent = link.find_parent("div") or link.find_parent("li")
                if parent and parent not in job_items:
                    job_items.append(parent)

        print(f"찾은 아이템 수: {len(job_items)}")

        for idx, item in enumerate(job_items[:5]):
            # 수정된 제목 추출 로직
            title = ""

            # 방법 1: strong.tit 또는 h2.job_tit 찾기
            actual_title_elem = (
                item.find("strong", class_=re.compile(r".*tit.*", re.I)) or
                item.find("h2", class_=re.compile(r".*job_tit.*|.*tit.*", re.I)) or
                item.find("span", class_=re.compile(r".*job_tit.*|.*tit.*", re.I))
            )

            if actual_title_elem:
                title = actual_title_elem.get_text(strip=True)

            # 방법 2: a 태그의 title 속성
            if not title:
                title_link = item.find("a", href=re.compile(r"/zf_user/jobs/relay/view"))
                if title_link and title_link.get('title'):
                    title = title_link.get('title')

            # 회사명 추출
            company_elem = item.find("span", class_=re.compile(r".*corp.*", re.I))
            company = company_elem.get_text(strip=True) if company_elem else ""

            print(f"\n{idx+1}. 제목: {title}")
            print(f"   회사: {company}")

if __name__ == "__main__":
    test_jobkorea()
    test_saramin()
