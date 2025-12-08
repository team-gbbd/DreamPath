"""
백그라운드 채용공고 추천 계산 서비스
사용자별로 미리 추천을 계산하여 DB에 캐싱합니다.
"""
import asyncio
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from services.database_service import DatabaseService
from services.agents.job_agent import run_job_agent_json
from services.recommendation_lock import get_recommendation_lock


class JobRecommendationCalculator:
    """채용공고 추천 미리 계산 서비스"""

    def __init__(self):
        self.db = DatabaseService()
        self.lock = get_recommendation_lock()

    async def calculate_all_user_recommendations(
        self,
        batch_size: int = 10,
        max_recommendations: int = 50
    ) -> Dict:
        """
        모든 사용자의 채용공고 추천을 계산합니다.

        Args:
            batch_size: 동시 처리할 사용자 수
            max_recommendations: 사용자당 최대 추천 공고 수

        Returns:
            실행 결과 통계
        """
        print("[JobRecommendationCalculator] 추천 계산 시작...")

        # 1. 커리어 분석이 완료된 활성 사용자 조회
        users = self._get_active_users_with_career_analysis()
        if not users:
            print("[JobRecommendationCalculator] 처리할 사용자가 없습니다.")
            return {
                "success": True,
                "total_users": 0,
                "processed_users": 0,
                "failed_users": 0,
                "total_recommendations": 0
            }

        print(f"[JobRecommendationCalculator] {len(users)}명의 사용자 발견")

        # 2. 배치 단위로 사용자 처리
        total_processed = 0
        total_failed = 0
        total_recommendations = 0

        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]
            print(f"[JobRecommendationCalculator] 배치 {i // batch_size + 1} 처리 중 ({len(batch)}명)...")

            # 병렬 처리
            tasks = [
                self.calculate_user_recommendations(
                    user_id=user["user_id"],
                    max_recommendations=max_recommendations
                )
                for user in batch
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 집계
            for result in results:
                if isinstance(result, Exception):
                    print(f"[JobRecommendationCalculator] 오류: {result}")
                    total_failed += 1
                elif result and result.get("success"):
                    total_processed += 1
                    total_recommendations += result.get("saved_count", 0)
                else:
                    total_failed += 1

            # API 부하 방지를 위한 대기
            if i + batch_size < len(users):
                await asyncio.sleep(2)

        print(f"[JobRecommendationCalculator] 완료: {total_processed}명 성공, {total_failed}명 실패, 총 {total_recommendations}개 추천")

        return {
            "success": True,
            "total_users": len(users),
            "processed_users": total_processed,
            "failed_users": total_failed,
            "total_recommendations": total_recommendations
        }

    async def calculate_user_recommendations(
        self,
        user_id: int,
        max_recommendations: int = 50
    ) -> Dict:
        """
        특정 사용자의 채용공고 추천을 계산합니다.

        Args:
            user_id: 사용자 ID
            max_recommendations: 최대 추천 공고 수

        Returns:
            계산 결과
        """
        try:
            # 🔒 분산 락 획득 (Race Condition 방지)
            with self.lock.acquire(user_id=user_id, timeout=300):
                print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 중... (락 획득)")

                # 1. 사용자 커리어 분석 데이터 조회
                career_analysis = self._get_user_career_analysis(user_id)
                if not career_analysis:
                    print(f"[JobRecommendationCalculator] 사용자 {user_id}의 커리어 분석 데이터가 없습니다.")
                    return {"success": False, "error": "No career analysis"}

                # 2. AI 에이전트로 추천 계산
                result = await run_job_agent_json(
                    user_id=user_id,
                    career_analysis=career_analysis,
                    limit=max_recommendations
                )

                if not result.get("success"):
                    print(f"[JobRecommendationCalculator] 사용자 {user_id} AI 추천 실패: {result.get('error')}")
                    return {"success": False, "error": result.get("error")}

                recommendations = result.get("recommendations", [])
                if not recommendations:
                    print(f"[JobRecommendationCalculator] 사용자 {user_id}의 추천 결과가 없습니다.")
                    return {"success": True, "saved_count": 0}

                # 3. DB에 저장
                saved_count = self._save_recommendations(user_id, recommendations)
                print(f"[JobRecommendationCalculator] 사용자 {user_id}: {saved_count}개 추천 저장 완료")

                return {
                    "success": True,
                    "user_id": user_id,
                    "saved_count": saved_count,
                    "total_recommendations": len(recommendations)
                }

        except TimeoutError as e:
            # 락 획득 실패 (다른 작업이 실행 중)
            print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 스킵 (이미 실행 중): {e}")
            return {
                "success": False,
                "error": "Already in progress",
                "skipped": True
            }
        except Exception as e:
            print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 실패: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    async def recalculate_for_new_jobs(self, job_listing_ids: List[int]) -> Dict:
        """
        새로운 채용공고가 추가되었을 때, 모든 사용자에 대해 해당 공고 추천 여부를 계산합니다.

        Args:
            job_listing_ids: 새로 추가된 채용공고 ID 리스트

        Returns:
            계산 결과
        """
        # TODO: 구현 필요 (선택적 기능)
        # 새 공고가 추가되면 모든 사용자에게 해당 공고를 추천할지 간단히 판단
        pass

    def _get_active_users_with_career_analysis(self) -> List[Dict]:
        """커리어 분석이 완료된 활성 사용자 조회"""
        try:
            # 최근 30일 이내 분석된 사용자만 대상
            query = """
                SELECT DISTINCT u.user_id
                FROM users u
                INNER JOIN career_sessions cs ON u.user_id = cs.user_id
                INNER JOIN career_analyses ca ON cs.id = ca.session_id
                WHERE u.is_active = TRUE
                AND ca.analyzed_at >= NOW() - INTERVAL 30 DAY
                ORDER BY ca.analyzed_at DESC
            """
            return self.db.execute_query(query)
        except Exception as e:
            print(f"[JobRecommendationCalculator] 사용자 조회 실패: {e}")
            return []

    def _get_user_career_analysis(self, user_id: int) -> Optional[Dict]:
        """사용자의 최신 커리어 분석 데이터 조회"""
        try:
            query = """
                SELECT ca.*
                FROM career_analyses ca
                INNER JOIN career_sessions cs ON ca.session_id = cs.id
                WHERE cs.user_id = %s
                ORDER BY ca.analyzed_at DESC
                LIMIT 1
            """
            # user_id를 문자열로 변환 (DB에 문자열로 저장됨)
            results = self.db.execute_query(query, (str(user_id),))

            if not results:
                return None

            analysis = results[0]

            # JSON 필드 파싱
            return {
                "recommendedCareers": self._parse_json_field(analysis.get("recommended_careers")),
                "strengths": self._parse_json_field(analysis.get("interest_areas")) or [],
                "interests": self._parse_json_field(analysis.get("interest_areas")) or [],
                "personalityType": analysis.get("personality_type"),
                "emotionScore": analysis.get("emotion_score")
            }

        except Exception as e:
            print(f"[JobRecommendationCalculator] 커리어 분석 조회 실패: {e}")
            return None

    def _parse_json_field(self, field_value) -> any:
        """JSON 필드 파싱"""
        if field_value is None:
            return None
        if isinstance(field_value, str):
            try:
                return json.loads(field_value)
            except:
                return field_value
        return field_value

    def _save_recommendations(self, user_id: int, recommendations: List[Dict]) -> int:
        """추천 결과를 DB에 저장"""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()

                # 기존 추천 삭제 (새로 계산된 결과로 덮어쓰기)
                delete_query = "DELETE FROM user_job_recommendations WHERE user_id = %s"
                cursor.execute(delete_query, (user_id,))

                # 새 추천 삽입
                insert_query = """
                    INSERT INTO user_job_recommendations (
                        user_id, job_listing_id, match_score, match_reason,
                        recommendation_data, calculated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        match_score = VALUES(match_score),
                        match_reason = VALUES(match_reason),
                        recommendation_data = VALUES(recommendation_data),
                        calculated_at = VALUES(calculated_at),
                        updated_at = CURRENT_TIMESTAMP
                """

                saved_count = 0
                for rec in recommendations:
                    try:
                        job_id = rec.get("id")
                        if not job_id:
                            continue

                        match_score = rec.get("matchScore", 0)
                        match_reason = rec.get("matchReason", "")
                        recommendation_data = json.dumps(rec, ensure_ascii=False)

                        cursor.execute(insert_query, (
                            user_id,
                            job_id,
                            match_score,
                            match_reason,
                            recommendation_data,
                            datetime.now()
                        ))
                        saved_count += 1

                    except Exception as e:
                        print(f"[JobRecommendationCalculator] 추천 저장 실패 (job_id={rec.get('id')}): {e}")
                        continue

                conn.commit()
                return saved_count

        except Exception as e:
            print(f"[JobRecommendationCalculator] DB 저장 실패: {e}")
            import traceback
            traceback.print_exc()
            return 0

    def cleanup_old_recommendations(self, days: int = 30) -> int:
        """오래된 추천 데이터 정리"""
        try:
            query = """
                DELETE FROM user_job_recommendations
                WHERE calculated_at < NOW() - INTERVAL %s DAY
            """
            return self.db.execute_update(query, (days,))
        except Exception as e:
            print(f"[JobRecommendationCalculator] 오래된 데이터 정리 실패: {e}")
            return 0


# 동기 실행 헬퍼 함수
def calculate_all_recommendations_sync(**kwargs) -> Dict:
    """동기적으로 모든 사용자 추천 계산 (스케줄러용)"""
    calculator = JobRecommendationCalculator()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            calculator.calculate_all_user_recommendations(**kwargs)
        )
    finally:
        loop.close()


def calculate_user_recommendations_sync(user_id: int, **kwargs) -> Dict:
    """동기적으로 특정 사용자 추천 계산"""
    calculator = JobRecommendationCalculator()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            calculator.calculate_user_recommendations(user_id, **kwargs)
        )
    finally:
        loop.close()
