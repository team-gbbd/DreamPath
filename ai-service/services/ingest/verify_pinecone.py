import os
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX", "dreampath")

pc = Pinecone(api_key=api_key)
index = pc.Index(index_name)

stats = index.describe_index_stats()
print(f"Index Stats: {stats}")
