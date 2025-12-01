"""
채용 공고 추천 AI 에이전트

기존 방식: 개발자가 순서를 정해놓고 실행
에이전트 방식: LLM이 직접 필요한 도구를 선택하고 실행

사용 가능한 도구:
- get_user_profile: 사용자 프로필/커리어 분석 조회
- search_jobs: 채용공고 검색
- search_jobs_by_keyword: 키워드로 채용공고 검색
- get_certifications: 자격증 정보 조회
- analyze_job_match: 채용공고와 사용자 매칭 분석
- generate_report: 최종 결과 리포트 생성
"""
import os
import json
import re
from typing import List, Dict, Optional
from openai import OpenAI
from services.database_service import DatabaseService
from services.qnet_api_service import QnetApiService


class JobRecommendationAgent:
    """
    채용 공고 추천 AI 에이전트

    LLM이 직접 도구를 선택하고 실행하는 구조
    """

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()
        self.qnet_service = QnetApiService()

        # 에이전트가 사용할 수 있는 도구 정의
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_user_profile",
                    "description": "사용자의 프로필과 커리어 분석 결과를 조회합니다. 추천 직업, 강점, 가치관, 관심사, 스킬 정보를 포함합니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "integer",
                                "description": "사용자 ID"
                            }
                        },
                        "required": ["user_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_jobs",
                    "description": "DB에서 최신 채용공고를 검색합니다. 최근 7일 이내 공고를 가져옵니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "integer",
                                "description": "가져올 공고 수 (기본값: 20)"
                            }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_jobs_by_keyword",
                    "description": "키워드로 채용공고를 검색합니다. 제목이나 설명에 키워드가 포함된 공고를 찾습니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "keyword": {
                                "type": "string",
                                "description": "검색 키워드 (예: 백엔드, 프론트엔드, 데이터)"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "가져올 공고 수 (기본값: 10)"
                            }
                        },
                        "required": ["keyword"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_certifications",
                    "description": "직업이나 키워드에 관련된 자격증 정보를 조회합니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "keyword": {
                                "type": "string",
                                "description": "자격증 검색 키워드 (예: 정보처리, 전기, 회계)"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "가져올 자격증 수 (기본값: 5)"
                            }
                        },
                        "required": ["keyword"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "analyze_job_match",
                    "description": "사용자 프로필과 채용공고의 매칭도를 분석합니다. 적합도 점수와 이유를 반환합니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_profile": {
                                "type": "object",
                                "description": "사용자 프로필 정보"
                            },
                            "job": {
                                "type": "object",
                                "description": "채용공고 정보"
                            }
                        },
                        "required": ["user_profile", "job"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_report",
                    "description": "수집한 정보를 바탕으로 최종 추천 리포트를 생성합니다.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "recommendations": {
                                "type": "array",
                                "items": {"type": "object"},
                                "description": "추천 채용공고 목록"
                            },
                            "certifications": {
                                "type": "array",
                                "items": {"type": "object"},
                                "description": "추천 자격증 목록"
                            },
                            "user_profile": {
                                "type": "object",
                                "description": "사용자 프로필"
                            }
                        },
                        "required": ["recommendations"]
                    }
                }
            }
        ]

        # 에이전트 실행 중 수집된 데이터 저장
        self.context = {}

    # ==================== 프로필 체크 ====================

    def _check_profile_in_db(self, user_id: int) -> Optional[Dict]:
        """
        DB에서 사용자의 커리어 분석 결과 조회

        Args:
            user_id: 사용자 ID

        Returns:
            커리어 분석 결과 또는 None
        """
        try:
            # career_analysis 테이블에서 조회
            query = """
                SELECT analysis_data
                FROM career_analysis
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
            """
            results = self.db_service.execute_query(query, (user_id,))

            if results and results[0][0]:
                analysis_data = results[0][0]
                # JSON 문자열이면 파싱
                if isinstance(analysis_data, str):
                    return json.loads(analysis_data)
                return analysis_data

            return None

        except Exception as e:
            print(f"DB 프로필 조회 실패: {str(e)}")
            return None

    # ==================== 에이전트 메인 실행 ====================

    async def run(
        self,
        user_request: str,
        user_id: int,
        career_analysis: Optional[Dict] = None,
        user_profile: Optional[Dict] = None,
        force_without_profile: bool = False
    ) -> Dict:
        """
        에이전트 실행 - LLM이 알아서 도구를 선택하고 실행

        Args:
            user_request: 사용자 요청 (자연어)
            user_id: 사용자 ID
            career_analysis: 커리어 분석 결과 (선택)
            user_profile: 사용자 프로필 (선택)
            force_without_profile: 프로필 없이 강제 진행 여부

        Returns:
            에이전트 실행 결과
        """
        # 1단계: 프로파일링 체크
        has_profile = bool(career_analysis and career_analysis.get("recommendedCareers"))

        if not has_profile and not force_without_profile:
            # DB에서 프로필 조회 시도
            db_profile = self._check_profile_in_db(user_id)
            if db_profile:
                career_analysis = db_profile
                has_profile = True

        # 프로필이 없고 강제 진행도 아니면 안내 메시지 반환
        if not has_profile and not force_without_profile:
            return {
                "success": False,
                "needsProfile": True,
                "message": "맞춤 채용 추천을 위해 커리어 분석이 필요합니다.",
                "guidance": "커리어 채팅을 통해 성향 분석을 먼저 진행해주세요.",
                "alternativeAction": "프로필 없이 진행하려면 관심 있는 직종을 알려주세요. (예: '백엔드 개발자 채용공고 찾아줘')",
                "context": {}
            }

        # 컨텍스트 초기화
        self.context = {
            "user_id": user_id,
            "career_analysis": career_analysis,
            "user_profile": user_profile,
            "has_profile": has_profile,
            "jobs": [],
            "certifications": [],
            "recommendations": []
        }

        # 시스템 프롬프트 (자유 선택 방식)
        if has_profile:
            system_prompt = """너는 채용 추천 AI 에이전트야.
사용자의 요청을 분석하고, 필요한 도구를 자유롭게 선택해서 실행해.

사용 가능한 도구:
- get_user_profile: 사용자 프로필/커리어 분석 결과 조회. 추천 직업, 적합한 직무 등 파악할 때 사용.
- search_jobs_by_keyword: 키워드로 채용공고 검색. 특정 직무나 기술에 맞는 공고 찾을 때 사용.
- get_certifications: 자격증 정보 조회. 직무 관련 자격증 추천이 필요할 때 사용.
- generate_report: 최종 결과 리포트 생성. 모든 정보를 종합해서 사용자에게 전달할 때 사용.

도구 사용 가이드:
- 상황에 맞게 필요한 도구만 선택해서 사용해.
- 같은 도구를 여러 번 호출할 수 있어 (예: 여러 키워드로 검색).
- 사용자가 원하는 정보를 얻으면 generate_report로 마무리해.
- 프로필 정보가 필요하면 get_user_profile을 호출해.
- 특정 직무에 대한 채용공고가 필요하면 search_jobs_by_keyword를 호출해.
- 자격증 정보가 필요하면 get_certifications를 호출해.

예시:
- "개발자 채용 보여줘" → search_jobs_by_keyword("개발자") → generate_report
- "내 프로필에 맞는 공고" → get_user_profile → search_jobs_by_keyword(추천 직업) → generate_report
- "백엔드 개발자에게 필요한 자격증" → get_certifications("백엔드") → generate_report
"""
        else:
            system_prompt = """너는 채용 추천 AI 에이전트야.
사용자의 요청을 분석하고, 필요한 도구를 자유롭게 선택해서 실행해.

사용 가능한 도구:
- search_jobs_by_keyword: 키워드로 채용공고 검색. 특정 직무나 기술에 맞는 공고 찾을 때 사용.
- get_certifications: 자격증 정보 조회. 직무 관련 자격증 추천이 필요할 때 사용.
- generate_report: 최종 결과 리포트 생성. 모든 정보를 종합해서 사용자에게 전달할 때 사용.

도구 사용 가이드:
- 상황에 맞게 필요한 도구만 선택해서 사용해.
- 같은 도구를 여러 번 호출할 수 있어 (예: 여러 키워드로 검색).
- 사용자가 원하는 정보를 얻으면 generate_report로 마무리해.

참고:
- 사용자는 아직 커리어 분석을 완료하지 않았어.
- 결과에 "더 정확한 추천을 위해 커리어 분석을 권장합니다" 메시지를 포함해줘.

예시:
- "프론트엔드 개발자 채용 보여줘" → search_jobs_by_keyword("프론트엔드") → generate_report
- "데이터 분석가에게 필요한 자격증" → get_certifications("데이터 분석") → generate_report
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"[user_id: {user_id}] {user_request}"}
        ]

        # 에이전트 루프 (최대 10번 반복)
        max_iterations = 10

        for iteration in range(max_iterations):
            print(f"\n[에이전트] 반복 {iteration + 1}/{max_iterations}")

            # LLM 호출 - 다음 행동 결정
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                temperature=0.3
            )

            message = response.choices[0].message

            # 메시지 기록에 추가
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    } for tc in message.tool_calls
                ] if message.tool_calls else None
            })

            # 도구 호출이 없으면 최종 응답
            if not message.tool_calls:
                print("[에이전트] 완료 - 최종 응답 생성")
                return {
                    "success": True,
                    "response": message.content,
                    "context": self.context
                }

            # 도구 실행
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)

                print(f"[에이전트] 도구 호출: {tool_name}")
                print(f"[에이전트] 인자: {tool_args}")

                # 도구 실행
                result = await self._execute_tool(tool_name, tool_args)

                print(f"[에이전트] 결과: {str(result)[:200]}...")

                # 결과를 메시지에 추가
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False, default=str)
                })

        # 최대 반복 초과
        return {
            "success": False,
            "error": "최대 반복 횟수 초과",
            "context": self.context
        }

    async def _execute_tool(self, tool_name: str, args: dict) -> dict:
        """
        도구 실행

        Args:
            tool_name: 도구 이름
            args: 도구 인자

        Returns:
            도구 실행 결과
        """
        try:
            if tool_name == "get_user_profile":
                return self._tool_get_user_profile(args.get("user_id"))

            elif tool_name == "search_jobs":
                return self._tool_search_jobs(args.get("limit", 20))

            elif tool_name == "search_jobs_by_keyword":
                return self._tool_search_jobs_by_keyword(
                    args.get("keyword"),
                    args.get("limit", 10)
                )

            elif tool_name == "get_certifications":
                return self._tool_get_certifications(
                    args.get("keyword"),
                    args.get("limit", 5)
                )

            elif tool_name == "analyze_job_match":
                return await self._tool_analyze_job_match(
                    args.get("user_profile"),
                    args.get("job")
                )

            elif tool_name == "generate_report":
                return self._tool_generate_report(
                    args.get("recommendations", []),
                    args.get("certifications", []),
                    args.get("user_profile")
                )

            else:
                return {"error": f"알 수 없는 도구: {tool_name}"}

        except Exception as e:
            return {"error": f"도구 실행 실패: {str(e)}"}

    # ==================== 도구 구현 ====================

    def _tool_get_user_profile(self, user_id: int) -> dict:
        """
        도구: 사용자 프로필 조회
        """
        # 컨텍스트에 이미 있으면 반환
        if self.context.get("career_analysis"):
            profile = {
                "user_id": user_id,
                "career_analysis": self.context["career_analysis"],
                "user_profile": self.context.get("user_profile"),
                "source": "context"
            }
        else:
            # DB에서 조회 시도
            try:
                query = """
                    SELECT career_analysis_data, profile_data
                    FROM user_career_analysis
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """
                results = self.db_service.execute_query(query, (user_id,))

                if results:
                    profile = {
                        "user_id": user_id,
                        "career_analysis": results[0][0] if results[0][0] else {},
                        "user_profile": results[0][1] if results[0][1] else {},
                        "source": "database"
                    }
                else:
                    profile = {
                        "user_id": user_id,
                        "career_analysis": {},
                        "user_profile": {},
                        "source": "not_found",
                        "message": "사용자 프로필을 찾을 수 없습니다. 커리어 분석을 먼저 진행해주세요."
                    }
            except Exception as e:
                profile = {
                    "user_id": user_id,
                    "error": str(e),
                    "source": "error"
                }

        # 컨텍스트 업데이트
        self.context["user_profile_data"] = profile
        return profile

    def _tool_search_jobs(self, limit: int = 20) -> dict:
        """
        도구: 최신 채용공고 검색
        """
        try:
            query = """
                SELECT id, title, company, location, url, description, site_name, crawled_at, tech_stack, required_skills
                FROM job_listings
                WHERE crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """
            results = self.db_service.execute_query(query, (limit,))

            jobs = []
            for row in results:
                # tech_stack 파싱 (JSON 문자열 또는 None)
                tech_stack = row[8]
                if tech_stack and isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack]

                required_skills = row[9]
                if required_skills and isinstance(required_skills, str):
                    try:
                        required_skills = json.loads(required_skills)
                    except:
                        required_skills = [required_skills]

                jobs.append({
                    "id": row[0],
                    "title": row[1],
                    "company": row[2],
                    "location": row[3],
                    "url": row[4],
                    "description": (row[5] or "")[:300],  # 설명 300자로 제한
                    "site_name": row[6],
                    "tech_stack": tech_stack,
                    "required_skills": required_skills
                })

            # 컨텍스트에 저장
            self.context["jobs"] = jobs

            return {
                "total_count": len(jobs),
                "jobs": jobs
            }

        except Exception as e:
            return {"error": f"채용공고 검색 실패: {str(e)}"}

    def _tool_search_jobs_by_keyword(self, keyword: str, limit: int = 10) -> dict:
        """
        도구: 키워드로 채용공고 검색
        """
        try:
            query = """
                SELECT id, title, company, location, url, description, site_name, tech_stack, required_skills
                FROM job_listings
                WHERE (title ILIKE %s OR description ILIKE %s)
                AND crawled_at >= NOW() - INTERVAL '7 days'
                ORDER BY crawled_at DESC
                LIMIT %s
            """
            pattern = f"%{keyword}%"
            results = self.db_service.execute_query(query, (pattern, pattern, limit))

            jobs = []
            for row in results:
                # tech_stack 파싱 (JSON 문자열 또는 None)
                tech_stack = row[7]
                if tech_stack and isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack]

                required_skills = row[8]
                if required_skills and isinstance(required_skills, str):
                    try:
                        required_skills = json.loads(required_skills)
                    except:
                        required_skills = [required_skills]

                jobs.append({
                    "id": row[0],
                    "title": row[1],
                    "company": row[2],
                    "location": row[3],
                    "url": row[4],
                    "description": (row[5] or "")[:300],
                    "site_name": row[6],
                    "tech_stack": tech_stack,
                    "required_skills": required_skills,
                    "matched_keyword": keyword
                })

            # 컨텍스트에 추가
            self.context["jobs"].extend(jobs)

            return {
                "keyword": keyword,
                "total_count": len(jobs),
                "jobs": jobs
            }

        except Exception as e:
            return {"error": f"키워드 검색 실패: {str(e)}"}

    def _tool_get_certifications(self, keyword: str, limit: int = 5) -> dict:
        """
        도구: 자격증 정보 조회
        """
        try:
            certs = self.db_service.get_certifications(keyword=keyword, limit=limit)

            # 컨텍스트에 저장
            self.context["certifications"].extend(certs)

            return {
                "keyword": keyword,
                "total_count": len(certs),
                "certifications": certs
            }

        except Exception as e:
            return {"error": f"자격증 조회 실패: {str(e)}"}

    async def _tool_analyze_job_match(self, user_profile: dict, job: dict) -> dict:
        """
        도구: 사용자와 채용공고 매칭 분석
        """
        # None 체크
        if not user_profile and not job:
            # 컨텍스트에서 가져오기
            user_profile = self.context.get("career_analysis", {})
            jobs = self.context.get("jobs", [])
            if jobs:
                job = jobs[0]  # 첫 번째 공고로 분석
            else:
                return {"error": "분석할 채용공고가 없습니다. 먼저 search_jobs를 호출하세요."}

        if not job:
            return {"error": "채용공고 정보가 필요합니다."}

        # 사용자 정보가 없으면 컨텍스트에서 가져오기
        if not user_profile:
            user_profile = self.context.get("career_analysis", {})

        # 사용자 정보 요약
        user_summary = []
        if user_profile:
            if user_profile.get("recommendedCareers"):
                careers = [c.get("careerName", "") for c in user_profile["recommendedCareers"][:3]]
                user_summary.append(f"추천 직업: {', '.join(careers)}")
            if user_profile.get("strengths"):
                user_summary.append(f"강점: {', '.join(user_profile['strengths'][:3])}")
            if user_profile.get("skills"):
                user_summary.append(f"스킬: {', '.join(user_profile['skills'][:5])}")

        user_summary_str = "\n".join(user_summary) if user_summary else "정보 없음"

        prompt = f"""다음 사용자와 채용 공고의 적합도를 분석해주세요.

