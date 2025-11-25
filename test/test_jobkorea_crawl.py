# -*- coding: utf-8 -*-
import requests
import json
import sys
import io

# Windows 한글 출력 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "http://localhost:8000/api/job-sites/crawl"
payload = {
    "siteName": "잡코리아",
    "siteUrl": "https://www.jobkorea.co.kr",
    "searchKeyword": None,
    "maxResults": 50,
    "forceRefresh": True
}

print("잡코리아 크롤링 시작...")
response = requests.post(url, json=payload)

if response.status_code == 200:
    result = response.json()
    print("\n[SUCCESS] 성공!")
    print(f"사이트: {result.get('site')}")
    print(f"검색 키워드: {result.get('searchKeyword')}")
    print(f"총 결과 수: {result.get('totalResults')}")
    print(f"캐시에서 가져옴: {result.get('fromCache')}")
    print(f"DB 저장 개수: {result.get('savedToDatabase', 'N/A')}")

    job_listings = result.get('jobListings', [])
    print(f"\n[공고 목록] 첫 10개:")
    for i, job in enumerate(job_listings[:10], 1):
        print(f"{i}. [{job.get('id', 'NO_ID')}] {job.get('title', 'NO_TITLE')[:50]} - {job.get('company', '회사명없음')}")

    # 회사명 있는 공고 개수 확인
    with_company = sum(1 for job in job_listings if job.get('company'))
    print(f"\n회사명 있는 공고: {with_company}/{len(job_listings)}")
else:
    print(f"[ERROR] 실패: HTTP {response.status_code}")
    print(response.text[:500])
