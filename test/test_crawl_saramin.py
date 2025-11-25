import requests
import json

url = "http://localhost:8000/api/job-sites/crawl"
data = {
    "siteName": "사람인",
    "siteUrl": "https://www.saramin.co.kr",
    "searchKeyword": "개발자",
    "maxResults": 20,
    "forceRefresh": True
}

print("요청 데이터:", json.dumps(data, ensure_ascii=False, indent=2))

try:
    response = requests.post(url, json=data, timeout=60)
    print(f"\n응답 상태 코드: {response.status_code}")
    print(f"응답 내용:\n{json.dumps(response.json(), ensure_ascii=False, indent=2)}")
except Exception as e:
    print(f"오류 발생: {e}")
    if hasattr(e, 'response'):
        print(f"응답 텍스트: {e.response.text}")
