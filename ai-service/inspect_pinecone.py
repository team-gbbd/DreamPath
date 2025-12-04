import os
import sys
from dotenv import load_dotenv

# Add current directory to path to import services
sys.path.append(os.getcwd())

load_dotenv()

from services.rag.pinecone_vector_service import PineconeVectorService
from services.vector.supabase_vector_repository import SupabaseVectorRepository

def inspect():
    print("="*50)
    print("🔍 INSPECTING RECOMMENDATION SYSTEM STATE")
    print("="*50)

    # 1. Initialize Services
    try:
        vector_service = PineconeVectorService()
        repo = SupabaseVectorRepository()
        print("✅ Services initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize services: {e}")
        return

    # 2. Check User Vector (Assuming user-1 for now, or we can ask user for ID)
    # Let's check a few user IDs to be safe
    user_ids = [1] 
    
    for uid in user_ids:
        vector_id = f"user-{uid}"
        print(f"\n👤 Checking User Vector: {vector_id}")
        
        # Fetch from Pinecone
        try:
            fetch_res = vector_service.index.fetch(ids=[vector_id])
            if vector_id in fetch_res.vectors:
                vec = fetch_res.vectors[vector_id]
                print(f"   ✅ Found in Pinecone")
                print(f"   - ID: {vec.id}")
                print(f"   - Dimension: {len(vec.values)}")
                print(f"   - Metadata: {vec.metadata}")
            else:
                print(f"   ❌ Not found in Pinecone")
        except Exception as e:
            print(f"   ❌ Error fetching from Pinecone: {e}")

        # Fetch from DB (Profile Vector)
        try:
            # We need to query profile_vector table. 
            # SupabaseVectorRepository has get_vector_by_id but we want original_text
            # Let's verify what's in the DB for this vector_id
            # We can use the repo's supabase client directly
            res = repo.supabase.table('profile_vector').select('original_text, updated_at').eq('vector_db_id', vector_id).execute()
            if res.data:
                print(f"   ✅ Found in DB (profile_vector)")
                print(f"   - Updated At: {res.data[0].get('updated_at')}")
                print(f"   - Original Text Preview: {res.data[0].get('original_text')[:100]}...")
                print(f"   - Full Text:\n{res.data[0].get('original_text')}")
            else:
                print(f"   ❌ Not found in DB (profile_vector)")
        except Exception as e:
            print(f"   ❌ Error fetching from DB: {e}")

    # 3. Check Job Vectors
    print(f"\n💼 Checking Job Vectors (Sample)")
    try:
        # Query for jobs to see what we get
        # We'll use a dummy vector (all zeros) just to fetch some jobs if possible, 
        # or better, just fetch specific IDs if we know them.
        # Let's try to fetch the ones we saw in the screenshot: job_10043, job_10034
        job_ids = ['job_10043', 'job_10034', 'job_994']
        fetch_res = vector_service.index.fetch(ids=job_ids)
        
        for jid in job_ids:
            if jid in fetch_res.vectors:
                vec = fetch_res.vectors[jid]
                print(f"   ✅ Found {jid}")
                print(f"   - Metadata: {vec.metadata}")
            else:
                print(f"   ❌ Not found {jid}")
                
        # Also check for the duplicate UUID one seen in screenshot
        # job_10043_4704064c-2055-4beb-a809-1810915880ef
        dup_id = 'job_10043_4704064c-2055-4beb-a809-1810915880ef'
        fetch_res_dup = vector_service.index.fetch(ids=[dup_id])
        if dup_id in fetch_res_dup.vectors:
             print(f"   ⚠️ Found Duplicate ID {dup_id} in Pinecone!")
        else:
             print(f"   ✅ Duplicate ID {dup_id} NOT found (maybe cleaned up?)")

    except Exception as e:
        print(f"   ❌ Error checking jobs: {e}")

    # 4. Check Major Vectors
    print(f"\n🎓 Checking Major Vectors (Sample)")
    try:
        # Fetch a sample major
        # We don't know exact IDs, let's try to query with filter
        # We need a vector to query... let's use the user vector if we found it
        if user_ids and f"user-{user_ids[0]}" in fetch_res.vectors:
            user_vec = fetch_res.vectors[f"user-{user_ids[0]}"].values
            
            print("   Querying for majors (type='department')...")
            query_res = vector_service.index.query(
                vector=user_vec,
                top_k=3,
                include_metadata=True,
                filter={'type': 'department'}
            )
            
            for match in query_res.matches:
                print(f"   - Match: {match.id}, Score: {match.score}")
                print(f"     Metadata: {match.metadata}")
        else:
            print("   Skipping query (no user vector)")

    except Exception as e:
        print(f"   ❌ Error checking majors: {e}")

if __name__ == "__main__":
    inspect()
