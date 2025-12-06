import os
from dotenv import load_dotenv
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.rag.pinecone_vector_service import PineconeVectorService

load_dotenv()

def restore_user_vector(user_id="user-1"):
    print(f"Restoring vector for {user_id}...")
    
    # 1. Supabase에서 원본 텍스트 가져오기
    repo = SupabaseVectorRepository()
    response = repo.supabase.table('profile_vector').select('*').eq('vector_db_id', user_id).execute()
    
    if not response.data:
        print(f"User {user_id} not found in Supabase profile_vector table.")
        return

    record = response.data[0]
    original_text = record.get('original_text')
    print(f"Found original text: {original_text[:50]}...")

    # 2. Embedding 생성 및 Pinecone Upsert
    vector_service = PineconeVectorService()
    vector_service.process(user_id, original_text, metadata={"type": "user", "profile_id": record.get('profile_id')})
    
    print(f"Successfully restored vector for {user_id} to Pinecone.")

if __name__ == "__main__":
    restore_user_vector()
