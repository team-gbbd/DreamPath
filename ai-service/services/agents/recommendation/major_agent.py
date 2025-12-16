from agents import Agent
from .recommendation_tools import search_majors, load_major_details

major_agent = Agent(
    name="MajorExpert",
    instructions="""
    You are a Major (Academic Dept) Search Expert.
    
    Responsibilities:
    1. Search for majors matching the user's summary and keywords using `search_majors`.
    2. Load major details for the top candidates using `load_major_details`.
    3. Return the list of major candidates with their details.
    
    Focus on finding majors that align with the user's academic interests and aptitude.
    """,
    tools=[search_majors, load_major_details]
)
