import requests
import json

# Get list of companies first
list_url = "http://localhost:8000/api/company/list"
list_params = {"page": 1, "page_size": 5, "site_name": "wanted"}

print("최근 기업 조회...")
list_response = requests.get(list_url, params=list_params)

if list_response.status_code == 200:
    companies = list_response.json().get('companies', [])

    if companies:
        # Get detail of first company
        first_company = companies[0]
        company_id = first_company.get('id')
        company_name = first_company.get('company_name')

        print(f"\n'{company_name}' (ID: {company_id}) 상세 정보:\n")

        detail_url = f"http://localhost:8000/api/company/{company_id}"
        detail_response = requests.get(detail_url)

        if detail_response.status_code == 200:
            company = detail_response.json().get('company', {})

            print(f"회사명: {company.get('company_name')}")
            print(f"사이트: {company.get('site_name')}")
            print(f"업종: {company.get('industry') or 'N/A'}")
            print(f"직원수: {company.get('employee_count') or 'N/A'}")
            print(f"위치: {company.get('location') or 'N/A'}")
            print(f"주소: {company.get('address') or 'N/A'}")
            print(f"\n회사 소개:")
            print(company.get('description') or 'N/A')
            print(f"\n복지/혜택:")
            print(company.get('benefits') or 'N/A')
            print(f"\n홈페이지: {company.get('homepage_url') or 'N/A'}")
            print(f"로고 URL: {company.get('logo_url') or 'N/A'}")
        else:
            print(f"상세 정보 조회 실패: {detail_response.status_code}")
    else:
        print("등록된 기업이 없습니다.")
else:
    print(f"목록 조회 실패: {list_response.status_code}")
