import os
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec


class PineconeVectorService:
    """
    1) document → embedding(text-embedding-3-large)
    2) pinecone upsert
    3) vector_id 반환
    """

    def __init__(self):
        # OpenAI
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Pinecone
        api_key = os.getenv("PINECONE_API_KEY")
        environment = os.getenv("PINECONE_ENV", "us-east-1")
        index_name = os.getenv("PINECONE_INDEX", "dreampath-index")

        self.pc = Pinecone(api_key=api_key)

        # 인덱스 없으면 자동 생성
        if index_name not in [idx["name"] for idx in self.pc.list_indexes()]:
            self.pc.create_index(
                name=index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=environment
                )
            )

        self.index = self.pc.Index(index_name)

    def embed_document(self, document: str):
        """
        OpenAI 임베딩 생성
        """
        response = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=document
        )
        return response.data[0].embedding

    def upsert_vector(self, vector_id: str, embedding: list, metadata: dict = None):
        """
        Pinecone 업서트
        """
        self.index.upsert(
            vectors=[
                {
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata or {}
                }
            ]
        )

    def process(self, vector_id: str, document: str, metadata: dict = None):
        """
        document → embedding → pinecone upsert → vector_id 반환
        """
        embedding = self.embed_document(document)
        self.upsert_vector(vector_id, embedding, metadata)
        return vector_id
