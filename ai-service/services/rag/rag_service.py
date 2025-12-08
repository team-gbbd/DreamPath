import os
from openai import OpenAI
from pinecone import Pinecone
from dotenv import load_dotenv
from config import settings

load_dotenv()


class RAGService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        pine_key = os.getenv("PINECONE_API_KEY")
        index_name = os.getenv("PINECONE_INDEX", "dreampath")

        if not api_key:
            raise RuntimeError("OPENAI_API_KEY 필요")
        if not pine_key:
            raise RuntimeError("PINECONE_API_KEY 필요")

        self.client = OpenAI(api_key=api_key)
        self.pc = Pinecone(api_key=pine_key)
        self.index = self.pc.Index(index_name)
        self.model = settings.OPENAI_MODEL

    # -----------------------------
    # ① 사용자 벡터 기반 Top-K 검색
    # -----------------------------
    async def search_by_user_vector(self, vector_id: str, top_k: int):
        res = self.index.query(
            id=vector_id,
            top_k=top_k,
            include_metadata=True
        )

        matches = res.get("matches", res.get("results", []))

        clean = []
        for m in matches:
            clean.append({
                "id": m.get("id"),
                "score": m.get("score"),
                "metadata": {
                    k: v for k, v in (m.get("metadata") or {}).items()
                    if isinstance(v, (str, int, float, bool))
                }
            })
        return clean

    # -----------------------------
    # ② RAG 기반 성향 분석
    # -----------------------------
    async def analyze_profile_rag(self, vector_id: str, top_k: int):
        res = self.index.query(
            id=vector_id,
            top_k=top_k,
            include_metadata=True
        )

        matches = res.get("matches", res.get("results", []))

        titles = []
        for m in matches:
            meta = m.get("metadata") or {}
            titles.append(
                meta.get("title")
                or meta.get("keyword")
                or meta.get("jobName")
                or m.get("id")
            )

        merged = "\n".join(f"- {t}" for t in titles)

        prompt = f"""
당신은 성향 분석 전문가입니다.
아래는 사용자 벡터와 유사한 항목들입니다:

{merged}

이 정보를 기반으로 사용자의 성향을 심층 분석해 주세요.
근거 기반, 객관적 분석, 구조적 서술이 필요합니다.
"""

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "당신은 성향 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
        )

        clean_matches = []
        for m in matches:
            clean_matches.append({
                "id": m.get("id"),
                "score": m.get("score"),
                "metadata": {
                    k: v for k, v in (m.get("metadata") or {}).items()
                    if isinstance(v, (str, int, float, bool))
                }
            })

        return {
            "analysis": completion.choices[0].message.content,
            "matches": clean_matches
        }
