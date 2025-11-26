import os
from supabase import create_client, Client


class SupabaseVectorRepository:
    '''
    Pinecone vector_id 및 RAG 문서 원본을 Supabase에 저장/조회하는 레이어
    '''

    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        self.supabase = None
        self._initialized = False

        if not url or not key:
            print("[Supabase] URL 또는 KEY가 설정되지 않았습니다. Supabase 기능이 비활성화됩니다.")
            return

        try:
            self.supabase: Client = create_client(url, key)
            self._initialized = True
            print("[Supabase] 초기화 완료")
        except Exception as e:
            print(f"[Supabase] 초기화 실패: {e}")
            print("[Supabase] Supabase 기능이 비활성화됩니다.")

    def save_vector(self, table: str, record: dict):
        '''
        record 예시:
        {
            'original_id': '직업/NCS/학과/학교/사례 코드',
            'document_text': 'RAG 문서 원문',
            'vector_id': 'pinecone vector ID'
        }
        '''
        if not self._initialized:
            print("[Supabase] 초기화되지 않아 save_vector를 건너뜁니다.")
            return None
        return self.supabase.table(table).insert(record).execute()

    def get_by_original_id(self, table: str, original_id: str):
        if not self._initialized:
            print("[Supabase] 초기화되지 않아 get_by_original_id를 건너뜁니다.")
            return None
        return (
            self.supabase.table(table)
            .select('*')
            .eq('original_id', original_id)
            .execute()
        )

    def get_vector_by_id(self, vector_id: str):
        """
        profile_vector 테이블에서 특정 vector_id에 해당하는 임베딩을 반환
        """
        if not self._initialized:
            print("[Supabase] 초기화되지 않아 get_vector_by_id를 건너뜁니다.")
            return None
        response = (
            self.supabase.table('profile_vector')
            .select('embedding')
            .eq('vector_id', vector_id)
            .execute()
        )
        if response.data:
            return response.data[0].get('embedding')
        return None
