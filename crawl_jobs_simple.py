"""
간단한 채용 공고 크롤링 스크립트
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def crawl_wanted(keyword="개발자", max_results=20):
    """원티드에서 채용 공고 크롤링"""
    print(f"\n원티드에서 '{keyword}' 검색 중...")

    response = requests.post(
        f"{BASE_URL}/api/job-sites/crawl/wanted",
        json={
            "searchKeyword": keyword,
            "maxResults": max_results,
            "forceRefresh": True
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] 성공! {data.get('totalResults', 0)}개 공고 수집")
        return data
    else:
        print(f"[ERROR] 실패: {response.status_code}")
        print(response.text)
        return None

def crawl_multiple_keywords():
    """여러 키워드로 크롤링"""
    keywords = ["개발자", "백엔드", "프론트엔드", "데이터 분석", "디자이너"]

    print("\n" + "="*60)
    print("  채용 공고 크롤링 시작")
    print("="*60)

    total_jobs = 0
    for keyword in keywords:
        result = crawl_wanted(keyword, max_results=10)
        if result:
            total_jobs += result.get('totalResults', 0)

    print(f"\n총 {total_jobs}개의 채용 공고 수집 완료!")
    print("="*60 + "\n")

if __name__ == "__main__":
    crawl_multiple_keywords()
