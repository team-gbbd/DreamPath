import requests
import json

# Test JobKorea crawling with company enrichment
url = "http://localhost:8000/api/job-sites/crawl"
data = {
    "siteName": "jobkorea",
    "siteUrl": "https://www.jobkorea.co.kr/Search/?stext=개발자&menucode=local",
    "searchKeyword": "개발자",
    "maxResults": 10,
    "forceRefresh": True
}

print("잡코리아 크롤링 시작 (기업정보 포함)...")
print(f"검색어: {data['searchKeyword']}, 최대: {data['maxResults']}개")

response = requests.post(url, json=data, timeout=120)

if response.status_code == 200:
    result = response.json()
    print(f"\n✅ 크롤링 성공!")
    print(f"- 채용공고: {len(result.get('jobListings', []))}개")
    print(f"- DB 저장: {result.get('savedToDatabase', 0)}개")
    print(f"- 기업 저장: {result.get('savedCompanies', 0)}개")

    # 기업 목록 조회
    print("\n잡코리아 기업 목록 조회...")
    list_response = requests.get("http://localhost:8000/api/company/list",
                                 params={"site_name": "jobkorea", "page": 1, "page_size": 5})

    if list_response.status_code == 200:
        companies = list_response.json().get('companies', [])
        print(f"\n등록된 잡코리아 기업: {len(companies)}개")

        if companies:
            print("\n최근 기업 정보:")
            for i, company in enumerate(companies[:3], 1):
                print(f"\n{i}. {company.get('company_name')}")
                print(f"   - 업종: {company.get('industry') or 'N/A'}")
                print(f"   - 설립연도: {company.get('established_year') or 'N/A'}")
                print(f"   - 직원수: {company.get('employee_count') or 'N/A'}")
                print(f"   - 위치: {company.get('location') or 'N/A'}")
                print(f"   - 주소: {(company.get('address') or 'N/A')[:50]}...")
                print(f"   - 복지: {'있음' if company.get('benefits') else '없음'}")
                print(f"   - 설명: {'있음' if company.get('description') else '없음'}")
else:
    print(f"\n❌ 크롤링 실패: {response.status_code}")
    print(response.text[:500])
