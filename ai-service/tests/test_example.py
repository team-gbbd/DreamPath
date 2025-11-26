"""
진로 분석 서비스 테스트 예제
"""
import requests
import json

# 서비스 URL
BASE_URL = "http://localhost:8000"

# 테스트 데이터
test_data = {
    "sessionId": "test-session-001",
    "conversationHistory": [
        {
            "role": "USER",
            "content": "안녕하세요. 저는 고등학교 2학년 학생입니다. 진로에 대해 고민이 많아요."
        },
        {
            "role": "ASSISTANT",
            "content": "안녕하세요! 진로 고민을 함께 해결해보아요. 어떤 분야에 관심이 있으신가요?"
        },
        {
            "role": "USER",
            "content": "프로그래밍과 기술 분야에 관심이 있어요. 특히 웹 개발이나 앱 개발을 하고 싶어요."
        },
        {
            "role": "ASSISTANT",
            "content": "좋은 관심사네요! 프로그래밍을 배워본 경험이 있으신가요?"
        },
        {
            "role": "USER",
            "content": "네, 학교에서 파이썬을 조금 배웠고, 혼자서 간단한 웹사이트도 만들어봤어요. 문제를 해결하는 과정이 재미있어요."
        },
        {
            "role": "ASSISTANT",
            "content": "훌륭하네요! 문제 해결을 즐기시는 것은 개발자에게 중요한 자질이에요. 어떤 종류의 문제를 해결하는 것을 좋아하시나요?"
        },
        {
            "role": "USER",
            "content": "논리적으로 생각해서 해결책을 찾는 것이 좋아요. 수학 문제를 푸는 것처럼 단계별로 접근하는 것을 즐겨요."
        }
    ]
}


def test_health_check():
    """헬스 체크 테스트"""
    print("=== 헬스 체크 테스트 ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")


def test_analyze():
    """진로 분석 테스트"""
    print("=== 진로 분석 테스트 ===")
    response = requests.post(
        f"{BASE_URL}/api/analyze",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 분석 성공!")
        print(f"\n세션 ID: {result['sessionId']}")
        print(f"\n📊 감정 분석:")
        print(f"  - 설명: {result['emotion']['description'][:100]}...")
        print(f"  - 점수: {result['emotion']['score']}")
        print(f"  - 상태: {result['emotion']['emotionalState']}")
        
        print(f"\n👤 성향 분석:")
        print(f"  - 설명: {result['personality']['description'][:100]}...")
        print(f"  - 유형: {result['personality']['type']}")
        print(f"  - 강점: {', '.join(result['personality']['strengths'])}")
        
        print(f"\n🎯 흥미 분석:")
        print(f"  - 설명: {result['interest']['description'][:100]}...")
        print(f"  - 관심 분야 수: {len(result['interest']['areas'])}")
        
        print(f"\n💼 추천 진로:")
        for i, career in enumerate(result['recommendedCareers'], 1):
            print(f"  {i}. {career['careerName']} (매칭 점수: {career['matchScore']})")
            print(f"     이유: {', '.join(career['reasons'][:2])}")
        
        print(f"\n📝 종합 분석:")
        print(f"  {result['comprehensiveAnalysis'][:200]}...")
        
    else:
        print(f"❌ 분석 실패: {response.status_code}")
        print(f"Error: {response.text}")


if __name__ == "__main__":
    print("🚀 DreamPath 진로 분석 서비스 테스트\n")
    
    try:
        test_health_check()
        test_analyze()
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
        print("서버가 실행 중인지 확인하세요: uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

