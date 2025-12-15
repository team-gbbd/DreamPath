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
        # 1) & 2) 최적화: Pinecone Query by ID (네트워크 RTT 절감) + 순차 실행
        
        # Supabase (빠름)
        interests = []
        try:
            if user_vector_id.startswith('user-'):
                user_id = int(user_vector_id.split('-')[1])
                interests_str = self.repo.get_user_interests(user_id)
                if interests_str:
                    import re
                    interests = [w.strip() for w in re.split(r'[,\s]+', interests_str) if len(w.strip()) >= 2]
        except Exception as e:
            print(f"[ERROR] Failed to fetch interests: {e}")
            
        # Pinecone Query (ID 사용)
        pinecone_res = self.index.query(
            id=user_vector_id,
            top_k=top_k * 2,
            include_metadata=True,
            filter={'type': 'job'}
        )


        # 3) metadata를 포함한 결과 반환 (중복 제거 + 리랭킹)
        results = []
        seen_job_names = set()
        seen_job_keys = set()  # 회사+제목 조합으로 추가 중복 체크

        for m in pinecone_res.matches:
            # 사용자 자신의 벡터는 제외
            if m.id == user_vector_id:
                continue

            metadata = m.metadata if m.metadata else {}
            job_name = metadata.get('jobName')
            company = metadata.get('company', '')
            title = metadata.get('title', '')

            # 1차: 직업명 중복 체크
            if job_name:
                if job_name in seen_job_names:
                    continue  # 이미 추가된 직업은 스킵
                seen_job_names.add(job_name)

            # 2차: 회사+제목 조합 중복 체크 (크롤링 채용공고용)
            if company and title:
                job_key = f"{company.lower().strip()}|{title.lower().strip()}"
                if job_key in seen_job_keys:
                    continue
                seen_job_keys.add(job_key)
            
            # 리랭킹 점수 계산
            bonus_score = 0
            if interests:
                summary = metadata.get('summary', '')
                # 검색 대상 텍스트 (소문자 변환)
                text_to_check = (str(job_name) + " " + str(summary)).lower()

                for keyword in interests:
                    if keyword.lower() in text_to_check:
                        bonus_score += 0.15  # 15% 가산점 (강력하게)

            result = {
                "job_id": m.id,
                "score": float(m.score) + bonus_score,
                "metadata": metadata
            }
            results.append(result)

        # 점수순 재정렬
        results.sort(key=lambda x: x['score'], reverse=True)
        final_results = results[:top_k]
        
        return final_results
