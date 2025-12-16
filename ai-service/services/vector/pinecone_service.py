import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()


class PineconeVectorService:
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX", "dreampath")

        if not api_key:
            raise ValueError("PINECONE_API_KEY가 없습니다")

        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)

    def upsert_vector(self, vector_id: str, embedding: list, metadata: dict):
        self.index.upsert(
            vectors=[{
                "id": vector_id,
                "values": embedding,
                "metadata": metadata
            }]
        )

    def query(self, embedding: list, top_k: int = 10, namespace: str = None, include_metadata: bool = True, filter: dict = None):
        query_params = {
            "vector": embedding,
            "top_k": top_k,
            "include_metadata": include_metadata
        }
        if filter:
            query_params["filter"] = filter
        if namespace:
            query_params["namespace"] = namespace
        return self.index.query(**query_params)
