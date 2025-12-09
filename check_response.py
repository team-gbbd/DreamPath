import requests
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

url = "http://localhost:8000/api/agent/job-recommendations/with-requirements"
data = {
    "userId": 1,
    "careerAnalysis": {
        "recommendedCareers": [{"careerName": "백엔드 개발자"}],
        "strengths": ["문제 해결력"],
        "values": ["성장"],
        "interests": ["프로그래밍"]
    },
    "userSkills": ["Python", "Java"],
    "limit": 2
}

response = requests.post(url, json=data, timeout=120)
result = response.json()

print("=" * 60)
print("API 응답 상세 확인")
print("=" * 60)

for rec in result.get('recommendations', [])[:2]:
    print(f"\n제목: {rec.get('title')}")
    print(f"회사: {rec.get('company')}")
    print(f"점수: {rec.get('matchScore')}")
    print(f"추천 이유: {rec.get('reasons')}")
    print(f"필요 기술: {rec.get('requiredTechnologies')}")
    print(f"필요 자격증: {rec.get('requiredCertifications')}")
    print(f"스킬 갭: {rec.get('skillGap')}")
    print("-" * 40)

print(f"\n공통 필요 기술: {result.get('commonRequiredTechnologies')}")
print(f"공통 필요 자격증: {result.get('commonRequiredCertifications')}")
