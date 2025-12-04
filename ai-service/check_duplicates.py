import os
import sys
from dotenv import load_dotenv
from supabase import create_client
from collections import Counter

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def check_duplicates():
    print("="*50)
    print("🔍 CHECKING FOR DUPLICATE DATA")
    print("="*50)

    try:
        # 1. Check Users
        print("\n👤 Checking Users...")
        users = supabase.table('users').select('*').execute().data
        print(f"   Total Users: {len(users)}")
        for u in users:
            print(f"   - ID: {u.get('user_id')}, Email: {u.get('email')}, Name: {u.get('username')}")

        # 2. Check User Profiles
        print("\n📝 Checking User Profiles...")
        profiles = supabase.table('user_profiles').select('*').execute().data
        print(f"   Total Profiles: {len(profiles)}")
        
        user_ids_in_profiles = [p['user_id'] for p in profiles]
        dup_users = [item for item, count in Counter(user_ids_in_profiles).items() if count > 1]
        
        if dup_users:
            print(f"   ⚠️ DUPLICATE PROFILES FOUND for User IDs: {dup_users}")
        else:
            print("   ✅ No duplicate profiles per user found.")

        for p in profiles:
            print(f"   - Profile ID: {p.get('profile_id')}, User ID: {p.get('user_id')}")
            print(f"     Interests: {p.get('interests')}")

        # 3. Check Profile Vectors
        print("\n🔢 Checking Profile Vectors...")
        vectors = supabase.table('profile_vector').select('*').execute().data
        print(f"   Total Vectors: {len(vectors)}")
        
        profile_ids_in_vectors = [v['profile_id'] for v in vectors]
        dup_vectors = [item for item, count in Counter(profile_ids_in_vectors).items() if count > 1]
        
        if dup_vectors:
            print(f"   ⚠️ DUPLICATE VECTORS FOUND for Profile IDs: {dup_vectors}")
        else:
            print("   ✅ No duplicate vectors per profile found.")

        for v in vectors:
            print(f"   - Vector ID: {v.get('id')}, Profile ID: {v.get('profile_id')}, DB ID: {v.get('vector_db_id')}")
            print(f"     Original Text Preview: {v.get('original_text')[:50]}...")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_duplicates()
