"""
직업 상세 정보 Tool - 직업별 급여, 역량, 자격증 조회
"""
from typing import Dict, Any, List
from services.database_service import DatabaseService
import json


TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_job_details",
        "description": "직업의 상세 정보를 조회합니다. 평균 급여, 필요 역량, 관련 자격증, 적성 등을 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회하는 사용자의 ID"
                },
                "job_name": {
                    "type": "string",
                    "description": "조회할 직업 이름 (예: 데이터 분석가, 웹 개발자)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(user_id: int, job_name: str = None, db: DatabaseService = None, **kwargs) -> Dict[str, Any]:
    """
    직업 상세 정보 조회

    Args:
        user_id: 사용자 ID
        job_name: 직업 이름 (선택)
        db: DatabaseService 인스턴스

    Returns:
        직업 상세 정보
    """
    try:
        if db is None:
            db = DatabaseService()

        if job_name:
            # 특정 직업 검색
            query = """
                SELECT
                    job_id,
                    summary as description,
                    wage_text as salary_info,
                    aptitude_text as aptitude,
                    abilities as required_skills,
                    certifications
                FROM job_details
                WHERE LOWER(summary) LIKE LOWER(%s)
                LIMIT 5
            """
            jobs = db.execute_query(query, (f"%{job_name}%",))
            # job_name 추가
            for job in jobs:
                job['job_name'] = job_name
        else:
            # 1. 사용자 추천 직업 가져오기
            query = """
                SELECT
                    ca.recommended_careers
                FROM career_analyses ca
                JOIN career_sessions cs ON ca.session_id = cs.id
                WHERE cs.user_id = %s
                ORDER BY ca.analyzed_at DESC
                LIMIT 1
            """
            results = db.execute_query(query, (str(user_id),))

            if not results or len(results) == 0:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 직업 정보를 제공해드릴 수 있어요."
                }

            # JSON 파싱
            recommended_careers = results[0].get('recommended_careers', [])
            if isinstance(recommended_careers, str):
                try:
                    recommended_careers = json.loads(recommended_careers)
                except:
                    recommended_careers = []

            if not recommended_careers:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 직업 정보를 제공해드릴 수 있어요."
                }

            # 2. 추천 직업명으로 job_details 테이블에서 상세 정보 검색
            jobs = []
            for career in recommended_careers[:5]:
                career_name = ""
                match_score = None

                if isinstance(career, dict):
                    career_name = career.get('careerName', career.get('name', ''))
                    match_score = career.get('matchScore', career.get('score'))
                elif isinstance(career, str):
                    career_name = career

                if not career_name:
                    continue

                # job_details에서 해당 직업 검색
                detail_query = """
                    SELECT
                        job_id,
                        summary as description,
                        wage_text as salary_info,
                        aptitude_text as aptitude,
                        abilities as required_skills,
                        certifications
                    FROM job_details
                    WHERE LOWER(summary) LIKE LOWER(%s)
                    LIMIT 1
                """
                detail_results = db.execute_query(detail_query, (f"%{career_name.split('(')[0].strip()}%",))

                if detail_results and len(detail_results) > 0:
                    job_detail = detail_results[0]
                    job_detail['job_name'] = career_name
                    job_detail['match_score'] = match_score
                    jobs.append(job_detail)
                else:
                    # 상세 정보가 없으면 기본 정보만 추가
                    jobs.append({
                        'job_name': career_name,
                        'match_score': match_score,
                        'description': None,
                        'salary_info': None,
                        'aptitude': None,
                        'required_skills': None,
                        'certifications': None
                    })

            # 추천 직업이 없으면 진로분석 안내
            if not jobs or len(jobs) == 0:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 직업 정보를 제공해드릴 수 있어요."
                }

        if not jobs or len(jobs) == 0:
            return {
                "success": False,
                "message": "해당 직업의 정보를 찾을 수 없습니다."
            }

        return {
            "success": True,
            "data": jobs
        }

    except Exception as e:
        print(f"직업 정보 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"직업 정보 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """직업 정보를 마크다운으로 포맷팅"""
    if not data.get("success"):
        return data.get("message", "해당 직업의 정보를 찾을 수 없습니다.")

    jobs = data.get("data", [])

    # 상세 정보 있는 직업과 없는 직업 분리
    detailed_jobs = []
    other_jobs = []

    for job in jobs:
        salary = job.get('salary_info')
        aptitude = job.get('aptitude')
        skills = job.get('required_skills')
        certs = job.get('certifications')

        if salary or aptitude or skills or certs:
            detailed_jobs.append(job)
        else:
            other_jobs.append(job)

    response = "## 💼 추천 직업 상세 정보\n\n"

    # 상세 정보 있는 직업 표시
    for idx, job in enumerate(detailed_jobs, 1):
        job_name = job.get('job_name', 'N/A')
        match_score = job.get('match_score')

        response += f"### {idx}. {job_name}"
        if match_score:
            response += f" (매칭 {match_score}%)"
        response += "\n\n"

        # 급여 정보
        salary = job.get('salary_info')
        if salary:
            if str(salary).isdigit() or str(salary).replace(',', '').isdigit():
                response += f"**💰 급여**: 연 {salary}만원\n\n"
            else:
                response += f"**💰 급여**: {salary}\n\n"

        # 적성
        aptitude = job.get('aptitude')
        if aptitude:
            response += f"**🎯 적성**: {aptitude}\n\n"

        # 필요 역량
        skills = job.get('required_skills')
        if skills:
            if isinstance(skills, str):
                try:
                    skills = json.loads(skills)
                except:
                    skills = []
            if isinstance(skills, list) and skills:
                response += "**📚 필요 역량**:\n"
                for skill in skills[:5]:
                    if isinstance(skill, dict):
                        skill_name = skill.get('name', skill.get('skill', ''))
                        if skill_name:
                            response += f"- {skill_name}\n"
                    elif isinstance(skill, str):
                        response += f"- {skill}\n"
                response += "\n"

        # 자격증
        certs = job.get('certifications')
        if certs:
            if isinstance(certs, str):
                try:
                    certs = json.loads(certs)
                except:
                    certs = []
            if isinstance(certs, list) and certs:
                response += "**📜 관련 자격증**:\n"
                for cert in certs[:5]:
                    if isinstance(cert, dict):
                        cert_text = cert.get('certificate', cert.get('name', ''))
                        if cert_text:
                            response += f"- {cert_text}\n"
                    elif isinstance(cert, str):
                        response += f"- {cert}\n"
                response += "\n"

        response += "---\n\n"

    # 상세 정보 없는 직업 간략히 표시
    if other_jobs:
        other_names = []
        for job in other_jobs:
            name = job.get('job_name', '')
            score = job.get('match_score')
            if name:
                if score:
                    other_names.append(f"{name} ({score}%)")
                else:
                    other_names.append(name)

        if other_names:
            response += f"**그 외 추천 직업**: {', '.join(other_names)}\n"

    # 상세 정보 있는 직업이 하나도 없는 경우
    if not detailed_jobs:
        response = "## 💼 추천 직업\n\n"
        for idx, job in enumerate(jobs, 1):
            job_name = job.get('job_name', 'N/A')
            match_score = job.get('match_score')
            response += f"{idx}. **{job_name}**"
            if match_score:
                response += f" (매칭 {match_score}%)"
            response += "\n"
        response += "\n*상세 정보는 준비 중입니다.*\n"

    return response