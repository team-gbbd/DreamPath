import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')

url = "http://localhost:8000/api/agent/job-recommendations/with-requirements"

# 백엔드 개발자가 다양한 직군 공고를 볼 때 점수 차이 테스트
data = {
    "userId": 1,
    "careerAnalysis": {
        "recommendedCareers": [
            {"careerName": "백엔드 개발자"},
            {"careerName": "풀스택 개발자"}
        ],
        "strengths": ["문제 해결력", "논리적 사고", "꼼꼼함"],
        "values": ["성장", "안정성"],
        "interests": ["프로그래밍", "시스템 설계", "데이터베이스"]
    },
    "userSkills": ["Python", "Java", "Spring", "MySQL", "Docker", "Git"],
    "limit": 15  # 더 많이 가져오기
}

response = requests.post(url, json=data, timeout=300)
result = response.json()

print("=" * 70)
print("AI 기반 채용 공고 추천 (다양한 직군 포함)")
print("=" * 70)
print(f"사용자 추천 직업: 백엔드 개발자, 풀스택 개발자")
print(f"보유 스킬: Python, Java, Spring, MySQL, Docker, Git")
print("=" * 70)
print(f"총 {result.get('totalCount', 0)}개 공고\n")

# 점수별로 정렬해서 출력
recs = sorted(result.get('recommendations', []), key=lambda x: x.get('matchScore', 0), reverse=True)

for i, rec in enumerate(recs, 1):
    score = rec.get('matchScore', 0)
    title = rec.get('title', 'N/A')
    company = rec.get('company', 'N/A')

    # 점수에 따른 이모지
    if score >= 80:
        emoji = "🟢"
    elif score >= 60:
        emoji = "🟡"
    elif score >= 40:
        emoji = "🟠"
    else:
        emoji = "🔴"

    print(f"{emoji} [{score}점] {title}")
    print(f"   회사: {company}")
    reasons = rec.get('reasons', [])
    if reasons:
        print(f"   이유: {reasons[0][:50]}...")
    print()
