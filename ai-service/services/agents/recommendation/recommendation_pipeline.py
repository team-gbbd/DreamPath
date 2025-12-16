from agents import Runner
from services.agents.recommendation.recommendation_agent import recommendation_agent
import logging
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import Any, Dict, Optional

try:
    from openai import RateLimitError
except Exception:  # pragma: no cover - fallback when openai isn't installed
    class RateLimitError(Exception):
        pass

def generate_ai_reasons(user_summary, items, item_type="직업"):
    try:
        # Fast & Cheap model for fallback reasoning
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        
        # Prepare item list string
        item_list_str = ""
        for item in items:
            name = item.get('jobName') if item_type == "직업" else item.get('name')
            item_list_str += f"- {name}: {item.get('desc_snippet', '')}\n"
            
        prompt = f"""
        당신은 진로 상담 전문가입니다.
        
        [사용자 프로필]
        {user_summary}
        
        [추천된 {item_type} 목록]
        {item_list_str}
        
        [임무]
        위의 각 {item_type}에 대해, 사용자의 성향과 목표를 고려하여 **추천하는 이유를 1문장으로** 작성해주십시오.
        단순한 사실 나열이 아니라, "사용자님은 ~한 성향이므로 이 {item_type}이 적합합니다"와 같이 연결지어 설명하세요.
        
        [출력 형식]
        반드시 아래와 같은 JSON 객체 하나만 출력하십시오. 다른 텍스트는 포함하지 마십시오.
        {{
            "항목이름1": "추천사유1",
            "항목이름2": "추천사유2"
        }}
        """
        
        msg = [
            SystemMessage(content="JSON Output Only."),
            HumanMessage(content=prompt)
        ]
        
        res = llm.invoke(msg)
        content = res.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        return json.loads(content)
    except Exception as e:
        print(f"⚠️ Failed to generate AI reasons: {e}")
        return {}

