"""
테스트용 커리어 분석 데이터 삽입 스크립트
채용추천 테스트를 위해 career_sessions, career_analyses 테이블에 테스트 데이터를 삽입합니다.
"""
import os
import sys
import json
from datetime import datetime

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from services.database_service import DatabaseService


def insert_test_data(user_id: str = "1"):
    """테스트용 커리어 분석 데이터 삽입"""

    db = DatabaseService()

    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()

            # 1. 기존 테스트 데이터 삭제 (있다면)
            session_id = f"test-session-{user_id}"

            print(f"[1/3] 기존 테스트 데이터 정리 중...")
            cursor.execute(
                "DELETE FROM career_analyses WHERE session_id IN (SELECT id FROM career_sessions WHERE session_id = %s)",
                (session_id,)
            )
            cursor.execute(
                "DELETE FROM career_sessions WHERE session_id = %s",
                (session_id,)
            )

            # 2. career_sessions 삽입
            print(f"[2/3] career_sessions 데이터 삽입 중...")

            survey_data = json.dumps({
                "name": "테스트 사용자",
                "age": 25,
                "interests": ["프로그래밍", "데이터 분석", "AI"],
                "favoriteSubjects": ["수학", "과학", "컴퓨터"],
                "difficultSubjects": ["영어"],
                "hasDreamCareer": "있음",
                "careerPressure": "보통",
                "concern": "어떤 분야가 더 맞을지 고민됩니다"
            }, ensure_ascii=False)

            cursor.execute("""
                INSERT INTO career_sessions (
                    session_id, user_id, created_at, updated_at,
                    status, conversation_stage, stage_message_count,
                    survey_completed, survey_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                session_id,
                user_id,
                datetime.now(),
                datetime.now(),
                'COMPLETED',
                'PRESENT',
                10,
                True,
                survey_data
            ))

            result = cursor.fetchone()
            session_pk = result['id'] if isinstance(result, dict) else result[0]
            print(f"   → career_sessions.id = {session_pk}")

            # 3. career_analyses 삽입
            print(f"[3/3] career_analyses 데이터 삽입 중...")

            interest_areas = json.dumps([
                {"name": "프로그래밍", "level": 9, "description": "소프트웨어 개발에 높은 관심"},
                {"name": "데이터 분석", "level": 8, "description": "데이터 기반 의사결정에 관심"},
                {"name": "인공지능", "level": 8, "description": "AI/ML 기술에 흥미"},
                {"name": "웹 개발", "level": 7, "description": "웹 서비스 구축에 관심"},
                {"name": "클라우드", "level": 6, "description": "클라우드 인프라에 관심"}
            ], ensure_ascii=False)

            recommended_careers = json.dumps([
                {
                    "careerName": "백엔드 개발자",
                    "description": "서버 및 API 개발을 담당하는 개발자",
                    "matchScore": 92,
                    "reasons": ["프로그래밍 관심도가 높음", "논리적 사고력 보유", "문제 해결 능력 우수"]
                },
                {
                    "careerName": "데이터 엔지니어",
                    "description": "데이터 파이프라인 구축 및 관리 전문가",
                    "matchScore": 88,
                    "reasons": ["데이터 분석에 관심", "시스템적 사고 가능", "대규모 데이터 처리에 흥미"]
                },
                {
                    "careerName": "풀스택 개발자",
                    "description": "프론트엔드와 백엔드 모두 개발하는 개발자",
                    "matchScore": 85,
                    "reasons": ["웹 개발에 관심", "다양한 기술 학습 의욕", "전체 시스템 이해 능력"]
                },
                {
                    "careerName": "AI 엔지니어",
                    "description": "인공지능 모델 개발 및 서비스화 전문가",
                    "matchScore": 82,
                    "reasons": ["AI 기술에 흥미", "수학적 사고력", "최신 기술 트렌드 관심"]
                },
                {
                    "careerName": "DevOps 엔지니어",
                    "description": "개발과 운영을 통합하는 인프라 전문가",
                    "matchScore": 78,
                    "reasons": ["클라우드에 관심", "자동화 선호", "시스템 안정성 중시"]
                }
            ], ensure_ascii=False)

            cursor.execute("""
                INSERT INTO career_analyses (
                    session_id,
                    emotion_analysis, emotion_score,
                    personality_analysis, personality_type,
                    interest_analysis, interest_areas,
                    comprehensive_analysis, recommended_careers,
                    analyzed_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                session_pk,
                "현재 진로에 대해 적극적이고 긍정적인 태도를 보이고 있습니다. 새로운 기술을 배우는 것에 대한 열정이 느껴지며, 미래에 대한 기대감이 높습니다.",
                78,
                "분석적이고 논리적인 성격으로, 문제를 체계적으로 접근하는 것을 선호합니다. 새로운 기술을 빠르게 습득하며, 꼼꼼하게 일을 처리하는 성향이 있습니다.",
                "INTJ",
                "기술 분야, 특히 소프트웨어 개발과 데이터 분석에 높은 관심을 보이고 있습니다. 실용적인 결과물을 만들어내는 것에 보람을 느끼며, 지속적인 학습을 즐깁니다.",
                interest_areas,
                "당신은 기술에 대한 깊은 관심과 논리적인 사고력을 갖추고 있어 IT 분야에서 큰 성장 가능성이 있습니다. 특히 백엔드 개발이나 데이터 엔지니어링 분야가 당신의 강점과 잘 맞을 것 같습니다. 꾸준히 학습하며 경험을 쌓아가면 원하는 목표를 이룰 수 있을 것입니다. 화이팅!",
                recommended_careers,
                datetime.now(),
                datetime.now()
            ))

            conn.commit()
            cursor.close()

            print(f"\n[OK] Test data inserted successfully!")
            print(f"   - user_id: {user_id}")
            print(f"   - session_id: {session_id}")
            print(f"   - Recommended careers: Backend Developer, Data Engineer, Fullstack Developer, AI Engineer, DevOps Engineer")
            print(f"\nYou can now test the job recommendation API:")
            print(f"   POST /api/job-agent/recommendations/calculate/{user_id}")
            print(f"   GET  /api/job-agent/recommendations/fast/{user_id}")

            return True

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.cleanup()


if __name__ == "__main__":
    user_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    print(f"=== 테스트 커리어 분석 데이터 삽입 ===")
    print(f"대상 user_id: {user_id}\n")
    insert_test_data(user_id)
