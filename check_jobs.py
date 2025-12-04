import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')

# 다양한 직업으로 검색해서 DB에 뭐가 있는지 확인
job_types = ["프론트엔드", "데이터", "DevOps", "디자이너", "PM", "AI", "풀스택"]

for job_type in job_types:
    url = "http://localhost:8000/api/agent/job-recommendations/with-requirements"
    data = {
        "userId": 1,
        "careerAnalysis": {
            "recommendedCareers": [{"careerName": job_type}],
            "strengths": ["문제 해결력"],
            "values": ["성장"],
            "interests": ["기술"]
        },
        "userSkills": [],
        "limit": 2
    }

    try:
        response = requests.post(url, json=data, timeout=60)
        result = response.json()
        count = result.get('totalCount', 0)
        print(f"{job_type}: {count}개 공고")
        if count > 0:
            for rec in result.get('recommendations', [])[:2]:
                print(f"  - {rec.get('title')} ({rec.get('company')})")
    except Exception as e:
        print(f"{job_type}: 에러 - {e}")
    print()
