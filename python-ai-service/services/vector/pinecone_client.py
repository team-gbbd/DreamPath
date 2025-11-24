# services/vector/pinecone_client.py
import logging
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()
logger = logging.getLogger(__name__)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")

index = None

if PINECONE_API_KEY and PINECONE_INDEX:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)

        # 인덱스 없으면 생성
        if PINECONE_INDEX not in [i.name for i in pc.list_indexes()]:
            pc.create_index(
                name=PINECONE_INDEX,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        index = pc.Index(PINECONE_INDEX)

    except Exception as exc:
        logger.error(f"Pinecone 초기화 실패: {exc}")
        index = None
else:
    logger.warning("Pinecone 환경 변수가 없습니다. (PINECONE_API_KEY, PINECONE_INDEX)")
