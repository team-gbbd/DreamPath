
import asyncio
import json
import logging
import sys
import os

# Add project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.agents.recommendation.recommendation_pipeline import RecommendationPipeline

# 로깅 활성화
logging.basicConfig(level=logging.INFO)

async def test_pipeline_fallback():
    print("=" * 60)
    print("🛡️ Pipeline Fallback Test")
    print("=" * 60)
    
    pipeline = RecommendationPipeline()
    
    test_profile = {
        "summary": "AI와 기술에 관심이 많고, 사람들을 돕는 것을 좋아하는 학생입니다.",
        "goals": ["AI 개발자", "데이터 사이언티스트"],
        "values": ["혁신", "성장", "협력"],
        "personality": {
            "openness": 85,
            "conscientiousness": 75,
            "extraversion": 60,
            "agreeableness": 80,
            "neuroticism": 40
        },
        "strengths": ["문제 해결", "창의성", "분석력"],
        "risks": ["완벽주의", "스트레스 관리"]
    }
    
    print("🚀 Running Pipeline...")
    try:
        response = await pipeline.run(test_profile)
        
        print("\n✅ Pipeline Execution Result:")
        jobs = response.get('jobs', [])
        majors = response.get('majors', [])
        
        print(f"  - Jobs Count: {len(jobs)}")
        print(f"  - Majors Count: {len(majors)}")
        
        if len(jobs) > 0:
            print("\n  [Job Sample]")
            print(f"  Title: {jobs[0].get('jobName') or jobs[0].get('title')}")
            print(f"  Score: {jobs[0].get('score')}")
            print(f"  Match: {jobs[0].get('match')}")
            
        if len(majors) > 0:
            print("\n  [Major Sample]")
            print(f"  Name: {majors[0].get('name') or majors[0].get('major_nm')}")
            print(f"  Score: {majors[0].get('score')}")
            print(f"  Match: {majors[0].get('match')}")

        if len(jobs) > 0 and len(majors) > 0:
            print("\n🎉 SUCCESS: Pipeline returned valid recommendations.")
        else:
            print("\n❌ FAILURE: Empty results even after fallback.")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_pipeline_fallback())
