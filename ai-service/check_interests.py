import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def check_interests():
    print("="*50)
    print("🔍 SEARCHING FOR '음악' OR '악기' IN PROFILES")
    print("="*50)

    try:
        # Fetch all profiles (or a reasonable limit)
        res = supabase.table('user_profiles').select('user_id, interests').execute()
        
        found = False
        for profile in res.data:
            interests = profile.get('interests', '')
            if '음악' in interests or '악기' in interests:
                print(f"✅ Found match!")
                print(f"   - User ID: {profile['user_id']}")
                print(f"   - Interests: {interests}")
                found = True
        
        if not found:
            print("❌ No profiles found with '음악' or '악기'")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_interests()
