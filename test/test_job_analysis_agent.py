"""
채용 공고 분석 AI 에이전트 테스트 스크립트

실행 방법:
1. Python AI Service가 실행 중인지 확인 (포트 8000)
2. python test_job_analysis_agent.py
"""
import requests
import json
from typing import Dict, Any


BASE_URL = "http://localhost:8000"


def print_response(title: str, response: Dict[Any, Any]):
    """응답을 보기 좋게 출력"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    print(json.dumps(response, ensure_ascii=False, indent=2))
    print(f"{'='*60}\n")


def test_market_trends():
    """시장 트렌드 분석 테스트"""
    print("\n[테스트 1] 시장 트렌드 분석")

    # 전체 시장 트렌드
    response = requests.post(
        f"{BASE_URL}/api/job-analysis/market-trends",
        json={
            "careerField": None,
            "days": 30
        }
    )

    if response.status_code == 200:
        print_response("전체 시장 트렌드 분석 결과", response.json())
    else:
        print(f"❌ 실패: {response.status_code} - {response.text}")

    # 개발자 트렌드
    response = requests.post(
        f"{BASE_URL}/api/job-analysis/market-trends",
        json={
            "careerField": "개발자",
            "days": 30
        }
    )

    if response.status_code == 200:
        print_response("개발자 시장 트렌드 분석 결과", response.json())
    else:
        print(f"❌ 실패: {response.status_code} - {response.text}")


def test_skill_requirements():
    """스킬 요구사항 분석 테스트"""
    print("\n[테스트 2] 스킬 요구사항 분석")

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/skill-requirements",
        json={
            "careerField": "백엔드 개발자",
            "days": 30
        }
    )

    if response.status_code == 200:
        print_response("백엔드 개발자 스킬 요구사항 분석 결과", response.json())
    else:
        print(f"❌ 실패: {response.status_code} - {response.text}")


def test_salary_trends():
    """연봉 트렌드 분석 테스트"""
    print("\n[테스트 3] 연봉 트렌드 분석")

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/salary-trends",
        json={
            "careerField": "개발자",
            "days": 30
        }
    )

    if response.status_code == 200:
        print_response("개발자 연봉 트렌드 분석 결과", response.json())
    else:
        print(f"❌ 실패: {response.status_code} - {response.text}")


def test_personalized_insights():
    """맞춤형 인사이트 테스트"""
    print("\n[테스트 4] 맞춤형 인사이트")

    # 샘플 데이터
    user_profile = {
        "skills": ["Python", "JavaScript", "React", "FastAPI"],
        "experience": "2년차 주니어 개발자"
    }

    career_analysis = {
        "recommendedCareers": [
            {
                "careerName": "백엔드 개발자",
                "description": "서버 개발 및 API 설계",
                "matchScore": 85,
                "reasons": ["Python 경험", "FastAPI 사용 경험"]
            },
            {
                "careerName": "풀스택 개발자",
                "description": "프론트엔드와 백엔드 모두 개발",
                "matchScore": 78,
                "reasons": ["React와 FastAPI 모두 사용 가능"]
            }
        ],
        "strengths": ["빠른 학습 능력", "문제 해결 능력"],
        "values": ["성장", "협업", "혁신"],
        "interests": ["웹 개발", "API 설계", "데이터베이스"]
    }

    response = requests.post(
        f"{BASE_URL}/api/job-analysis/personalized-insights",
        json={
            "userProfile": user_profile,
            "careerAnalysis": career_analysis
        }
    )

    if response.status_code == 200:
        print_response("맞춤형 인사이트 결과", response.json())
    else:
        print(f"❌ 실패: {response.status_code} - {response.text}")


def test_job_comparison():
    """채용 공고 비교 테스트"""
    print("\n[테스트 5] 채용 공고 비교")

    # 먼저 최근 공고 2개를 가져오기
    try:
        # DB에서 직접 조회하는 대신, 임의의 ID로 테스트
        # 실제 환경에서는 존재하는 ID를 사용해야 함
        response = requests.post(
            f"{BASE_URL}/api/job-analysis/compare-jobs",
            json={
                "jobIds": [1, 2]  # 실제 존재하는 ID로 변경 필요
            }
        )

        if response.status_code == 200:
            print_response("채용 공고 비교 결과", response.json())
        else:
            print(f"⚠️  공고 비교 테스트 스킵 (공고 ID가 없을 수 있음): {response.status_code}")
            print(f"   메시지: {response.text}")
    except Exception as e:
        print(f"⚠️  공고 비교 테스트 스킵: {str(e)}")


def main():
    """모든 테스트 실행"""
    print("\n" + "="*60)
    print("  채용 공고 분석 AI 에이전트 테스트")
    print("="*60)

    try:
        # 서버 연결 확인
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("❌ 서버가 실행 중이지 않습니다. Python AI Service를 먼저 시작하세요.")
            return

        print("✅ 서버 연결 확인")

        # 각 기능 테스트
        test_market_trends()
        test_skill_requirements()
        test_salary_trends()
        test_personalized_insights()
        test_job_comparison()

        print("\n" + "="*60)
        print("  테스트 완료!")
        print("="*60 + "\n")

    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
        print("   Python AI Service가 http://localhost:8000 에서 실행 중인지 확인하세요.")
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")


if __name__ == "__main__":
    main()
