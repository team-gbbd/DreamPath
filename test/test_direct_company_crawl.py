import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test_jobkorea_company_crawl(company_id):
    """Test direct JobKorea company crawling"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    company_url = f"https://www.jobkorea.co.kr/Recruit/Co_Read/{company_id}"
    print(f"Testing URL: {company_url}\n")

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        response = await client.get(company_url)

        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            result = {}

            # Find company info section
            info_section = soup.find('div', class_='tabWrap')

            if info_section:
                print("Found tabWrap section")

                # Industry
                industry_elem = info_section.find('dt', string=re.compile(r'업종'))
                if industry_elem:
                    industry_dd = industry_elem.find_next_sibling('dd')
                    if industry_dd:
                        result['industry'] = industry_dd.get_text(strip=True)
                        print(f"Industry: {result['industry']}")

                # Established year
                established_elem = info_section.find('dt', string=re.compile(r'설립일|설립년도'))
                if established_elem:
                    established_dd = established_elem.find_next_sibling('dd')
                    if established_dd:
                        result['established_year'] = established_dd.get_text(strip=True)
                        print(f"Established: {result['established_year']}")

                # Employee count
                employee_elem = info_section.find('dt', string=re.compile(r'사원수|직원수'))
                if employee_elem:
                    employee_dd = employee_elem.find_next_sibling('dd')
                    if employee_dd:
                        result['employee_count'] = employee_dd.get_text(strip=True)
                        print(f"Employees: {result['employee_count']}")

                # Address
                address_elem = info_section.find('dt', string=re.compile(r'주소'))
                if address_elem:
                    address_dd = address_elem.find_next_sibling('dd')
                    if address_dd:
                        result['address'] = address_dd.get_text(strip=True)
                        print(f"Address: {result['address'][:50]}...")
            else:
                print("tabWrap section not found")
                # Print first 500 chars of HTML to debug
                print("\nFirst 500 chars of HTML:")
                print(response.text[:500])

            # Company intro
            intro_section = soup.find('div', class_='coInfo')
            if intro_section:
                intro_text = intro_section.get_text(strip=True)
                if intro_text and len(intro_text) > 10:
                    result['description'] = intro_text
                    print(f"\nDescription length: {len(intro_text)}")
                    print(f"Description preview: {intro_text[:100]}...")

            # Welfare/benefits
            welfare_section = soup.find('div', class_='welfare')
            if welfare_section:
                welfare_items = welfare_section.find_all('li')
                if welfare_items:
                    benefits = [item.get_text(strip=True) for item in welfare_items]
                    result['benefits'] = ', '.join(benefits)
                    print(f"\nBenefits: {result['benefits'][:100]}...")

            return result
        else:
            print(f"Failed to fetch page: {response.status_code}")
            return {}

# Test with a known company ID
company_id = "47796997"
print(f"Testing JobKorea company detail crawling...")
print(f"Company ID: {company_id}\n")

result = asyncio.run(test_jobkorea_company_crawl(company_id))

print(f"\n\nFinal result: {len(result)} fields extracted")
for key, value in result.items():
    print(f"- {key}: {str(value)[:50]}...")
