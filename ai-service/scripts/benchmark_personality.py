
import asyncio
import os
import time
import json
import numpy as np
from typing import List, Dict
from dotenv import load_dotenv

# Add project root to path
import sys
# Assuming script is in ai-service/scripts/benchmark_personality.py
# We need to add ai-service/ to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.agents.tools.summarizer_tool import SummarizerTool
from services.rag.pinecone_vector_service import PineconeVectorService

load_dotenv()

# synthetic_data.py content
RAW_CONVERSATION = [
    {"role": "user", "content": "안녕, 나는 개발자가 되고 싶어."},
    {"role": "assistant", "content": "안녕하세요! 어떤 개발 분야에 관심이 있으신가요?"},
    {"role": "user", "content": "백엔드 개발자가 되고 싶어. 자바를 공부하고 있어."},
    {"role": "assistant", "content": "좋은 목표네요. 자바 외에 다른 언어에도 관심이 있으신가요?"},
    {"role": "user", "content": "아니 아직은 자바만."},
    {"role": "user", "content": "점심 뭐 먹지?"},  # Noise
    {"role": "assistant", "content": "점심 메뉴는 고민되죠 ㅎㅎ"}, # Noise
    {"role": "user", "content": "그리고 나중에 대기업에 가고 싶어. 안정적인게 좋아."},
    {"role": "assistant", "content": "안정성을 중요하게 생각하시는군요."},
    {"role": "user", "content": "백엔드 개발자가 되고 싶어."}, # Duplicate
    {"role": "user", "content": "스트레스를 잘 받는 편이라 걱정이야."}, # Risk
    {"role": "assistant", "content": "스트레스 관리가 중요하겠네요."},
    {"role": "user", "content": "꼼꼼하게 일하는건 자신있어."}, # Strength
]

TARGET_JOB_DESC = "백엔드 개발자 자바 대기업 안정성 꼼꼼함"
IRRELEVANT_JOB_DESC = "간호사 병원 의료 환자 케어"

async def benchmark():
    print("# Personality Agent Performance Benchmark\n")
    
    summarizer = SummarizerTool()
    vector_service = PineconeVectorService()
    
    # ---------------------------------------------------------
    # [1] Data Quality Analysis
    # ---------------------------------------------------------
    print("## [1] Data Quality Analysis")
    
    # Measure Summarization
    start_time = time.time()
    summary_result = await summarizer.run(conversation_history=RAW_CONVERSATION)
    summary_latency = time.time() - start_time
    
    raw_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in RAW_CONVERSATION])
    summary_text = summary_result.get("summary", "")
    
    raw_len = len(raw_text)
    summary_len = len(summary_text)
    compression_rate = (1 - (summary_len / raw_len)) * 100
    
    print(f"- Raw Length: {raw_len} chars")
    print(f"- Summary Length: {summary_len} chars")
    print(f"- Compression Rate: {compression_rate:.2f}%")
    print(f"- Missing Fields Check:")
    for field in ["strengths", "risks", "goals", "values"]:
        val = summary_result.get(field)
        status = "✅" if val else "❌"
        print(f"  - {field}: {status} ({len(val) if val else 0} items)")
    
    # Check for noise removal (manual check of keywords)
    has_lunch = "점심" in summary_text
    print(f"- Noise Removal (lunch): {'✅ Removed' if not has_lunch else '❌ Failed'}")
    
    # ---------------------------------------------------------
    # [2] Embedding Performance
    # ---------------------------------------------------------
    print("\n## [4] Embedding Server Performance (Labeled as [4] in request)")
    
    # Measure Raw Embedding
    start = time.time()
    raw_vector = vector_service.embed_document(raw_text)
    raw_embed_time = time.time() - start
    
    # Measure Summary Embedding
    start = time.time()
    summary_vector = vector_service.embed_document(summary_text)
    summary_embed_time = time.time() - start
    
    # Measure Target/Irrelevant Embedding (for similarity check)
    target_vector = vector_service.embed_document(TARGET_JOB_DESC)
    irrelevant_vector = vector_service.embed_document(IRRELEVANT_JOB_DESC)

    print(f"- Embedding Latency (Raw): {raw_embed_time:.5f}s")
    print(f"- Embedding Latency (Summary): {summary_embed_time:.5f}s")
    # Token count approximation (1 token ~= 4 chars)
    print(f"- Est. Tokens (Raw): {raw_len / 4:.0f}")
    print(f"- Est. Tokens (Summary): {summary_len / 4:.0f}")

    # ---------------------------------------------------------
    # [2] Vector DB Impact
    # ---------------------------------------------------------
    print("\n## [2] Vector DB Impact")
    print(f"- Vector Dimension: {len(summary_vector)}")
    
    # Measure Pinecone Query Latency
    start = time.time()
    query_res = vector_service.index.query(
        vector=summary_vector,
        top_k=5,
        include_metadata=True
    )
    query_latency = time.time() - start
    print(f"- Pinecone Search Latency: {query_latency:.5f}s")
    
    # ---------------------------------------------------------
    # [3] Recommendation Accuracy (Similarity Analysis)
    # ---------------------------------------------------------
    print("\n## [3] Recommendation Accuracy")
    
    def cosine_similarity(v1, v2):
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    
    # Similarity: Self (Target Job)
    sim_raw_target = cosine_similarity(raw_vector, target_vector)
    sim_sum_target = cosine_similarity(summary_vector, target_vector)
    
    # Similarity: Noise (Irrelevant Job)
    sim_raw_noise = cosine_similarity(raw_vector, irrelevant_vector)
    sim_sum_noise = cosine_similarity(summary_vector, irrelevant_vector)
    
    print(f"- Similarity (Target Job): {sim_raw_target:.4f} (Raw) -> {sim_sum_target:.4f} (Summary)")
    print(f"- Similarity (Irrelevant Job): {sim_raw_noise:.4f} (Raw) -> {sim_sum_noise:.4f} (Summary)")
    
    # Top-K accuracy (Simulation)
    # This matches the user's intent.
    target_improvement = (sim_sum_target - sim_raw_target) / sim_raw_target * 100
    noise_reduction = (sim_raw_noise - sim_sum_noise) / sim_raw_noise * 100
    
    print(f"- Target Similarity Improvement: {target_improvement:.2f}%")
    print(f"- Noise Similarity Reduction (Lower is better for noise sim): {noise_reduction:.2f}%")
    
    if query_res and query_res.matches:
        print(f"- Top 3 Search Results (Confirm Relevance):")
        for i, match in enumerate(query_res.matches[:3]):
            print(f"  {i+1}. Score: {match.score:.4f}, ID: {match.id}")

if __name__ == "__main__":
    asyncio.run(benchmark())
