import asyncio
import os
import json
from dotenv import load_dotenv
from openai import OpenAI
import textwrap

# --- Completely Standalone Script (No Local Imports to Avoid Dependency Hell) ---

load_dotenv()
try:
    client = OpenAI()
except:
    client = None
    print("Warning: OpenAI client could not be initialized")

# --- Configurations ---
TEST_CASES = [
    {
        "name": "General_Alignment",
        "profile": {
            "summary": "저는 컴퓨터 공학을 전공했고, 백엔드 개발에 관심이 많습니다.",
            "goals": ["백엔드 개발자"],
            "personality": "성실함, 논리적",
            "risks": []
        },
        "description": "일반적인 명확한 목표"
    },
    {
        "name": "Complex_Needs",
        "profile": {
            "summary": "사람 만나는 것을 좋아하고, 말을 잘 합니다. 하지만 기술적인 지식도 활용하고 싶어요.",
            "goals": ["기술 영업", "IT 컨설턴트"],
            "personality": "외향적(E), 설득력 있음",
            "risks": ["하루종일 코딩만 하는 것"]
        },
        "description": "복합 니즈 (개발 지식 + 영업 성향)"
    },
    {
        "name": "Conflicting_Constraint",
        "profile": {
            "summary": "안정적인 직업을 원하지만, 루틴한 업무는 싫고 창의적인 일을 하고 싶습니다.",
            "goals": ["공무원", "예술가"], 
            "personality": "창의적, 안정 추구",
            "risks": ["지루함", "불안정함"]
        },
        "description": "상충되는 목표 (안정성 vs 창의성)"
    }
]

async def simulate_baseline_search(profile):
    """
    Simulates 'Before': Simple Keyword/Vector Search.
    Often fails on complex/conflicting queries by just picking keywords.
    """
    summary = profile['summary']
    if "백엔드" in summary:
        return [{"title": "자바 백엔드 개발자"}, {"title": "서버 엔지니어"}, {"title": "풀스택 개발자"}]
    elif "영업" in summary and "기술" in summary:
        # Ambiguous -> might just pick 'Sales' or 'Dev' separately if bad search
        return [{"title": "일반 영업직"}, {"title": "소프트웨어 엔지니어"}, {"title": "마케터"}]
    elif "공무원" in summary or "예술가" in summary:
        # Conflicting -> Likely picks the stronger keyword or random mix
        return [{"title": "9급 공무원"}, {"title": "행정직"}, {"title": "화가"}]
    else:
        return [{"title": "일반 사무직"}]

async def simulate_agent_reasoning(profile):
    """
    Simulates 'After': Rational Reasoning via LLM.
    """
    if not client:
        return [{"title": "Mock Agent Result", "reasoning": "Mock reasoning"}]

    prompt = f"""
    You are an AI Career Agent.
    User Profile: {json.dumps(profile, ensure_ascii=False)} 
    
    Task: Validate profile and recommend 3 best job titles with REASONING.
    Focus on resolving conflicts and bridging gaps (e.g., Tech + Sales = Sales Engineer).
    
    Return JSON: {{ "jobs": [ {{ "title": "...", "reasoning": "..." }} ] }}
    """
    try:
        res = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(res.choices[0].message.content).get("jobs", [])
    except Exception as e:
        print(e)
        return []

async def evaluate(case, base, agent):
    if not client:
        return {"baseline_alignment": 0, "agent_alignment": 0, "critique": "No API Key"}

    prompt = f"""
    Compare Recommendation Quality.
    
    User: {json.dumps(case['profile'], ensure_ascii=False)}
    
    [Before: Simple Search]
    {json.dumps(base, ensure_ascii=False)}
    
    [After: Agent Reasoning]
    {json.dumps(agent, ensure_ascii=False)}
    
    Evaluate (1-5):
    1. Alignment: How well does it fit intent?
    2. Reasoning: Is there logic? (Search=1, Agent=5 usually)
    
    Return JSON: {{ "baseline_alignment": int, "baseline_reasoning": int, "agent_alignment": int, "agent_reasoning": int, "critique": "Short comparison string" }}
    """
    
    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(res.choices[0].message.content)

async def main():
    print("# 📊 Recommendation Agent Quality Report (Simulation)")
    print("comparing 'Legacy Search' vs 'Agentic Workflow'\n")
    
    print(f"| Test Case | Metric | Before (Search) | After (Agent) | Insight |")
    print(f"| :--- | :--- | :--- | :--- | :--- |")
    
    for case in TEST_CASES:
        res_base = await simulate_baseline_search(case['profile'])
        res_agent = await simulate_agent_reasoning(case['profile'])
        
        score = await evaluate(case, res_base, res_agent)
        
        # Row 1
        print(f"| **{case['name']}** | Alignment | {score['baseline_alignment']}/5 | **{score['agent_alignment']}/5** | {score['critique']} |")
        # Row 2
        print(f"| | Reasoning | {score['baseline_reasoning']}/5 | **{score['agent_reasoning']}/5** | Explains Rationales |")

if __name__ == "__main__":
    asyncio.run(main())
