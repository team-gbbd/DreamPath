import os
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
