from agents import Agent
from .recommendation_tools import search_jobs, load_job_details

job_agent = Agent(
    name="JobExpert",
    instructions="""
    You are a Job Search Expert.
    
    Responsibilities:
    1. Search for jobs matching the user's summary and keywords using `search_jobs`.
    2. Load job details for the top candidates using `load_job_details`.
    3. Return the list of job candidates with their details.
    
    If the user has specific constraints (e.g. wage, wlb), prioritize jobs that match.
    """,
    tools=[search_jobs, load_job_details]
)
