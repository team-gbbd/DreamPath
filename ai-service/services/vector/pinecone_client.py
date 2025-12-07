# services/vector/pinecone_client.py
import logging
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()
logger = logging.getLogger(__name__)

# ============================
# 환경 변수 통합 (HEAD + dev)
# ============================
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME") or os.getenv("PINECONE_INDEX")

# 인덱스 객체
index = None

if PINECONE_API_KEY and PINECONE_INDEX_NAME:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)

        # 존재하는 인덱스 목록
        existing_indexes = [i.name for i in pc.list_indexes()]

        # 인덱스 없으면 생성
        if PINECONE_INDEX_NAME not in existing_indexes:
            logger.info(f"[Pinecone] 인덱스 '{PINECONE_INDEX_NAME}'가 없어 새로 생성합니다.")

            # pc.create_index(
            #     name=PINECONE_INDEX_NAME,
            #     dimension=1536,
            #     metric="cosine",
            #     spec=ServerlessSpec(
            #         cloud="aws",
            #         region="us-east-1"  # dev 기준 유지
            #     )
            # )
            pass

        # 인덱스 연결
        index = pc.Index(PINECONE_INDEX_NAME)
        logger.info(f"[Pinecone] 인덱스 '{PINECONE_INDEX_NAME}' 연결 완료")

    except Exception as exc:
        logger.error(f"[Pinecone 초기화 실패] {exc}")
        index = None

else:
    logger.warning(f"Pinecone 환경 변수 누락됨: API_KEY={PINECONE_API_KEY}, INDEX={PINECONE_INDEX_NAME}")
