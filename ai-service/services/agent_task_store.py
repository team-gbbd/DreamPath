"""
에이전트 태스크 저장소 (Redis 기반)
백그라운드 에이전트 실행 결과를 저장하고 조회
"""
import redis
import json
import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime


class AgentTaskStore:
    """Redis 기반 에이전트 태스크 저장소"""

    def __init__(self):
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
            self.redis_client.ping()
            self.enabled = True
            print(f"[AgentTaskStore] Redis 연결 성공: {redis_host}:{redis_port}")
        except Exception as e:
            print(f"[AgentTaskStore] Redis 연결 실패 (인메모리 모드): {e}")
            self.redis_client = None
            self.enabled = False
            # Redis 없을 때 인메모리 저장소 사용
            self._memory_store: Dict[str, Dict] = {}

    def create_task(self, session_id: str, user_id: Optional[int] = None) -> str:
        """
        새 에이전트 태스크 생성

        Returns:
            task_id: 생성된 태스크 ID
        """
        task_id = str(uuid.uuid4())
        task_data = {
            "task_id": task_id,
            "session_id": session_id,
            "user_id": user_id,
            "status": "pending",  # pending → running → completed/failed
            "created_at": datetime.now().isoformat(),
            "result": None,
            "error": None
        }

        self._save_task(task_id, task_data)
        return task_id

    def set_running(self, task_id: str):
        """태스크 실행 중 상태로 변경"""
        task_data = self._get_task(task_id)
        if task_data:
            task_data["status"] = "running"
            task_data["started_at"] = datetime.now().isoformat()
            self._save_task(task_id, task_data)

    def set_completed(self, task_id: str, result: Dict[str, Any]):
        """태스크 완료 + 결과 저장"""
        task_data = self._get_task(task_id)
        if task_data:
            task_data["status"] = "completed"
            task_data["result"] = result
            task_data["completed_at"] = datetime.now().isoformat()
            self._save_task(task_id, task_data)

    def set_failed(self, task_id: str, error: str):
        """태스크 실패 + 에러 저장"""
        task_data = self._get_task(task_id)
        if task_data:
            task_data["status"] = "failed"
            task_data["error"] = error
            task_data["completed_at"] = datetime.now().isoformat()
            self._save_task(task_id, task_data)

    def set_skipped(self, task_id: str):
        """태스크 스킵 (에이전트 사용 안 함)"""
        task_data = self._get_task(task_id)
        if task_data:
            task_data["status"] = "skipped"
            task_data["completed_at"] = datetime.now().isoformat()
            self._save_task(task_id, task_data)

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """태스크 조회"""
        return self._get_task(task_id)

    def _save_task(self, task_id: str, task_data: Dict[str, Any], ttl: int = 300):
        """태스크 저장 (TTL 5분)"""
        key = f"agent_task:{task_id}"

        if self.enabled and self.redis_client:
            self.redis_client.setex(key, ttl, json.dumps(task_data, ensure_ascii=False, default=str))
        else:
            self._memory_store[task_id] = task_data

    def _get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """태스크 조회 (내부)"""
        key = f"agent_task:{task_id}"

        if self.enabled and self.redis_client:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        else:
            return self._memory_store.get(task_id)


# 싱글톤 인스턴스
_agent_task_store: Optional[AgentTaskStore] = None


def get_agent_task_store() -> AgentTaskStore:
    """에이전트 태스크 저장소 싱글톤"""
    global _agent_task_store
    if _agent_task_store is None:
        _agent_task_store = AgentTaskStore()
    return _agent_task_store
