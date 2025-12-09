"""
채용공고 추천 계산 분산 락 (Race Condition 방지)
"""
import redis
import time
from typing import Optional
from contextlib import contextmanager
import os


class RecommendationLock:
    """Redis 기반 분산 락"""

    def __init__(self):
        # Redis 연결 (환경변수 또는 기본값)
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        redis_db = int(os.getenv("REDIS_DB", 0))

        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            # 연결 테스트
            self.redis_client.ping()
            self.enabled = True
            print(f"[RecommendationLock] Redis 연결 성공: {redis_host}:{redis_port}")
        except Exception as e:
            print(f"[RecommendationLock] Redis 연결 실패 (락 비활성화): {e}")
            self.redis_client = None
            self.enabled = False

    def _get_lock_key(self, user_id: int) -> str:
        """락 키 생성"""
        return f"job_recommendation_lock:user:{user_id}"

    @contextmanager
    def acquire(self, user_id: int, timeout: int = 300, retry_interval: float = 0.5):
        """
        분산 락 획득 (컨텍스트 매니저)

        Args:
            user_id: 사용자 ID
            timeout: 락 유지 시간 (초) - 최대 5분
            retry_interval: 재시도 간격 (초)

        Usage:
            with lock.acquire(user_id=1):
                # 추천 계산 로직
                calculate_recommendations(user_id)
        """
        if not self.enabled:
            # Redis가 없으면 락 없이 실행 (개발 환경용)
            print(f"[RecommendationLock] Redis 비활성화, 락 없이 실행: user_id={user_id}")
            yield True
            return

        lock_key = self._get_lock_key(user_id)
        lock_value = f"{time.time()}:{os.getpid()}"
        acquired = False

        try:
            # 락 획득 시도 (최대 10초 대기)
            max_wait = 10  # 초
            start_time = time.time()

            while time.time() - start_time < max_wait:
                # SET NX EX: 키가 없을 때만 설정, 만료 시간 지정
                acquired = self.redis_client.set(
                    lock_key,
                    lock_value,
                    nx=True,  # 키가 없을 때만 설정
                    ex=timeout  # 만료 시간 (초)
                )

                if acquired:
                    print(f"[RecommendationLock] 락 획득 성공: user_id={user_id}")
                    break
                else:
                    # 다른 프로세스가 락을 보유 중
                    current_lock = self.redis_client.get(lock_key)
                    print(f"[RecommendationLock] 락 대기 중: user_id={user_id}, "
                          f"현재 락={current_lock}")
                    time.sleep(retry_interval)

            if not acquired:
                raise TimeoutError(
                    f"락 획득 실패 (타임아웃): user_id={user_id}. "
                    f"다른 작업이 이미 실행 중일 수 있습니다."
                )

            # 락을 획득한 상태에서 작업 실행
            yield True

        finally:
            # 락 해제 (자신이 설정한 락만 해제)
            if acquired and self.redis_client:
                try:
                    # Lua 스크립트로 원자적 삭제 (자신의 락만 삭제)
                    lua_script = """
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("del", KEYS[1])
                    else
                        return 0
                    end
                    """
                    deleted = self.redis_client.eval(lua_script, 1, lock_key, lock_value)

                    if deleted:
                        print(f"[RecommendationLock] 락 해제 성공: user_id={user_id}")
                    else:
                        print(f"[RecommendationLock] 락이 이미 만료됨: user_id={user_id}")

                except Exception as e:
                    print(f"[RecommendationLock] 락 해제 실패: user_id={user_id}, error={e}")

    def is_locked(self, user_id: int) -> bool:
        """락이 걸려있는지 확인"""
        if not self.enabled:
            return False

        lock_key = self._get_lock_key(user_id)
        return self.redis_client.exists(lock_key) > 0

    def force_unlock(self, user_id: int):
        """강제로 락 해제 (관리자용)"""
        if not self.enabled:
            return

        lock_key = self._get_lock_key(user_id)
        deleted = self.redis_client.delete(lock_key)
        print(f"[RecommendationLock] 강제 락 해제: user_id={user_id}, deleted={deleted}")


# 싱글톤 인스턴스
_lock_instance: Optional[RecommendationLock] = None


def get_recommendation_lock() -> RecommendationLock:
    """락 인스턴스 가져오기 (싱글톤)"""
    global _lock_instance
    if _lock_instance is None:
        _lock_instance = RecommendationLock()
    return _lock_instance
