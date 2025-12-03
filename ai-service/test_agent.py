"""
채용 추천 에이전트 테스트
"""
import asyncio
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

from services.agents.job_recommendation_agent import JobRecommendationAgent


async def test_agent():
    print("=" * 60)
    print("채용 추천 에이전트 테스트")
    print("=" * 60)

    # 에이전트 생성
    agent = JobRecommendationAgent()

    # 테스트 1: 자연어 요청
    print("\n[테스트 1] 자연어 요청: '백엔드 개발자 채용공고 찾아줘'")
    print("-" * 60)

    result = await agent.run(
        user_request="백엔드 개발자 채용공고 찾아줘",
        user_id=1
    )

    print("\n[결과]")
    print(f"성공: {result.get('success')}")
    print(f"응답: {result.get('response', '')[:500]}...")

    context = result.get("context", {})
    print(f"\n수집된 데이터:")
    print(f"- 채용공고 수: {len(context.get('jobs', []))}")
    print(f"- 추천 수: {len(context.get('recommendations', []))}")
    print(f"- 자격증 수: {len(context.get('certifications', []))}")

    # 테스트 2: 커리어 분석 결과와 함께 요청
    print("\n" + "=" * 60)
    print("[테스트 2] 커리어 분석 결과 포함 요청")
    print("-" * 60)

    career_analysis = {
        "recommendedCareers": [
            {"careerName": "백엔드 개발자"},
            {"careerName": "풀스택 개발자"}
        ],
        "strengths": ["문제 해결 능력", "논리적 사고", "협업"],
        "values": ["성장", "안정성"],
        "interests": ["프로그래밍", "데이터베이스", "서버"]
    }

    result2 = await agent.run(
        user_request="나에게 맞는 채용공고 추천하고, 필요한 자격증도 알려줘",
        user_id=1,
        career_analysis=career_analysis
    )

    print("\n[결과]")
    print(f"성공: {result2.get('success')}")
    print(f"응답: {result2.get('response', '')[:500]}...")

    context2 = result2.get("context", {})
    print(f"\n수집된 데이터:")
    print(f"- 채용공고 수: {len(context2.get('jobs', []))}")
    print(f"- 추천 수: {len(context2.get('recommendations', []))}")
    print(f"- 자격증 수: {len(context2.get('certifications', []))}")

    # 추천 결과 출력
    if context2.get("recommendations"):
        print("\n[추천 채용공고]")
        for i, rec in enumerate(context2["recommendations"][:3], 1):
            print(f"{i}. {rec.get('job', {}).get('title', 'N/A')} - {rec.get('job', {}).get('company', 'N/A')}")
            print(f"   매칭점수: {rec.get('matchScore', 'N/A')}점")
            print(f"   이유: {', '.join(rec.get('reasons', []))}")

    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_agent())
