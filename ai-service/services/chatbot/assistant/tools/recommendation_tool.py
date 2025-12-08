"""
추천 시스템 Tool - 직업/학과 추천
"""
from typing import Dict, Any, List, Optional
from services.database_service import DatabaseService


# OpenAI Function Calling 스키마
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_recommendations",
        "description": "사용자에게 맞는 직업, 학과를 추천합니다. 프로필 분석 결과를 기반으로 Pinecone 벡터 검색을 통해 개인화된 추천을 제공합니다.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "integer",
                    "description": "조회할 사용자의 ID"
                },
                "recommendation_type": {
                    "type": "string",
                    "enum": ["job", "major", "all"],
                    "description": "추천 유형 - job(직업), major(학과), all(전체)"
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
    추천 시스템 실행 - Pinecone 벡터 검색 기반

    Args:
        user_id: 사용자 ID
        recommendation_type: 추천 유형 (job, major, all)
        top_k: 추천 결과 개수
        db: DatabaseService 인스턴스
        **kwargs: 추가 파라미터 (무시됨)

    Returns:
        추천 결과
    """
    try:
        if db is None:
            db = DatabaseService()

        # 1. user_id로 profile_id 조회, 그 다음 vector_db_id 조회
        vector_query = """
            SELECT pv.vector_db_id
            FROM profile_vector pv
            JOIN user_profiles up ON pv.profile_id = up.profile_id
            WHERE up.user_id = %s
        """
        vector_result = db.execute_query(vector_query, (user_id,))

        if not vector_result or len(vector_result) == 0:
            return {
                "success": False,
                "message": "프로필 벡터가 없습니다. 프로필 분석을 먼저 진행해주세요."
            }

        vector_id = vector_result[0].get("vector_db_id")

        # 3. Pinecone에서 추천 결과 조회
        recommendations = {}

        try:
            # recommend_service를 사용하여 추천 결과 가져오기
            from services.recommend.recommend_service import RecommendService
            recommend_service = RecommendService()

            if recommendation_type in ["job", "all"]:
                # 직업 추천
                job_results = recommend_service.recommend_jobs(vector_id, top_k=top_k)
                if job_results:
                    recommendations["jobs"] = job_results

            if recommendation_type in ["major", "all"]:
                # 학과 추천
                major_results = recommend_service.recommend_major(vector_id, top_k=top_k)
                if major_results:
                    recommendations["majors"] = major_results

        except Exception as e:
            pass

        if not recommendations:
            return {
                "success": False,
                "message": "추천 결과가 없습니다. 프로필 분석을 먼저 완료해주세요."
            }

        return {
            "success": True,
            "data": recommendations
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"추천 조회 중 오류가 발생했습니다: {str(e)}"
        }


def format_result(data: Dict[str, Any]) -> str:
    """
    추천 결과를 사용자 친화적인 마크다운으로 포맷팅

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
            title = job.get("title", job.get("metadata", {}).get("jobName", "제목 없음"))
            score = job.get("score", 0)
            metadata = job.get("metadata", {})

            response += f"{idx}. **{title}** (적합도: {score:.1%})\n"

            summary = metadata.get("summary") or metadata.get("job_summary")
            if summary:
                # 요약이 너무 길면 자르기
                if len(summary) > 100:
                    summary = summary[:100] + "..."
                response += f"   - {summary}\n"

            job_ability = metadata.get("job_ability")
            if job_ability:
                response += f"   - 필요 능력: {job_ability}\n"

        response += "\n"

    # 학과 추천
    if "majors" in recommendations and recommendations["majors"]:
        response += "### 🎓 추천 학과\n"
        for idx, major in enumerate(recommendations["majors"][:5], 1):
            title = major.get("title", major.get("metadata", {}).get("deptName", "제목 없음"))
            score = major.get("score", 0)
            metadata = major.get("metadata", {})

            response += f"{idx}. **{title}** (적합도: {score:.1%})\n"

            dept_name = metadata.get("deptName")
            summary = metadata.get("summary") or metadata.get("mClass")

            if dept_name and dept_name != title:
                response += f"   - 학과: {dept_name}\n"
            if summary:
                if len(summary) > 100:
                    summary = summary[:100] + "..."
                response += f"   - {summary}\n"

        response += "\n"

    if not any(recommendations.values()):
        return "추천 결과가 없습니다. 프로필 분석을 먼저 완료해주세요."

    response += "*이 추천은 AI 벡터 검색 기반으로 생성되었습니다.*"

    return response