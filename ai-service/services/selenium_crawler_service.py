"""
Selenium 기반 웹 크롤러 서비스
JavaScript로 렌더링되는 페이지를 크롤링
"""
import re
from typing import Optional
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


class SeleniumCrawlerService:
    """Selenium을 사용한 동적 웹 페이지 크롤링"""

    def __init__(self):
        self.driver = None

    def _get_driver(self):
        """Chrome WebDriver 초기화 (헤드리스 모드)"""
        if self.driver is None:
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

            self.driver = webdriver.Chrome(options=chrome_options)
        return self.driver

    def close(self):
        """WebDriver 종료"""
        if self.driver:
            self.driver.quit()
            self.driver = None

    def get_saramin_company_csn(self, rec_idx: str) -> Optional[str]:
        """
        사람인 채용공고 페이지에서 회사 정보 CSN 추출

        Args:
            rec_idx: 채용공고 ID

        Returns:
            csn 값 또는 None
        """
        driver = self._get_driver()
        job_url = f"https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={rec_idx}"

        try:
            print(f"[Selenium] 페이지 로딩: {job_url}")
            driver.get(job_url)

            # 페이지 로딩 대기 (최대 10초)
            wait = WebDriverWait(driver, 10)

            # 회사명 링크가 로딩될 때까지 대기
            # 여러 가능한 selector 시도
            selectors = [
                "//a[contains(@href, 'company-info') and contains(@href, 'csn=')]",
                "//div[contains(@class, 'company')]//a[contains(@href, 'csn=')]",
                "//a[contains(text(), '주식회사') or contains(text(), '㈜') or contains(text(), '(주)')][@href]"
            ]

            company_link = None
            for selector in selectors:
                try:
                    company_link = wait.until(
                        EC.presence_of_element_located((By.XPATH, selector))
                    )
                    if company_link:
                        print(f"[Selenium] 회사 링크 발견: {selector}")
                        break
                except TimeoutException:
                    continue

            if company_link:
                href = company_link.get_attribute('href')
                company_name = company_link.text.strip()
                print(f"[Selenium] 회사명: {company_name}, href: {href[:100]}")

                # csn 추출
                csn_match = re.search(r'[?&]csn=([^&]+)', href)
                if csn_match:
                    csn = csn_match.group(1)
                    print(f"[Selenium] CSN 추출 성공: {csn}")
                    return csn
                else:
                    print(f"[Selenium] href에 csn 없음: {href}")
            else:
                print(f"[Selenium] 회사 링크를 찾을 수 없습니다")

                # 디버깅: 페이지 소스 일부 출력
                page_source = driver.page_source
                if 'company-info' in page_source:
                    print(f"[Selenium DEBUG] 페이지에 company-info 존재함")
                    # company-info 주변 HTML 추출
                    import re
                    matches = re.findall(r'.{0,200}company-info.{0,200}', page_source)
                    for idx, match in enumerate(matches[:3]):
                        print(f"[Selenium DEBUG] match {idx}: {match[:150]}")

        except Exception as e:
            print(f"[Selenium] 에러 발생: {type(e).__name__}: {str(e)}")

        return None

    def __del__(self):
        """소멸자에서 드라이버 정리"""
        self.close()
