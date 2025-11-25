import requests
import json

# Test JobKorea crawling
url = "http://localhost:8000/api/job-sites/crawl"
data = {
    "siteName": "jobkorea",
    "siteUrl": "https://www.jobkorea.co.kr/Search/?stext=개발자&menucode=local",
    "searchKeyword": "개발자",
    "maxResults": 10,
    "forceRefresh": True
}

print("Crawling JobKorea...")
response = requests.post(url, json=data, timeout=120)

if response.status_code == 200:
    result = response.json()
    print(f"Success! Jobs: {len(result.get('jobListings', []))}, DB saved: {result.get('savedToDatabase', 0)}, Companies saved: {result.get('savedCompanies', 0)}")

    # Check company list
    list_response = requests.get("http://localhost:8000/api/company/list",
                                 params={"site_name": "jobkorea", "page": 1, "page_size": 3})

    if list_response.status_code == 200:
        companies = list_response.json().get('companies', [])
        print(f"\nTotal JobKorea companies: {list_response.json().get('total', 0)}")

        for i, company in enumerate(companies[:3], 1):
            print(f"\n{i}. {company.get('company_name')}")
            print(f"   Industry: {company.get('industry') or 'N/A'}")
            print(f"   Established: {company.get('established_year') or 'N/A'}")
            print(f"   Employees: {company.get('employee_count') or 'N/A'}")
            print(f"   Location: {company.get('location') or 'N/A'}")
            print(f"   Benefits: {'Yes' if company.get('benefits') else 'No'}")
            print(f"   Description: {'Yes' if company.get('description') else 'No'}")
else:
    print(f"Failed: {response.status_code}")
