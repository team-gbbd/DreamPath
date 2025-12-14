import os
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone

# Load env from ai-service directory
load_dotenv("ai-service/.env")

def check_metadata():
    # Helper to check keys
    try:
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        index = pc.Index("dreampath")

        # 1. Check Major
        query_text = "컴퓨터"
        print(f"\n--- Querying for '{query_text}' (Type: major) ---")
        
        # Use Large model (3072 dim)
        resp = client.embeddings.create(input=query_text, model="text-embedding-3-large")
        vec = resp.data[0].embedding
        
        results = index.query(vector=vec, top_k=3, include_metadata=True, filter={"type": "major"})
        
        for m in results['matches']:
            print(f"ID: {m['id']}")
            print(f"Keys: {list(m['metadata'].keys())}")
            print(f"FULL META: {m['metadata']}")
            
        # 2. Check Job (for ID format)
        print(f"\n--- Querying for '소방관' (Type: job) ---")
        resp = client.embeddings.create(input="소방관", model="text-embedding-3-large")
        vec = resp.data[0].embedding
        
        results = index.query(vector=vec, top_k=3, include_metadata=True, filter={"type": "job"})
        for m in results['matches']:
            print(f"ID: {m['id']}")
            print(f"FULL META: {m['metadata']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_metadata()
