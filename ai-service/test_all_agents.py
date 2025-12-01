"""
모든 에이전트 테스트 스크립트
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/agent"

def test_agent(agent_type: str, message: str, description: str):
    """에이전트 테스트 실행"""
    print(f"\n{'='*60}")
    print(f"테스트: {description}")
    print(f"에이전트 타입: {agent_type}")
    print(f"요청: {message}")
    print(f"{'='*60}")

    try:
        response = requests.post(
            f"{BASE_URL}/job-agent",
            json={
                "message": message,
                "userId": 1,
                "agentType": agent_type
            },
            timeout=120
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"에이전트: {data.get('agent')}")
                print(f"\n응답:\n{data.get('response', '')[:1000]}...")
            else:
                print(f"에러: {data.get('error')}")
        else:
            print(f"HTTP Error: {response.text}")

    except Exception as e:
        print(f"예외 발생: {e}")

def main():
    print("\n" + "="*60)
    print("OpenAI Agents SDK - 전체 에이전트 테스트")
    print("="*60)

    # 1. 종합 상담 코디네이터 (main)
    test_agent(
        agent_type="main",
        message="안녕하세요. 백엔드 개발자로 취업하고 싶은데 어떻게 준비하면 좋을까요?",
        description="종합 상담 코디네이터 (CareerCoordinator)"
    )

    # 2. 채용공고 추천 에이전트
    test_agent(
        agent_type="recommendation",
        message="Python과 Django를 사용하는 백엔드 개발자 채용공고 추천해주세요",
        description="채용공고 추천 에이전트 (JobRecommendationAgent)"
    )

    # 3. 채용 시장 분석 에이전트
    test_agent(
        agent_type="analysis",
        message="최근 백엔드 개발자 채용 시장에서 가장 많이 요구되는 기술은 뭐야?",
        description="채용 시장 분석 에이전트 (JobAnalysisAgent)"
    )

    # 4. 자격증 추천 에이전트
    test_agent(
        agent_type="certification",
        message="백엔드 개발자가 취득하면 좋은 자격증 추천해주세요",
        description="자격증 추천 에이전트 (CertificationAgent)"
    )

    # 5. 커리어 성장 에이전트
    test_agent(
        agent_type="career_growth",
        message="신입 백엔드 개발자에서 시니어까지 성장하려면 어떤 로드맵을 따르면 좋을까요?",
        description="커리어 성장 에이전트 (CareerGrowthAgent)"
    )

    # 6. 기업 정보 에이전트
    test_agent(
        agent_type="company_info",
        message="IT 회사들 중에서 연봉이 좋고 복지가 좋은 회사 알려주세요",
        description="기업 정보 에이전트 (CompanyInfoAgent)"
    )

    print("\n" + "="*60)
    print("전체 테스트 완료!")
    print("="*60)

if __name__ == "__main__":
    main()
