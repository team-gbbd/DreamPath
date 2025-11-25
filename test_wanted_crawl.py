# -*- coding: utf-8 -*-
import requests
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "http://localhost:8000/api/job-sites/crawl/wanted"
payload = {
    "searchKeyword": None,
    "maxResults": 50,
    "forceRefresh": True
}

print("원티드 크롤링 시작...")
response = requests.post(url, json=payload)

if response.status_code == 200:
    result = response.json()
    print("\n[SUCCESS] 성공!")
    print(f"사이트: {result.get('site')}")
    print(f"총 결과 수: {result.get('totalResults')}")
    print(f"캐시: {result.get('fromCache')}")
    print(f"DB 저장: {result.get('savedToDatabase', 'N/A')}")

    jobs = result.get('jobListings', [])
    print(f"\n[공고 목록] 첫 10개:")
    for i, job in enumerate(jobs[:10], 1):
        print(f"{i}. {job.get('title', 'NO_TITLE')[:50]} - {job.get('company', '회사명없음')}")

    with_company = sum(1 for job in jobs if job.get('company'))
    print(f"\n회사명 있는 공고: {with_company}/{len(jobs)}")
else:
    print(f"[ERROR] HTTP {response.status_code}")
    print(response.text[:500])
