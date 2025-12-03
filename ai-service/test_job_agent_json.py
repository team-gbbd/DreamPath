"""
job_agent JSON API 테스트
"""
import requests
import json

def test_job_recommendations():
    url = "http://localhost:8000/api/agent/job-recommendations"

    payload = {
        "userId": 1,
        "careerAnalysis": {
            "recommendedCareers": [
                {
                    "careerName": "백엔드 개발자",
                    "description": "서버 개발 및 API 설계",
                    "matchScore": 85
                }
            ],
            "strengths": ["문제 해결 능력", "논리적 사고"],
            "interests": ["웹 개발", "데이터베이스"]
        },
        "userProfile": {
            "skills": ["Python", "Java", "Spring"],
            "experience": "2년차"
        },
        "limit": 5
    }

    print("=" * 50)
    print("채용 공고 추천 API 테스트 (OpenAI Agents SDK)")
    print("=" * 50)
    print(f"Request: {json.dumps(payload, ensure_ascii=False, indent=2)[:500]}...")
    print("=" * 50)

    try:
        response = requests.post(url, json=payload, timeout=120)
        print(f"Status: {response.status_code}")

        data = response.json()
        print(f"\nResponse:")
        print(json.dumps(data, ensure_ascii=False, indent=2))

        if data.get("success"):
            print(f"\n추천 공고 수: {data.get('totalCount', 0)}")
            recommendations = data.get("recommendations", [])
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"\n#{i} {rec.get('title', 'N/A')}")
                print(f"   회사: {rec.get('company', 'N/A')}")
                print(f"   매칭점수: {rec.get('matchScore', 0)}%")
                print(f"   추천이유: {rec.get('reasons', [])[:2]}")
        else:
            print(f"\n에러: {data.get('error', 'Unknown')}")

    except requests.exceptions.Timeout:
        print("타임아웃 (120초 초과)")
    except Exception as e:
        print(f"에러: {e}")

if __name__ == "__main__":
    test_job_recommendations()
