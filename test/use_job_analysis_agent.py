"""
채용 공고 분석 AI 에이전트 사용 예제
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def print_section(title):
    """섹션 헤더 출력"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)


def analyze_market_trends(career_field=None):
    """시장 트렌드 분석"""
    print_section(f"시장 트렌드 분석 - {career_field or '전체'}")

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/market-trends",
        json={
            "careerField": career_field,
            "days": 7
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"\n분석 기간: {data['period']}")
        print(f"분야: {data['careerField']}")
        print(f"총 채용 공고 수: {data['totalJobs']}개")

        print("\n[상위 채용 기업]")
        for item in data['topCompanies'][:5]:
            print(f"  - {item['name']}: {item['count']}개 공고")

        print("\n[인기 지역]")
        for item in data['topLocations'][:5]:
            print(f"  - {item['name']}: {item['count']}개 공고")

        print("\n[트렌딩 스킬]")
        for skill in data['trendingSkills']:
            print(f"  - {skill}")

        print("\n[성장하는 분야]")
        for field in data['growingFields']:
            print(f"  - {field}")

        print(f"\n[요약]\n{data['summary']}")

        print("\n[인사이트]")
        for insight in data['insights']:
            print(f"  - {insight}")

    else:
        print(f"[ERROR] {response.status_code}: {response.text}")


def analyze_skill_requirements(career_field):
    """스킬 요구사항 분석"""
    print_section(f"스킬 요구사항 분석 - {career_field}")

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/skill-requirements",
        json={
            "careerField": career_field,
            "days": 7
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"\n분석한 공고 수: {data['analyzedJobs']}개")

        print("\n[필수 스킬]")
        for skill_detail in data['requiredSkills'][:10]:
            print(f"  - {skill_detail['skill']} (빈도: {skill_detail['frequency']}, 중요도: {skill_detail['importance']})")

        print("\n[우대 스킬]")
        for skill in data['preferredSkills'][:5]:
            print(f"  - {skill}")

        print("\n[떠오르는 스킬]")
        for skill in data['emergingSkills']:
            print(f"  - {skill}")

        exp_level = data['experienceLevel']
        print("\n[경력 요구사항]")
        if exp_level.get('entry'):
            print(f"  - 신입: {exp_level['entry']}")
        if exp_level.get('mid'):
            print(f"  - 중급: {exp_level['mid']}")
        if exp_level.get('senior'):
            print(f"  - 시니어: {exp_level['senior']}")

        print("\n[학습 추천]")
        for rec in data['recommendations']:
            print(f"  - {rec}")

    else:
        print(f"[ERROR] {response.status_code}: {response.text}")


def get_personalized_insights():
    """맞춤형 인사이트"""
    print_section("맞춤형 커리어 인사이트")

    # 샘플 데이터
    user_profile = {
        "skills": ["Python", "JavaScript", "React", "FastAPI", "Docker"],
        "experience": "2년차 주니어 개발자"
    }

    career_analysis = {
        "recommendedCareers": [
            {
                "careerName": "백엔드 개발자",
                "description": "서버 개발 및 API 설계",
                "matchScore": 85,
                "reasons": ["Python 경험", "FastAPI 사용"]
            },
            {
                "careerName": "풀스택 개발자",
                "description": "프론트엔드와 백엔드 모두",
                "matchScore": 78,
                "reasons": ["React와 FastAPI 모두 사용"]
            }
        ]
    }

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/personalized-insights",
        json={
            "userProfile": user_profile,
            "careerAnalysis": career_analysis
        }
    )

    if response.status_code == 200:
        data = response.json()

        print("\n[사용자 프로필]")
        print(f"  경력: {user_profile['experience']}")
        print(f"  스킬: {', '.join(user_profile['skills'])}")

        for insight in data['insights']:
            print(f"\n--- {insight['careerName']} ({insight['jobCount']}개 공고) ---")

            print("\n부족한 스킬:")
            for gap in insight['gapAnalysis']:
                print(f"  - {gap}")

            print("\n추천 학습 경로:")
            for i, step in enumerate(insight['learningPath'], 1):
                print(f"  {i}. {step}")

            print(f"\n경쟁력: {insight['competitiveness']}")

            print("\n추천사항:")
            for rec in insight['recommendations']:
                print(f"  - {rec}")

        print(f"\n[종합 추천]\n{data['overallRecommendation']}")

    else:
        print(f"[ERROR] {response.status_code}: {response.text}")


def main():
    """메인 함수"""
    print("\n" + "="*60)
    print("  채용 공고 분석 AI 에이전트 사용 예제")
    print("="*60)

    # 1. 전체 시장 트렌드 분석
    analyze_market_trends(None)

    # 2. 개발자 시장 트렌드
    analyze_market_trends("개발자")

    # 3. 백엔드 개발자 스킬 요구사항
    analyze_skill_requirements("백엔드")

    # 4. 맞춤형 인사이트
    get_personalized_insights()

    print("\n" + "="*60)
    print("  분석 완료!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
