"""
정체성 분석 기능 테스트 스크립트
"""
import asyncio
import os
from dotenv import load_dotenv
from services.identity_analysis_service import IdentityAnalysisService

load_dotenv()

async def test_identity_analysis():
    """정체성 분석 기능 테스트"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OPENAI_API_KEY가 설정되지 않았습니다.")
        return
    
    print("[OK] IdentityAnalysisService 초기화 중...")
    service = IdentityAnalysisService(api_key, "gpt-4o-mini")
    
    # 테스트 대화 내용
    conversation = """
USER: 안녕하세요
ASSISTANT: 안녕하세요! 진로 상담을 도와드리겠습니다. 무엇이 궁금하신가요?
USER: 저는 프로그래밍을 좋아하는데, 어떤 진로가 좋을까요?
ASSISTANT: 프로그래밍을 좋아하시는군요! 어떤 분야에 관심이 있으신가요?
USER: 웹 개발과 인공지능 둘 다 흥미롭습니다.
"""
    
    print("\n[1] 명확도 평가 테스트...")
    try:
        clarity_result = await service.assess_clarity(conversation)
        print(f"   명확도: {clarity_result['clarity']}")
        print(f"   이유: {clarity_result['reason']}")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    print("\n[2] 정체성 추출 테스트...")
    try:
        identity_result = await service.extract_identity(conversation)
        print(f"   핵심 정체성: {identity_result['identityCore']}")
        print(f"   확신도: {identity_result['confidence']}")
        print(f"   특징 개수: {len(identity_result['traits'])}")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    print("\n[3] 인사이트 생성 테스트...")
    try:
        recent = "USER: 웹 개발과 인공지능 둘 다 흥미롭습니다."
        insight_result = await service.generate_insight(recent, conversation)
        print(f"   인사이트 발견: {insight_result['hasInsight']}")
        if insight_result['hasInsight']:
            print(f"   인사이트: {insight_result['insight']}")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    print("\n[4] 단계 진행 평가 테스트...")
    try:
        progress_result = await service.assess_stage_progress(conversation, "PRESENT")
        print(f"   진행 준비: {progress_result['readyToProgress']}")
        print(f"   이유: {progress_result['reason']}")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    print("\n[OK] 테스트 완료!")

if __name__ == "__main__":
    asyncio.run(test_identity_analysis())

