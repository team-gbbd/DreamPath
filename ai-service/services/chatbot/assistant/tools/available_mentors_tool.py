"""
승인된 멘토 조회 Tool - 멘토 목록 및 상세 정보 조회
"""
import json
from typing import Dict, Any, List
from services.database_service import DatabaseService


TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_available_mentors",
        "description": "승인된 멘토 목록을 조회합니다. 멘토의 회사, 직무, 경력, 자기소개 등을 확인할 수 있습니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회하는 사용자의 ID"
                },
                "job_field": {
                    "type": "string",
                    "description": "필터링할 직무 분야 (예: 개발, 디자인, 마케팅)"
                }
            },
            "required": ["user_id"]
        }
    }
}


def execute(user_id: int, job_field: str = None, db: DatabaseService = None, **kwargs) -> Dict[str, Any]:
    """
    승인된 멘토 목록 조회 (진로분석 결과 기반 추천)

    Args:
        user_id: 사용자 ID
        job_field: 직무 분야 필터 (선택)
        db: DatabaseService 인스턴스

    Returns:
        멘토 목록
    """
    try:
        if db is None:
            db = DatabaseService()

        # job_field가 지정된 경우 해당 분야로 필터링
        if job_field:
            query = """
                SELECT
                    m.mentor_id,
                    m.company,
                    m.job as job_title,
                    u.name as mentor_name
                FROM mentors m
                JOIN users u ON m.user_id = u.user_id
                WHERE m.status = 'APPROVED'
                  AND m.company IS NOT NULL AND m.company != ''
                  AND m.job IS NOT NULL AND m.job != ''
                  AND LOWER(m.job) LIKE LOWER(%s)
                ORDER BY m.mentor_id DESC
                LIMIT 10
            """
            mentors = db.execute_query(query, (f"%{job_field}%",))
        else:
            # 1. 사용자의 진로분석 결과에서 추천 직업 가져오기
            analysis_query = """
                SELECT ca.recommended_careers
                FROM career_analyses ca
                JOIN career_sessions cs ON ca.session_id = cs.id
                WHERE cs.user_id = %s
                ORDER BY ca.analyzed_at DESC
                LIMIT 1
            """
            analysis_results = db.execute_query(analysis_query, (str(user_id),))

            if not analysis_results or len(analysis_results) == 0:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 멘토를 추천해드릴 수 있어요."
                }

            # JSON 파싱
            recommended_careers = analysis_results[0].get('recommended_careers', [])
            if isinstance(recommended_careers, str):
                try:
                    recommended_careers = json.loads(recommended_careers)
                except:
                    recommended_careers = []

            if not recommended_careers:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 멘토를 추천해드릴 수 있어요."
                }

            # 2. 추천 직업명 추출
            career_names = []
            for career in recommended_careers[:5]:
                if isinstance(career, dict):
                    career_name = career.get('careerName', career.get('name', ''))
                elif isinstance(career, str):
                    career_name = career
                else:
                    continue

                if career_name:
                    # 괄호 앞 부분만 사용 (예: "데이터 분석가(Data Analyst)" -> "데이터 분석가")
                    career_names.append(career_name.split('(')[0].strip())

            if not career_names:
                return {
                    "success": False,
                    "need_analysis": True,
                    "message": "아직 진로 분석을 진행하지 않으셨네요! 진로 분석을 진행하시면 맞춤 멘토를 추천해드릴 수 있어요."
                }

            # 3. 추천 직업과 매칭되는 멘토 검색
            mentors = []
            for career_name in career_names:
                query = """
                    SELECT
                        m.mentor_id,
                        m.company,
                        m.job as job_title,
                        u.name as mentor_name
                    FROM mentors m
                    JOIN users u ON m.user_id = u.user_id
                    WHERE m.status = 'APPROVED'
                      AND m.company IS NOT NULL AND m.company != ''
                      AND m.job IS NOT NULL AND m.job != ''
                      AND LOWER(m.job) LIKE LOWER(%s)
                    ORDER BY m.mentor_id DESC
                    LIMIT 3
                """
                results = db.execute_query(query, (f"%{career_name}%",))
                if results:
                    for mentor in results:
                        # 중복 방지
                        if not any(m['mentor_id'] == mentor['mentor_id'] for m in mentors):
                            mentors.append(mentor)

            # 매칭되는 멘토가 없으면 메시지 표시
            if not mentors or len(mentors) == 0:
                return {
                    "success": False,
                    "message": "해당 분야의 활동 중인 멘토가 없습니다."
                }

        if not mentors or len(mentors) == 0:
            return {
                "success": False,
                "message": "해당 분야의 활동 중인 멘토가 없습니다."
            }

        return {
            "success": True,
            "data": mentors
        }

    except Exception as e:
        print(f"멘토 조회 오류: {str(e)}")
        return {
            "success": False,
            "message": f"멘토 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """멘토 목록을 마크다운으로 포맷팅"""
    if not data.get("success"):
        return data.get("message", "멘토를 찾을 수 없습니다.")

    mentors = data.get("data", [])
    response = "## 👨‍🏫 추천 멘토\n\n"

    for idx, mentor in enumerate(mentors, 1):
        name = mentor.get('mentor_name', '멘토')
        company = mentor.get('company', 'N/A')
        job_title = mentor.get('job_title', 'N/A')

        response += f"### {idx}. {name} 멘토\n"
        response += f"- **회사**: {company}\n"
        response += f"- **직무**: {job_title}\n"
        response += "\n"

    response += f"*총 {len(mentors)}명의 멘토가 추천되었습니다.*\n"
    response += "\n💡 멘토링 예약은 **멘토링** 메뉴에서 가능합니다."

    return response