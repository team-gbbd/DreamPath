
import asyncio
import os
import time
import json
import numpy as np
from typing import List, Dict
from dotenv import load_dotenv
import tiktoken

# Add project root to path
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Services
from services.rag.pinecone_vector_service import PineconeVectorService
# Assuming DatabaseService is used for Supabase save/get or SupabaseVectorRepository
# Check imports based on previous file views.
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from openai import OpenAI

load_dotenv()

# Metric Collectors
metrics = {
    "embedding": {},
    "storage": {},
    "accuracy": {},
    "cost": {}
}

# Synthetic Data (15-turn mixed)
SYNTHETIC_CONVERSATION = [
    "안녕, 나는 개발자가 되고 싶어.",
    "안녕하세요! 어떤 개발 분야에 관심이 있으신가요?",
    "백엔드 개발자가 되고 싶어. 자바를 공부하고 있어.",
    "좋은 목표네요. 자바 외에 다른 언어에도 관심이 있으신가요?",
    "아니 아직은 자바만.",
    "점심 뭐 먹지?",
    "점심 메뉴는 고민되죠 ㅎㅎ",
    "그리고 나중에 대기업에 가고 싶어. 안정적인게 좋아.",
    "안정성을 중요하게 생각하시는군요.",
    "백엔드 개발자가 되고 싶어.",
    "스트레스를 잘 받는 편이라 걱정이야.",
    "스트레스 관리가 중요하겠네요.",
    "꼼꼼하게 일하는건 자신있어.",
    "대학은 컴퓨터공학과를 나왔어.",
    "알겠습니다. 백엔드 개발자로서의 강점을 잘 살려봅시다."
]

RAW_TEXT = "\n".join(SYNTHETIC_CONVERSATION)

# Targets for Accuracy
TARGET_JOB_DESC = "백엔드 개발자 자바 대기업 안정성 꼼꼼함"
IRRELEVANT_JOB_DESC = "간호사 병원 의료 환자 케어"

async def measure_embedding_performance():
    print(">>> Measuring Embedding Performance...")
    client = OpenAI()
    
    # 1. Cold Start
    start = time.time()
    _ = client.embeddings.create(model="text-embedding-3-large", input="Cold Start")
    cold_latency = time.time() - start
    metrics["embedding"]["cold_start"] = cold_latency
    
    # 2. Warm Start (Average of 5)
    latencies = []
    for _ in range(5):
        start = time.time()
        _ = client.embeddings.create(model="text-embedding-3-large", input="Warm Start")
        latencies.append(time.time() - start)
    metrics["embedding"]["warm_avg"] = sum(latencies) / len(latencies)
    metrics["embedding"]["max_latency"] = max(latencies) # Of warm runs

    # 3. Token vs Latency
    # Short (1 msg), Medium (5 msgs), Long (15 msgs)
    short_text = SYNTHETIC_CONVERSATION[0]
    medium_text = "\n".join(SYNTHETIC_CONVERSATION[:5])
    long_text = RAW_TEXT
    
    inputs = {"short": short_text, "medium": medium_text, "long": long_text}
    token_latency = {}
    
    encoding = tiktoken.encoding_for_model("text-embedding-3-large")
    
    for k, text in inputs.items():
        tokens = len(encoding.encode(text))
        start = time.time()
        _ = client.embeddings.create(model="text-embedding-3-large", input=text)
        lat = time.time() - start
        token_latency[k] = {"tokens": tokens, "latency": lat}
        
    metrics["embedding"]["token_vs_latency"] = token_latency
    print("Done.")

async def measure_storage_performance():
    print(">>> Measuring Storage Performance...")
    pinecone_svc = PineconeVectorService()
    supabase_repo = SupabaseVectorRepository() 
    
    # Dummy Vector
    vector_id = f"bench_vector_{int(time.time())}"
    embedding = [0.1] * 3072 # 3072 dim
    metadata = {"type": "benchmark", "content": "test"}
    
    # 1. Pinecone Upsert
    start = time.time()
    pinecone_svc.upsert_vector(vector_id, embedding, metadata)
    metrics["storage"]["pinecone_upsert"] = time.time() - start
    
    # 2. Pinecone Query
    start = time.time()
    pinecone_svc.index.query(vector=embedding, top_k=1)
    metrics["storage"]["pinecone_query"] = time.time() - start
    
    # 3. Supabase Save/Get Performance
    # Since we don't want to pollute production tables with dummy data, 
    # we will measure 'Get' latency using a known public ID or just a random ID check (miss is also a latency check).
    # For 'Save', we will simulate the overhead or skip it if dangerous.
    
    # Measure GET (Read) Latency
    start = time.time()
    # Fetch a standard ID (e.g., ID 1, likely exists or quickly returns null)
    # Using existing method get_job_details_by_ids
    supabase_repo.get_job_details_by_ids([1]) 
    metrics["storage"]["supabase_get"] = time.time() - start
    
    # Measure Save Latency (Simulated / Skipped for safety)
    # If we really need to measure save, we should use a test table. 
    # Given we shouldn't create tables dynamically, we will assert 0 or estimate.
    # For now, we will mark it as N/A or 0.
    metrics["storage"]["supabase_save"] = 0.0 

        
    print("Done.")

