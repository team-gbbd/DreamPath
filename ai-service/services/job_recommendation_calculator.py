"""
백그라운드 채용공고 추천 계산 서비스
사용자별로 미리 추천을 계산하여 DB에 캐싱합니다.
AI를 활용하여 직업명에서 관련 채용공고 검색 키워드를 생성합니다.
"""
import asyncio
import json
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from openai import OpenAI
from services.database_service import DatabaseService
from services.recommendation_lock import get_recommendation_lock


class JobRecommendationCalculator:
    """채용공고 추천 미리 계산 서비스"""

    def __init__(self):
        self.db = DatabaseService()
        self.lock = get_recommendation_lock()
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.keyword_cache = {}  # AI 생성 키워드 캐시

    async def calculate_all_user_recommendations(
        self,
        batch_size: int = 10,
        max_recommendations: int = 50
    ) -> Dict:
        """
        모든 사용자의 채용공고 추천을 계산합니다.

        Args:
            batch_size: 동시 처리할 사용자 수
            max_recommendations: 사용자당 최대 추천 공고 수

        Returns:
            실행 결과 통계
        """
        print("[JobRecommendationCalculator] 추천 계산 시작...")

        # 1. 커리어 분석이 완료된 활성 사용자 조회
        users = self._get_active_users_with_career_analysis()
        if not users:
            print("[JobRecommendationCalculator] 처리할 사용자가 없습니다.")
            return {
                "success": True,
                "total_users": 0,
                "processed_users": 0,
                "failed_users": 0,
                "total_recommendations": 0
            }

        print(f"[JobRecommendationCalculator] {len(users)}명의 사용자 발견")

        # 2. 배치 단위로 사용자 처리
        total_processed = 0
        total_failed = 0
        total_recommendations = 0

        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]
            print(f"[JobRecommendationCalculator] 배치 {i // batch_size + 1} 처리 중 ({len(batch)}명)...")

            # 병렬 처리
            tasks = [
                self.calculate_user_recommendations(
                    user_id=user["user_id"],
                    max_recommendations=max_recommendations
                )
                for user in batch
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 집계
            for result in results:
                if isinstance(result, Exception):
                    print(f"[JobRecommendationCalculator] 오류: {result}")
                    total_failed += 1
                elif result and result.get("success"):
                    total_processed += 1
                    total_recommendations += result.get("saved_count", 0)
                else:
                    total_failed += 1

            # API 부하 방지를 위한 대기
            if i + batch_size < len(users):
                await asyncio.sleep(2)

        print(f"[JobRecommendationCalculator] 완료: {total_processed}명 성공, {total_failed}명 실패, 총 {total_recommendations}개 추천")

        return {
            "success": True,
            "total_users": len(users),
            "processed_users": total_processed,
            "failed_users": total_failed,
            "total_recommendations": total_recommendations
        }

    async def calculate_user_recommendations(
        self,
        user_id: int,
        max_recommendations: int = 50
    ) -> Dict:
        """
        특정 사용자의 채용공고 추천을 계산합니다.
        job_recommendations 테이블의 직업명을 기반으로 job_listings에서 채용공고를 검색합니다.

        Args:
            user_id: 사용자 ID
            max_recommendations: 최대 추천 공고 수

        Returns:
            계산 결과
        """
        try:
            # 🔒 분산 락 획득 (Race Condition 방지)
            with self.lock.acquire(user_id=user_id, timeout=300):
                print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 중... (락 획득)")

                # 1. 사용자 프로필 + 직업 추천 데이터 조회
                career_analysis = self._get_user_career_analysis(user_id)
                if not career_analysis:
                    print(f"[JobRecommendationCalculator] 사용자 {user_id}의 프로필 분석 데이터가 없습니다.")
                    return {"success": False, "error": "No profile analysis"}

                # 2. 추천 직업 목록 확인
                recommended_careers = career_analysis.get("recommendedCareers", [])
                if not recommended_careers:
                    print(f"[JobRecommendationCalculator] 사용자 {user_id}의 추천 직업이 없습니다.")
                    return {"success": False, "error": "No job recommendations"}

                # 3. 직업명 기반으로 채용공고 검색
                recommendations = self._search_job_listings_by_careers(
                    user_id=user_id,
                    recommended_careers=recommended_careers,
                    career_analysis=career_analysis,
                    max_recommendations=max_recommendations
                )

                if not recommendations:
                    print(f"[JobRecommendationCalculator] 사용자 {user_id}의 채용공고 검색 결과가 없습니다.")
                    return {"success": True, "saved_count": 0}

                # 4. DB에 저장
                saved_count = self._save_recommendations(user_id, recommendations)
                print(f"[JobRecommendationCalculator] 사용자 {user_id}: {saved_count}개 추천 저장 완료")

                return {
                    "success": True,
                    "user_id": user_id,
                    "saved_count": saved_count,
                    "total_recommendations": len(recommendations)
                }

        except TimeoutError as e:
            # 락 획득 실패 (다른 작업이 실행 중)
            print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 스킵 (이미 실행 중): {e}")
            return {
                "success": False,
                "error": "Already in progress",
                "skipped": True
            }
        except Exception as e:
            print(f"[JobRecommendationCalculator] 사용자 {user_id} 추천 계산 실패: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    def _search_job_listings_by_careers(
        self,
        user_id: int,
        recommended_careers: List[Dict],
        career_analysis: Dict,
        max_recommendations: int = 50
    ) -> List[Dict]:
        """
        추천 직업명을 기반으로 job_listings에서 채용공고를 검색합니다.
        중복 공고는 회사명+제목 조합으로 필터링합니다.
        """
        try:
            recommendations = []
            seen_job_ids = set()
            seen_job_keys = set()  # 회사명+제목 조합으로 중복 체크

            for career in recommended_careers:
                career_name = career.get("careerName", "")
                career_score = career.get("matchScore", 0.5)

                if not career_name:
                    continue

                # 직업명으로 채용공고 검색 (LIKE 검색)
                # 직업명의 키워드 추출 (예: "소프트웨어 개발자" → "소프트웨어", "개발자")
                keywords = self._extract_keywords(career_name)

                for keyword in keywords:
                    if len(recommendations) >= max_recommendations:
                        break

                    search_query = """
                        SELECT id, title, company, location, url, description,
                               site_name, experience, crawled_at
                        FROM job_listings
                        WHERE (title ILIKE %s OR description ILIKE %s)
                        ORDER BY crawled_at DESC
                        LIMIT %s
                    """
                    search_pattern = f"%{keyword}%"
                    results = self.db.execute_query(
                        search_query,
                        (search_pattern, search_pattern, max_recommendations * 2)  # 중복 제거 후 부족하지 않도록 여유있게
                    )

                    for row in results:
                        job_id = row.get("id")
                        title = row.get("title", "")
                        company = row.get("company", "")

                        # 1차: ID 기준 중복 체크
                        if job_id in seen_job_ids:
                            continue

                        # 2차: 회사명+제목 조합으로 중복 체크 (같은 공고가 다른 사이트에 있는 경우)
                        job_key = f"{company.lower().strip()}|{title.lower().strip()}"
                        if job_key in seen_job_keys:
                            continue

                        seen_job_ids.add(job_id)
                        seen_job_keys.add(job_key)

                        # 매칭 점수 계산 (직업 추천 점수 기반)
                        base_score = career_score if isinstance(career_score, (int, float)) else 0.5

                        # CareerNet/AI가 0-1 또는 0-100 범위를 혼용하므로 모두 처리
                        if base_score <= 1:
                            match_score = int(base_score * 100)
                        else:
                            match_score = int(base_score)

                        # DB precision(5,2)을 넘지 않도록 0-100 범위로 클램프
                        match_score = max(0, min(match_score, 100))

                        recommendations.append({
                            "id": job_id,
                            "title": title,
                            "company": company,
                            "location": row.get("location"),
                            "url": row.get("url"),
                            "description": row.get("description"),
                            "siteName": row.get("site_name"),
                            "experience": row.get("experience"),
                            "matchScore": match_score,
                            "matchReason": f"추천 직업 '{career_name}'과(와) 관련된 채용공고",
                            "matchedCareer": career_name,
                            "careerCategory": career.get("category")
                        })

                        if len(recommendations) >= max_recommendations:
                            break

            # 매칭 점수 기준 정렬
            recommendations.sort(key=lambda x: x.get("matchScore", 0), reverse=True)

            print(f"[JobRecommendationCalculator] 사용자 {user_id}: 총 {len(recommendations)}개 채용공고 검색됨 (중복 제거됨)")
            return recommendations[:max_recommendations]

        except Exception as e:
            print(f"[JobRecommendationCalculator] 채용공고 검색 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _extract_keywords(self, career_name: str) -> List[str]:
        """
        AI를 활용하여 직업명에서 관련 채용공고 검색 키워드를 생성합니다.
        캐시를 사용하여 동일한 직업명에 대한 중복 API 호출을 방지합니다.
        """
        # 캐시 확인
        if career_name in self.keyword_cache:
            print(f"[AI KeywordGen] '{career_name}' → 캐시된 키워드 사용")
            return self.keyword_cache[career_name]

        try:
            # OpenAI API를 사용하여 관련 키워드 생성
            keywords = self._generate_keywords_with_ai(career_name)

            if keywords:
                # 캐시에 저장
                self.keyword_cache[career_name] = keywords
                print(f"[AI KeywordGen] '{career_name}' → AI 생성 키워드: {keywords}")
                return keywords
            else:
                # AI 실패 시 기본 키워드 반환
                return self._get_fallback_keywords(career_name)

        except Exception as e:
            print(f"[AI KeywordGen] AI 키워드 생성 실패: {e}")
            return self._get_fallback_keywords(career_name)

    def _generate_keywords_with_ai(self, career_name: str) -> List[str]:
        """OpenAI를 사용하여 직업명에서 채용공고 검색 키워드를 생성합니다."""
        try:
            prompt = f"""당신은 채용공고 검색 전문가입니다.
다음 직업을 희망하는 사람이 취업 사이트에서 채용공고를 검색할 때 사용하면 좋을 키워드를 추천해주세요.

직업명: {career_name}

요구사항:
1. 실제 채용공고 제목이나 설명에 자주 등장하는 키워드를 선택하세요
2. 해당 직업과 관련된 다양한 직무명, 직책명, 기술명을 포함하세요
3. 너무 일반적인 키워드(예: "직원", "담당자")는 제외하세요
4. 한국 취업시장에서 실제로 사용되는 용어를 사용하세요

정확히 8-10개의 키워드를 쉼표로 구분하여 한 줄로만 응답하세요.
예시: 디자이너, UI, UX, 그래픽, 시각디자인, 웹디자인, 편집디자인, 포토샵"""

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 한국 채용시장 전문가입니다. 키워드만 간결하게 응답하세요."},
                    {"role": "user", "content": prompt}
                ],
                max_completion_tokens=200,
                temperature=0.3
            )

            # 응답 파싱
            result = response.choices[0].message.content.strip()
            keywords = [kw.strip() for kw in result.split(",") if kw.strip()]

            # 직업명도 키워드에 추가
            if career_name not in keywords:
                keywords.insert(0, career_name)

            return keywords[:10]

        except Exception as e:
            print(f"[AI KeywordGen] OpenAI API 호출 실패: {e}")
            return []

    def _get_fallback_keywords(self, career_name: str) -> List[str]:
        """AI 실패 시 기본 키워드 반환"""
        # 기본적인 키워드 추출 (공백/특수문자 분리)
        words = career_name.replace("/", " ").replace(",", " ").split()
        keywords = [career_name]  # 원본 직업명 포함

        for word in words:
            if len(word) >= 2 and word not in keywords:
                keywords.append(word)

        print(f"[AI KeywordGen] '{career_name}' → 폴백 키워드: {keywords}")
        return keywords[:5]

    async def recalculate_for_new_jobs(self, job_listing_ids: List[int]) -> Dict:
        """
        새로운 채용공고가 추가되었을 때, 모든 사용자에 대해 해당 공고 추천 여부를 계산합니다.

        Args:
            job_listing_ids: 새로 추가된 채용공고 ID 리스트

        Returns:
            계산 결과
        """
        # TODO: 구현 필요 (선택적 기능)
        # 새 공고가 추가되면 모든 사용자에게 해당 공고를 추천할지 간단히 판단
        pass

    def _get_active_users_with_career_analysis(self) -> List[Dict]:
        """커리어 분석이 완료된 활성 사용자 조회"""
        try:
            # 최근 30일 이내 분석된 사용자만 대상
            query = """
                SELECT DISTINCT u.user_id
                FROM users u
                INNER JOIN career_sessions cs ON u.user_id = cs.user_id
                INNER JOIN career_analyses ca ON cs.id = ca.session_id
                WHERE u.is_active = TRUE
                AND ca.analyzed_at >= NOW() - INTERVAL 30 DAY
                ORDER BY ca.analyzed_at DESC
            """
            return self.db.execute_query(query)
        except Exception as e:
            print(f"[JobRecommendationCalculator] 사용자 조회 실패: {e}")
            return []

    def _get_user_career_analysis(self, user_id: int) -> Optional[Dict]:
        """사용자의 프로필 분석 + 직업 추천 데이터 조회"""
        try:
            # 1. profile_analysis 테이블에서 성향 프로파일링 조회
            profile_query = """
                SELECT *
                FROM profile_analysis
                WHERE user_id = %s
                LIMIT 1
            """
            profile_results = self.db.execute_query(profile_query, (user_id,))

            if not profile_results:
                print(f"[JobRecommendationCalculator] 사용자 {user_id}의 프로필 분석 데이터가 없습니다.")
                return None

            analysis = profile_results[0]
            print(f"[JobRecommendationCalculator] 프로필 분석 데이터 조회 성공: user_id={user_id}")

            # 2. job_recommendations 테이블에서 추천 직업 조회
            job_rec_query = """
                SELECT job_name, job_code, match_score, category, description
                FROM job_recommendations
                WHERE user_id = %s
                ORDER BY match_score DESC
                LIMIT 10
            """
            job_results = self.db.execute_query(job_rec_query, (user_id,))

            recommended_careers = []
            if job_results:
                print(f"[JobRecommendationCalculator] 사용자 {user_id}의 추천 직업 {len(job_results)}개 조회됨")
                for job in job_results:
                    recommended_careers.append({
                        "careerName": job.get("job_name"),
                        "jobCode": job.get("job_code"),
                        "matchScore": job.get("match_score"),
                        "category": job.get("category"),
                        "description": job.get("description")
                    })
            else:
                print(f"[JobRecommendationCalculator] 사용자 {user_id}의 추천 직업이 없습니다.")

            # JSON 필드 파싱
            personality = self._parse_json_field(analysis.get("personality")) or {}
            values = self._parse_json_field(analysis.get("values")) or {}
            interests = self._parse_json_field(analysis.get("interests"))
            strengths = self._parse_json_field(analysis.get("strengths")) or []
            goals = self._parse_json_field(analysis.get("goals")) or []

            # interests가 문자열이면 리스트로 변환
            if isinstance(interests, str):
                interests = [i.strip() for i in interests.split(",") if i.strip()]
            elif not interests:
                interests = []

            return {
                "recommendedCareers": recommended_careers,
                "strengths": strengths if strengths else list(personality.keys())[:3],
                "interests": interests,
                "personalityType": analysis.get("mbti"),
                "personality": personality,
                "values": values,
                "goals": goals,
                "summary": analysis.get("summary")
            }

        except Exception as e:
            print(f"[JobRecommendationCalculator] 프로필 분석 조회 실패: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _parse_json_field(self, field_value) -> any:
        """JSON 필드 파싱"""
        if field_value is None:
            return None
        if isinstance(field_value, str):
            try:
                return json.loads(field_value)
            except:
                return field_value
        return field_value

    def _save_recommendations(self, user_id: int, recommendations: List[Dict]) -> int:
        """추천 결과를 DB에 저장"""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()

                # 기존 추천 삭제 (새로 계산된 결과로 덮어쓰기)
                delete_query = "DELETE FROM user_job_recommendations WHERE user_id = %s"
                cursor.execute(delete_query, (user_id,))

                # 새 추천 삽입 (PostgreSQL 문법)
                insert_query = """
                    INSERT INTO user_job_recommendations (
                        user_id, job_listing_id, match_score, match_reason,
                        recommendation_data, calculated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, job_listing_id) DO UPDATE SET
                        match_score = EXCLUDED.match_score,
                        match_reason = EXCLUDED.match_reason,
                        recommendation_data = EXCLUDED.recommendation_data,
                        calculated_at = EXCLUDED.calculated_at,
                        updated_at = CURRENT_TIMESTAMP
                """

                saved_count = 0
                for rec in recommendations:
                    try:
                        job_id = rec.get("id")
                        if not job_id:
                            continue

                        match_score = rec.get("matchScore", 0)
                        
                        # DB precision(5,2) safety check (max 999.99)
                        # Ensure score is within valid range 0-100
                        if match_score > 100:
                            match_score = 100
                        elif match_score < 0:
                            match_score = 0
                            
                        match_reason = rec.get("matchReason", "")
                        recommendation_data = json.dumps(rec, ensure_ascii=False)

                        cursor.execute(insert_query, (
                            user_id,
                            job_id,
                            match_score,
                            match_reason,
                            recommendation_data,
                            datetime.now()
                        ))
                        saved_count += 1

                    except Exception as e:
                        print(f"[JobRecommendationCalculator] 추천 저장 실패 (job_id={rec.get('id')}): {e}")
                        continue

                conn.commit()
                return saved_count

        except Exception as e:
            print(f"[JobRecommendationCalculator] DB 저장 실패: {e}")
            import traceback
            traceback.print_exc()
            return 0

    def cleanup_old_recommendations(self, days: int = 30) -> int:
        """오래된 추천 데이터 정리"""
        try:
            query = """
                DELETE FROM user_job_recommendations
                WHERE calculated_at < NOW() - INTERVAL %s DAY
            """
            return self.db.execute_update(query, (days,))
        except Exception as e:
            print(f"[JobRecommendationCalculator] 오래된 데이터 정리 실패: {e}")
            return 0


# 동기 실행 헬퍼 함수
def calculate_all_recommendations_sync(**kwargs) -> Dict:
    """동기적으로 모든 사용자 추천 계산 (스케줄러용)"""
    calculator = JobRecommendationCalculator()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            calculator.calculate_all_user_recommendations(**kwargs)
        )
    finally:
        loop.close()


def calculate_user_recommendations_sync(user_id: int, **kwargs) -> Dict:
    """동기적으로 특정 사용자 추천 계산"""
    calculator = JobRecommendationCalculator()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            calculator.calculate_user_recommendations(user_id, **kwargs)
        )
    finally:
        loop.close()
