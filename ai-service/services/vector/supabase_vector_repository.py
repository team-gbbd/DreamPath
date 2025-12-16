import os
import json
from supabase import create_client, Client


class SupabaseVectorRepository:
    '''
    Pinecone vector_id 및 RAG 문서 원본을 Supabase에 저장/조회하는 레이어
    '''

    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        self.supabase: Client = create_client(url, key)

    def save_vector(self, table: str, record: dict):
        '''
        record 예시:
        {
            'original_id': '직업/NCS/학과/학교/사례 코드',
            'document_text': 'RAG 문서 원문',
            'vector_id': 'pinecone vector ID'
        }
        '''
        return self.supabase.table(table).insert(record).execute()

    def get_by_original_id(self, table: str, original_id: str):
        return (
            self.supabase.table(table)
            .select('*')
            .eq('original_id', original_id)
            .execute()
        )

    def get_vector_by_id(self, vector_id: str):
        """
        profile_vector 테이블에서 특정 vector_db_id에 해당하는 임베딩을 반환
        """
        response = (
            self.supabase.table('profile_vector')
            .select('vector_data')
            .eq('vector_db_id', vector_id)
            .execute()
        )
        if response.data:
            return response.data[0].get('vector_data')
        return None

    def get_user_interests(self, user_id: int):
        """
        user_profiles 테이블에서 사용자의 관심사(interests) 조회
        """
        try:
            response = (
                self.supabase.table('user_profiles')
                .select('interests')
                .eq('user_id', user_id)
                .execute()
            )
            if response.data:
                return response.data[0].get('interests')
        except Exception as e:
            print(f"Error fetching user interests: {e}")
        return None

    def get_job_details_by_ids(self, job_ids: list):
        """
        Fetch job details for a list of job IDs
        """
        if not job_ids:
            return []
        try:
            # Convert job_ids from "job_10117" format to integer 10117
            numeric_ids = []
            for job_id in job_ids:
                if isinstance(job_id, str):
                    # Extract number from "job_10117" or just use "10117"
                    numeric_part = job_id.replace("job_", "")
                    try:
                        numeric_ids.append(int(numeric_part))
                    except ValueError:
                        print(f"Warning: Could not convert job_id '{job_id}' to integer")
                        continue
                else:
                    numeric_ids.append(job_id)

            if not numeric_ids:
                return []

            response = (
                self.supabase.table('job_details')
                .select('*')
                .in_('job_id', numeric_ids)
                .execute()
            )

            # raw_data에서 직업명 추출하여 최상위 필드로 추가
            enriched_data = []
            for item in response.data:
                enriched_item = item.copy()
                raw_data = item.get('raw_data')

                # raw_data가 문자열이면 JSON 파싱
                if isinstance(raw_data, str):
                    try:
                        raw_data = json.loads(raw_data)
                    except:
                        raw_data = {}

                # baseInfo에서 직업명 추출
                if isinstance(raw_data, dict):
                    base_info = raw_data.get('baseInfo', {})
                    job_name = base_info.get('job_nm', '')
                    if job_name:
                        enriched_item['jobName'] = job_name
                        enriched_item['job_nm'] = job_name

                    # 추가 유용한 정보도 추출
                    enriched_item['wage'] = base_info.get('wage', '')
                    enriched_item['wlb'] = base_info.get('wlb', '')
                    enriched_item['aptitude'] = base_info.get('aptit_name', '')
                    enriched_item['relatedJob'] = base_info.get('rel_job_nm', '')

                enriched_data.append(enriched_item)

            return enriched_data
        except Exception as e:
            print(f"Error fetching job details: {e}")
            return []

    def get_major_details_by_ids(self, major_ids: list):
        """
        Fetch major details for a list of major IDs
        """
        if not major_ids:
            return []
        try:
            # Convert major_ids from "major_123" format to integer 123
            numeric_ids = []
            for major_id in major_ids:
                if isinstance(major_id, str):
                    numeric_part = major_id.replace("major_", "").replace("dept_", "")
                    try:
                        numeric_ids.append(int(numeric_part))
                    except ValueError:
                        print(f"Warning: Could not convert major_id '{major_id}' to integer")
                        continue
                else:
                    numeric_ids.append(major_id)
            
            if not numeric_ids:
                return []
            
            response = (
                self.supabase.table('major_details')
                .select('*')
                .in_('major_id', numeric_ids)
                .execute()
            )

            # 학과명 필드 정규화 (majorName, name 추가)
            enriched_data = []
            for item in response.data:
                enriched_item = item.copy()
                major_name = item.get('major_name', '')
                if major_name:
                    enriched_item['majorName'] = major_name
                    enriched_item['name'] = major_name
                enriched_data.append(enriched_item)

            return enriched_data
        except Exception as e:
            print(f"Error fetching major details: {e}")
            return []

    def search_keyword(self, table: str, column: str, keyword: str, limit: int = 5):
        """
        Perform a simple text search (ilike) on a specific table and column.
        Useful for "Hard Keyword Injection" (e.g., finding exact job titles).
        """
        try:
            response = (
                self.supabase.table(table)
                .select('*')
                .ilike(column, f"%{keyword}%")
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            print(f"Error searching keyword in {table}.{column}: {e}")
            return []
