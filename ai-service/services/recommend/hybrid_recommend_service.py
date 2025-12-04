import os

from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

class HybridRecommendService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        self.index = self.vector.index

    def recommend(self, user_vector_id, top_k=20):
        """
        Pinecone에서 벡터 기반 직업 추천 (metadata 포함)
        """
        # 1) 사용자 벡터 가져오기 (Pinecone에서)
        user_result = self.index.fetch(ids=[user_vector_id])
        if not user_result or not user_result.vectors or user_vector_id not in user_result.vectors:
            print(f"User vector not found in Pinecone: {user_vector_id}")
            return []
        
        user_vector = user_result.vectors[user_vector_id].values

        # 1.5) 사용자 관심사 가져오기 (리랭킹용)
        interests = []
        try:
            if user_vector_id.startswith('user-'):
                user_id = int(user_vector_id.split('-')[1])
                interests_str = self.repo.get_user_interests(user_id)
                if interests_str:
                    import re
                    # 쉼표, 공백 등으로 분리하고 2글자 이상인 것만 추출
                    interests = [w.strip() for w in re.split(r'[,\s]+', interests_str) if len(w.strip()) >= 2]
                    print(f"[DEBUG] User interests for re-ranking: {interests}")
        except Exception as e:
            print(f"[ERROR] Failed to fetch interests: {e}")

        # 2) 벡터 기반 Top-K 추천 (직업만 필터링)
        pinecone_res = self.index.query(
            vector=user_vector,
            top_k=top_k * 2,  # 리랭킹을 위해 더 많이 가져옴
            include_metadata=True,
            filter={'type': 'job'}  # 직업 데이터만 가져오기
        )

        # 3) metadata를 포함한 결과 반환 (중복 제거 + 리랭킹)
        results = []
        seen_job_names = set()
        
        for m in pinecone_res.matches:
            # 사용자 자신의 벡터는 제외
            if m.id == user_vector_id:
                continue
            
            # 직업명 중복 체크
            job_name = m.metadata.get('jobName') if m.metadata else None
            if job_name:
                if job_name in seen_job_names:
                    continue  # 이미 추가된 직업은 스킵
                seen_job_names.add(job_name)
            
            # 리랭킹 점수 계산
            bonus_score = 0
            if interests:
                summary = m.metadata.get('summary', '')
                # 검색 대상 텍스트 (소문자 변환)
                text_to_check = (str(job_name) + " " + str(summary)).lower()
                
                for keyword in interests:
                    if keyword.lower() in text_to_check:
                        bonus_score += 0.15 # 15% 가산점 (강력하게)
                        print(f"[DEBUG] Bonus score +0.15 for {job_name} (keyword: {keyword})")

            result = {
                "job_id": m.id,
                "score": float(m.score) + bonus_score,
                "metadata": m.metadata if m.metadata else {}
            }
            results.append(result)

        # 점수순 재정렬
        results.sort(key=lambda x: x['score'], reverse=True)

        return results[:top_k]  # 요청된 개수만큼 반환