class RecommendationPipeline:

    @staticmethod
    def _clean_text(value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            text = value.strip()
            return text or None
        text = str(value).strip()
        return text or None

    def _ensure_job_name(self, job: Dict[str, Any]) -> bool:
        metadata = job.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        name = self._clean_text(job.get("jobName")) or \
            self._clean_text(job.get("title")) or \
            self._clean_text(job.get("job_nm")) or \
            self._clean_text(job.get("name")) or \
            self._clean_text(metadata.get("jobName")) or \
            self._clean_text(metadata.get("title")) or \
            self._clean_text(metadata.get("job_nm")) or \
            self._clean_text(metadata.get("job_name"))

        if not name:
            logging.warning("Dropping job recommendation without name: %s", job)
            return False

        job["jobName"] = name
        job.setdefault("title", name)
        job["metadata"] = metadata
        return True

    def _ensure_major_name(self, major: Dict[str, Any]) -> bool:
        metadata = major.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        name = self._clean_text(major.get("name")) or \
            self._clean_text(major.get("majorName")) or \
            self._clean_text(major.get("title")) or \
            self._clean_text(major.get("major_nm")) or \
            self._clean_text(metadata.get("majorName")) or \
            self._clean_text(metadata.get("name")) or \
            self._clean_text(metadata.get("deptName")) or \
            self._clean_text(metadata.get("mClass")) or \
            self._clean_text(metadata.get("lClass"))

        if not name:
            logging.warning("Dropping major recommendation without name: %s", major)
            return False

        major["name"] = name
        major.setdefault("majorName", name)
        major.setdefault("title", name)
        major["metadata"] = metadata
        return True

    async def run(self, user_profile: dict):
        """
        user_profile must include:
        summary, goals, values, personality, strengths, risks
        """
        runner = Runner()
        rate_limited = False
        try:
            result = await runner.run(
                recommendation_agent,
                input=json.dumps(user_profile, ensure_ascii=False)
            )
        except RateLimitError as exc:
            logging.warning("Recommendation agent hit rate limit/quota: %s", exc)
            rate_limited = True
            result = None

        final_output: dict = {}
        if result is not None:
            final_output = result.final_output
            if hasattr(final_output, "model_dump"):
                final_output = final_output.model_dump()
            elif hasattr(final_output, "dict"):
                final_output = final_output.dict()
            elif isinstance(final_output, str):
                try:
                    final_output = json.loads(final_output)
                except json.JSONDecodeError as exc:
                    raise ValueError("Recommendation agent returned non-JSON string output.") from exc

            if not isinstance(final_output, dict):
                raise ValueError(f"Recommendation agent did not return a valid object. Got: {type(final_output)}")

        job_explanations = final_output.get("job_explanations") or final_output.get("jobExplanations") or []
        major_explanations = final_output.get("major_explanations") or final_output.get("majorExplanations") or []
        
        # Normalize Data Keys for Frontend/Backend Compatibility
        # ⚠️ CRITICAL: LLM output의 title/jobName은 신뢰하지 않음
        # Pinecone metadata가 유일한 source of truth
        jobs = final_output.get("jobs", [])
        majors = final_output.get("majors", [])

        normalized_jobs = []
        for j in jobs:
            new_j = j.copy()

            # 🛡️ TRUST ONLY METADATA: LLM이 생성한 title은 무시
            # metadata에서 jobName을 가져오고, 없으면 job_nm, 그래도 없으면 LLM title (최후의 수단)
            meta = new_j.get('metadata', {})
            if isinstance(meta, dict):
                trusted_name = meta.get('jobName') or meta.get('job_nm') or meta.get('title')
                if trusted_name:
                    new_j['jobName'] = trusted_name
                    # LLM이 생성한 title과 metadata의 실제 이름이 다르면 경고 로그
                    llm_title = new_j.get('title', '')
                    if llm_title and llm_title != trusted_name:
                        print(f"⚠️ [ID/Name Mismatch] LLM title='{llm_title}' ≠ metadata='{trusted_name}'")

            # metadata에서 못 가져온 경우에만 job_nm → jobName 매핑 (레거시 호환)
            if 'jobName' not in new_j:
                if 'job_nm' in new_j:
                    new_j['jobName'] = new_j['job_nm']
                elif 'title' in new_j:
                    # 최후의 수단: LLM title 사용 (경고와 함께)
                    print(f"⚠️ [No Metadata] Using LLM-generated title: {new_j['title']}")
                    new_j['jobName'] = new_j['title']

            if 'score' in new_j and 'match' not in new_j:
                new_j['match'] = int(float(new_j['score']) * 100) if new_j['score'] <= 1 else int(new_j['score'])
            normalized_jobs.append(new_j)

        normalized_majors = []
        for m in majors:
            new_m = m.copy()

            # 🛡️ TRUST ONLY METADATA: 학과명도 동일한 규칙 적용
            meta = new_m.get('metadata', {})
            if isinstance(meta, dict):
                trusted_name = meta.get('majorName') or meta.get('major_nm') or meta.get('name')
                if trusted_name:
                    new_m['name'] = trusted_name
                    llm_title = new_m.get('title', '')
                    if llm_title and llm_title != trusted_name:
                        print(f"⚠️ [ID/Name Mismatch] LLM title='{llm_title}' ≠ metadata='{trusted_name}'")

            if 'name' not in new_m:
                if 'major_nm' in new_m:
                    new_m['name'] = new_m['major_nm']
                elif 'title' in new_m:
                    print(f"⚠️ [No Metadata] Using LLM-generated title: {new_m['title']}")
                    new_m['name'] = new_m['title']

            if 'score' in new_m and 'match' not in new_m:
                 new_m['match'] = int(float(new_m['score']) * 100) if new_m['score'] <= 1 else int(new_m['score'])
            normalized_majors.append(new_m)

        normalized_jobs = [job for job in normalized_jobs if self._ensure_job_name(job)]
        normalized_majors = [major for major in normalized_majors if self._ensure_major_name(major)]

        response = {
            "jobs": normalized_jobs,
            "majors": normalized_majors,
            "jobExplanations": job_explanations,
            "majorExplanations": major_explanations
        }
        if rate_limited:
            response["warning"] = "AI 추천 모델 사용 한도를 초과해 기본 추천 결과를 제공했습니다. 잠시 후 다시 시도해주세요."

        # ---------------------------------------------------------
        # 🛡️ SAFETY NET: Fallback Mechanism
        # If Agent returns empty results, force direct search.
        # ---------------------------------------------------------
        # ---------------------------------------------------------
        # 🛡️ SAFETY NET: Fallback Mechanism (Robust Metadata Mode)
        # ---------------------------------------------------------
        if not normalized_jobs or not normalized_majors:
            print(f"⚠️  [Fallback Triggered] Agent returned incomplete results.")
            
            # Import logic functions directly
            from .recommendation_tools import search_jobs_logic, search_majors_logic
            from services.vector.supabase_vector_repository import SupabaseVectorRepository

            # Initialize repo for job name lookup
            job_repo = SupabaseVectorRepository()

            summary = user_profile.get("summary", "")
            goals = user_profile.get("goals", [])

            # --- Fallback for JOBS ---
            if not normalized_jobs:
                print("🔄 Executing Fallback Search for JOBS (Metadata Mode)...")
                try:
                    raw_res = search_jobs_logic(summary=summary, goals=goals, top_k=20)

                    # Normalize response (handle QueryResponse object)
                    if hasattr(raw_res, "to_dict"):
                        raw_res = raw_res.to_dict()
                    matches = raw_res.get('matches', []) if isinstance(raw_res, dict) else getattr(raw_res, 'matches', [])

                    # Filter: type='job' OR id starts with 'job_'
                    job_matches = []
                    for m in matches:
                        if hasattr(m, "to_dict"):
                            m = m.to_dict()

                        meta = m.get("metadata") or {} # handle None
                        if meta.get('type') == 'job' or m.get('id', '').startswith('job_'):
                            job_matches.append(m)

                    # Pre-generate list for LLM
                    candidates_for_llm = []
                    normalized_jobs = []

                    # First pass: Collect data
                    temp_matches = []
                    for m in job_matches[:6]:
                        meta = m.get('metadata') or {}
                        score = m.get('score', 0)
                        match_pct = int(score * 100) if score <= 1.0 else int(score)

                        job_name = meta.get('jobName') or meta.get('title') or f"Job {m['id']}"

                        # ID Normalization for Detail Page (Strip 'job_' prefix or use original_id)
                        raw_id = str(m['id'])
                        real_id = meta.get('original_id') or (raw_id.split('_')[1] if '_' in raw_id else raw_id)

                        # Static Reason Backup
                        aptitude = meta.get('aptitude', '관련')
                        wlb = meta.get('wlb', '보통')
                        wage = meta.get('wage', '')
                        
                        static_reason = f"이 직업은 '{aptitude}' 적성이 요구되며, 사용자님의 목표와 높은 연관성을 보입니다."
                        if wage:
                            static_reason += f" 평균 연봉은 약 {wage}만원 수준이며,"
                        if wlb:
                            static_reason += f" 업무 환경({wlb}) 측면에서도 고려해볼 만합니다."

                        temp_matches.append({
                            "id": real_id,
                            "jobName": job_name,
                            "match": match_pct,
                            "description": meta.get('summary') or "설명이 없습니다.",
                            "backup_reason": static_reason,
                            "desc_snippet": (meta.get('summary') or "")[:100],
                            "metadata": meta  # Pass metadata for frontend
                        })
                        
                    # Batch LLM Call
                    ai_reasons = generate_ai_reasons(summary, temp_matches, "직업")
                    
                    # Second pass: Assemble final result
                    job_explanations = []
                    for item in temp_matches:
                        final_reason = ai_reasons.get(item['jobName'], item['backup_reason'])
                        
                        normalized_jobs.append({
                            "id": item['id'],
                            "job_id": str(item['id']), # Explicit job_id for frontend
                            "jobName": item['jobName'],
                            "match": item['match'],
                            "description": item['description'],
                            "reason": final_reason,
                            "explanation": final_reason,
                            "metadata": item['metadata'] # Pass metadata
                        })
                        job_explanations.append(final_reason)
                    
                    response['jobs'] = normalized_jobs
                    # Only overwrite explanations if they are empty
                    if not response.get('jobExplanations'):
                         response['jobExplanations'] = job_explanations
                         
                    print(f"✅ Fallback JOBS: Recovered {len(normalized_jobs)} items from Metadata")
                except Exception as e:
                     print(f"❌ Fallback JOBS Failed: {e}")

            # --- Fallback for MAJORS ---
            if not normalized_majors:
                print("🔄 Executing Fallback Search for MAJORS (Metadata Mode)...")
                try:
                    raw_res = search_majors_logic(summary=summary, goals=goals, top_k=20)
                    
                    # Normalize response
                    if hasattr(raw_res, "to_dict"):
                        raw_res = raw_res.to_dict()
                    matches = raw_res.get('matches', []) if isinstance(raw_res, dict) else getattr(raw_res, 'matches', [])
                    
                    major_matches = []
                    for m in matches:
                        if hasattr(m, "to_dict"):
                             m = m.to_dict()
                        
                        meta = m.get("metadata") or {}
                        if meta.get('type') == 'major' or m.get('id', '').startswith('major_'):
                            major_matches.append(m)
                    
                    candidates_for_llm = []
                    temp_matches = []
                    
                    for m in major_matches[:6]:
                        meta = m.get('metadata') or {}
                        score = m.get('score', 0)
                        match_pct = int(score * 100) if score <= 1.0 else int(score)
                        
                        major_name = meta.get('majorName') or meta.get('name') or f"Major {m['id']}"
                        
                        # ID Normalization for Detail Page (Strip 'major_' prefix or use original_id)
                        raw_id = str(m['id'])
                        real_id = meta.get('original_id') or (raw_id.split('_')[1] if '_' in raw_id else raw_id)
                        
                        l_class = meta.get('lClass', '관련')

                        static_reason = f"'{l_class}' 계열의 대표적인 학과로, 사용자님의 관심사와 잘 매칭됩니다."

                        temp_matches.append({
                            "id": real_id,
                            "name": major_name,
                            "match": match_pct,
                            "description": meta.get('summary') or "설명이 없습니다.",
                            "backup_reason": static_reason,
                            "desc_snippet": (meta.get('summary') or "")[:100],
                            "metadata": meta
                        })

                    # Batch LLM Call
                    ai_reasons = generate_ai_reasons(summary, temp_matches, "학과")

                    major_explanations = []
                    for item in temp_matches:
                        final_reason = ai_reasons.get(item['name'], item['backup_reason'])
                        
                        normalized_majors.append({
                            "id": item['id'],
                            "major_id": item['id'], # Explicit major_id for frontend
                            "name": item['name'],
                            "match": item['match'],
                            "description": item['description'],
                            "reason": final_reason,
                            "explanation": final_reason,
                            "metadata": item['metadata'] # Pass metadata
                        })
                        major_explanations.append(final_reason)

                    response['majors'] = normalized_majors
                    if not response.get('majorExplanations'):
                        response['majorExplanations'] = major_explanations
                        
                    print(f"✅ Fallback MAJORS: Recovered {len(normalized_majors)} items from Metadata")
                except Exception as e:
                    print(f"❌ Fallback MAJORS Failed: {e}")
            


        # ---------------------------------------------------------
        # 🔗 DATA ENRICHMENT: Fetch Full Details from DB
        # ---------------------------------------------------------
        try:
            from services.db.major_repository import MajorRepository
            major_repo = MajorRepository()
            
            # Helper to extract ID from item safely
            def normalize_mid(raw_id):
                s = str(raw_id)
                if s.startswith('major_'):
                    return s.replace('major_', '')
                return s

            def get_id_safe(item):
                # 1. Top level
                raw = item.get('major_id') or item.get('id')
                if raw: return normalize_mid(raw)
                # 2. Metadata level
                meta = item.get('metadata', {})
                if isinstance(meta, dict):
                    raw = meta.get('major_id') or meta.get('id') or meta.get('majorId')
                    if raw: return normalize_mid(raw)
                return None

            # 1. Collect IDs
            major_ids_to_fetch = []
            for m in response.get('majors', []):
                mid = get_id_safe(m)
                if mid and mid.isdigit():
                     major_ids_to_fetch.append(int(mid))
            
            if major_ids_to_fetch:
                # 2. Fetch from DB
                unique_ids = list(set(major_ids_to_fetch))
                details = major_repo.get_major_details_by_ids(unique_ids)
                
                # 3. Create Map for O(1) Access
                # DB major_id is int/bigint
                detail_map = {str(d['major_id']): d for d in details}
                
                # 4. Merge
                for m in response['majors']:
                    curr_id = get_id_safe(m)
                    
                    if curr_id in detail_map:
                        db_item = detail_map[curr_id]
                        
                        # -------------------------------------------------
                        # DATA EXTRACTION & NORMALIZATION
                        # -------------------------------------------------
                        
                        # 1. Parse Raw Data
                        raw_data = db_item.get('raw_data')
                        if isinstance(raw_data, str):
                            try:
                                raw_data = json.loads(raw_data)
                            except:
                                raw_data = {}
                        elif not isinstance(raw_data, dict):
                            raw_data = {}
                            
                        # 2. Extract Chart Data safely
                        # DEBUG FINDING: chartData is a LIST, not a DICT!
                        # It looks like: [{'gender': ...}, {'field': ...}, ...] or something similar?
                        # Wait, previous debug_api_keys.py output showed chartData as a DICT:
                        # {'gender': [...], 'field': [...], ...}
                        # BUT debug_enrichment_repro.py crashed with "AttributeError: 'list' object has no attribute 'keys'".
                        # This implies SOME records have chartData as a list.
                        # I should handle BOTH cases to be safe.
                        
                        chart_data_src = raw_data.get('chartData')
                        chart_data_dict = {}
                        
                        if isinstance(chart_data_src, dict):
                            chart_data_dict = chart_data_src
                        elif isinstance(chart_data_src, list):
                            # If it's a list, it might be a list of single-key dicts?
                            # e.g. [{"gender": ...}, {"field": ...}]
                            # Let's merge them into one dict for easy access
                            for item in chart_data_src:
                                if isinstance(item, dict):
                                    chart_data_dict.update(item)
                                    
                        # Ensure metadata exists
                        if 'metadata' not in m or not isinstance(m.get('metadata'), dict):
                            m['metadata'] = {}

                        # 3. Calculate Advancement Rate (진학률)
                        adv_rate = "정보 없음"
                        if 'after_graduation' in chart_data_dict:
                            ag_list = chart_data_dict['after_graduation']
                            if isinstance(ag_list, list):
                                for x in ag_list:
                                    if x.get('item') == '전체':
                                        adv_rate = f"{x.get('data')}%"
                                        break
                        m['metadata']['advancement_rate'] = adv_rate
                        
                        # 4. Calculate Employment Rate (취업률)
                        emp_rate = "정보 없음"
                        
                        if 'employment_rate' in chart_data_dict:
                            er_list = chart_data_dict['employment_rate']
                            if isinstance(er_list, list):
                                for x in er_list:
                                    if x.get('item') == '전체':
                                        emp_rate = f"{x.get('data')}%"
                                        break
                        
                        if (emp_rate == "정보 없음") and db_item.get('employment'):
                            emp_rate = db_item['employment']
                            
                        m['metadata']['employment_rate'] = emp_rate
                        
                        # 5. Other Metadata
                        if 'lClass' not in m['metadata'] and raw_data.get('lClass'):
                             m['metadata']['lClass'] = raw_data['lClass']

                print(f"✅ Data Enrichment: Updated {len(response['majors'])} majors with DB details.")

        except Exception as e:
            print(f"⚠️ Data Enrichment Failed: {e}")
            import traceback
            traceback.print_exc()
            
        response["jobs"] = [job for job in response.get("jobs", []) if self._ensure_job_name(job)]
        response["majors"] = [major for major in response.get("majors", []) if self._ensure_major_name(major)]

        return response
