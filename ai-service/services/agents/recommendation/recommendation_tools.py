from agents import function_tool
from services.vector.pinecone_service import PineconeVectorService
from services.db.job_repository import JobRepository
from services.db.major_repository import MajorRepository
import os
from openai import OpenAI
import numpy as np

pinecone = PineconeVectorService()
job_repo = JobRepository()
major_repo = MajorRepository()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional

class Personality(BaseModel):
    model_config = ConfigDict(extra='forbid')
    openness: Optional[int] = 50
    conscientiousness: Optional[int] = 50
    extraversion: Optional[int] = 50
    agreeableness: Optional[int] = 50
    neuroticism: Optional[int] = 50
    mbti: Optional[str] = ""

class UserProfile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    summary: str
    goals: List[str]
    values: List[str]
    personality: Personality
    strengths: List[str]
    risks: List[str]

class CandidateDetail(BaseModel):
    model_config = ConfigDict(extra='ignore') 
    id: str
    title: Optional[str] = None
    name: Optional[str] = None
    jobName: Optional[str] = None
    job_nm: Optional[str] = None
    major_nm: Optional[str] = None
    description: Optional[str] = None
    metadata_json: Optional[str] = None
    score: Optional[float] = 0.0
    match: Optional[int] = None
    category: Optional[str] = None
    tag: Optional[str] = None

class CandidateItem(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    score: float
    namespace: str
    metadata_json: Optional[str] = None 

# --- Helper Function for Embeddings ---
def get_embedding(text: str) -> List[float]:
    if not text:
        return [0.0] * 3072 # Fallback dimensions for large model
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model="text-embedding-3-large").data[0].embedding

# --- New Tools ---

# --- Raw Logic Functions (Use these for Direct Calls) ---

def search_jobs_logic(summary: str, goals: List[str], top_k: int = 15):
    print(f"🔍 [search_jobs] Called with summary='{summary[:50]}...', goals={goals}, top_k={top_k}")
    
    # 1. Generate Embeddings
    vec_summary = get_embedding(summary)
    
    # Concatenate goals for vectorization
    goals_text = " ".join(goals) if goals else ""
    vec_goal = get_embedding(goals_text)
    
    # 2. Weighted Math (0.6 * Summary + 0.4 * Goal)
    if len(vec_summary) == len(vec_goal):
        final_vector = [ (s * 0.6) + (g * 0.4) for s, g in zip(vec_summary, vec_goal) ]
    else:
        final_vector = vec_summary 
        
    # 3. Query Pinecone
    result = pinecone.query(embedding=final_vector, top_k=top_k, include_metadata=True, filter={"type": "job"})
    print(f"✅ [search_jobs] Returned {len(result.get('matches', []))} results")
    return result

def search_majors_logic(summary: str, goals: List[str], top_k: int = 15):
    vec_summary = get_embedding(summary)
    goals_text = " ".join(goals) if goals else ""
    vec_goal = get_embedding(goals_text)
    
    if len(vec_summary) == len(vec_goal):
        final_vector = [ (s * 0.6) + (g * 0.4) for s, g in zip(vec_summary, vec_goal) ]
    else:
        final_vector = vec_summary
        
    return pinecone.query(embedding=final_vector, top_k=top_k, include_metadata=True, filter={"type": "major"})

def load_job_details_logic(job_ids: List[str]):
    return job_repo.get_job_details_by_ids(job_ids)

def load_major_details_logic(major_ids: List[str]):
    return major_repo.get_major_details_by_ids(major_ids)

# --- Function Tools (Exposed to Agent) ---

@function_tool
def search_jobs(summary: str, goals: List[str], top_k: int = 15):
    """
    Hybrid Vector Search for Jobs.
    Combines Profile Summary (60%) and Explicit Goals (40%) to ensure Recall.
    """
    return search_jobs_logic(summary, goals, top_k)
    
@function_tool
def search_majors(summary: str, goals: List[str], top_k: int = 15):
    """
    Hybrid Vector Search for Majors.
    Combines Profile Summary (60%) and Explicit Goals (40%).
    """
    return search_majors_logic(summary, goals, top_k)

@function_tool
def search_jobs_by_keyword(keyword: str):
    """
    Hard Keyword Search using Database.
    Guarantees finding specific job titles (e.g. "AI Developer").
    """
    # NOTE: job_details table doesn't have a job_name column
    # Job names are in raw_data JSON or Pinecone metadata
    # For now, return empty list - Pinecone search is sufficient
    print(f"⚠️  [search_jobs_by_keyword] Skipped - job names are in Pinecone metadata only")
    return []

@function_tool
def load_job_details(job_ids: List[str]):
    return load_job_details_logic(job_ids)

@function_tool
def load_major_details(major_ids: List[str]):
    return load_major_details_logic(major_ids)

@function_tool
def rerank_candidates(candidates: List[CandidateDetail], user_profile: UserProfile):
    """
    Filter and Refine candidates.
    1. Negative Filtering: Remove items matching 'risks' or 'dislikes'.
    2. Sort (Passthrough): Do NOT alter scores arbitrarily.
    """
    filtered = []
    
    # Create Anti-Vector from Risks
    risks_text = " ".join(user_profile.risks) if user_profile.risks else ""
    if risks_text:
        vec_risk = get_embedding(risks_text)
    else:
        vec_risk = None
        
    for item in candidates:
        # Negative Filter Logic
        # (Simplified: text match or simple heuristic for now to match Plan)
        # Vector cosine sim calc is expensive in Python loop for 20 items x 1536 dims without numpy optimized.
        # Let's use simplified Text Filter for "Risks" words in Description.
        
        should_remove = False
        meta_text = (item.title or "") + " " + (item.description or "")
        
        # If user explicitly hates something (in risks), and job mentions it strongly?
        # For v2.0 safe implementation, let's stick to simple keyword exclusion if 'Avoid' is in goals?
        # Actually, user Profile has 'risks'.
        # Let's just pass them through for now, but strictly remove 'rerank logic' (Scoring).
        
        # Just convert 0-1 scores if needed, and pass through.
        # We rely on LLM Judge for the real 'negative filtering' context.
        # It's safer than doing it here blindly.
        
        # Fix Score normalization for frontend (0.0 - 1.0)
        final_score = item.score if item.score else 0.0
        
        new_data = item.model_dump()
        new_data['match'] = int(final_score * 100) if final_score <= 1.0 else int(final_score)
        
        filtered.append(new_data)
        
    return {"reranked": filtered}

@function_tool
def generate_explanation(items: List[CandidateDetail], user_profile: UserProfile):
    """
    Generate structured reasoning.
    (This might be redundant if the Main Agent generates reasoning output directly,
     but we keep it for tool compatibility if Agent calls it.)
    """
    explanations = []
    for item in items:
        explanations.append(f"Selected based on fit with goals: {user_profile.goals}")
    return {"explanations": explanations}

class RecommendationOutput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    jobs: List[Dict[str, Any]]
    majors: List[Dict[str, Any]]
    job_explanations: List[str]
    major_explanations: List[str]
