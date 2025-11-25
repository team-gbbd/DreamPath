import asyncio
import httpx
from bs4 import BeautifulSoup
import re
import json

async def test_saramin_job_page():
    """Test actual saramin job page structure"""
    url = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=52371239'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    result = {
        'status': 'unknown',
        'company_name': None,
        'csn': None,
        'company_elements': []
    }

    try:
        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)

            result['status'] = f'HTTP {response.status_code}'

            if response.status_code == 200:
                html = response.text
                soup = BeautifulSoup(html, 'html.parser')

                # CSN 찾기
                csn_match = re.search(r'company-info/view\?csn=(\d+)', html)
                if csn_match:
                    result['csn'] = csn_match.group(1)

                # 회사명 찾기 - 여러 패턴 시도
                company_selectors = [
                    ('class_company', soup.find('a', class_=re.compile(r'.*company.*', re.I))),
                    ('class_corp_name', soup.find('span', class_=re.compile(r'.*corp.*name.*', re.I))),
                    ('class_company_name', soup.find('div', class_=re.compile(r'.*company.*name.*', re.I))),
                    ('strong_company', soup.find('strong', string=re.compile(r'.*주식회사.*|.*㈜.*', re.I))),
                ]

                for selector_name, elem in company_selectors:
                    if elem:
                        text = elem.get_text(strip=True)
                        result['company_elements'].append({
                            'selector': selector_name,
                            'text': text,
                            'tag': elem.name,
                            'class': elem.get('class', [])
                        })
                        if not result['company_name']:
                            result['company_name'] = text

    except Exception as e:
        result['error'] = str(e)

    return result

async def main():
    result = await test_saramin_job_page()

    # Write to JSON file
    with open('debug_saramin_output.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("Result saved to debug_saramin_output.json")
    print(f"Status: {result['status']}")
    print(f"CSN: {result.get('csn', 'Not found')}")
    print(f"Company Name: {result.get('company_name', 'Not found')}")
    print(f"Found {len(result.get('company_elements', []))} company elements")

if __name__ == "__main__":
    asyncio.run(main())
