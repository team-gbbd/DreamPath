import requests

# Get first JobKorea company
list_response = requests.get("http://localhost:8000/api/company/list",
                             params={"site_name": "jobkorea", "page": 1, "page_size": 1})

if list_response.status_code == 200:
    companies = list_response.json().get('companies', [])

    if companies:
        company = companies[0]
        print(f"Company: {company.get('company_name')}")
        print(f"Company ID: {company.get('company_id')}")
        print(f"Homepage URL: {company.get('homepage_url')}")
        print(f"Recruitment URL: {company.get('recruitment_url')}")

        print("\nCurrent data:")
        print(f"- Industry: {company.get('industry') or 'N/A'}")
        print(f"- Established: {company.get('established_year') or 'N/A'}")
        print(f"- Employees: {company.get('employee_count') or 'N/A'}")
        print(f"- Address: {company.get('address') or 'N/A'}")
        print(f"- Benefits: {company.get('benefits') or 'N/A'}")
        print(f"- Description length: {len(company.get('description') or '')}")
    else:
        print("No companies found")
else:
    print(f"Error: {list_response.status_code}")
