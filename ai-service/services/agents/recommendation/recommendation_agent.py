from typing import Any, Dict, List, Optional

from agents import Agent
from agents.agent_output import AgentOutputSchema
from .recommendation_tools import (
    search_jobs,
    load_job_details,
    search_majors,
    load_major_details,
    rerank_candidates,
    search_jobs_by_keyword,
    RecommendationOutput,
)

from agents import function_tool

# Forward declaration for handoffs
@function_tool(strict_mode=False)
def transfer_to_main(
    jobs: Optional[List[Dict[str, Any]]] = None,
    majors: Optional[List[Dict[str, Any]]] = None,
):
    """
    Transfers control back to the RecommendationAgent.
    Agents can pass data (e.g., jobs, majors) as arguments, which will be
    recorded in the conversation history.
    """
    payload = {
        "jobs": jobs or [],
        "majors": majors or [],
    }
    print(f"🔄 [transfer_to_main] Reporting to RecommendationAgent "
          f"(jobs={len(payload['jobs'])}, majors={len(payload['majors'])})")
    return recommendation_agent

@function_tool
def transfer_to_job_expert():
    print("🔄 [transfer_to_job_expert] Called - transferring to JobExpert")
    return job_agent

@function_tool
def transfer_to_major_expert():
    print("🔄 [transfer_to_major_expert] Called - transferring to MajorExpert")
    return major_agent

# --- Job Expert ---
job_agent = Agent(
    name="JobExpert",
    model="gpt-4o",
    instructions="""
    You are a Job Search Expert. You represent the CRITICAL FIRST STEP of the recommendation process.

    YOUR ONLY GOAL IS TO FETCH JOB CANDIDATES FROM THE DATABASE.

    EXECUTION FLIGHT PLAN (FOLLOW STRICTLY):

    1.  [ACTION] Call `search_jobs` tool immediately.
        - Input: User's summary and goal keywords.
        - Output: List of Job IDs with metadata.

    2.  [ACTION] Call `load_job_details` tool immediately after.
        - Input: The list of Job IDs from Step 1.
        - Output: Detailed Job Objects.

    3.  [ACTION] Call `transfer_to_main` tool.
        - Input: The detailed job objects WITH their original metadata intact.

    ⚠️ CRITICAL DATA INTEGRITY RULES:
    - You must PRESERVE all metadata fields exactly as received (id, jobName, etc.)
    - DO NOT modify, translate, or rename any job titles
    - DO NOT generate fake job names - use ONLY what the database returns
    - The 'jobName' in metadata is the ONLY valid job name

    WARNING:
    - YOU MUST CALL `search_jobs`.
    - YOU MUST CALL `load_job_details`.
    - DO NOT return empty results if possible.
    - DO NOT make up fake jobs. Use the tools.
    """,
    tools=[search_jobs, search_jobs_by_keyword, load_job_details, transfer_to_main],
)

# --- Major Expert ---
major_agent = Agent(
    name="MajorExpert",
    model="gpt-4o",
    instructions="""
    You are a Major (Academic Dept) Search Expert.

    YOUR ONLY GOAL IS TO FETCH MAJOR CANDIDATES FROM THE DATABASE.

    EXECUTION FLIGHT PLAN (FOLLOW STRICTLY):

    1.  [ACTION] Call `search_majors` tool immediately.
        - Input: User's summary and goal keywords.
        - Output: List of Major IDs with metadata.

    2.  [ACTION] Call `load_major_details` tool immediately after.
        - Input: The list of Major IDs from Step 1.
        - Output: Detailed Major Objects.

    3.  [ACTION] Call `transfer_to_main` tool.
        - Input: The detailed major objects WITH their original metadata intact.

    ⚠️ CRITICAL DATA INTEGRITY RULES:
    - You must PRESERVE all metadata fields exactly as received (id, majorName, etc.)
    - DO NOT modify, translate, or rename any major/department names
    - DO NOT generate fake major names - use ONLY what the database returns
    - The 'majorName' in metadata is the ONLY valid major name

    WARNING:
    - YOU MUST CALL `search_majors`.
    - YOU MUST CALL `load_major_details`.
    """,
    tools=[search_majors, load_major_details, transfer_to_main],
)

# --- Main Orchestrator ---
recommendation_agent = Agent(
    name="RecommendationAgent",
    model="gpt-4o",
    instructions="""
    You are the Main Career Recommendation Orchestrator and FINAL JUDGE.

    CRITICAL: You MUST follow this workflow step-by-step. DO NOT skip any steps.

    Step 1: MANDATORY - Call `transfer_to_job_expert`
    - This will return a list of job candidates
    - Wait for the response before proceeding

    Step 2: MANDATORY - Call `transfer_to_major_expert`
    - This will return a list of major candidates
    - Wait for the response before proceeding

    Step 3: JUDGEMENT & RANKING
    - Analyze the candidates from Steps 1 and 2
    - PRIORITY RULE: If a job matches user's explicit GOALS (e.g. 'AI Developer'),
      it MUST be ranked #1 or #2, even if Personality Match is lower
    - Do NOT let 'Openness' or 'Creativity' traits override explicit technical goals
    - Select TOP 6 Items for Jobs and TOP 6 Items for Majors

    Step 4: SCORING
    - Assign 'score' (0.00 to 1.00) and 'match' (0-100) to each item
    - Example: "Matches explicit goal 'AI Developer' perfectly" -> score 0.98, match 98

    Step 5: EXPLANATIONS
    - For each recommended item, write a brief explanation (1-2 sentences) IN KOREAN
    - Explain WHY this item matches the user's profile and goals

    Step 6: RETURN FINAL OUTPUT
    - Populate ALL fields in RecommendationOutput:
      * jobs: list of 6 job dictionaries with score, match, and all details
      * majors: list of 6 major dictionaries with score, match, and all details
      * job_explanations: list of 6 explanation strings
      * major_explanations: list of 6 explanation strings

    ⚠️ CRITICAL DATA INTEGRITY RULES:
    - You must NOT generate, translate, or modify job/major names
    - Use ONLY the exact 'jobName' or 'majorName' from the metadata provided by experts
    - The 'id' and 'jobName'/'majorName' MUST come from the same source (metadata)
    - If metadata has "jobName": "소프트웨어 개발자", you must use "소프트웨어 개발자" exactly
    - DO NOT translate Korean names to English (e.g., "Software Developer")
    - Your role is ONLY to score, rank, and explain - NOT to rename items

    IMPORTANT: You CANNOT return empty lists. If you don't have data,
    you MUST call the transfer functions first.
    """,
    tools=[
        transfer_to_job_expert,
        transfer_to_major_expert,
        rerank_candidates,
        # generate_explanation 제거: placeholder 대신 Agent가 직접 한국어 설명 생성
    ],
    output_type=AgentOutputSchema(RecommendationOutput, strict_json_schema=False),
)