async def measure_accuracy_baseline():
    print(">>> Measuring Accuracy Baseline...")
    client = OpenAI()
    
    # Embed Raw, Target, Irrelevant
    raw_emb = client.embeddings.create(model="text-embedding-3-large", input=RAW_TEXT).data[0].embedding
    target_emb = client.embeddings.create(model="text-embedding-3-large", input=TARGET_JOB_DESC).data[0].embedding
    irr_emb = client.embeddings.create(model="text-embedding-3-large", input=IRRELEVANT_JOB_DESC).data[0].embedding
    
    def cosine_similarity(v1, v2):
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        
    metrics["accuracy"]["sim_target"] = cosine_similarity(raw_emb, target_emb)
    metrics["accuracy"]["sim_irrelevant"] = cosine_similarity(raw_emb, irr_emb)
    
    # RAG Top-3 Quality (Pinecone Search)
    pinecone_svc = PineconeVectorService()
    res = pinecone_svc.index.query(vector=raw_emb, top_k=3, include_metadata=True)
    
    top3_scores = [m.score for m in res.matches] if res.matches else [0]
    metrics["accuracy"]["top3_avg_score"] = sum(top3_scores) / len(top3_scores) if top3_scores else 0
    print("Done.")

async def measure_cost_baseline():
    print(">>> Measuring Cost Baseline...")
    encoding = tiktoken.encoding_for_model("text-embedding-3-large")
    tokens = len(encoding.encode(RAW_TEXT))
    
    # Price: $0.00013 / 1k tokens (text-embedding-3-large)
    price_per_1k = 0.00013
    cost_per_session = (tokens / 1000) * price_per_1k
    cost_1000_users = cost_per_session * 1000
    
    metrics["cost"]["tokens_avg"] = tokens
    metrics["cost"]["cost_per_session"] = cost_per_session
    metrics["cost"]["cost_1000_users"] = cost_1000_users
    print("Done.")

async def main():
    await measure_embedding_performance()
    await measure_storage_performance()
    await measure_accuracy_baseline()
    await measure_cost_baseline()
    
    # Output Report
    print("\n" + "="*50)
    print("BEFORE BASELINE REPORT")
    print("="*50)
    print(json.dumps(metrics, indent=2))
    
    # Generate CSV
    with open("embedding_baseline_report.csv", "w") as f:
        f.write("Category,Metric,Value,Unit\n")
        # Embedding
        f.write(f"Embedding,Cold Start Latency,{metrics['embedding']['cold_start']:.4f},s\n")
        f.write(f"Embedding,Warm Start Avg,{metrics['embedding']['warm_avg']:.4f},s\n")
        f.write(f"Embedding,Max Latency,{metrics['embedding']['max_latency']:.4f},s\n")
        for k, v in metrics["embedding"]["token_vs_latency"].items():
            f.write(f"Embedding,Latency ({k} - {v['tokens']} toks),{v['latency']:.4f},s\n")
            
        # Storage
        f.write(f"Storage,Pinecone Upsert,{metrics['storage'].get('pinecone_upsert',0):.4f},s\n")
        f.write(f"Storage,Pinecone Query,{metrics['storage'].get('pinecone_query',0):.4f},s\n")
        
        # Accuracy
        f.write(f"Accuracy,Sim Target,{metrics['accuracy']['sim_target']:.4f},score\n")
        f.write(f"Accuracy,Sim Irrelevant,{metrics['accuracy']['sim_irrelevant']:.4f},score\n")
        f.write(f"Accuracy,Top-3 Avg Score,{metrics['accuracy']['top3_avg_score']:.4f},score\n")
        
        # Cost
        f.write(f"Cost,Avg Tokens,{metrics['cost']['tokens_avg']},tokens\n")
        f.write(f"Cost,Cost Per Session,{metrics['cost']['cost_per_session']:.6f},USD\n")
        f.write(f"Cost,Cost 1000 Users,{metrics['cost']['cost_1000_users']:.4f},USD\n")

if __name__ == "__main__":
    asyncio.run(main())
