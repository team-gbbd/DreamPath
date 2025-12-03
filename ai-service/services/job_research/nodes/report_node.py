"""
리포트 노드 - MD 파일 생성
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from ..state import JobResearchState


def load_prompt(prompt_name: str) -> str:
    """프롬프트 파일 로드"""
    prompt_path = Path(__file__).parent.parent / "prompts" / f"{prompt_name}.txt"
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def format_tech_stack(tech_stack: list) -> str:
    """기술 스택 포맷팅"""
    if not tech_stack:
        return "데이터 없음"

    lines = []
    for i, tech in enumerate(tech_stack[:10], 1):
        lines.append(f"{i}. {tech['name']} - {tech['count']}건 ({tech['percentage']}%)")
    return "\n".join(lines)


def format_certifications(certifications: list) -> str:
    """자격증 정보 포맷팅"""
    if not certifications:
        return "관련 자격증 언급 없음"

    lines = ["| 자격증 | 언급 빈도 | 난이도 | 추천도 |", "|--------|-----------|--------|--------|"]
    for cert in certifications:
        lines.append(
            f"| {cert['name']} | {cert['mention_count']}건 | {cert['difficulty']} | {cert['recommendation']} |"
        )
    return "\n".join(lines)


def format_experience(experience: dict) -> str:
    """경력 분포 포맷팅"""
    if not experience:
        return "데이터 없음"

    lines = []
    for level, count in experience.items():
        if count > 0:
            lines.append(f"- {level}: {count}건")
    return "\n".join(lines) if lines else "데이터 없음"


def format_salary(salary: dict) -> str:
    """연봉 분석 포맷팅"""
    if not salary:
        return "데이터 없음"

    return f"""- 신입: {salary.get('entry_level', 'N/A')}
- 경력 3~5년: {salary.get('mid_level', 'N/A')}
- 시니어 (5년+): {salary.get('senior_level', 'N/A')}"""


def generate_markdown_report(state: JobResearchState) -> str:
    """마크다운 리포트 생성"""
    keyword = state["keyword"]
    date = datetime.now().strftime("%Y-%m-%d")
    total_postings = state.get("total_postings", 0)

    # 기술 스택 TOP 10
    tech_stack = state.get("tech_stack_analysis", [])
    tech_table = "| 순위 | 기술 | 언급 수 | 비율 |\n|------|------|---------|------|\n"
    for i, tech in enumerate(tech_stack[:10], 1):
        tech_table += f"| {i} | {tech['name']} | {tech['count']}건 | {tech['percentage']}% |\n"

    # 우대 자격증
    cert_table = format_certifications(state.get("certifications", []))

    # 경력 분포
    exp_dist = state.get("experience_distribution", {})
    exp_lines = []
    for level, count in exp_dist.items():
        if count > 0:
            bar = "█" * min(count // 2, 20)
            exp_lines.append(f"- {level}: {bar} {count}건")
    exp_chart = "\n".join(exp_lines) if exp_lines else "데이터 없음"

    # 주요 기업
    company_stats = state.get("company_stats", {})
    company_list = "\n".join([
        f"- **{company}**: {count}건"
        for company, count in list(company_stats.items())[:10]
    ]) if company_stats else "데이터 없음"

    # AI 인사이트 파싱
    ai_insights = state.get("ai_insights", "{}")
    try:
        # JSON 코드 블록 제거
        if "```json" in ai_insights:
            ai_insights = ai_insights.split("```json")[1].split("```")[0]
        elif "```" in ai_insights:
            ai_insights = ai_insights.split("```")[1].split("```")[0]
        insights = json.loads(ai_insights.strip())
    except:
        insights = {
            "market_trend": ai_insights if ai_insights else "분석 결과 없음",
            "essential_skills": [],
            "differentiators": [],
            "cautions": []
        }

    # 필수 스킬
    essential_skills = insights.get("essential_skills", [])
    skills_list = "\n".join([f"- {skill}" for skill in essential_skills]) if essential_skills else "- 데이터 분석 필요"

    # 차별화 포인트
    differentiators = insights.get("differentiators", [])
    diff_list = "\n".join([f"- {d}" for d in differentiators]) if differentiators else "- 추가 분석 필요"

    # 주의사항
    cautions = insights.get("cautions", [])
    caution_list = "\n".join([f"- {c}" for c in cautions]) if cautions else "- 특별한 주의사항 없음"

    # 연봉 분석
    salary = state.get("salary_analysis", {})
    salary_info = format_salary(salary)

    # 주요 채용 공고
    job_postings = state.get("job_postings", [])[:5]
    job_links = "\n".join([
        f"- [{job.get('company', 'N/A')} - {job.get('title', 'N/A')}]({job.get('url', '#')})"
        for job in job_postings
    ]) if job_postings else "- 채용 공고 없음"

    # 사이트별 통계
    sites = state.get("sites_crawled", [])
    site_stats = {}
    for job in state.get("job_postings", []):
        site = job.get("site_name", "unknown")
        site_stats[site] = site_stats.get(site, 0) + 1

    site_table = "| 사이트 | 공고 수 |\n|--------|--------|\n"
    for site, count in site_stats.items():
        site_table += f"| {site} | {count}건 |\n"

    # 마크다운 리포트 생성
    report = f"""# 📋 [{keyword}] 채용 분석 리포트
> 생성일: {date} | 분석 공고 수: {total_postings}건

---

## 📊 채용 현황 요약

{site_table}

### 주요 채용 기업
{company_list}

---

## 🔥 요구 기술 스택 TOP 10

{tech_table}

---

## 📜 우대 자격증

{cert_table}

---

## 💼 경력별 분포

{exp_chart}

---

## 💰 예상 연봉

{salary_info}

---

## 🎯 AI 분석 인사이트

### 시장 동향
{insights.get('market_trend', '분석 중...')}

### 필수 역량
{skills_list}

### 차별화 포인트
{diff_list}

### 주의사항
{caution_list}

---

## 📎 주요 채용 공고

{job_links}

---

> 🤖 이 리포트는 AI가 자동 생성했습니다.
> 📅 데이터 기준: 최근 7일간 채용 공고
"""

    return report


def save_report(report: str, keyword: str) -> str:
    """리포트를 MD 파일로 저장"""
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)

    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_keyword = keyword.replace(" ", "_").replace("/", "_")
    filename = f"{safe_keyword}_{date_str}.md"
    filepath = output_dir / filename

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report)

    return str(filepath)


def generate_report(state: JobResearchState) -> Dict[str, Any]:
    """
    리포트 생성 노드
    """
    # 마크다운 리포트 생성
    report_markdown = generate_markdown_report(state)

    # 파일 저장
    report_path = save_report(report_markdown, state["keyword"])

    return {
        "report_markdown": report_markdown,
        "report_path": report_path,
        "created_at": datetime.now().isoformat()
    }
