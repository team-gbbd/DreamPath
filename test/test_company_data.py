import requests
import json

# Check company list
url = "http://localhost:8000/api/company/list"
params = {
    "page": 1,
    "page_size": 10,
    "site_name": "wanted"
}

print("기업 목록 조회...")
response = requests.get(url, params=params)

if response.status_code == 200:
    result = response.json()
    print(f"총 기업 수: {result.get('total', 0)}개")

    companies = result.get('companies', [])
    if companies:
        print(f"\n최근 등록된 기업 {len(companies)}개:")
        for i, company in enumerate(companies[:5], 1):
            print(f"\n{i}. {company.get('company_name')}")
            print(f"   - ID: {company.get('id')}")
            print(f"   - 사이트: {company.get('site_name')}")
            print(f"   - 업종: {company.get('industry', 'N/A')}")
            print(f"   - 직원수: {company.get('employee_count', 'N/A')}")
            print(f"   - 위치: {company.get('location', 'N/A')}")
            print(f"   - 설명 길이: {len(company.get('description', '')) if company.get('description') else 0}자")
            print(f"   - 로고: {'있음' if company.get('logo_url') else '없음'}")
    else:
        print("등록된 기업이 없습니다.")
else:
    print(f"에러: {response.status_code} - {response.text}")
