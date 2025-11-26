import pinecone
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.rag.pinecone_vector_service import PineconeVectorService


class RecommendService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.index = pinecone.Index("dreampath-index")

    def recommend_jobs(self, user_vector_id, top_k=10):

        # 1. 사용자 벡터 가져오기
        user_vector = self.repo.get_vector_by_id(user_vector_id)
        if user_vector is None:
            return []

        # 2. Pinecone 유사도 검색
        result = self.index.query(
            vector=user_vector,
            top_k=top_k,
            include_metadata=True
        )

        # 3. 결과 정리
        jobs = []
        for match in result.matches:
            jobs.append({
                "job_id": match.id,
                "score": float(match.score),
                "metadata": match.metadata
            })

        return jobs

    def recommend_worknet(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "worknet_vector", top_k)

    def recommend_major(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "major_vector", top_k)

    def recommend_school(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "school_vector", top_k)

    def _recommend_by_namespace(self, vector_id: str, namespace: str, top_k: int):

        user_vector = self.repo.get_vector_by_id(vector_id)
        if user_vector is None:
            return []

        result = self.index.query(
            vector=user_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=namespace
        )

        items = []
        for match in result.matches:
            items.append({
                "id": match.id,
                "score": float(match.score),
                "metadata": match.metadata
            })

        return items
