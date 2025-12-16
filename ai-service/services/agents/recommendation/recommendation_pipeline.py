import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import Any, Dict, Optional


def generate_ai_reasons(user_summary, items, item_type="직업"):
    """
    GPT-4o-mini를 사용하여 각 추천 항목에 대한 개인화된 추천 사유를 생성합니다.
    """
    try:
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

        ⚠️ Option A: Agent 우회, Pinecone 직접 검색 사용
        - Agent는 GPT-4o 기반으로 job/major 이름을 자체 생성하는 문제가 있었음
        - Pinecone 검색 + DB 조회로 정확한 데이터 보장
        """
        print("🚀 [RecommendationPipeline] Starting Direct Pinecone Search (Agent Bypass Mode)")

        # Import logic functions
        from .recommendation_tools import (
            search_jobs_logic,
            search_majors_logic,
            load_job_details_logic,
            load_major_details_logic
        )

        # Initialize response
        response = {
            "jobs": [],
            "majors": [],
            "jobExplanations": [],
            "majorExplanations": []
        }

        normalized_jobs = []
        normalized_majors = []
        job_explanations = []
        major_explanations = []

        summary = user_profile.get("summary", "")
        goals = user_profile.get("goals", [])

        # =============================================================
        # 1. JOBS: Pinecone 검색 + DB 조회
        # =============================================================
        print("🔄 [JOBS] Executing Direct Pinecone Search...")
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

                meta = m.get("metadata") or {}
                if meta.get('type') == 'job' or m.get('id', '').startswith('job_'):
                    job_matches.append(m)

            # Get top 6 job IDs for DB lookup
            top_job_ids = [m['id'] for m in job_matches[:6]]
            print(f"📋 [JOBS] Top IDs from Pinecone: {top_job_ids}")

            # Load full details from DB via SupabaseVectorRepository
            job_details_list = load_job_details_logic(top_job_ids) if top_job_ids else []
            print(f"📦 [JOBS] Loaded {len(job_details_list)} job details from DB")

            # Create lookup map: job_id -> DB record
            job_details_map = {}
            for jd in job_details_list:
                jid = str(jd.get('job_id', ''))
                job_details_map[jid] = jd

            # First pass: Collect data from Pinecone + DB
            temp_matches = []
            for m in job_matches[:6]:
                meta = m.get('metadata') or {}
                score = m.get('score', 0)
                match_pct = int(score * 100) if score <= 1.0 else int(score)

                # ID Normalization
                raw_id = str(m['id'])
                real_id = meta.get('original_id') or (raw_id.split('_')[1] if '_' in raw_id else raw_id)

                # 🔑 핵심: DB에서 jobName 가져오기 (SupabaseVectorRepository가 raw_data에서 추출)
                db_record = job_details_map.get(real_id, {})
                job_name = (
                    db_record.get('jobName') or
                    db_record.get('job_nm') or
                    meta.get('jobName') or
                    meta.get('title') or
                    f"Job {real_id}"
                )

                # DB에서 추가 정보 가져오기
                wage = db_record.get('wage') or meta.get('wage', '')
                wlb = db_record.get('wlb') or meta.get('wlb', '보통')
                aptitude = db_record.get('aptitude') or meta.get('aptitude', '관련')

                # Static Reason Backup (LLM 실패 시 사용)
                static_reason = f"이 직업은 '{aptitude}' 적성이 요구되며, 사용자님의 목표와 높은 연관성을 보입니다."
                if wage:
                    static_reason += f" 평균 연봉은 약 {wage}만원 수준이며,"
                if wlb:
                    static_reason += f" 업무 환경({wlb}) 측면에서도 고려해볼 만합니다."

                temp_matches.append({
                    "id": real_id,
                    "jobName": job_name,
                    "match": match_pct,
                    "description": meta.get('summary') or db_record.get('description') or "설명이 없습니다.",
                    "backup_reason": static_reason,
                    "desc_snippet": (meta.get('summary') or "")[:100],
                    "metadata": {
                        **meta,
                        "wage": wage,
                        "wlb": wlb,
                        "aptitude": aptitude
                    },
                    "db_record": db_record  # 전체 DB 레코드 포함
                })

            # Batch LLM Call for personalized reasons
            ai_reasons = generate_ai_reasons(summary, temp_matches, "직업")

            # Second pass: Assemble final result
            for item in temp_matches:
                final_reason = ai_reasons.get(item['jobName'], item['backup_reason'])

                normalized_jobs.append({
                    "id": item['id'],
                    "job_id": str(item['id']),
                    "jobName": item['jobName'],
                    "match": item['match'],
                    "description": item['description'],
                    "reason": final_reason,
                    "explanation": final_reason,
                    "metadata": item['metadata']
                })
                job_explanations.append(final_reason)

            response['jobs'] = normalized_jobs
            response['jobExplanations'] = job_explanations

            print(f"✅ [JOBS] Complete: {len(normalized_jobs)} items")
        except Exception as e:
            print(f"❌ [JOBS] Search Failed: {e}")
            import traceback
            traceback.print_exc()

        # =============================================================
        # 2. MAJORS: Pinecone 검색 + DB 조회
        # =============================================================
        print("🔄 [MAJORS] Executing Direct Pinecone Search...")
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

            # Get top 6 major IDs for DB lookup
            top_major_ids = [m['id'] for m in major_matches[:6]]
            print(f"📋 [MAJORS] Top IDs from Pinecone: {top_major_ids}")

            # Load full details from DB via SupabaseVectorRepository
            major_details_list = load_major_details_logic(top_major_ids) if top_major_ids else []
            print(f"📦 [MAJORS] Loaded {len(major_details_list)} major details from DB")

            # Create lookup map
            major_details_map = {}
            for md in major_details_list:
                mid = str(md.get('major_id', ''))
                major_details_map[mid] = md

            temp_matches = []

            for m in major_matches[:6]:
                meta = m.get('metadata') or {}
                score = m.get('score', 0)
                match_pct = int(score * 100) if score <= 1.0 else int(score)

                # ID Normalization
                raw_id = str(m['id'])
                real_id = meta.get('original_id') or (raw_id.split('_')[1] if '_' in raw_id else raw_id)

                # 🔑 핵심: DB에서 majorName 가져오기
                db_record = major_details_map.get(real_id, {})
                major_name = (
                    db_record.get('majorName') or
                    db_record.get('name') or
                    db_record.get('major_name') or
                    meta.get('majorName') or
                    meta.get('name') or
                    f"Major {real_id}"
                )

                l_class = db_record.get('l_class') or meta.get('lClass', '관련')

                static_reason = f"'{l_class}' 계열의 대표적인 학과로, 사용자님의 관심사와 잘 매칭됩니다."

                temp_matches.append({
                    "id": real_id,
                    "name": major_name,
                    "match": match_pct,
                    "description": meta.get('summary') or db_record.get('description') or "설명이 없습니다.",
                    "backup_reason": static_reason,
                    "desc_snippet": (meta.get('summary') or "")[:100],
                    "metadata": {**meta, "lClass": l_class},
                    "db_record": db_record
                })

            # Batch LLM Call for personalized reasons
            ai_reasons = generate_ai_reasons(summary, temp_matches, "학과")

            for item in temp_matches:
                final_reason = ai_reasons.get(item['name'], item['backup_reason'])

                normalized_majors.append({
                    "id": item['id'],
                    "major_id": item['id'],
                    "name": item['name'],
                    "match": item['match'],
                    "description": item['description'],
                    "reason": final_reason,
                    "explanation": final_reason,
                    "metadata": item['metadata']
                })
                major_explanations.append(final_reason)

            response['majors'] = normalized_majors
            response['majorExplanations'] = major_explanations

            print(f"✅ [MAJORS] Complete: {len(normalized_majors)} items")
        except Exception as e:
            print(f"❌ [MAJORS] Search Failed: {e}")
            import traceback
            traceback.print_exc()

        # =============================================================
        # 3. DATA ENRICHMENT: 학과 추가 정보 보강 (취업률, 진학률)
        # =============================================================
        try:
            from services.db.major_repository import MajorRepository
            major_repo = MajorRepository()

            def normalize_mid(raw_id):
                s = str(raw_id)
                if s.startswith('major_'):
                    return s.replace('major_', '')
                return s

            def get_id_safe(item):
                raw = item.get('major_id') or item.get('id')
                if raw:
                    return normalize_mid(raw)
                meta = item.get('metadata', {})
                if isinstance(meta, dict):
                    raw = meta.get('major_id') or meta.get('id') or meta.get('majorId')
                    if raw:
                        return normalize_mid(raw)
                return None

            # Collect IDs
            major_ids_to_fetch = []
            for m in response.get('majors', []):
                mid = get_id_safe(m)
                if mid and mid.isdigit():
                    major_ids_to_fetch.append(int(mid))

            if major_ids_to_fetch:
                unique_ids = list(set(major_ids_to_fetch))
                details = major_repo.get_major_details_by_ids(unique_ids)
                detail_map = {str(d['major_id']): d for d in details}

                for m in response['majors']:
                    curr_id = get_id_safe(m)

                    if curr_id in detail_map:
                        db_item = detail_map[curr_id]

                        # Parse Raw Data
                        raw_data = db_item.get('raw_data')
                        if isinstance(raw_data, str):
                            try:
                                raw_data = json.loads(raw_data)
                            except:
                                raw_data = {}
                        elif not isinstance(raw_data, dict):
                            raw_data = {}

                        # Extract Chart Data
                        chart_data_src = raw_data.get('chartData')
                        chart_data_dict = {}

                        if isinstance(chart_data_src, dict):
                            chart_data_dict = chart_data_src
                        elif isinstance(chart_data_src, list):
                            for item in chart_data_src:
                                if isinstance(item, dict):
                                    chart_data_dict.update(item)

                        if 'metadata' not in m or not isinstance(m.get('metadata'), dict):
                            m['metadata'] = {}

                        # Advancement Rate (진학률)
                        adv_rate = "정보 없음"
                        if 'after_graduation' in chart_data_dict:
                            ag_list = chart_data_dict['after_graduation']
                            if isinstance(ag_list, list):
                                for x in ag_list:
                                    if x.get('item') == '전체':
                                        adv_rate = f"{x.get('data')}%"
                                        break
                        m['metadata']['advancement_rate'] = adv_rate

                        # Employment Rate (취업률)
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

                        # Other Metadata
                        if 'lClass' not in m['metadata'] and raw_data.get('lClass'):
                            m['metadata']['lClass'] = raw_data['lClass']

                print(f"✅ [DATA ENRICHMENT] Updated {len(response['majors'])} majors with additional details.")

        except Exception as e:
            print(f"⚠️ [DATA ENRICHMENT] Failed: {e}")
            import traceback
            traceback.print_exc()

        # =============================================================
        # 4. FINAL VALIDATION: 이름 없는 항목 필터링
        # =============================================================
        response["jobs"] = [job for job in response.get("jobs", []) if self._ensure_job_name(job)]
        response["majors"] = [major for major in response.get("majors", []) if self._ensure_major_name(major)]

        return response
