"""
분석 노드 - 채용 공고 데이터 분석
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, List
from collections import Counter
from openai import OpenAI
from ..state import JobResearchState
from config import settings


def load_prompt(prompt_name: str) -> str:
    """프롬프트 파일 로드"""
    prompt_path = Path(__file__).parent.parent / "prompts" / f"{prompt_name}.txt"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def analyze_tech_stack(job_postings: List[Dict]) -> List[Dict]:
    """기술 스택 분석"""
    tech_counter = Counter()

    for job in job_postings:
        tech_stack = job.get("tech_stack", [])
        if isinstance(tech_stack, list):
            for tech in tech_stack:
                if tech:
                    tech_counter[tech] += 1

    total = len(job_postings) if job_postings else 1
    return [
        {
            "name": tech,
            "count": count,
            "percentage": round(count / total * 100, 1)
        }
        for tech, count in tech_counter.most_common(20)
    ]


def analyze_experience(job_postings: List[Dict]) -> Dict[str, int]:
    """경력 요구사항 분석"""
    experience_dist = {"신입": 0, "1-3년": 0, "3-5년": 0, "5년 이상": 0, "경력무관": 0}

    for job in job_postings:
        desc = job.get("description", "")
        if "신입" in desc:
            experience_dist["신입"] += 1
        if "경력무관" in desc or "경력 무관" in desc:
            experience_dist["경력무관"] += 1
        if any(x in desc for x in ["1년", "2년", "3년"]):
            experience_dist["1-3년"] += 1
        if any(x in desc for x in ["4년", "5년"]):
            experience_dist["3-5년"] += 1
        if any(x in desc for x in ["6년", "7년", "8년", "시니어", "Senior"]):
            experience_dist["5년 이상"] += 1

    return experience_dist


def analyze_companies(job_postings: List[Dict]) -> Dict[str, int]:
    """기업별 공고 수 분석"""
    company_counter = Counter()

    for job in job_postings:
        company = job.get("company", "")
        if company:
            company_counter[company] += 1

    return dict(company_counter.most_common(10))


def extract_certifications(job_postings: List[Dict]) -> List[Dict]:
    """자격증 언급 분석"""
    cert_keywords = {
        "정보처리기사": {"difficulty": "⭐⭐⭐", "recommendation": "필수"},
        "정보처리산업기사": {"difficulty": "⭐⭐", "recommendation": "추천"},
        "SQLD": {"difficulty": "⭐⭐", "recommendation": "추천"},
        "SQLP": {"difficulty": "⭐⭐⭐⭐", "recommendation": "우대"},
        "AWS SAA": {"difficulty": "⭐⭐⭐", "recommendation": "높음"},
        "AWS SAP": {"difficulty": "⭐⭐⭐⭐", "recommendation": "우대"},
        "CKA": {"difficulty": "⭐⭐⭐⭐", "recommendation": "우대"},
        "CKAD": {"difficulty": "⭐⭐⭐", "recommendation": "추천"},
        "리눅스마스터": {"difficulty": "⭐⭐", "recommendation": "추천"},
        "네트워크관리사": {"difficulty": "⭐⭐", "recommendation": "추천"},
        "빅데이터분석기사": {"difficulty": "⭐⭐⭐", "recommendation": "추천"},
        "ADsP": {"difficulty": "⭐⭐", "recommendation": "추천"},
        "ADP": {"difficulty": "⭐⭐⭐⭐", "recommendation": "우대"},
    }

    cert_counter = Counter()

    for job in job_postings:
        desc = job.get("description", "")
        for cert in cert_keywords:
            if cert in desc:
                cert_counter[cert] += 1

    certifications = []
    for cert, count in cert_counter.most_common():
        info = cert_keywords.get(cert, {"difficulty": "⭐⭐", "recommendation": "추천"})
        certifications.append({
            "name": cert,
            "mention_count": count,
            "difficulty": info["difficulty"],
            "recommendation": info["recommendation"]
        })

    return certifications


def get_ai_insights(state: JobResearchState) -> str:
    """OpenAI를 사용한 AI 인사이트 생성"""
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        prompt_template = load_prompt("analyze")

        # 데이터 준비
        tech_data = "\n".join([
            f"- {t['name']}: {t['count']}건 ({t['percentage']}%)"
            for t in state.get("tech_stack_analysis", [])[:10]
        ])

        exp_data = "\n".join([
            f"- {k}: {v}건"
            for k, v in state.get("experience_distribution", {}).items()
        ])

        company_data = "\n".join([
            f"- {k}: {v}건"
            for k, v in list(state.get("company_stats", {}).items())[:5]
        ])

        prompt = prompt_template.format(
            keyword=state["keyword"],
            total_postings=state.get("total_postings", 0),
            sites=", ".join(state.get("sites_crawled", [])),
            tech_stack_data=tech_data or "데이터 없음",
            experience_data=exp_data or "데이터 없음",
            company_data=company_data or "데이터 없음"
        )

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=1
        )

        return response.choices[0].message.content

    except Exception as e:
        return json.dumps({
            "market_trend": f"분석 중 오류 발생: {str(e)}",
            "essential_skills": [],
            "differentiators": [],
            "cautions": []
        })


def analyze_jobs(state: JobResearchState) -> Dict[str, Any]:
    """
    채용 공고 분석 노드
    """
    job_postings = state.get("job_postings", [])

    # 기술 스택 분석
    tech_stack_analysis = analyze_tech_stack(job_postings)

    # 경력 분포 분석
    experience_distribution = analyze_experience(job_postings)

    # 기업별 분석
    company_stats = analyze_companies(job_postings)

    # 자격증 분석
    certifications = extract_certifications(job_postings)

    # 연봉 분석 (현재는 placeholder)
    salary_analysis = {
        "entry_level": "3,500~4,500만원",
        "mid_level": "5,000~6,500만원",
        "senior_level": "7,000만원~"
    }

    # 상태 업데이트
    updated_state = {
        "tech_stack_analysis": tech_stack_analysis,
        "experience_distribution": experience_distribution,
        "company_stats": company_stats,
        "certifications": certifications,
        "salary_analysis": salary_analysis
    }

    # AI 인사이트 생성
    temp_state = {**state, **updated_state}
    ai_insights = get_ai_insights(temp_state)
    updated_state["ai_insights"] = ai_insights

    return updated_state
