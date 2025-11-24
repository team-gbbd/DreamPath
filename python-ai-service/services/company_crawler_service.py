"""
기업정보 크롤링 서비스
채용공고로부터 기업정보를 추출하고, 기업 상세 페이지를 크롤링합니다.
"""
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup
import asyncio
import re
from services.database_service import DatabaseService
from services.selenium_crawler_service import SeleniumCrawlerService


class CompanyCrawlerService:
    """기업정보 크롤링 서비스"""

    def __init__(self):
        self.db_service = DatabaseService()
        self.selenium_service = None  # 필요할 때만 초기화
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    def _get_selenium_service(self):
        """Selenium 서비스 lazy 초기화"""
        if self.selenium_service is None:
            self.selenium_service = SeleniumCrawlerService()
        return self.selenium_service

    async def _extract_csn_from_job_page(self, job_url: str) -> Optional[str]:
        """
        사람인 채용공고 페이지에서 csn 추출 (httpx 사용)

        Args:
            job_url: 채용공고 URL

        Returns:
            csn 또는 None
        """
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=30.0, follow_redirects=True) as client:
                response = await client.get(job_url)

                if response.status_code == 200:
                    html = response.text

                    # HTML에서 csn 패턴 찾기
                    # 패턴 1: company-info/view?csn=숫자
                    csn_match = re.search(r'company-info/view\?csn=(\d+)', html)
                    if csn_match:
                        return csn_match.group(1)

                    # 패턴 2: /zf_user/company-info/view?csn=숫자
                    csn_match = re.search(r'/zf_user/company-info/view\?csn=(\d+)', html)
                    if csn_match:
                        return csn_match.group(1)

                    # 패턴 3: [?&]csn=숫자
                    csn_match = re.search(r'[?&]csn=(\d+)', html)
                    if csn_match:
                        return csn_match.group(1)

        except Exception as e:
            print(f"[사람인] httpx로 csn 추출 중 오류: {str(e)}")

        return None

    async def _extract_company_name_from_job_page(self, job_url: str) -> Optional[str]:
        """
        사람인 채용공고 페이지에서 회사명 추출 (httpx 사용)

        Args:
            job_url: 채용공고 URL

        Returns:
            회사명 또는 None
        """
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=30.0, follow_redirects=True) as client:
                response = await client.get(job_url)

                if response.status_code == 200:
                    html = response.text

                    # JavaScript 변수에서 회사명 추출: companyNm = '회사명'
                    company_match = re.search(r"companyNm\s*=\s*['\"]([^'\"]+)['\"]", html)
                    if company_match:
                        return company_match.group(1)

                    # meta 태그에서 회사명 추출
                    meta_match = re.search(r'<meta\s+name="description"\s+content="([^"]+),', html)
                    if meta_match:
                        return meta_match.group(1)

                    # title 태그에서 [회사명] 패턴 추출
                    title_match = re.search(r'<title>\[([^\]]+)\]', html)
                    if title_match:
                        return title_match.group(1)

        except Exception as e:
            print(f"[사람인] httpx로 회사명 추출 중 오류: {str(e)}")

        return None

    def extract_companies_from_job_listings(
        self,
        site_name: str,
        job_listings: List[Dict]
    ) -> List[Dict]:
        """
        채용공고에서 기업정보를 추출합니다.

        Args:
            site_name: 사이트 이름
            job_listings: 채용공고 리스트

        Returns:
            추출된 기업정보 리스트
        """
        companies = {}  # 중복 제거를 위한 딕셔너리

        for job in job_listings:
            company_name = job.get('company', '').strip()

            # 회사명 정리 (불필요한 텍스트 제거)
            if company_name:
                company_name = company_name.replace('관심기업 등록하기', '').strip()

            # 사이트별 company_id 추출
            company_id = job.get('id')  # 기본값
            job_url = job.get('url', '')

            if site_name in ['jobkorea', '잡코리아']:
                # 잡코리아는 URL에서 company_id 추출 시도
                # 예: /Recruit/GI_Read/12345 또는 /Co_Read/67890
                co_match = re.search(r'/Co_Read/(\d+)', job_url)
                if co_match:
                    company_id = co_match.group(1)
                else:
                    # GI_Read에서 추출한 ID 사용
                    gi_match = re.search(r'/GI_Read/(\d+)', job_url)
                    if gi_match:
                        company_id = gi_match.group(1)

            elif site_name in ['saramin', '사람인']:
                # 사람인은 URL에서 company_id 추출 (csn 파라미터 또는 rec_idx)
                csn_match = re.search(r'[?&]csn=(\d+)', job_url)
                if csn_match:
                    company_id = csn_match.group(1)
                else:
                    # csn이 없으면 rec_idx를 임시로 사용 (나중에 상세 페이지에서 csn 추출 가능)
                    rec_match = re.search(r'[?&]rec_idx=(\d+)', job_url)
                    if rec_match:
                        company_id = f"rec_{rec_match.group(1)}"

                # 사람인은 company_name이 비어있는 경우가 많으므로 "회사명 미상"으로 설정
                if not company_name or company_name.strip() == '':
                    company_name = f"회사명 미상 (ID: {company_id})"

            # 사람인의 경우 회사명이 없어도 company_id가 있으면 진행
            if site_name in ['saramin', '사람인']:
                if not company_id:
                    continue
                # company_id를 키로 사용 (더 정확한 중복 체크)
                key = company_id
            else:
                # 다른 사이트는 회사명 필수
                if not company_name:
                    continue
                key = company_name

            # 중복 체크
            if key not in companies:

                company_info = {
                    'company_id': company_id,
                    'company_name': company_name,
                    'location': job.get('location'),
                    'description': job.get('description'),
                    'recruitment_url': job.get('url'),
                }

                # 사이트별 추가 정보 추출
                if site_name in ['wanted', '원티드']:
                    # 원티드는 API에서 더 많은 정보를 제공할 수 있음
                    company_info['homepage_url'] = f"https://www.wanted.co.kr/company/{job.get('id')}"
                elif site_name in ['jobkorea', '잡코리아']:
                    # 잡코리아는 회사 페이지 URL 생성
                    company_info['homepage_url'] = f"https://www.jobkorea.co.kr/Recruit/Co_Read/{company_id}"
                elif site_name in ['saramin', '사람인']:
                    # 사람인은 회사 페이지 URL 생성
                    if company_id and not company_id.startswith('rec_'):
                        company_info['homepage_url'] = f"https://www.saramin.co.kr/zf_user/company-info/view?csn={company_id}"

                companies[key] = company_info

        return list(companies.values())

    def save_companies(
        self,
        site_name: str,
        companies: List[Dict]
    ) -> int:
        """
        기업정보를 데이터베이스에 저장합니다.

        Args:
            site_name: 사이트 이름
            companies: 기업정보 리스트

        Returns:
            저장된 기업 수
        """
        if not companies:
            print("[기업정보] 저장할 기업정보가 없습니다.")
            return 0

        print(f"[기업정보] {len(companies)}개 기업 정보 저장 시작...")
        saved_count = self.db_service.save_company_info(site_name, companies)
        print(f"[기업정보] {saved_count}개 기업 정보 저장 완료!")

        return saved_count

    async def crawl_wanted_company_detail(self, job_id: str) -> Dict:
        """
        원티드 기업 상세 정보 크롤링 (API + 웹 페이지)

        Args:
            job_id: 원티드 채용공고 ID

        Returns:
            기업 상세 정보
        """
        try:
            # 먼저 채용공고 API에서 company_id를 가져옴
            job_api_url = f"https://www.wanted.co.kr/api/v4/jobs/{job_id}"

            async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
                job_response = await client.get(job_api_url)

                if job_response.status_code == 200:
                    job_data = job_response.json()
                    job_info = job_data.get('job', {})
                    company_id = job_info.get('company', {}).get('id')

                    if not company_id:
                        return {}

                    result = {}

                    # 기업 상세 정보 API 호출
                    company_api_url = f"https://www.wanted.co.kr/api/v4/companies/{company_id}"
                    company_response = await client.get(company_api_url)

                    if company_response.status_code == 200:
                        data = company_response.json()
                        company = data.get('company', {})

                        result['industry'] = company.get('industry_name')
                        result['employee_count'] = str(company.get('employee_count', '')) if company.get('employee_count') else None
                        result['established_year'] = str(company.get('founded_year')) if company.get('founded_year') else None
                        result['logo_url'] = company.get('logo_img', {}).get('origin') if company.get('logo_img') else None

                        # 주소 정보
                        company_address = company.get('company_address', {})
                        if company_address:
                            result['address'] = company_address.get('full_location')

                        # 회사 설명
                        detail = company.get('detail', {})
                        if detail:
                            result['description'] = detail.get('description')

                    # 웹 페이지에서 추가 정보 크롤링
                    web_url = f"https://www.wanted.co.kr/company/{company_id}"
                    web_response = await client.get(web_url)

                    if web_response.status_code == 200:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(web_response.text, 'html.parser')

                        # dl/dt/dd 구조에서 정보 추출
                        info_sections = soup.find_all('dl')

                        for dl in info_sections:
                            dt_tags = dl.find_all('dt')
                            dd_tags = dl.find_all('dd')

                            for dt, dd in zip(dt_tags, dd_tags):
                                dt_text = dt.get_text(strip=True)
                                dd_text = dd.get_text(strip=True)

                                # 자본금
                                if '자본금' in dt_text:
                                    result['capital'] = dd_text

                                # 기업형태 or 회사구분 -> company_type
                                elif '기업형태' in dt_text or '회사구분' in dt_text or '기업구분' in dt_text:
                                    result['company_type'] = dd_text

                                # 매출액
                                elif '매출액' in dt_text:
                                    result['revenue'] = dd_text

                                # 대표자명 or 대표자
                                elif ('대표자' in dt_text or '대표이사' in dt_text) and '대표산업' not in dt_text:
                                    result['ceo_name'] = dd_text

                                # 평균연봉
                                elif '평균연봉' in dt_text or '평균 연봉' in dt_text:
                                    result['average_salary'] = dd_text

                    return result

        except Exception as e:
            print(f"[원티드] 기업 상세 정보 크롤링 실패 (job_id: {job_id}): {str(e)}")

        return {}

    async def crawl_jobkorea_company_detail(self, job_url: str) -> Dict:
        """
        잡코리아 기업 상세 정보 크롤링

        Args:
            job_url: 잡코리아 채용공고 URL (GI_Read URL)

        Returns:
            기업 상세 정보
        """
        try:
            # 먼저 채용공고 페이지에서 기업 페이지 링크 추출
            async with httpx.AsyncClient(headers=self.headers, timeout=30.0, follow_redirects=True) as client:
                job_response = await client.get(job_url)

                if job_response.status_code != 200:
                    return {}

                job_soup = BeautifulSoup(job_response.text, 'html.parser')

                # 회사명 링크 찾기 - 여러 패턴 시도
                company_link = None
                company_href = None

                # 패턴 1: /company/{id}/ 형식 (최신)
                company_link = job_soup.find('a', href=re.compile(r'/company/\d+'))

                if not company_link:
                    # 패턴 2: /Co_Read/C/{id} 형식 (2024년 변경된 구조)
                    company_link = job_soup.find('a', href=re.compile(r'/Co_Read/C/\d+'))

                if not company_link:
                    # 패턴 3: /Co_Read/{id} 형식 (구버전)
                    company_link = job_soup.find('a', href=re.compile(r'/Co_Read/[^/]+$'))

                if not company_link:
                    # 패턴 4: 회사명 텍스트로 찾기 (주식회사, ㈜, (주) 등)
                    all_links = job_soup.find_all('a', href=True)
                    company_keywords = ['주식회사', '(주)', '㈜']
                    for link in all_links:
                        text = link.get_text(strip=True)
                        href = link.get('href', '')
                        if any(keyword in text for keyword in company_keywords) and '/Co_Read/' in href:
                            company_link = link
                            break

                if not company_link:
                    print(f"[잡코리아] 기업 링크를 찾을 수 없음: {job_url}")
                    return {}

                company_href = company_link.get('href', '')

                # URL 파싱 및 기업 페이지 URL 생성
                company_url = None

                # /company/{id}/ 패턴
                company_match = re.search(r'/company/(\d+)', company_href)
                if company_match:
                    company_id = company_match.group(1)
                    company_url = f"https://www.jobkorea.co.kr/company/{company_id}/"
                else:
                    # /Co_Read/C/{id} 패턴 (새로운 구조)
                    company_match = re.search(r'/Co_Read/C/(\d+)', company_href)
                    if company_match:
                        company_id = company_match.group(1)
                        company_url = f"https://www.jobkorea.co.kr/Recruit/Co_Read/C/{company_id}"
                    else:
                        # /Co_Read/{id} 패턴 (구버전)
                        company_match = re.search(r'/Co_Read/([^/?#]+)', company_href)
                        if company_match:
                            company_id = company_match.group(1)
                            # ID가 'C'로 시작하지 않으면 숫자만 추출
                            if company_id.startswith('C'):
                                company_url = f"https://www.jobkorea.co.kr/Recruit/Co_Read/{company_id}"
                            else:
                                company_url = f"https://www.jobkorea.co.kr/Recruit/Co_Read/C/{company_id}"

                if not company_url:
                    print(f"[잡코리아] 기업 URL 파싱 실패: {company_href}")
                    return {}

                # 기업 상세 페이지 크롤링
                response = await client.get(company_url)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    result = {}

                    # 기업 정보 섹션 찾기 - 최신 table 구조 우선
                    info_section = soup.find('table', class_='table-basic-infomation-primary')

                    # 구버전 fallback
                    if not info_section:
                        info_section = soup.find('div', class_='tabWrap')

                    if info_section:
                        # 최신 table 구조인 경우
                        if info_section.name == 'table':
                            # 산업/업종
                            th_industry = info_section.find('th', class_='field-label', string=re.compile(r'산업|업종'))
                            if th_industry:
                                td = th_industry.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['industry'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 설립일
                            th_established = info_section.find('th', class_='field-label', string=re.compile(r'설립일|설립년도'))
                            if th_established:
                                td = th_established.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['established_year'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 사원수/직원수
                            th_employee = info_section.find('th', class_='field-label', string=re.compile(r'사원수|직원수'))
                            if th_employee:
                                td = th_employee.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['employee_count'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 주소
                            th_address = info_section.find('th', class_='field-label', string=re.compile(r'주소'))
                            if th_address:
                                td = th_address.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['address'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 홈페이지
                            th_homepage = info_section.find('th', class_='field-label', string=re.compile(r'홈페이지'))
                            if th_homepage:
                                td = th_homepage.find_next_sibling('td', class_='field-value')
                                if td:
                                    homepage_link = td.find('a')
                                    if homepage_link:
                                        result['homepage_url'] = homepage_link.get('href', '')
                                    else:
                                        value_div = td.find('div', class_='value')
                                        homepage_text = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)
                                        if homepage_text and 'http' in homepage_text:
                                            result['homepage_url'] = homepage_text

                            # 기업구분
                            th_company_type = info_section.find('th', class_='field-label', string=re.compile(r'기업구분'))
                            if th_company_type:
                                td = th_company_type.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['company_type'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 매출액
                            th_revenue = info_section.find('th', class_='field-label', string=re.compile(r'매출액'))
                            if th_revenue:
                                td = th_revenue.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['revenue'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 대표자
                            th_ceo = info_section.find('th', class_='field-label', string=re.compile(r'대표자'))
                            if th_ceo:
                                td = th_ceo.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['ceo_name'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 대졸초임/평균연봉
                            th_salary = info_section.find('th', class_='field-label', string=re.compile(r'대졸초임|평균연봉'))
                            if th_salary:
                                td = th_salary.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['average_salary'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 주요사업
                            th_business = info_section.find('th', class_='field-label', string=re.compile(r'주요사업'))
                            if th_business:
                                td = th_business.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['vision'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                            # 4대보험
                            th_insurance = info_section.find('th', class_='field-label', string=re.compile(r'4대보험'))
                            if th_insurance:
                                td = th_insurance.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    insurance_text = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)
                                    # benefits 필드에 저장 (기존 복지정보와 구분을 위해 접두어 추가)
                                    if insurance_text:
                                        result['benefits'] = f"[4대보험] {insurance_text}"

                            # 자본금
                            th_capital = info_section.find('th', class_='field-label', string=re.compile(r'자본금'))
                            if th_capital:
                                td = th_capital.find_next_sibling('td', class_='field-value')
                                if td:
                                    value_div = td.find('div', class_='value')
                                    result['capital'] = value_div.get_text(strip=True) if value_div else td.get_text(strip=True)

                        else:
                            # 구버전 dt/dd 구조
                            # 업종
                            industry_elem = info_section.find('dt', string=re.compile(r'업종'))
                            if industry_elem:
                                industry_dd = industry_elem.find_next_sibling('dd')
                                if industry_dd:
                                    result['industry'] = industry_dd.get_text(strip=True)

                            # 설립일
                            established_elem = info_section.find('dt', string=re.compile(r'설립일|설립년도'))
                            if established_elem:
                                established_dd = established_elem.find_next_sibling('dd')
                                if established_dd:
                                    result['established_year'] = established_dd.get_text(strip=True)

                            # 직원수
                            employee_elem = info_section.find('dt', string=re.compile(r'사원수|직원수'))
                            if employee_elem:
                                employee_dd = employee_elem.find_next_sibling('dd')
                                if employee_dd:
                                    result['employee_count'] = employee_dd.get_text(strip=True)

                            # 주소
                            address_elem = info_section.find('dt', string=re.compile(r'주소'))
                            if address_elem:
                                address_dd = address_elem.find_next_sibling('dd')
                                if address_dd:
                                    result['address'] = address_dd.get_text(strip=True)

                            # 홈페이지
                            homepage_elem = info_section.find('dt', string=re.compile(r'홈페이지'))
                            if homepage_elem:
                                homepage_dd = homepage_elem.find_next_sibling('dd')
                                if homepage_dd:
                                    homepage_link = homepage_dd.find('a')
                                    if homepage_link:
                                        result['homepage_url'] = homepage_link.get('href', '')

                    # 회사 소개
                    intro_section = soup.find('div', class_='coInfo')
                    if intro_section:
                        intro_text = intro_section.get_text(strip=True)
                        if intro_text and len(intro_text) > 10:
                            result['description'] = intro_text

                    # 복지/혜택
                    welfare_section = soup.find('div', class_='welfare')
                    if welfare_section:
                        welfare_items = welfare_section.find_all('li')
                        if welfare_items:
                            benefits = [item.get_text(strip=True) for item in welfare_items]
                            result['benefits'] = ', '.join(benefits)

                    return result

        except Exception as e:
            print(f"[잡코리아] 기업 상세 정보 크롤링 실패 (job_url: {job_url}): {str(e)}")

        return {}

    async def crawl_saramin_company_detail(self, company_id: str, rec_idx: str = None, job_url: str = None) -> Dict:
        """
        사람인 기업 상세 정보 크롤링

        Args:
            company_id: 사람인 기업 ID (csn) 또는 rec_로 시작하는 임시 ID
            rec_idx: 채용공고 ID (company_id가 rec_로 시작할 경우 사용)
            job_url: 채용공고 URL (csn 추출용)

        Returns:
            기업 상세 정보
        """
        try:
            # company_id가 rec_로 시작하면 먼저 채용공고 페이지에서 csn 추출 시도
            actual_csn = company_id
            if company_id and company_id.startswith('rec_'):
                rec_id = company_id.replace('rec_', '')
                print(f"[사람인] rec_idx {rec_id}에서 csn 추출 시도...")

                # 먼저 httpx로 채용공고 페이지에서 csn 추출 시도 (빠름)
                if job_url:
                    print(f"[사람인] 채용공고 페이지에서 csn 추출 시도: {job_url}")
                    actual_csn = await self._extract_csn_from_job_page(job_url)
                    if actual_csn:
                        print(f"[사람인] 채용공고 페이지에서 csn 추출 성공: {actual_csn}")

                # httpx로 실패하면 Selenium 사용 (느림)
                if not actual_csn or actual_csn.startswith('rec_'):
                    print(f"[사람인] Selenium으로 csn 추출 시도...")
                    try:
                        selenium_service = self._get_selenium_service()
                        actual_csn = selenium_service.get_saramin_company_csn(rec_id)

                        if actual_csn:
                            print(f"[사람인] Selenium으로 csn 추출 성공: {actual_csn}")
                        else:
                            print(f"[사람인] Selenium으로 csn 추출 실패")
                            return {}
                    except Exception as e:
                        print(f"[사람인] Selenium 사용 중 오류: {str(e)}")
                        return {}

            # CSN이 없으면 기업 상세 페이지 크롤링 불가
            # 대신 채용공고 페이지에서 추출할 수 있는 정보 반환
            if not actual_csn or actual_csn.startswith('rec_'):
                print(f"[사람인] csn 추출 실패, 채용공고 페이지에서 기본 정보만 추출: {actual_csn}")

                # 채용공고 페이지에서 기본 정보 추출
                if job_url:
                    try:
                        async with httpx.AsyncClient(headers=self.headers, timeout=30.0, follow_redirects=True) as client:
                            response = await client.get(job_url)
                            if response.status_code == 200:
                                html = response.text
                                result = {}

                                # 회사명 추출
                                company_match = re.search(r"companyNm\s*=\s*['\"]([^'\"]+)['\"]", html)
                                if company_match:
                                    result['company_name'] = company_match.group(1)

                                # 산업/업종 추출
                                ind_match = re.search(r"jobCategoryNm\s*=\s*['\"]([^'\"]+)['\"]", html)
                                if ind_match:
                                    # 첫 번째 카테고리만 사용
                                    categories = ind_match.group(1).split(',')
                                    if categories:
                                        result['industry'] = categories[0]

                                # 홈페이지 추출
                                homepage_match = re.search(r'homepage["\s:=]+["\']([^"\']+)["\']', html, re.I)
                                if homepage_match:
                                    result['homepage_url'] = homepage_match.group(1)

                                return result
                    except Exception as e:
                        print(f"[사람인] 채용공고 페이지에서 정보 추출 실패: {str(e)}")

                return {}

            company_url = f"https://www.saramin.co.kr/zf_user/company-info/view?csn={actual_csn}"
            print(f"[사람인] 회사 페이지 크롤링: {company_url}")

            async with httpx.AsyncClient(headers=self.headers, timeout=30.0, follow_redirects=True) as client:
                response = await client.get(company_url)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    result = {}

                    # 기업 정보 테이블
                    info_table = soup.find('div', class_='company_info_table')

                    if info_table:
                        # 업종
                        industry_elem = info_table.find('th', string=re.compile(r'업종'))
                        if industry_elem:
                            industry_td = industry_elem.find_next_sibling('td')
                            if industry_td:
                                result['industry'] = industry_td.get_text(strip=True)

                        # 설립일
                        established_elem = info_table.find('th', string=re.compile(r'설립일|설립년도'))
                        if established_elem:
                            established_td = established_elem.find_next_sibling('td')
                            if established_td:
                                result['established_year'] = established_td.get_text(strip=True)

                        # 직원수
                        employee_elem = info_table.find('th', string=re.compile(r'사원수|직원수'))
                        if employee_elem:
                            employee_td = employee_elem.find_next_sibling('td')
                            if employee_td:
                                result['employee_count'] = employee_td.get_text(strip=True)

                        # 주소
                        address_elem = info_table.find('th', string=re.compile(r'주소'))
                        if address_elem:
                            address_td = address_elem.find_next_sibling('td')
                            if address_td:
                                result['address'] = address_td.get_text(strip=True)

                        # 홈페이지
                        homepage_elem = info_table.find('th', string=re.compile(r'홈페이지'))
                        if homepage_elem:
                            homepage_td = homepage_elem.find_next_sibling('td')
                            if homepage_td:
                                homepage_link = homepage_td.find('a')
                                if homepage_link:
                                    result['homepage_url'] = homepage_link.get('href', '')

                        # 기업형태 or 기업구분 or 회사구분
                        company_type_elem = info_table.find('th', string=re.compile(r'기업형태|기업구분|회사구분|기업분류'))
                        if company_type_elem:
                            company_type_td = company_type_elem.find_next_sibling('td')
                            if company_type_td:
                                result['company_type'] = company_type_td.get_text(strip=True)

                        # 매출액
                        revenue_elem = info_table.find('th', string=re.compile(r'매출액|연매출'))
                        if revenue_elem:
                            revenue_td = revenue_elem.find_next_sibling('td')
                            if revenue_td:
                                result['revenue'] = revenue_td.get_text(strip=True)

                        # 대표자
                        ceo_elem = info_table.find('th', string=re.compile(r'대표자|대표이사|대표'))
                        if ceo_elem:
                            # "대표산업" 같은 것 제외
                            if '대표산업' not in ceo_elem.get_text(strip=True):
                                ceo_td = ceo_elem.find_next_sibling('td')
                                if ceo_td:
                                    result['ceo_name'] = ceo_td.get_text(strip=True)

                        # 자본금
                        capital_elem = info_table.find('th', string=re.compile(r'자본금'))
                        if capital_elem:
                            capital_td = capital_elem.find_next_sibling('td')
                            if capital_td:
                                result['capital'] = capital_td.get_text(strip=True)

                        # 평균연봉 or 대졸초임
                        salary_elem = info_table.find('th', string=re.compile(r'평균연봉|대졸초임|평균 연봉'))
                        if salary_elem:
                            salary_td = salary_elem.find_next_sibling('td')
                            if salary_td:
                                result['average_salary'] = salary_td.get_text(strip=True)

                    # 회사명 추출 (페이지 제목 또는 헤더에서)
                    company_name_elem = (
                        soup.find('h1', class_=re.compile(r'.*company.*name.*|.*title.*', re.I)) or
                        soup.find('div', class_=re.compile(r'.*company.*name.*', re.I)) or
                        soup.find('strong', class_=re.compile(r'.*company.*name.*', re.I))
                    )
                    if company_name_elem:
                        result['company_name'] = company_name_elem.get_text(strip=True)
                        print(f"[사람인] 회사명 추출: {result['company_name']}")

                    # 회사 소개
                    intro_section = soup.find('div', class_='company_intro')
                    if intro_section:
                        intro_text = intro_section.get_text(strip=True)
                        if intro_text and len(intro_text) > 10:
                            result['description'] = intro_text

                    # 복지/혜택
                    welfare_section = soup.find('div', class_='company_welfare')
                    if welfare_section:
                        welfare_items = welfare_section.find_all('li')
                        if welfare_items:
                            benefits = [item.get_text(strip=True) for item in welfare_items]
                            result['benefits'] = ', '.join(benefits)

                    return result

        except Exception as e:
            print(f"[사람인] 기업 상세 정보 크롤링 실패 (company_id: {company_id}): {str(e)}")

        return {}

    async def enrich_companies_with_details(
        self,
        site_name: str,
        companies: List[Dict]
    ) -> List[Dict]:
        """
        기업 정보를 상세 정보로 보강합니다.

        Args:
            site_name: 사이트 이름
            companies: 기본 기업 정보 리스트

        Returns:
            상세 정보가 추가된 기업 리스트
        """
        enriched = []

        for company in companies:
            enriched_company = company.copy()

            try:
                if site_name in ['wanted', '원티드']:
                    # 원티드는 채용공고 URL에서 job_id 추출
                    url = company.get('recruitment_url', '')
                    match = re.search(r'/wd/(\d+)', url)
                    if match:
                        job_id = match.group(1)
                        # 원티드 API로 상세 정보 가져오기
                        details = await self.crawl_wanted_company_detail(job_id)
                        enriched_company.update(details)
                        print(f"[원티드] {company.get('company_name')} 상세 정보 추가")
                        await asyncio.sleep(0.5)  # Rate limiting

                elif site_name in ['jobkorea', '잡코리아']:
                    # 잡코리아는 채용공고 URL에서 기업 정보 추출
                    job_url = company.get('recruitment_url')
                    if job_url:
                        details = await self.crawl_jobkorea_company_detail(job_url)
                        enriched_company.update(details)
                        print(f"[잡코리아] {company.get('company_name')} 상세 정보 추가")
                        await asyncio.sleep(1.0)  # Rate limiting (더 느리게)

                elif site_name in ['saramin', '사람인']:
                    # 사람인은 company_id와 job_url 사용
                    company_id = company.get('company_id')
                    job_url = company.get('recruitment_url')
                    company_name = company.get('company_name', '')

                    # 회사명이 "회사명 미상"이면 채용공고 페이지에서 추출 시도
                    if job_url and ('회사명 미상' in company_name or not company_name):
                        print(f"[사람인] 회사명 추출 시도: {job_url}")
                        extracted_name = await self._extract_company_name_from_job_page(job_url)
                        if extracted_name:
                            enriched_company['company_name'] = extracted_name
                            print(f"[사람인] 회사명 추출 성공: {extracted_name}")

                    if company_id:
                        details = await self.crawl_saramin_company_detail(
                            company_id=company_id,
                            job_url=job_url
                        )
                        enriched_company.update(details)

                        # 상세 정보에서 실제 회사명을 가져왔다면 업데이트
                        if details.get('company_name'):
                            enriched_company['company_name'] = details['company_name']

                        print(f"[사람인] {enriched_company.get('company_name') or company_id} 상세 정보 추가")
                        await asyncio.sleep(1.0)  # Rate limiting (더 느리게)

            except Exception as e:
                print(f"기업 정보 보강 실패 ({company.get('company_name')}): {str(e)}")

            enriched.append(enriched_company)

        return enriched

    async def crawl_and_save_companies_from_jobs(
        self,
        site_name: str,
        job_listings: List[Dict]
    ) -> int:
        """
        채용공고에서 기업정보를 추출하고 저장합니다.

        Args:
            site_name: 사이트 이름
            job_listings: 채용공고 리스트

        Returns:
            저장된 기업 수
        """
        # 기업정보 추출
        companies = self.extract_companies_from_job_listings(site_name, job_listings)

        if not companies:
            return 0

        # 상세 정보 보강 (비동기 실행)
        companies = await self.enrich_companies_with_details(site_name, companies)

        # 기업정보 저장
        return self.save_companies(site_name, companies)
