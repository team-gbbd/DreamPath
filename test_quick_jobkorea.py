import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test():
    url = "https://www.jobkorea.co.kr/Recruit/GI_Read/48020673"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        # 패턴 2: /Co_Read/C/{id} 형식
        company_link = soup.find('a', href=re.compile(r'/Co_Read/C/\d+'))

        if company_link:
            print(f"Found: {company_link.get('href')}")
            print(f"Text: {company_link.get_text(strip=True)}")
        else:
            print("Not found - trying text search")
            all_links = soup.find_all('a', href=True)
            company_keywords = ['주식회사', '(주)', '㈜']
            for link in all_links:
                text = link.get_text(strip=True)
                href = link.get('href', '')
                if any(keyword in text for keyword in company_keywords) and '/Co_Read/' in href:
                    print(f"Found via text: {href} - {text[:50]}")
                    break

asyncio.run(test())
