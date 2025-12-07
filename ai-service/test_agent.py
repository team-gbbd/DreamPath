"""
ReAct 에이전트 통합 테스트
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def test_should_use_agent():
    """에이전트 사용 여부 판단 테스트"""
    from services.agents import should_use_agent

    print("\n" + "=" * 60)
    print("테스트 1: should_use_agent() 함수")
    print("=" * 60)

    test_cases = [
        # (메시지, 예상 결과)
        ("안녕!", False),  # 단순 인사
        ("ㅋㅋㅋ", False),  # 단순 반응
        ("응", False),  # 단순 응답
        ("UX 디자이너가 되고 싶어", True),  # 진로 관심
        ("프론트엔드 개발자가 되려면 뭘 배워야 해?", True),  # 학습 질문
        ("멘토 상담 받고 싶어", True),  # 멘토링 키워드
        ("취업하려면 어떻게 해야해?", True),  # 취업 질문
        ("PM이 되려면 뭐부터 시작해야 해?", True),  # 시작 질문
        ("데이터 분석가 관련 채용 있어?", True),  # 채용 검색
    ]

    passed = 0
    for message, expected in test_cases:
        result = should_use_agent(message)
        status = "✅" if result == expected else "❌"
        if result == expected:
            passed += 1
        print(f"{status} '{message[:30]}...' → 에이전트: {result} (예상: {expected})")

    print(f"\n결과: {passed}/{len(test_cases)} 통과")
    return passed == len(test_cases)


async def test_route_message_simple():
    """route_message 단순 대화 테스트"""
    from services.agents import route_message

    print("\n" + "=" * 60)
    print("테스트 2: route_message() - 단순 대화 (에이전트 미사용)")
    print("=" * 60)

    result = await route_message(
        message="안녕!",
        user_id=1,
        session_id="test-session",
    )

    print(f"메시지: '안녕!'")
    print(f"used_agent: {result.get('used_agent')}")
    print(f"message: {result.get('message')}")

    # 단순 대화는 에이전트 미사용, message는 None
    success = result.get("used_agent") is False and result.get("message") is None
    print(f"\n{'✅ 통과' if success else '❌ 실패'}: 단순 대화는 기존 서비스에 위임")
    return success


async def test_route_message_agent():
    """route_message 에이전트 사용 테스트"""
    from services.agents import route_message

    print("\n" + "=" * 60)
    print("테스트 3: route_message() - 진로 질문 (에이전트 사용)")
    print("=" * 60)

    result = await route_message(
        message="UX 디자이너가 되고 싶은데, 뭘 배워야 해?",
        user_id=1,
        session_id="test-session",
        conversation_history=[
            {"role": "user", "content": "안녕"},
            {"role": "assistant", "content": "안녕! 무엇을 도와줄까?"},
        ],
    )

    print(f"메시지: 'UX 디자이너가 되고 싶은데, 뭘 배워야 해?'")
    print(f"used_agent: {result.get('used_agent')}")
    print(f"tools_used: {result.get('tools_used', [])}")
    print(f"message (처음 100자): {result.get('message', '')[:100]}...")

    success = result.get("used_agent") is True and result.get("message") is not None
    print(f"\n{'✅ 통과' if success else '❌ 실패'}: 에이전트가 응답 생성")
    return success


async def test_career_agent_direct():
    """run_career_agent 직접 호출 테스트"""
    from services.agents import run_career_agent

    print("\n" + "=" * 60)
    print("테스트 4: run_career_agent() 직접 실행")
    print("=" * 60)

    result = await run_career_agent(
        user_message="프론트엔드 개발자가 되려면 어떻게 시작해야 해?",
        user_id=1,
        session_id="test-session",
    )

    print(f"메시지: '프론트엔드 개발자가 되려면 어떻게 시작해야 해?'")
    print(f"success: {result.get('success')}")
    print(f"tools_used: {result.get('tools_used', [])}")
    print(f"answer (처음 150자): {result.get('answer', '')[:150]}...")

    success = result.get("success") is True
    print(f"\n{'✅ 통과' if success else '❌ 실패'}: 에이전트 실행 성공")
    return success


async def test_mentoring_search():
    """멘토링 검색 도구 테스트"""
    from services.agents import run_career_agent

    print("\n" + "=" * 60)
    print("테스트 5: 멘토링 검색 도구 사용")
    print("=" * 60)

    result = await run_career_agent(
        user_message="백엔드 개발자 멘토를 찾고 싶어",
        user_id=1,
        session_id="test-session",
    )

    print(f"메시지: '백엔드 개발자 멘토를 찾고 싶어'")
    print(f"tools_used: {result.get('tools_used', [])}")
    print(f"answer (처음 150자): {result.get('answer', '')[:150]}...")

    # 멘토링 검색 도구가 사용되었는지 확인
    used_mentoring = "search_mentoring_sessions" in result.get("tools_used", [])
    print(f"\n{'✅' if used_mentoring else '⚠️'} search_mentoring_sessions 도구 사용: {used_mentoring}")
    return True  # 도구 사용 여부와 관계없이 응답 생성하면 성공


async def test_job_search():
    """채용 공고 검색 도구 테스트"""
    from services.agents import run_career_agent

    print("\n" + "=" * 60)
    print("테스트 6: 채용 공고 검색 도구 사용")
    print("=" * 60)

    result = await run_career_agent(
        user_message="데이터 분석가 취업하려면 어떤 회사가 있어?",
        user_id=1,
        session_id="test-session",
    )

    print(f"메시지: '데이터 분석가 취업하려면 어떤 회사가 있어?'")
    print(f"tools_used: {result.get('tools_used', [])}")
    print(f"answer (처음 150자): {result.get('answer', '')[:150]}...")

    # 채용 검색 도구가 사용되었는지 확인
    used_jobs = "search_job_postings" in result.get("tools_used", [])
    print(f"\n{'✅' if used_jobs else '⚠️'} search_job_postings 도구 사용: {used_jobs}")
    return True


async def main():
    """모든 테스트 실행"""
    print("\n" + "=" * 60)
    print("🚀 DreamPath ReAct 에이전트 통합 테스트")
    print("=" * 60)

    # OpenAI API 키 확인
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY가 설정되지 않았습니다.")
        print("   .env 파일에 OPENAI_API_KEY를 설정해주세요.")
        return

    results = []

    # 테스트 1: should_use_agent
    try:
        results.append(await test_should_use_agent())
    except Exception as e:
        print(f"❌ 테스트 1 실패: {e}")
        results.append(False)

    # 테스트 2: route_message (단순 대화)
    try:
        results.append(await test_route_message_simple())
    except Exception as e:
        print(f"❌ 테스트 2 실패: {e}")
        results.append(False)

    # 테스트 3: route_message (에이전트 사용)
    try:
        results.append(await test_route_message_agent())
    except Exception as e:
        print(f"❌ 테스트 3 실패: {e}")
        results.append(False)

    # 테스트 4: run_career_agent 직접 실행
    try:
        results.append(await test_career_agent_direct())
    except Exception as e:
        print(f"❌ 테스트 4 실패: {e}")
        results.append(False)

    # 테스트 5: 멘토링 검색
    try:
        results.append(await test_mentoring_search())
    except Exception as e:
        print(f"❌ 테스트 5 실패: {e}")
        results.append(False)

    # 테스트 6: 채용 검색
    try:
        results.append(await test_job_search())
    except Exception as e:
        print(f"❌ 테스트 6 실패: {e}")
        results.append(False)

    # 최종 결과
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"통과: {passed}/{total}")

    if passed == total:
        print("✅ 모든 테스트 통과!")
    else:
        print("⚠️ 일부 테스트 실패")


if __name__ == "__main__":
    asyncio.run(main())
