
import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_data():
    load_dotenv()
    
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX", "dreampath")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ PINECONE_API_KEY Missing")
        return False
        
    print("🌲 Checking Pinecone Data...")
    try:
        pc = Pinecone(api_key=api_key)
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        print(f"📊 Index Stats: {stats}")
        
        total_vectors = stats.get('total_vector_count', 0)
        if total_vectors == 0:
            print("❌ Error: Index is empty! No search possible.")
            return False
            
        print(f"✅ Total Vectors: {total_vectors}")
        
        # Test Search with OpenAI Embedding
        client = OpenAI(api_key=openai_key)
        query = "AI 개발자"
        print(f"\n🔍 Testing Search for query: '{query}'")
        
        # Simple embedding call
        resp = client.embeddings.create(input=[query], model="text-embedding-3-large")
        embedding = resp.data[0].embedding
        
        results = index.query(vector=embedding, top_k=3, include_metadata=True)
        
        matches = results.get('matches', [])
        print(f"✅ Found {len(matches)} matches")
        
        if not matches:
            print("⚠️ Warning: Vectors exist but search returned nothing.")
            return False
            
        for m in matches:
            print(f"  - ID: {m['id']}, Score: {m['score']}")
            print(f"    Title: {m.get('metadata', {}).get('title', 'N/A')}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error checking Pinecone: {e}")
        return False

if __name__ == "__main__":
    if check_data():
        print("\n✅ Data Check PASSED")
    else:
        print("\n❌ Data Check FAILED")
