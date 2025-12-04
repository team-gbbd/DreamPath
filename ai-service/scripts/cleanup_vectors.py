import os
from dotenv import load_dotenv
from services.rag.pinecone_vector_service import PineconeVectorService

load_dotenv()

def cleanup_vectors():
    print("Starting vector cleanup...")
    svc = PineconeVectorService()
    
    # Delete by metadata filter
    try:
        print("Deleting existing 'job' vectors...")
        svc.index.delete(filter={"type": "job"})
        print("Deleted 'job' vectors.")
    except Exception as e:
        print(f"Error deleting job vectors: {e}")

    try:
        print("Deleting existing 'department' vectors...")
        svc.index.delete(filter={"type": "department"})
        print("Deleted 'department' vectors.")
    except Exception as e:
        print(f"Error deleting department vectors: {e}")

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_vectors()
