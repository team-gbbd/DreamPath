import os
from dotenv import load_dotenv
from services.rag.pinecone_vector_service import PineconeVectorService

load_dotenv()

def cleanup_counsel_vectors():
    print("Starting counsel vector cleanup...")
    svc = PineconeVectorService()
    
    try:
        print("Deleting existing 'counsel' and 'case' vectors...")
        # Delete both types to be safe (previous code used 'case', new uses 'counsel')
        svc.index.delete(filter={"type": "case"})
        svc.index.delete(filter={"type": "counsel"})
        print("Deleted counsel vectors.")
    except Exception as e:
        print(f"Error deleting counsel vectors: {e}")

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_counsel_vectors()
