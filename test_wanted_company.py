"""
원티드 기업 상세 페이지 구조 분석
"""
import asyncio
import httpx
from bs4 import BeautifulSoup
import json

async def test_wanted_company():
    company_id = 104  # SM엔터테인먼트
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    
    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        # 1. API 확인
        print("=== 1. API 데이터 ===")
        api_url = f"https://www.wanted.co.kr/api/v4/companies/{company_id}"
        response = await client.get(api_url)
        
        if response.status_code == 200:
            data = response.json()
            company = data.get('company', {})
            
            print(f"회사명: {company.get('name')}")
            print(f"산업: {company.get('industry_name')}")
            print(f"설립연도: {company.get('founded_year')}")
            print(f"주소: {company.get('company_address', {}).get('full_location')}")
            print(f"설명: {company.get('detail', {}).get('description', '')[:100]}...")
        
        # 2. 웹 페이지 확인
        print("\n=== 2. 웹 페이지 데이터 ===")
        web_url = f"https://www.wanted.co.kr/company/{company_id}"
        web_response = await client.get(web_url)
        
        if web_response.status_code == 200:
            soup = BeautifulSoup(web_response.text, 'html.parser')
            
            # 회사 정보 섹션 찾기
            info_sections = soup.find_all('dl')
            print(f"dl 태그 {len(info_sections)}개 발견")
            
            for dl in info_sections[:5]:
                dt_tags = dl.find_all('dt')
                dd_tags = dl.find_all('dd')
                for dt, dd in zip(dt_tags, dd_tags):
                    print(f"  {dt.get_text(strip=True)}: {dd.get_text(strip=True)[:50]}")

asyncio.run(test_wanted_company())
