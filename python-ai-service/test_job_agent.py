# -*- coding: utf-8 -*-
"""
채용공고 AI 에이전트 테스트

OpenAI Agents SDK 기반 채용공고 에이전트 테스트 스크립트
"""
import os
import sys
import asyncio

# Windows 콘솔 UTF-8 설정
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# OpenAI API 키 확인
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("[ERROR] OPENAI_API_KEY가 설정되지 않았습니다.")
    print("   .env 파일에 OPENAI_API_KEY=sk-... 형태로 추가해주세요.")
    exit(1)

print(f"[OK] OpenAI API Key 확인됨: {api_key[:10]}...")


async def test_recommendation_agent():
    """추천 에이전트 테스트"""
    print("\n" + "=" * 50)
    print("[TEST] 채용공고 추천 에이전트 테스트")
    print("=" * 50)

    from services.agents.job_agent import run_job_agent

    # 테스트 1: 키워드 기반 검색
    print("\n[테스트 1] 키워드 기반 채용공고 검색")
    result = await run_job_agent(
        user_request="백엔드 개발자 채용공고 추천해줘",
        agent_type="recommendation"
    )

    if result["success"]:
        print(f"[OK] 성공!")
        print(f"   에이전트: {result['agent']}")
        response = result.get('response', '')
        if response:
            print(f"   응답: {response[:500]}...")
    else:
        print(f"[FAIL] 실패: {result.get('error', 'Unknown error')}")

    return result["success"]


async def test_analysis_agent():
    """분석 에이전트 테스트"""
    print("\n" + "=" * 50)
    print("[TEST] 채용 시장 분석 에이전트 테스트")
    print("=" * 50)

    from services.agents.job_agent import run_job_agent

    # 테스트 2: 기술 트렌드 분석
    print("\n[테스트 2] 프론트엔드 기술 트렌드 분석")
    result = await run_job_agent(
        user_request="프론트엔드 개발자에게 요구되는 기술 스택 분석해줘",
        agent_type="analysis"
    )

    if result["success"]:
        print(f"[OK] 성공!")
        print(f"   에이전트: {result['agent']}")
        response = result.get('response', '')
        if response:
            print(f"   응답: {response[:500]}...")
    else:
        print(f"[FAIL] 실패: {result.get('error', 'Unknown error')}")

    return result["success"]


async def test_main_agent():
    """메인 에이전트 (라우터) 테스트"""
    print("\n" + "=" * 50)
    print("[TEST] 메인 에이전트 (자동 라우팅) 테스트")
    print("=" * 50)

    from services.agents.job_agent import run_job_agent

    # 테스트 3: 자동 라우팅
    print("\n[테스트 3] 자동 라우팅 - 채용공고 추천")
    result = await run_job_agent(
        user_request="데이터 분석가 채용공고 찾아줘",
        agent_type="main"
    )

    if result["success"]:
        print(f"[OK] 성공!")
        print(f"   에이전트: {result['agent']}")
        response = result.get('response', '')
        if response:
            print(f"   응답: {response[:500]}...")
    else:
        print(f"[FAIL] 실패: {result.get('error', 'Unknown error')}")

    return result["success"]


async def test_certification():
    """자격증 추천 테스트"""
    print("\n" + "=" * 50)
    print("[TEST] 자격증 추천 테스트")
    print("=" * 50)

    from services.agents.job_agent import run_job_agent

    print("\n[테스트 4] 자격증 추천")
    result = await run_job_agent(
        user_request="정보처리 관련 자격증 알려줘",
        agent_type="recommendation"
    )

    if result["success"]:
        print(f"[OK] 성공!")
        print(f"   에이전트: {result['agent']}")
        response = result.get('response', '')
        if response:
            print(f"   응답: {response[:500]}...")
    else:
        print(f"[FAIL] 실패: {result.get('error', 'Unknown error')}")

    return result["success"]


async def main():
    """메인 테스트 실행"""
    print("\n[START] 채용공고 AI 에이전트 테스트 시작")
    print("=" * 60)

    results = []

    # 각 테스트 실행
    try:
        results.append(("추천 에이전트", await test_recommendation_agent()))
    except Exception as e:
        print(f"[ERROR] 추천 에이전트 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("추천 에이전트", False))

    try:
        results.append(("분석 에이전트", await test_analysis_agent()))
    except Exception as e:
        print(f"[ERROR] 분석 에이전트 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("분석 에이전트", False))

    try:
        results.append(("메인 에이전트", await test_main_agent()))
    except Exception as e:
        print(f"[ERROR] 메인 에이전트 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("메인 에이전트", False))

    try:
        results.append(("자격증 추천", await test_certification()))
    except Exception as e:
        print(f"[ERROR] 자격증 추천 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
        results.append(("자격증 추천", False))

    # 결과 요약
    print("\n" + "=" * 60)
    print("[SUMMARY] 테스트 결과 요약")
    print("=" * 60)

    passed = 0
    for name, success in results:
        status = "[PASS]" if success else "[FAIL]"
        print(f"   {name}: {status}")
        if success:
            passed += 1

    print(f"\n   총 {len(results)}개 테스트 중 {passed}개 통과")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
