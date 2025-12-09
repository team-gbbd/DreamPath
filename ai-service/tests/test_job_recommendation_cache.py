"""
채용공고 추천 캐싱 시스템 테스트
"""
import asyncio
import sys
from pathlib import Path

# 프로젝트 루트를 PYTHONPATH에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from services.job_recommendation_calculator import JobRecommendationCalculator
from services.database_service import DatabaseService


async def test_table_exists():
    """테이블 존재 확인"""
    print("\n=== 1. 테이블 존재 확인 ===")
    db = DatabaseService()

    try:
        query = """
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_name = 'user_job_recommendations'
        """
        result = db.execute_query(query)

        if result and result[0].get('count', 0) > 0:
            print("✓ user_job_recommendations 테이블이 존재합니다.")
            return True
        else:
            print("✗ user_job_recommendations 테이블이 존재하지 않습니다.")
            print("  → python db/run_migrations.py 를 실행하세요.")
            return False

    except Exception as e:
        print(f"✗ 테이블 확인 실패: {e}")
        return False


async def test_get_users():
    """커리어 분석이 있는 사용자 조회"""
    print("\n=== 2. 커리어 분석이 있는 사용자 조회 ===")
    calculator = JobRecommendationCalculator()

    try:
        users = calculator._get_active_users_with_career_analysis()
        print(f"✓ {len(users)}명의 사용자 발견:")

        for i, user in enumerate(users[:5], 1):  # 최대 5명만 출력
            print(f"  {i}. 사용자 ID: {user.get('user_id')}")

        if len(users) > 5:
            print(f"  ... 외 {len(users) - 5}명")

        return len(users) > 0

    except Exception as e:
        print(f"✗ 사용자 조회 실패: {e}")
        return False


async def test_calculate_single_user():
    """단일 사용자 추천 계산 테스트"""
    print("\n=== 3. 단일 사용자 추천 계산 테스트 ===")
    calculator = JobRecommendationCalculator()

    # 테스트할 사용자 ID
    users = calculator._get_active_users_with_career_analysis()
    if not users:
        print("✗ 테스트할 사용자가 없습니다.")
        return False

    test_user_id = users[0].get('user_id')
    print(f"테스트 사용자 ID: {test_user_id}")

    try:
        result = await calculator.calculate_user_recommendations(
            user_id=test_user_id,
            max_recommendations=10
        )

        if result.get("success"):
            print(f"✓ 추천 계산 성공:")
            print(f"  - 저장된 추천: {result.get('saved_count', 0)}개")
            print(f"  - 총 추천: {result.get('total_recommendations', 0)}개")
            return True
        else:
            print(f"✗ 추천 계산 실패: {result.get('error')}")
            return False

    except Exception as e:
        print(f"✗ 추천 계산 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_query_cached_recommendations():
    """캐시된 추천 조회 테스트"""
    print("\n=== 4. 캐시된 추천 조회 테스트 ===")
    db = DatabaseService()
    calculator = JobRecommendationCalculator()

    users = calculator._get_active_users_with_career_analysis()
    if not users:
        print("✗ 테스트할 사용자가 없습니다.")
        return False

    test_user_id = users[0].get('user_id')

    try:
        query = """
            SELECT
                ujr.id,
                ujr.match_score,
                ujr.match_reason,
                jl.title,
                jl.company
            FROM user_job_recommendations ujr
            INNER JOIN job_listings jl ON ujr.job_listing_id = jl.id
            WHERE ujr.user_id = %s
            ORDER BY ujr.match_score DESC
            LIMIT 5
        """

        results = db.execute_query(query, (test_user_id,))

        if results:
            print(f"✓ {len(results)}개의 캐시된 추천 발견:")
            for i, rec in enumerate(results, 1):
                print(f"  {i}. [{rec.get('match_score'):.1f}점] {rec.get('title')} - {rec.get('company')}")
                if rec.get('match_reason'):
                    print(f"     이유: {rec.get('match_reason')[:50]}...")
            return True
        else:
            print("✗ 캐시된 추천이 없습니다.")
            return False

    except Exception as e:
        print(f"✗ 추천 조회 실패: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_performance():
    """성능 테스트 (조회 속도)"""
    print("\n=== 5. 성능 테스트 ===")
    import time

    db = DatabaseService()
    calculator = JobRecommendationCalculator()

    users = calculator._get_active_users_with_career_analysis()
    if not users:
        print("✗ 테스트할 사용자가 없습니다.")
        return False

    test_user_id = users[0].get('user_id')

    try:
        # 캐시된 추천 조회 속도 측정
        start_time = time.time()

        query = """
            SELECT *
            FROM user_job_recommendations ujr
            INNER JOIN job_listings jl ON ujr.job_listing_id = jl.id
            WHERE ujr.user_id = %s
            ORDER BY ujr.match_score DESC
            LIMIT 20
        """

        results = db.execute_query(query, (test_user_id,))
        end_time = time.time()

        duration_ms = (end_time - start_time) * 1000

        print(f"✓ 조회 성능:")
        print(f"  - 조회된 추천: {len(results)}개")
        print(f"  - 소요 시간: {duration_ms:.2f}ms")

        if duration_ms < 100:
            print(f"  - 성능: 매우 우수 (100ms 이내)")
        elif duration_ms < 500:
            print(f"  - 성능: 양호 (500ms 이내)")
        else:
            print(f"  - 성능: 개선 필요 (500ms 이상)")

        return True

    except Exception as e:
        print(f"✗ 성능 테스트 실패: {e}")
        return False


async def run_all_tests():
    """모든 테스트 실행"""
    print("\n" + "="*60)
    print("채용공고 추천 캐싱 시스템 테스트 시작")
    print("="*60)

    results = []

    # 1. 테이블 존재 확인
    results.append(await test_table_exists())

    # 2. 사용자 조회
    results.append(await test_get_users())

    # 3. 단일 사용자 추천 계산
    results.append(await test_calculate_single_user())

    # 4. 캐시된 추천 조회
    results.append(await test_query_cached_recommendations())

    # 5. 성능 테스트
    results.append(await test_performance())

    # 결과 요약
    print("\n" + "="*60)
    print(f"테스트 결과: {sum(results)}/{len(results)} 성공")
    print("="*60)

    if all(results):
        print("\n✓ 모든 테스트 통과!")
        return True
    else:
        print("\n✗ 일부 테스트 실패")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
