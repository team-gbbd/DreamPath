
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.vector.pinecone_service import PineconeVectorService
from services.agents.recommendation.recommendation_tools import get_embedding

def check_data():
    load_dotenv()
    
    print("🌲 Checking Pinecone Data...")
    try:
        pinecone = PineconeVectorService()
        stats = pinecone.index.describe_index_stats()
        print(f"📊 Index Stats: {stats}")
        
        total_vectors = stats.get('total_vector_count', 0)
        if total_vectors == 0:
            print("❌ Error: Index is empty! No search possible.")
            return False
            
        print(f"✅ Total Vectors: {total_vectors}")
        
        # Test Search
        query = "AI 개발자"
        print(f"\n🔍 Testing Search for query: '{query}'")
        embedding = get_embedding(query)
        results = pinecone.query(embedding=embedding, top_k=3)
        
        matches = results.get('matches', [])
        print(f"✅ Found {len(matches)} matches")
        
        if not matches:
            print("⚠️ Warning: Vectors exist but search returned nothing.")
            return False
            
        for m in matches:
            print(f"  - ID: {m['id']}, Score: {m['score']}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error checking Pinecone: {e}")
        return False

if __name__ == "__main__":
    if check_data():
        print("\n✅ Data Check PASSED")
    else:
        print("\n❌ Data Check FAILED")
