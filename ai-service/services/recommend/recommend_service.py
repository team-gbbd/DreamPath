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
            
            if not user_result or 'vectors' not in user_result or user_vector_id not in user_result['vectors']:
                print(f"User vector not found in Pinecone: {user_vector_id}")
                return []
            
            user_vector = user_result['vectors'][user_vector_id]['values']

            # 2. Pinecone 유사도 검색 (type=job 필터 추가)
            # 중복 제거를 고려하여 요청된 top_k보다 훨씬 더 많은 후보를 가져옴
            # Pinecone에 중복이 많아서 20배로 설정
            fetch_k = min(top_k * 20, 1000)  # 최대 1000개
            result = self.index.query(
                vector=user_vector,
                top_k=fetch_k,
                include_metadata=True,
                filter={"type": "job"}
            )

            # 3. CareerNet API에서 직업 정보 가져오기 (모든 페이지)
            careernet_data = {}
            if result.matches:
                try:
                    from services.ingest.careernet_client import CareerNetClient
                    client = CareerNetClient()
                    
                    # 페이지네이션으로 모든 데이터 가져오기
                    all_jobs = []
                    page = 1
                    while True:
                        page_data = client.get_job_list(page_index=page, page_size=100)
                        if not page_data:
                            break
                        all_jobs.extend(page_data)
                        # totalCount 확인하여 더 이상 페이지가 없으면 중단
                        if len(page_data) < 100:
                            break
                        page += 1
                        if page > 10:  # 안전장치: 최대 10페이지 (1000개)
                            break
                    
                    # Create lookup dict by job_code
                    careernet_data = {item.get('job_code'): item for item in all_jobs if item.get('job_code')}
                    print(f"[DEBUG] Fetched {len(careernet_data)} JOB records from CareerNet API ({len(all_jobs)} total)")
                except Exception as e:
                    print(f"[ERROR] Error fetching CareerNet JOB data: {e}")

            # 4. 결과 정리 (중복 제거 로직 추가)
            jobs = []
            seen_titles = set()
            
            for match in result.matches:
                # original_id (CareerNet Job) or job_code (NCS Fallback)
                job_code = match.metadata.get("original_id") or match.metadata.get("job_code")
                
                title = match.metadata.get("jobName", match.metadata.get("title", ""))
                metadata = match.metadata
                
                # Enrich with CareerNet data
                if job_code and job_code in careernet_data:
                    cn_data = careernet_data[job_code]
                    title = cn_data.get('job', title)
                    # print(f"[DEBUG] Enriching job {match.id} (code={job_code}) with CareerNet data: {title}")
                    
                    metadata.update({
                        "jobName": cn_data.get('job', ''),
                        "summary": cn_data.get('summary', ''),
                        "work_env": cn_data.get('work_env', ''),
                        "job_ability": cn_data.get('job_ability', ''),
                        "job_values": cn_data.get('job_values', ''),
                        "major": cn_data.get('major', ''),
                        "job_path": cn_data.get('job_path', ''),
                        "aptitude": cn_data.get('aptitude', '')
                    })
                
                final_title = title or "제목 미확인"
                
                # 중복 제거: 이미 추가된 직업명은 건너뜀
                if final_title in seen_titles:
                    continue
                
                seen_titles.add(final_title)
                
                jobs.append({
                    "job_id": match.id,
                    "title": final_title,
                    "score": float(match.score),
                    "metadata": metadata
                })
                
                # 요청된 개수만큼 채워지면 중단
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

    def _recommend_by_namespace(self, vector_id: str, namespace: str, top_k: int):
        """
        Recommend items by querying Pinecone
        1. Fetch user vector from Pinecone using vector_id
        2. Query Pinecone with that vector using metadata type filter
        3. Enrich results with actual data from CareerNet API
        """
        try:
            # Fetch user vector from Pinecone by ID
            user_result = self.index.fetch(ids=[vector_id])
            
            if not user_result or 'vectors' not in user_result or vector_id not in user_result['vectors']:
                print(f"User vector not found in Pinecone: {vector_id}")
                return []
            
            user_vector = user_result['vectors'][vector_id]['values']
            
            # Map namespace to Pinecone metadata type
            type_mapping = {
                "major_vector": ("department", "univ_list"),
                "school_vector": ("school", "high_list"), 
                "worknet_vector": ("worknet", None)
            }
            metadata_type, gubun = type_mapping.get(namespace, (namespace.replace("_vector", ""), None))
            
            # 중복 제거를 고려하여 요청된 top_k보다 더 많은 후보를 가져옴
            fetch_k = top_k * 5
            result = self.index.query(
                vector=user_vector,
                top_k=fetch_k,
                include_metadata=True,
                filter={"type": metadata_type}
            )
            
            items = []
            seen_titles = set()
            
            # Fetch department/school data from CareerNet API if needed
            careernet_data = {}
            if gubun and result.matches:
                try:
                    from services.ingest.careernet_client import CareerNetClient
                    client = CareerNetClient()
                    # Fetch all data at once (up to 100 items)
                    all_data = client.get_major_list(page_index=1, page_size=100, gubun=gubun)
                    
                    # Determine ID field and Title field based on gubun
                    id_field = 'majorSeq' if gubun == 'univ_list' else 'seq'
                    title_field = 'mClass' if gubun == 'univ_list' else 'schoolName'
                    
                    # Create lookup dict by ID
                    careernet_data = {item.get(id_field): item for item in all_data if item.get(id_field)}
                    print(f"[DEBUG] Fetched {len(careernet_data)} {gubun} records from CareerNet API")
                    if careernet_data:
                        first_key = next(iter(careernet_data))
                        print(f"[DEBUG] Sample CareerNet data (key={first_key}): {careernet_data[first_key].get(title_field)}")
                except Exception as e:
                    print(f"[ERROR] Error fetching CareerNet data: {e}")
            
            for match in result.matches:
                original_id = match.metadata.get("original_id")
                
                title = ""
                # Try to get data from CareerNet first
                if original_id and original_id in careernet_data:
                    cn_data = careernet_data[original_id]
                    title = cn_data.get(title_field, '')
                    # print(f"[DEBUG] Enriching item {match.id} (original_id={original_id}) with CareerNet data: {title}")
                    
                    item = {
                        "id": match.id,
                        "title": title,
                        "score": float(match.score),
                        "metadata": {
                            **match.metadata,
                            "deptName": cn_data.get('mClass', ''),
                            "schoolName": cn_data.get('schoolName', ''),
                            "lClass": cn_data.get('lClass', ''),
                            "summary": cn_data.get('summary', ''),
                            "job": cn_data.get('job', ''),
                            "subject": cn_data.get('subject', ''),
                            "region": cn_data.get('region', ''),
                            "adres": cn_data.get('adres', ''),
                            "link": cn_data.get('link', '')
                        }
                    }
                else:
                    if original_id:
                        print(f"[DEBUG] No CareerNet data found for original_id={original_id}")
                    # Fallback to Supabase data
                    item = {
                        "id": match.id,
                        "title": "",
                        "score": float(match.score),
                        "metadata": match.metadata
                    }
                
                final_title = item["title"]
                if final_title and final_title in seen_titles:
                    continue
                
                if final_title:
                    seen_titles.add(final_title)
                
                items.append(item)
                
                # 요청된 개수만큼 채워지면 중단
                if len(items) >= top_k:
                    break
            
            # 학과 추천인 경우, 계열별 일반 설명 제공
            if metadata_type == 'department':
                # 계열별 설명 매핑
                category_descriptions = {
                    "인문계열": "언어, 문학, 역사, 철학 등 인간의 사상과 문화를 탐구하는 학문 분야입니다.",
                    "사회계열": "사회 현상과 인간 관계를 연구하며, 법학, 경영학, 경제학 등이 포함됩니다.",
                    "교육계열": "교육 이론과 실천을 다루며, 미래 교육자를 양성하는 학문 분야입니다.",
                    "공학계열": "과학 원리를 응용하여 실용적인 기술과 시스템을 개발하는 학문 분야입니다.",
                    "자연계열": "자연 현상과 생명체를 연구하며, 수학, 물리학, 화학, 생물학 등이 포함됩니다.",
                    "의약계열": "인간의 건강과 질병을 다루며, 의학, 간호학, 약학 등이 포함됩니다.",
                    "예체능계열": "예술과 체육 분야의 창작 및 실기 능력을 기르는 학문 분야입니다."
                }
                
                for item in items:
                    if not item['metadata'].get('summary'):
                        lclass = item['metadata'].get('lClass', '')
                        if lclass in category_descriptions:
                            description = f"{item['title']}은(는) {category_descriptions[lclass]}"
                            item['metadata']['summary'] = description
                            item['metadata']['deptDesc'] = description

            print(f"Found {len(items)} unique recommendations for {metadata_type} (vector_id: {vector_id})")
            return items
        except Exception as e:
            print(f"Error in recommendation for {namespace}: {e}")
            import traceback
            traceback.print_exc()
            return []
