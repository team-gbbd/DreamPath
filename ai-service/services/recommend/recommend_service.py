import os
from pinecone import Pinecone
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.rag.pinecone_vector_service import PineconeVectorService

class RecommendService:

    def __init__(self):
        self.vector = PineconeVectorService()
        self.repo = SupabaseVectorRepository()
        
        # Pinecone 초기화 (host 파라미터 포함)
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX", "dreampath")
        index_host = os.getenv("PINECONE_INDEX_HOST")
        
        if not api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")
        
        pc = Pinecone(api_key=api_key)
        self.index = pc.Index(name=index_name, host=index_host) if index_host else pc.Index(index_name)

    def recommend_jobs(self, user_vector_id, top_k=10):
        """
        Recommend jobs by querying Pinecone
        1. Fetch user vector from Pinecone using vector_id
        2. Query Pinecone with that vector
        3. Enrich results with CareerNet API data
        """
        try:
            # 1. 사용자 벡터 가져오기 (Pinecone에서)
            user_result = self.index.fetch(ids=[user_vector_id])
            
            if not user_result or not user_result.vectors or user_vector_id not in user_result.vectors:
                print(f"User vector not found in Pinecone: {user_vector_id}")
                return []
            
            user_vector = user_result.vectors[user_vector_id].values

            # 2. Pinecone 유사도 검색 (type=job 필터 추가)
            fetch_k = min(top_k * 20, 1000)  # 중복 제거를 위해 큰 수로 요청
            result = self.index.query(
                vector=user_vector,
                top_k=fetch_k,
                include_metadata=True,
                filter={"type": "job"}
            )

            # 3. 결과 정리
            jobs = []
            seen_titles = set()
            
            for match in result.matches:
                # 메타데이터에서 정보 추출
                metadata = match.metadata or {}
                
                # job_code와 original_id 처리
                job_code = metadata.get("original_id") or metadata.get("job_code")
                
                # 제목 추출 (jobName 우선)
                title = metadata.get("jobName") or metadata.get("title") or "제목 미확인"
                
                # 중복 제거
                if title in seen_titles:
                    continue
                seen_titles.add(title)
                
                # 메타데이터 정리
                # 인덱싱 시 'summary'에 'jobDesc'(하는 일)를 저장했으므로 그대로 사용
                # 'relatedJob'도 그대로 사용
                
                jobs.append({
                    "job_id": match.id,
                    "title": title,
                    "score": float(match.score),
                    "metadata": {
                        "jobName": title,
                        "job_code": job_code,
                        "summary": metadata.get("summary", ""),
                        "wage": metadata.get("wage", ""),
                        "wlb": metadata.get("wlb", ""),
                        "aptitude": metadata.get("aptitude", ""),
                        "relatedJob": metadata.get("relatedJob", ""),
                        "ability": metadata.get("ability", "")  # 상세 API를 안 쓰면 비어있을 수 있음
                    },
                    # 프론트엔드 호환성을 위해 최상위에도 reason/summary 노출
                    "reason": metadata.get("summary", "")
                })
                
                if len(jobs) >= top_k:
                    break

            print(f"Found {len(jobs)} unique job recommendations (vector_id: {user_vector_id})")
            return jobs
        except Exception as e:
            print(f"Error in recommend_jobs: {e}")
            import traceback
            traceback.print_exc()
            return []

    def recommend_worknet(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "worknet_vector", top_k)

    def recommend_major(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "major_vector", top_k)

    def recommend_school(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "school_vector", top_k)

    def recommend_counsel(self, vector_id: str, top_k: int = 10):
        return self._recommend_by_namespace(vector_id, "case_vector", top_k)

    def _recommend_by_namespace(self, vector_id: str, namespace: str, top_k: int):
        """
        Recommend items by querying Pinecone
        1. Fetch user vector from Pinecone using vector_id
        2. Query Pinecone with that vector using metadata type filter
        3. Enrich results with actual data from CareerNet API
        """
        try:
            # Fetch user vector
            user_result = self.index.fetch(ids=[vector_id])
            
            if not user_result or not user_result.vectors or vector_id not in user_result.vectors:
                print(f"User vector not found in Pinecone: {vector_id}")
                return []
            
            user_vector = user_result.vectors[vector_id].values
            
            # type filter mapping
            type_mapping = {
                "major_vector": ("major", None),
                "school_vector": ("school", None), 
                "worknet_vector": ("worknet", None),
                "case_vector": ("counsel", None)
            }
            metadata_type, _ = type_mapping.get(namespace, (namespace.replace("_vector", ""), None))
            
            fetch_k = top_k * 5
            result = self.index.query(
                vector=user_vector,
                top_k=fetch_k,
                include_metadata=True,
                filter={"type": metadata_type}
            )
            
            items = []
            seen_titles = set()
            
            for match in result.matches:
                original_id = match.metadata.get("original_id")
                metadata = match.metadata or {}
                title = (
                    metadata.get("majorName")
                    or metadata.get("deptName")
                    or metadata.get("schoolName")
                    or metadata.get("title")
                    or ""
                )
                final_title = title.strip()
                
                if final_title and final_title in seen_titles:
                    continue
                
                if final_title:
                    seen_titles.add(final_title)
                
                item = {
                    "id": match.id,
                    "title": final_title,
                    "score": float(match.score),
                    "metadata": metadata
                }
                
                items.append(item)
                
                if len(items) >= top_k:
                    break
            
            # 학과 설명 자동 생성
            if metadata_type == 'department':
                category_descriptions = {
                    "인문계열": "언어, 문학, 역사, 철학 등 인간의 사상과 문화를 탐구하는 학문 분야입니다.",
                    "사회계열": "사회 현상과 인간 관계를 연구하며, 법학, 경영학, 경제학 등이 포함됩니다.",
                    "교육계열": "교육 이론과 실천을 다루며, 미래 교육자를 양성하는 학문 분야입니다.",
                    "공학계열": "과학 원리를 응용하여 기술과 시스템을 개발하는 분야입니다.",
                    "자연계열": "자연 현상과 생명체를 연구하며, 수학·물리·화학·생명과학 등이 포함됩니다.",
                    "의약계열": "인간의 건강과 질병을 다루며, 의학·간호학·약학 등이 포함됩니다.",
                    "예체능계열": "예술 및 체육 활동의 실기 능력을 기르는 분야입니다."
                }
                
                for item in items:
                    if not item['metadata'].get('summary'):
                        lclass = item['metadata'].get('lClass', '')
                        if lclass in category_descriptions:
                            desc = f"{item['title']}은(는) {category_descriptions[lclass]}"
                            item['metadata']['summary'] = desc
                            item['metadata']['deptDesc'] = desc

            print(f"Found {len(items)} unique recommendations for {metadata_type} (vector_id: {vector_id})")
            return items
        except Exception as e:
            print(f"Error in recommendation for {namespace}: {e}")
            import traceback
            traceback.print_exc()
            return []
