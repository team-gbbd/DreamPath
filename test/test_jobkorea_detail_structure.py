"""
잡코리아 기업 상세 페이지 구조 분석 스크립트
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
import re
import sys
import io

# Windows 콘솔 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test_company_detail():
    """주식회사 문 (ID: 48093847) 페이지 구조 확인"""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    # 1단계: 채용공고 페이지에서 기업 링크 찾기
    job_url = "https://www.jobkorea.co.kr/Recruit/GI_Read/48093847"
    print(f"=== 1단계: 채용공고 페이지 분석 ===")
    print(f"URL: {job_url}\n")

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        try:
            response = await client.get(job_url)
            print(f"HTTP 상태 코드: {response.status_code}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')

                # HTML 저장 (디버깅용)
                with open('jobkorea_job_page.html', 'w', encoding='utf-8') as f:
                    f.write(soup.prettify())
                print("✓ 채용공고 HTML이 'jobkorea_job_page.html'에 저장됨\n")

                # 회사명 링크 찾기 - 다양한 패턴 시도
                print("[회사명 링크 찾기]")

                # 패턴 1: /company/{id}/ 형식
                company_link = soup.find('a', href=re.compile(r'/company/\d+'))
                if company_link:
                    print(f"✓ 패턴 1 (/company/숫자): {company_link.get('href')}")
                    print(f"  텍스트: {company_link.get_text(strip=True)}")
                else:
                    print("✗ 패턴 1 (/company/숫자): 찾을 수 없음")

                # 패턴 2: /Co_Read/{id} 형식
                co_read_link = soup.find('a', href=re.compile(r'/Co_Read/\d+'))
                if co_read_link:
                    print(f"✓ 패턴 2 (/Co_Read/숫자): {co_read_link.get('href')}")
                    print(f"  텍스트: {co_read_link.get_text(strip=True)}")
                else:
                    print("✗ 패턴 2 (/Co_Read/숫자): 찾을 수 없음")

                # 패턴 3: class에 'company' 포함된 링크
                company_class_links = soup.find_all('a', class_=re.compile(r'company', re.I))
                if company_class_links:
                    print(f"✓ 패턴 3 (class='company'): {len(company_class_links)}개 발견")
                    for i, link in enumerate(company_class_links[:3], 1):
                        print(f"  {i}. {link.get('href')} - {link.get_text(strip=True)[:50]}")
                else:
                    print("✗ 패턴 3 (class='company'): 찾을 수 없음")

                # 패턴 4: 모든 링크에서 '회사', '기업', '주식회사', '(주)' 텍스트 포함 검색
                print("\n[모든 링크에서 회사명 검색]")
                all_links = soup.find_all('a', href=True)
                print(f"전체 링크 수: {len(all_links)}")

                company_keywords = ['주식회사', '(주)', '㈜', '기업', '그룹']
                potential_company_links = []

                for link in all_links:
                    text = link.get_text(strip=True)
                    href = link.get('href', '')
                    if any(keyword in text for keyword in company_keywords):
                        potential_company_links.append((href, text))

                if potential_company_links:
                    print(f"✓ 회사명으로 보이는 링크 {len(potential_company_links)}개 발견:")
                    for i, (href, text) in enumerate(potential_company_links[:10], 1):
                        print(f"  {i}. {href[:60]} - {text[:50]}")
                else:
                    print("✗ 회사명 링크를 찾을 수 없음")

                # 2단계: 실제 사용할 기업 링크 결정
                print("\n=== 2단계: 기업 상세 페이지 링크 결정 ===")
                target_company_link = company_link or co_read_link

                # potential_company_links에서 /Co_Read/ 포함된 것 사용
                if not target_company_link and potential_company_links:
                    for href, text in potential_company_links:
                        if '/Co_Read/' in href and ('주식회사' in text or '㈜' in text or '(주)' in text):
                            # 가짜 링크 객체 생성
                            class FakeLink:
                                def __init__(self, href):
                                    self.href = href
                                def get(self, key, default=''):
                                    if key == 'href':
                                        return self.href
                                    return default
                                def get_text(self, strip=False):
                                    return text
                            target_company_link = FakeLink(href)
                            print(f"텍스트 기반 검색으로 링크 발견: {text}")
                            break

                if target_company_link:
                    href = target_company_link.get('href', '')

                    # URL 생성 - 절대 URL로 변환
                    if href.startswith('http'):
                        company_url = href
                    elif href.startswith('/'):
                        company_url = f"https://www.jobkorea.co.kr{href}"
                    else:
                        company_url = f"https://www.jobkorea.co.kr/{href}"

                    print(f"선택된 기업 URL: {company_url}")

                    # 3단계: 기업 상세 페이지 크롤링
                    print(f"\n=== 3단계: 기업 상세 페이지 분석 ===")
                    print(f"URL: {company_url}\n")

                    await asyncio.sleep(1)  # Rate limiting

                    company_response = await client.get(company_url)
                    print(f"HTTP 상태 코드: {company_response.status_code}")

                    if company_response.status_code == 200:
                        company_soup = BeautifulSoup(company_response.text, 'html.parser')

                        # HTML 저장 (디버깅용)
                        with open('jobkorea_company_page.html', 'w', encoding='utf-8') as f:
                            f.write(company_soup.prettify())
                        print("✓ HTML이 'jobkorea_company_page.html'에 저장됨")

                        # 주요 정보 추출 시도
                        print("\n[정보 추출 결과]")

                        # 회사명
                        company_name = None
                        for selector in ['h1', 'h2.coName', 'div.coName', 'span.coName']:
                            elem = company_soup.find(selector.split('.')[0],
                                                     class_=selector.split('.')[1] if '.' in selector else None)
                            if elem:
                                company_name = elem.get_text(strip=True)
                                print(f"✓ 회사명 ({selector}): {company_name}")
                                break
                        if not company_name:
                            print("✗ 회사명: 찾을 수 없음")

                        # 정보 섹션 찾기 - 여러 패턴 시도
                        info_sections = [
                            company_soup.find('table', class_='table-basic-infomation-primary'),
                            company_soup.find('div', class_='tabWrap'),
                            company_soup.find('div', class_='companyInfo'),
                            company_soup.find('div', class_='company-info'),
                            company_soup.find('div', class_='coInfo'),
                            company_soup.find('dl', class_='company'),
                            company_soup.find('table', class_='tbCoInfo'),
                        ]

                        info_section = None
                        for section in info_sections:
                            if section:
                                info_section = section
                                print(f"✓ 정보 섹션 발견: {section.name}.{section.get('class')}")
                                break

                        if not info_section:
                            print("✗ 정보 섹션을 찾을 수 없음")
                            # 전체 HTML에서 dt/dd 태그 찾기
                            print("\n[전체 페이지에서 dt/dd 쌍 검색]")
                            dt_tags = company_soup.find_all('dt')
                            if dt_tags:
                                print(f"✓ {len(dt_tags)}개의 dt 태그 발견:")
                                for dt in dt_tags[:10]:
                                    dd = dt.find_next_sibling('dd')
                                    dt_text = dt.get_text(strip=True)
                                    dd_text = dd.get_text(strip=True) if dd else 'N/A'
                                    print(f"  - {dt_text}: {dd_text[:100]}")
                        else:
                            # 업종, 설립일, 직원수, 주소, 홈페이지 등 추출
                            fields = {
                                '산업': [r'산업', r'업종', r'업\s*종'],
                                '설립일': [r'설립일', r'설립년도', r'설립\s*일'],
                                '사원수': [r'사원수', r'직원수', r'사원\s*수'],
                                '주소': [r'주소'],
                                '홈페이지': [r'홈페이지', r'홈\s*페이지'],
                            }

                            for field_name, patterns in fields.items():
                                found = False
                                for pattern in patterns:
                                    # th 태그로 찾기 (table 구조)
                                    th_elem = info_section.find('th', class_='field-label', string=re.compile(pattern))
                                    if th_elem:
                                        td = th_elem.find_next_sibling('td', class_='field-value')
                                        if td:
                                            value_div = td.find('div', class_='value')
                                            if value_div:
                                                value_text = value_div.get_text(strip=True)
                                            else:
                                                value_text = td.get_text(strip=True)
                                            print(f"✓ {field_name} (th.field-label/td.field-value): {value_text[:100]}")
                                            found = True
                                            break
                                    else:
                                        # dt/dd 구조 (구버전)
                                        dt_elem = info_section.find('dt', string=re.compile(pattern))
                                        if dt_elem:
                                            dd = dt_elem.find_next_sibling('dd')
                                            if dd:
                                                print(f"✓ {field_name} (dt/dd): {dd.get_text(strip=True)[:100]}")
                                                found = True
                                                break

                                if not found:
                                    print(f"✗ {field_name}: 찾을 수 없음")

                        # 회사 소개
                        print("\n[회사 소개 섹션]")
                        intro_selectors = [
                            ('div', 'coInfo'),
                            ('div', 'companyIntro'),
                            ('div', 'company-intro'),
                            ('div', 'comIntro'),
                        ]

                        intro_found = False
                        for tag, class_name in intro_selectors:
                            intro_section = company_soup.find(tag, class_=class_name)
                            if intro_section:
                                intro_text = intro_section.get_text(strip=True)
                                print(f"✓ 회사 소개 ({tag}.{class_name}): {intro_text[:200]}...")
                                intro_found = True
                                break

                        if not intro_found:
                            print("✗ 회사 소개: 찾을 수 없음")

                        # 복지/혜택
                        print("\n[복지/혜택 섹션]")
                        welfare_selectors = [
                            ('div', 'welfare'),
                            ('div', 'benefit'),
                            ('ul', 'welfare'),
                        ]

                        welfare_found = False
                        for tag, class_name in welfare_selectors:
                            welfare_section = company_soup.find(tag, class_=class_name)
                            if welfare_section:
                                welfare_items = welfare_section.find_all('li')
                                if welfare_items:
                                    benefits = [item.get_text(strip=True) for item in welfare_items[:5]]
                                    print(f"✓ 복지/혜택 ({tag}.{class_name}): {', '.join(benefits)}")
                                    welfare_found = True
                                    break

                        if not welfare_found:
                            print("✗ 복지/혜택: 찾을 수 없음")

                    else:
                        print(f"✗ 기업 상세 페이지 접근 실패: HTTP {company_response.status_code}")

                else:
                    print("✗ 기업 링크를 찾을 수 없음")

        except Exception as e:
            print(f"오류 발생: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_company_detail())
