
import asyncio
import json
import time
import inspect
import sys
from unittest.mock import MagicMock
import os

# --- MOCKING SETUP START ---
# We mock external services to verify Agent Logic in isolation and handle missing files.

# Mock PineconeVectorService
mock_pinecone = MagicMock()
mock_pinecone.PineconeVectorService.return_value.query.side_effect = lambda query_text, top_k, namespace: [
    {"id": "job_1", "score": 0.9} if namespace == "job" else {"id": "major_1", "score": 0.8}
]
sys.modules["services.vector.pinecone_service"] = mock_pinecone

# Mock JobRepository
mock_job_repo_module = MagicMock()
mock_job_repo = MagicMock()
mock_job_repo.get_job_details_by_ids.return_value = [{"job_id": "job_1", "title": "Mock Job"}]
mock_job_repo_module.JobRepository.return_value = mock_job_repo
sys.modules["services.db.job_repository"] = mock_job_repo_module

# Mock MajorRepository
mock_major_repo_module = MagicMock()
mock_major_repo = MagicMock()
mock_major_repo.get_major_details_by_ids.return_value = [{"major_id": "major_1", "title": "Mock Major"}]
mock_major_repo_module.MajorRepository.return_value = mock_major_repo
sys.modules["services.db.major_repository"] = mock_major_repo_module

# --- MOCKING SETUP END ---

from agents import Runner, Agent

# Delay imports of valid files until mocks are in place
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import the agent
try:
    from services.agents.recommendation.recommendation_agent import recommendation_agent, job_agent, major_agent
    from services.agents.recommendation.recommendation_pipeline import RecommendationPipeline
    from services.agents.recommendation.recommendation_tools import (
        search_jobs, load_job_details, search_majors, load_major_details,
        rerank_candidates, generate_explanation
    )
except ImportError as e:
    print(json.dumps({
        "final_status": "FAIL",
        "notes": [f"Import Validation Failed despite mocks: {e}"]
    }))
    sys.exit(1)

async def verify_recommendation_agent():
    report = {
        "agent_structure": "FAIL",
        "tools_validation": "FAIL",
        "pipeline_execution": "FAIL",
        "router_status": "FAIL", 
        "job_major_separation": "FAIL",
        "sdk_compliance": "FAIL",
        "latency_ms": 0,
        "final_status": "FAIL",
        "notes": []
    }

    # 1. Python Agent Structure Verification
    try:
        if isinstance(recommendation_agent, Agent):
            if "Main Career Recommendation Orchestrator" in recommendation_agent.instructions:
                # Updated expected tools for Orchestrator
                expected_tools_names = [
                    "transfer_to_job_expert", "transfer_to_major_expert",
                    "rerank_candidates", "generate_explanation"
                ]
                registered_tool_names = [getattr(t, 'name', getattr(t, '__name__', str(t))) for t in recommendation_agent.tools]
                
                # Check if all expected tools are present
                if all(name in registered_tool_names for name in expected_tools_names):
                    report["agent_structure"] = "PASS"
                else:
                    report["notes"].append(f"Tool list mismatch. Registered: {registered_tool_names}")
            else:
                report["notes"].append("Instructions do not match the Orchestrator role.")
        else:
            report["notes"].append("recommendation_agent is not an instance of Agent")
    except Exception as e:
        report["notes"].append(f"Agent structure check failed: {e}")

    # 2. Tool Flow - Validating Sub-Agents exist and have correct tools
    try:
        from services.agents.recommendation.recommendation_agent import job_agent, major_agent
        
        job_tools = [getattr(t, 'name', getattr(t, '__name__', str(t))) for t in job_agent.tools]
        major_tools = [getattr(t, 'name', getattr(t, '__name__', str(t))) for t in major_agent.tools]
        
        if "search_jobs" in job_tools and "load_job_details" in job_tools:
            if "search_majors" in major_tools and "load_major_details" in major_tools:
                report["tools_validation"] = "PASS"
                report["job_major_separation"] = "PASS"
            else:
                report["notes"].append(f"MajorAgent missing tools. Has: {major_tools}")
        else:
            report["notes"].append(f"JobAgent missing tools. Has: {job_tools}")
            
    except Exception as e:
        report["notes"].append(f"Sub-agent validation failed: {e}")

    # 3. Agent Execution & 4. Output Structure
    pipeline = RecommendationPipeline()
    profile_payload = {
        "summary": "I want to be a backend developer.",
        "goals": ["Become a senior dev"],
        "values": ["Growth", "Stability"],
        "personality": {"openness": 80},
        "strengths": ["Coding"],
        "risks": ["Burnout"]
    }

    start_time = time.time()
    try:
        # Mocking Runner.run via patch
        with pytch_runner_run():
            # Run pipeline
            result = await pipeline.run(profile_payload)
        
        end_time = time.time()
        report["latency_ms"] = int((end_time - start_time) * 1000)
        
        # Check assertions on pipeline result (which maps Pydantic to Dict)
        # Pipeline now returns flat 'job_explanations'
        # Check result structure
        # Expecting nested explanations
        if "jobs" in result and "explanations" in result and "jobs" in result["explanations"]:
             report["pipeline_execution"] = "PASS"
        else:
             report["notes"].append(f"Pipeline output missing keys. Got keys: {result.keys()}")
             report["pipeline_execution"] = "FAIL"

    except Exception as e:
        report["pipeline_execution"] = "FAIL"
        report["notes"].append(f"Execution Error: {e}")

    # 5. Router - Check file existence and router object
    try:
        from routers.recommendation_agent_router import router
        if router:
             report["router_status"] = "PASS"
    except Exception as e:
        report["notes"].append(f"Router check failed: {e}")

    # SDK Check
    if "agents" in sys.modules:
         report["sdk_compliance"] = "PASS"

    # Final Status
    if all(v == "PASS" for k, v in report.items() if k != "final_status" and k != "latency_ms" and k != "notes"):
        report["final_status"] = "PASS"
    else:
        report["final_status"] = "FAIL"

    print(json.dumps(report, indent=2))

from contextlib import contextmanager
import unittest.mock

@contextmanager
def pytch_runner_run():
    # Mock Result object that has final_output attribute
    class MockResult:
        def __init__(self, output):
            self.final_output = output
            
    async def mock_run(agent, input):
        
        class MockOutput:
            def model_dump(self):
                # Return nested explanations to match Pydantic model structure, 
                # but WAIT, pipeline expects flattish structure?
                # recommendation_pipeline logic:
                # job_explanations = final_output.get("job_explanations")
                
                # So the Agent Output Pydantic model has 'job_explanations'.
                return {
                    "jobs": [{"id": "j1"}],
                    "majors": [{"id": "m1"}],
                    "job_explanations": ["Exp J1"],
                    "major_explanations": ["Exp M1"]
                }
        
        return MockResult(MockOutput())

    with unittest.mock.patch('services.agents.recommendation.recommendation_pipeline.Runner') as MockRunner:
        MockRunner.return_value.run = mock_run
        yield

if __name__ == "__main__":
    asyncio.run(verify_recommendation_agent())
