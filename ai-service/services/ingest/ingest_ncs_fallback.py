#!/usr/bin/env python3
"""
services/ingest/ingest_ncs_fallback.py

LLM 기반 NCS 자동 생성 및 벡터 DB 저장 모듈
"""
import os
import json
import sys
from typing import List
# Add project root to sys.path so that 'services' package can be imported when running this script directly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from openai import OpenAI

from config import settings
from services.ingest.careernet_client import CareerNetClient
from services.rag.document_builder import DocumentBuilder
from services.embedding.embedding_service import EmbeddingService
from services.vector.supabase_vector_repository import SupabaseVectorRepository
from services.rag.pinecone_vector_service import PineconeVectorService

# OpenAI client (API key must be set in env)
_openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class NCSFallbackIngest:
    """Generate NCS-like data from CareerNet data using LLM and store it."""

    def __init__(self):
        self.repo = SupabaseVectorRepository()
        self.pinecone = PineconeVectorService()

    def _fetch_job_and_cases(self, job_code: str):
        """Retrieve CareerNet JOB and related CASE entries.
        Returns:
            job (dict), cases (list of dict)
        """
        # 1️⃣ fetch job
        job_resp = CareerNetClient.call('JOB', start=1, display=200)
        jobs = job_resp.get('dataSearch', {}).get('content', [])
        job = next((j for j in jobs if str(j.get('job_code')) == str(job_code)), None)
        if not job:
            raise ValueError(f"Job with code {job_code} not found in CareerNet JOB API")

        # 2️⃣ fetch cases (COUNSEL) and filter by job_code if possible
        case_resp = CareerNetClient.call('COUNSEL', start=1, display=200)
        cases = case_resp.get('dataSearch', {}).get('content', [])
        # Some cases contain a 'job_code' field; filter if present
        related_cases = [c for c in cases if str(c.get('job_code')) == str(job_code)]
        return job, related_cases

    def _build_prompt(self, job: dict, cases: List[dict]) -> str:
        """Create LLM prompt that asks for NCS JSON structure."""
        job_desc = job.get('summary') or job.get('job_desc') or ''
        prompt_doc = DocumentBuilder.build_ncs_fallback_document(job, cases, job_desc)
        # Prompt template – ask LLM to output JSON with required fields
        prompt = (
            "You are an expert in Korean occupational standards. "
            "Based on the following job information, generate an NCS‑style description in JSON with the keys: "
            "'job_description', 'required_skills', 'technical_requirements', 'work_environment', 'certifications'.\n"
            "Provide concise Korean sentences.\n"
            "Job information:\n"
            f"{prompt_doc}\n"
            "Output only the JSON object."
        )
        return prompt

    def _call_llm(self, prompt: str) -> dict:
        """Call OpenAI chat completion and parse JSON response."""
        response = _openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
        )
        content = response.choices[0].message.content.strip()
        
        # Strip markdown code block formatting if present
        if content.startswith("```"):
            # Remove opening ```json or ``` and closing ```
            lines = content.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = '\n'.join(lines).strip()
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM did not return valid JSON: {e}\nRaw: {content}")

    def _store_vector(self, job_code: str, ncs_json: dict, document_text: str):
        """Create embedding, upsert to Pinecone, and save record in Supabase."""
        embedding_service = EmbeddingService()
        embedding = embedding_service.create_embedding(document_text)
        vector_id = f"ncs_{job_code}_{os.urandom(4).hex()}"
        # Upsert to Pinecone
        self.pinecone.upsert_vector(vector_id, embedding, metadata={"job_code": job_code})
        # Save to Supabase job_vector (reuse same table for simplicity)
        record = {
            "original_id": job_code,
            "document_text": document_text,
            "vector_id": vector_id,
            "metadata": json.dumps(ncs_json),
        }
        self.repo.save_vector('job_vector', record)

    def ingest_job(self, job_code: str):
        """Full pipeline for a single job_code."""
        job, cases = self._fetch_job_and_cases(job_code)
        prompt = self._build_prompt(job, cases)
        ncs_data = self._call_llm(prompt)
        # Build a single document string for embedding (concatenate fields)
        doc_parts = [
            f"Job Description: {ncs_data.get('job_description', '')}",
            f"Required Skills: {ncs_data.get('required_skills', '')}",
            f"Technical Requirements: {ncs_data.get('technical_requirements', '')}",
            f"Work Environment: {ncs_data.get('work_environment', '')}",
            f"Certifications: {ncs_data.get('certifications', '')}",
        ]
        document_text = "\n".join(doc_parts)
        self._store_vector(job_code, ncs_data, document_text)
        print(f"✅ NCS fallback ingested for job_code {job_code}")

if __name__ == "__main__":
    # Simple CLI for testing – provide job_code as env or arg
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ingest_ncs_fallback.py <job_code>")
        sys.exit(1)
    code = sys.argv[1]
    NCSFallbackIngest().ingest_job(code)