【사용자 정보】
{user_summary_str}

【채용 공고】
- 제목: {job.get('title', '')}
- 회사: {job.get('company', '')}
- 위치: {job.get('location', '')}
- 설명: {job.get('description', '')[:300]}

다음 JSON 형식으로 응답:
{{
  "matchScore": 85,
  "reasons": ["이유1", "이유2"],
  "requiredSkills": ["필요 스킬1", "필요 스킬2"],
  "recommendation": "추천 의견"
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "채용 매칭 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            result_text = response.choices[0].message.content
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)

            if json_match:
                result = json.loads(json_match.group())
                result["job"] = {
                    "id": job.get("id"),
                    "title": job.get("title"),
                    "company": job.get("company")
                }

                # 컨텍스트에 추천 추가
                if result.get("matchScore", 0) >= 50:
                    self.context["recommendations"].append(result)

                return result

        except Exception as e:
            return {"error": f"매칭 분석 실패: {str(e)}"}

        return {"matchScore": 50, "reasons": ["분석 실패"], "job": job}

    def _tool_generate_report(
        self,
        recommendations: list,
        certifications: list,
        user_profile: dict
    ) -> dict:
        """
        도구: 최종 결과 리포트 생성
        """
        # 컨텍스트에서 데이터 가져오기
        all_certifications = certifications or self.context.get("certifications", [])
        all_jobs = self.context.get("jobs", [])

        # 기술 스택 집계 (모든 채용공고에서 추출)
        tech_stack_count = {}
        required_skills_count = {}

        for job in all_jobs:
            # tech_stack 집계
            tech_stack = job.get("tech_stack") or []
            if isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except:
                    tech_stack = [tech_stack]

            for tech in tech_stack:
                if tech:
                    tech_stack_count[tech] = tech_stack_count.get(tech, 0) + 1

            # required_skills 집계
            required_skills = job.get("required_skills") or []
            if isinstance(required_skills, str):
                try:
                    required_skills = json.loads(required_skills)
                except:
                    required_skills = [required_skills]

            for skill in required_skills:
                if skill:
                    required_skills_count[skill] = required_skills_count.get(skill, 0) + 1

        # 상위 기술 스택 정렬 (빈도순)
        common_tech_stack = sorted(tech_stack_count.items(), key=lambda x: x[1], reverse=True)
        common_required_skills = sorted(required_skills_count.items(), key=lambda x: x[1], reverse=True)

        # jobs를 recommendations 형식으로 변환
        all_recommendations = []
        for job in all_jobs:
            job_tech_stack = job.get("tech_stack") or []
            if isinstance(job_tech_stack, str):
                try:
                    job_tech_stack = json.loads(job_tech_stack)
                except:
                    job_tech_stack = []

            all_recommendations.append({
                "jobId": str(job.get("id", "")),
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "url": job.get("url", ""),
                "description": job.get("description", ""),
                "siteName": job.get("site_name", ""),
                "techStack": job_tech_stack,
                "matchScore": 70,  # 기본 점수
                "reasons": [f"'{job.get('matched_keyword', '')}' 키워드 매칭"] if job.get("matched_keyword") else ["관련 포지션"],
                "strengths": [],
                "concerns": []
            })

        # 컨텍스트에 저장
        self.context["recommendations"] = all_recommendations

        report = {
            "summary": {
                "total_jobs_found": len(all_jobs),
                "total_recommendations": len(all_recommendations),
                "total_certifications": len(all_certifications),
                "total_unique_tech_stacks": len(tech_stack_count)
            },
            "top_recommendations": all_recommendations[:10],
            "recommended_certifications": all_certifications[:5],
            "commonRequiredTechnologies": [{"name": tech, "count": count} for tech, count in common_tech_stack[:15]],
            "commonRequiredSkills": [{"name": skill, "count": count} for skill, count in common_required_skills[:10]],
            "has_profile": self.context.get("has_profile", False),
            "generated_at": "now"
        }

        return report

    # ==================== 기존 메서드 (호환성 유지) ====================

    async def get_recommendations(
        self,
        user_id: int,
        career_analysis: Dict,
        user_profile: Optional[Dict] = None,
        limit: int = 10
    ) -> Dict:
        """
        기존 방식의 채용 추천 (호환성 유지)

        내부적으로 에이전트를 호출합니다.

        Returns:
            성공 시: {"success": True, "recommendations": [...]}
            프로필 필요 시: {"success": False, "needsProfile": True, ...}
        """
        result = await self.run(
            user_request="나에게 맞는 채용공고를 추천해주세요.",
            user_id=user_id,
            career_analysis=career_analysis,
            user_profile=user_profile
        )

        # 프로필 필요 응답
        if result.get("needsProfile"):
            return result

        # 성공
        if result.get("success"):
            recommendations = result.get("context", {}).get("recommendations", [])
            return {
                "success": True,
                "recommendations": recommendations[:limit],
                "totalCount": len(recommendations)
            }

        # 실패
        return {
            "success": False,
            "error": result.get("error", "추천 실패"),
            "recommendations": []
        }

    async def get_real_time_recommendations(
        self,
        user_id: int,
        career_keywords: List[str],
        limit: int = 5
    ) -> Dict:
        """
        실시간 채용 공고 추천 (키워드 기반)

        프로필 없이도 키워드로 검색 가능
        """
        keyword_str = ", ".join(career_keywords)
        result = await self.run(
            user_request=f"{keyword_str} 관련 채용공고를 찾아주세요.",
            user_id=user_id,
            force_without_profile=True  # 키워드 기반이므로 프로필 없이 진행
        )

        if result.get("success"):
            jobs = result.get("context", {}).get("jobs", [])
            return {
                "success": True,
                "jobs": jobs[:limit],
                "totalCount": len(jobs),
                "message": "키워드 기반 검색 결과입니다. 더 정확한 추천을 위해 커리어 분석을 권장합니다."
            }

        return {
            "success": False,
            "jobs": [],
            "error": result.get("error", "검색 실패")
        }

    async def get_recommendations_with_requirements(
        self,
        user_id: int,
        career_analysis: Dict,
        user_profile: Optional[Dict] = None,
        user_skills: Optional[List[str]] = None,
        limit: int = 10
    ) -> Dict:
        """
        채용 공고 추천 + 필요 기술/자격증 통합 분석

        내부적으로 에이전트를 호출합니다.
        """
        skills_str = ", ".join(user_skills) if user_skills else ""
        request = f"나에게 맞는 채용공고를 추천하고, 필요한 자격증도 알려주세요."
        if skills_str:
            request += f" 내 스킬: {skills_str}"

        result = await self.run(
            user_request=request,
            user_id=user_id,
            career_analysis=career_analysis,
            user_profile=user_profile
        )

        # 프로필 필요 응답
        if result.get("needsProfile"):
            return result

        # 성공
        if result.get("success"):
            context = result.get("context", {})
            jobs = context.get("jobs", [])

            # 기술 스택 집계 (모든 채용공고에서 추출)
            tech_stack_count = {}
            for job in jobs:
                tech_stack = job.get("tech_stack") or []
                if isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack]

                for tech in tech_stack:
                    if tech:
                        tech_stack_count[tech] = tech_stack_count.get(tech, 0) + 1

            # 상위 기술 스택 정렬 (빈도순)
            common_tech_stack = sorted(tech_stack_count.items(), key=lambda x: x[1], reverse=True)

            return {
                "success": True,
                "recommendations": context.get("recommendations", [])[:limit],
                "totalCount": len(context.get("recommendations", [])),
                "commonRequiredTechnologies": [{"name": tech, "count": count} for tech, count in common_tech_stack[:15]],
                "commonRequiredCertifications": context.get("certifications", [])[:10],
                "overallLearningPath": []
            }

        # 실패
        return {
            "success": False,
            "recommendations": [],
            "totalCount": 0,
            "commonRequiredTechnologies": [],
            "commonRequiredCertifications": [],
            "overallLearningPath": []
        }
