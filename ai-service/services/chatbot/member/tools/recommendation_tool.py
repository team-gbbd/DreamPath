"""
추천 시스템 Tool - 직업/학과/학교 추천
"""
from typing import Dict, Any, List, Optional
from services.database_service import DatabaseService
from services.recommend.recommend_service import RecommendService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_recommendations",
        "description": "사용자에게 맞는 직업, 학과, 학교를 추천합니다. Pinecone 벡터 검색 기반 개인화 추천 서비스입니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "recommendation_type": {
                    "type": "string",
                    "enum": ["job", "major", "school", "all"],
                    "description": "추천 유형 - job(직업), major(학과), school(학교), all(전체)"
                },
                "top_k": {
                    "type": "integer",
                    "description": "추천 결과 개수 (기본: 5)",
                    "default": 5
                }
            },
            "required": ["user_id", "recommendation_type"]
        }
    }
}


def execute(
    user_id: int,
    recommendation_type: str = "all",
    top_k: int = 5,
    db: DatabaseService = None,
    **kwargs
) -> Dict[str, Any]:
    """
    추천 시스템 실행

    Args:
        user_id: 사용자 ID
        recommendation_type: 추천 유형 (job, major, school, all)
        top_k: 추천 결과 개수

    Args:
        data: execute() 반환값

    Returns:
        포맷된 마크다운 문자열
    """
    if not data.get("success"):
        return data.get("message", "추천 결과를 찾을 수 없습니다.")

    recommendations = data.get("data", {})
    response = "## 🎯 맞춤형 추천 결과\n\n"

    # 직업 추천
    if "jobs" in recommendations and recommendations["jobs"]:
        response += "### 💼 추천 직업\n"
        for idx, job in enumerate(recommendations["jobs"][:5], 1):
            title = job.get("title", "제목 없음")
            score = job.get("score", 0)
            metadata = job.get("metadata", {})

            response += f"{idx}. **{title}** (적합도: {score:.2f})\n"

            summary = metadata.get("summary")
            if summary:
                response += f"   - {summary}\n"

            job_ability = metadata.get("job_ability")
            if job_ability:
                response += f"   - 필요 능력: {job_ability}\n"

        response += "\n"

    # 학과 추천
    if "majors" in recommendations and recommendations["majors"]:
        response += "### 🎓 추천 학과\n"
        for idx, major in enumerate(recommendations["majors"][:5], 1):
            title = major.get("title", "제목 없음")
            score = major.get("score", 0)
            metadata = major.get("metadata", {})

            response += f"{idx}. **{title}** (적합도: {score:.2f})\n"

            dept_name = metadata.get("deptName")
            summary = metadata.get("summary")

            if dept_name:
                response += f"   - 학과: {dept_name}\n"
            if summary:
                response += f"   - {summary}\n"

        response += "\n"

    # 학교 추천
    if "schools" in recommendations and recommendations["schools"]:
        response += "### 🏫 추천 학교\n"
        for idx, school in enumerate(recommendations["schools"][:5], 1):
            title = school.get("title", "제목 없음")
            score = school.get("score", 0)
            metadata = school.get("metadata", {})

            response += f"{idx}. **{title}** (적합도: {score:.2f})\n"

            region = metadata.get("region")
            if region:
                response += f"   - 지역: {region}\n"

        response += "\n"

    if not any(recommendations.values()):
        return "추천 결과가 없습니다. 성격 검사를 먼저 완료해주세요."

    response += "*이 추천은 AI 벡터 검색 기반으로 생성되었습니다.*"

    return response