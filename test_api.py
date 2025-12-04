import requests
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

url = "http://localhost:8000/api/agent/job-recommendations/with-requirements"
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
    "limit": 3
}

try:
    response = requests.post(url, json=data, timeout=120)
    result = response.json()

    print("=" * 60)
    print("AI 기반 채용 공고 추천 결과")
    print("=" * 60)
    print(f"총 추천 공고 수: {result.get('totalCount', 0)}")
    print()

    for i, rec in enumerate(result.get('recommendations', []), 1):
        print(f"[{i}] {rec.get('title', 'N/A')}")
        print(f"    회사: {rec.get('company', 'N/A')}")
        print(f"    AI 점수: {rec.get('matchScore', 0)}점")
        print(f"    추천 이유:")
        for reason in rec.get('reasons', []):
            print(f"      - {reason}")
        print(f"    강점:")
        for strength in rec.get('strengths', [])[:3]:
            print(f"      - {strength}")
        if rec.get('concerns'):
            print(f"    고려사항:")
            for concern in rec.get('concerns', []):
                print(f"      - {concern}")
        print()

    # 파일로도 저장
    with open("C:/Users/301/dev/qwer/DreamPath/test_result.txt", "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("AI 기반 채용 공고 추천 결과\n")
        f.write("=" * 60 + "\n")
        f.write(f"총 추천 공고 수: {result.get('totalCount', 0)}\n\n")

        for i, rec in enumerate(result.get('recommendations', []), 1):
            f.write(f"[{i}] {rec.get('title', 'N/A')}\n")
            f.write(f"    회사: {rec.get('company', 'N/A')}\n")
            f.write(f"    AI 점수: {rec.get('matchScore', 0)}점\n")
            f.write(f"    추천 이유:\n")
            for reason in rec.get('reasons', []):
                f.write(f"      - {reason}\n")
            f.write(f"    강점:\n")
            for strength in rec.get('strengths', [])[:3]:
                f.write(f"      - {strength}\n")
            if rec.get('concerns'):
                f.write(f"    고려사항:\n")
                for concern in rec.get('concerns', []):
                    f.write(f"      - {concern}\n")
            f.write("\n")

    print("결과가 test_result.txt에 저장되었습니다.")

except Exception as e:
    print(f"Error: {e}")
