import requests

# Search for a specific company
url = "http://localhost:8000/api/company/search/by-name"
params = {"name": "아이리스브라이트"}

print("'아이리스브라이트' 검색...")
response = requests.get(url, params=params)

if response.status_code == 200:
    result = response.json()
    companies = result.get('companies', [])

    if companies:
        company = companies[0]
        print(f"\n회사명: {company.get('company_name')}")
        print(f"사이트: {company.get('site_name')}")
        print(f"업종: {company.get('industry') or 'N/A'}")
        print(f"직원수: {company.get('employee_count') or 'N/A'}")
        print(f"위치: {company.get('location') or 'N/A'}")
        print(f"주소: {company.get('address') or 'N/A'}")
        print(f"\n회사 소개:")
        desc = company.get('description') or 'N/A'
        print(desc[:200] + '...' if len(desc) > 200 else desc)
        print(f"\n로고 URL: {company.get('logo_url') or 'N/A'}")
        print(f"홈페이지: {company.get('homepage_url') or 'N/A'}")
    else:
        print("검색 결과 없음")
else:
    print(f"에러: {response.status_code}")
