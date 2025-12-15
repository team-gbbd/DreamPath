"""
목표 기업 인재상 분석 AI 에이전트
사용자가 목표로 하는 기업의 인재상, 핵심 역량, 채용 기준을 분석합니다.

기능:
1. 기업명 입력 시 해당 기업의 인재상 자동 분석
2. 채용공고에서 자격요건, 우대사항 추출
3. 기업문화, 핵심가치 분석
4. 사용자 역량과 인재상 매칭도 분석
"""
import os
import re
import json
from typing import List, Dict, Optional
from openai import OpenAI
from services.database_service import DatabaseService


class CompanyTalentAgent:
    """목표 기업 인재상 분석 AI 에이전트"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.db_service = DatabaseService()

    # ==================== 기업 인재상 분석 ====================

    async def analyze_company_talent(
        self,
        company_name: str,
        user_profile: Optional[Dict] = None,
        career_analysis: Optional[Dict] = None
    ) -> Dict:
        """
        기업의 인재상을 종합 분석합니다.

        Args:
            company_name: 분석할 기업명
            user_profile: 사용자 프로필 (선택)
            career_analysis: 커리어 분석 결과 (선택)

        Returns:
            기업 인재상 분석 결과
        """
        # 1. DB에서 해당 기업의 채용공고 및 정보 조회
        company_data = await self._get_company_data(company_name)

        # 2. AI로 인재상 분석 (사용자 데이터 포함)
        talent_analysis = await self._analyze_talent_requirements(
            company_name, company_data, user_profile, career_analysis
        )

        # 3. 사용자 매칭 분석 (프로필이 있는 경우)
        matching_result = None
        if user_profile or career_analysis:
            matching_result = await self._analyze_user_matching(
                talent_analysis, user_profile, career_analysis
            )

        return {
            "companyName": company_name,
            "companyInfo": company_data.get("company_info", {}),
            "talentAnalysis": talent_analysis,
            "userMatching": matching_result,
            "jobPostings": company_data.get("job_postings", [])[:5],  # 최근 5개
            "analyzedAt": self._get_current_time()
        }

    async def _get_company_data(self, company_name: str) -> Dict:
        """DB에서 기업 관련 데이터 조회"""
        try:
            # 1. 기업 정보 조회
            company_info_query = """
                SELECT
                    company_id, company_name, industry, description,
                    employee_count, established_year, homepage_url,
                    address, company_type, revenue, ceo_name,
                    average_salary, benefits, vision, capital
                FROM company_info
                WHERE company_name ILIKE %s
                ORDER BY updated_at DESC
                LIMIT 1
            """
            company_results = self.db_service.execute_query(
                company_info_query, (f"%{company_name}%",)
            )

            company_info = {}
            if company_results:
                row = company_results[0]
                company_info = {
                    "companyId": row.get("company_id"),
                    "companyName": row.get("company_name"),
                    "industry": row.get("industry"),
                    "description": row.get("description"),
                    "employeeCount": row.get("employee_count"),
                    "establishedYear": row.get("established_year"),
                    "homepageUrl": row.get("homepage_url"),
                    "address": row.get("address"),
                    "companyType": row.get("company_type"),
                    "revenue": row.get("revenue"),
                    "ceoName": row.get("ceo_name"),
                    "averageSalary": row.get("average_salary"),
                    "benefits": row.get("benefits"),
                    "vision": row.get("vision"),
                    "capital": row.get("capital")
                }

            # 2. 채용공고 조회
            job_query = """
                SELECT
                    id, title, company, location, url, description,
                    tech_stack, required_skills, site_name, crawled_at
                FROM job_listings
                WHERE company ILIKE %s
                AND crawled_at >= NOW() - INTERVAL '90 days'
                ORDER BY crawled_at DESC
                LIMIT 20
            """
            job_results = self.db_service.execute_query(
                job_query, (f"%{company_name}%",)
            )

            job_postings = []
            for row in job_results:
                tech_stack = row.get("tech_stack")
                if tech_stack and isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = [tech_stack] if tech_stack else []

                required_skills = row.get("required_skills")
                if required_skills and isinstance(required_skills, str):
                    try:
                        required_skills = json.loads(required_skills)
                    except:
                        required_skills = [required_skills] if required_skills else []

                job_postings.append({
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "url": row.get("url"),
                    "description": row.get("description"),
                    "techStack": tech_stack or [],
                    "requiredSkills": required_skills or [],
                    "siteName": row.get("site_name"),
                    "crawledAt": str(row.get("crawled_at")) if row.get("crawled_at") else None
                })

            return {
                "company_info": company_info,
                "job_postings": job_postings
            }

        except Exception as e:
            print(f"기업 데이터 조회 실패: {str(e)}")
            return {"company_info": {}, "job_postings": []}

    async def _analyze_talent_requirements(
        self,
        company_name: str,
        company_data: Dict,
        user_profile: Optional[Dict] = None,
        career_analysis: Optional[Dict] = None
    ) -> Dict:
        """AI를 사용하여 기업의 인재상 분석 (사용자 맞춤형)"""

        company_info = company_data.get("company_info", {})
        job_postings = company_data.get("job_postings", [])

        # 채용공고 요약 생성
        job_summaries = []
        all_tech_stacks = set()
        all_skills = set()

        for job in job_postings[:10]:  # 최대 10개
            job_summaries.append(f"- {job.get('title', '')}: {(job.get('description') or '')[:200]}")
            for tech in job.get('techStack', []):
                if tech:
                    all_tech_stacks.add(tech)
            for skill in job.get('requiredSkills', []):
                if skill:
                    all_skills.add(skill)

        job_summary_text = "\n".join(job_summaries) if job_summaries else "채용공고 정보 없음"
        tech_stack_text = ", ".join(list(all_tech_stacks)[:20]) if all_tech_stacks else "정보 없음"
        skills_text = ", ".join(list(all_skills)[:20]) if all_skills else "정보 없음"

        # 사용자 정보 구성 (핵심 개선!)
        user_context = self._build_user_context(user_profile, career_analysis)

        prompt = f"""다음 기업의 인재상과 채용 기준을 분석하고, 지원자에게 맞춤형 조언을 제공해주세요.

【기업 정보】
- 기업명: {company_name}
- 산업: {company_info.get('industry', '정보 없음')}
- 기업규모: {company_info.get('employeeCount', '정보 없음')}명
- 기업유형: {company_info.get('companyType', '정보 없음')}
- 기업소개: {(company_info.get('description') or '정보 없음')[:500]}
- 비전/주요사업: {company_info.get('vision', '정보 없음')}

【채용공고 요약】
{job_summary_text}

【요구 기술스택】
{tech_stack_text}

【요구 스킬】
{skills_text}

{user_context}

다음 JSON 형식으로 분석 결과를 제공해주세요:
{{
  "idealCandidate": {{
    "summary": "이 기업이 원하는 인재상 한 문장 요약 (구체적으로)",
    "coreValues": ["핵심가치1", "핵심가치2", "핵심가치3"],
    "keyTraits": ["원하는 인재 특성1", "특성2", "특성3", "특성4", "특성5"]
  }},
  "requirements": {{
    "essential": [
      {{"category": "학력/전공", "items": ["구체적 요구사항1", "요구사항2"]}},
      {{"category": "경력", "items": ["구체적 경력 요구사항"]}},
      {{"category": "기술역량", "items": ["필수 기술1", "필수 기술2", "필수 기술3"]}},
      {{"category": "자격증", "items": ["관련 자격증"]}}
    ],
    "preferred": [
      {{"category": "경험", "items": ["우대 경험1", "우대 경험2"]}},
      {{"category": "역량", "items": ["우대 역량1", "우대 역량2"]}}
    ]
  }},
  "companyCulture": {{
    "workStyle": "구체적인 업무 스타일 설명",
    "environment": "실제 근무 환경 설명",
    "growthOpportunity": "성장 기회와 커리어 패스",
    "keywords": ["문화 키워드1", "키워드2", "키워드3"]
  }},
  "hiringProcess": {{
    "steps": ["서류 전형", "코딩 테스트", "기술 면접", "임원 면접"],
    "timeline": "보통 2-4주 소요",
    "tips": "전형별 준비 팁"
  }},
  "hiringTrends": {{
    "mainPositions": ["주로 채용하는 포지션1", "포지션2", "포지션3"],
    "techFocus": ["주력 기술1", "기술2", "기술3"],
    "industryPosition": "업계에서의 위치 및 경쟁력"
  }},
  "interviewTips": [
    "구체적인 면접 준비 팁1 (예상 질문 포함)",
    "면접 준비 팁2",
    "면접 준비 팁3"
  ],
  "userSpecificAdvice": {{
    "strengthsToHighlight": ["지원자가 강조해야 할 강점"],
    "areasToImprove": ["보완이 필요한 부분"],
    "preparationPlan": ["단기 준비 사항", "중기 준비 사항"]
  }}
}}

분석 시 주의사항:
- 채용공고와 기업정보를 기반으로 실제적이고 구체적인 분석을 해주세요
- 일반적인 내용보다는 해당 기업/산업에 특화된 인사이트를 제공해주세요
- 지원자 정보가 있다면, 그에 맞춘 맞춤형 조언을 반드시 포함해주세요
- 예상 면접 질문, 실제 준비해야 할 기술 등 실질적으로 도움이 되는 정보 제공
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 기업 분석 및 채용 컨설팅 전문가입니다. 기업의 채용 정보를 분석하여 구직자에게 유용한 인사이트를 제공합니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_completion_tokens=2000
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                return result

            return self._get_default_talent_analysis()

        except Exception as e:
            print(f"인재상 분석 실패: {str(e)}")
            return self._get_default_talent_analysis()

    async def _analyze_user_matching(
        self,
        talent_analysis: Dict,
        user_profile: Optional[Dict],
        career_analysis: Optional[Dict]
    ) -> Dict:
        """사용자와 기업 인재상 매칭 분석 (상세 버전)"""

        # 사용자 정보를 더 상세하게 구성
        user_info_parts = []

        if career_analysis:
            if career_analysis.get("recommendedCareers"):
                careers = [c.get("careerName", "") for c in career_analysis["recommendedCareers"][:3] if c.get("careerName")]
                if careers:
                    user_info_parts.append(f"- AI 추천 직업: {', '.join(careers)}")

            if career_analysis.get("strengths"):
                user_info_parts.append(f"- 핵심 강점: {', '.join(career_analysis['strengths'][:5])}")

            if career_analysis.get("weaknesses"):
                user_info_parts.append(f"- 개선 필요 영역: {', '.join(career_analysis['weaknesses'][:3])}")

            if career_analysis.get("values"):
                user_info_parts.append(f"- 직업 가치관: {', '.join(career_analysis['values'][:3])}")

            if career_analysis.get("interests"):
                user_info_parts.append(f"- 관심 분야: {', '.join(career_analysis['interests'][:5])}")

            if career_analysis.get("personalityType"):
                user_info_parts.append(f"- 성격 유형: {career_analysis['personalityType']}")

            if career_analysis.get("mbti"):
                user_info_parts.append(f"- MBTI: {career_analysis['mbti']}")

        if user_profile:
            if user_profile.get("education"):
                user_info_parts.append(f"- 학력: {user_profile['education']}")
            if user_profile.get("major"):
                user_info_parts.append(f"- 전공: {user_profile['major']}")
            if user_profile.get("experience"):
                user_info_parts.append(f"- 경력: {user_profile['experience']}")
            if user_profile.get("skills"):
                skills = user_profile["skills"][:10] if isinstance(user_profile["skills"], list) else [user_profile["skills"]]
                user_info_parts.append(f"- 보유 스킬: {', '.join(skills)}")
            if user_profile.get("certifications"):
                certs = user_profile["certifications"][:5] if isinstance(user_profile["certifications"], list) else [user_profile["certifications"]]
                user_info_parts.append(f"- 자격증: {', '.join(certs)}")
            if user_profile.get("projects"):
                user_info_parts.append(f"- 프로젝트 경험: 있음")

        user_summary = "\n".join(user_info_parts) if user_info_parts else "상세 정보 없음"

        # 기업 인재상 요약
        ideal_candidate = talent_analysis.get("idealCandidate", {})
        requirements = talent_analysis.get("requirements", {})

        # 채용프로세스 정보
        hiring_process = talent_analysis.get("hiringProcess", {})
        company_culture = talent_analysis.get("companyCulture", {})

        prompt = f"""지원자와 기업의 상세 매칭 분석을 수행해주세요. 실제 데이터를 기반으로 구체적이고 실용적인 분석을 제공해주세요.

【지원자 상세 정보】
{user_summary}

【기업이 원하는 인재상】
- 인재상 요약: {ideal_candidate.get('summary', '정보 없음')}
- 핵심 가치: {', '.join(ideal_candidate.get('coreValues', [])) or '정보 없음'}
- 원하는 특성: {', '.join(ideal_candidate.get('keyTraits', [])) or '정보 없음'}

【필수 요건】
{json.dumps(requirements.get('essential', []), ensure_ascii=False, indent=2)}

【우대 사항】
{json.dumps(requirements.get('preferred', []), ensure_ascii=False, indent=2)}

【기업 문화】
- 업무 스타일: {company_culture.get('workStyle', '정보 없음')}
- 근무 환경: {company_culture.get('environment', '정보 없음')}
- 문화 키워드: {', '.join(company_culture.get('keywords', [])) or '정보 없음'}

【채용 프로세스】
- 전형 단계: {', '.join(hiring_process.get('steps', [])) or '정보 없음'}
- 예상 소요 기간: {hiring_process.get('timeline', '정보 없음')}

다음 JSON 형식으로 상세 매칭 분석 결과를 제공해주세요:
{{
  "overallMatchScore": 75,
  "matchSummary": "구체적인 매칭 결과 요약 (지원자의 실제 강점과 연계)",
  "strengthMatches": [
    {{"area": "부합하는 구체적 영역", "match": "지원자의 어떤 점이 어떻게 부합하는지 상세 설명", "score": 85}},
    {{"area": "두번째 강점 영역", "match": "상세 설명", "score": 80}}
  ],
  "gapAnalysis": [
    {{"area": "부족한 구체적 영역", "gap": "무엇이 왜 부족한지 상세 설명", "priority": "HIGH", "improvementTip": "개선 방법"}},
    {{"area": "두번째 부족 영역", "gap": "상세 설명", "priority": "MEDIUM", "improvementTip": "개선 방법"}}
  ],
  "verificationCriteria": {{
    "passLikelihood": "합격 가능성 (상/중/하)",
    "keyFactors": ["합격에 영향을 미칠 핵심 요소들"],
    "riskFactors": ["탈락 위험 요소들"]
  }},
  "hiringStatus": {{
    "competitiveness": "경쟁력 수준 설명",
    "positionInPool": "지원자 풀에서의 예상 위치"
  }},
  "actionItems": [
    {{"action": "당장 해야 할 구체적 준비 사항", "reason": "왜 필요한지", "priority": "HIGH"}},
    {{"action": "중기적 준비 사항", "reason": "이유", "priority": "MEDIUM"}},
    {{"action": "장기적 준비 사항", "reason": "이유", "priority": "LOW"}}
  ],
  "interviewPreparation": {{
    "expectedQuestions": ["예상 면접 질문1 (지원자 경험 기반)", "질문2", "질문3"],
    "answerTips": ["질문별 답변 팁"],
    "technicalTopics": ["준비해야 할 기술 주제들"]
  }},
  "fitAssessment": {{
    "cultureFit": "문화 적합도 상세 설명 (구체적 근거 포함)",
    "skillFit": "역량 적합도 상세 설명",
    "growthPotential": "이 회사에서의 성장 가능성과 커리어 전망"
  }}
}}

분석 시 반드시:
- 지원자의 실제 데이터를 기반으로 구체적인 분석 제공
- 일반론이 아닌 해당 지원자에게 특화된 조언 제공
- 합격 가능성과 위험 요소를 솔직하게 평가
- 실제로 도움이 되는 구체적인 액션 아이템 제시
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 커리어 매칭 전문가입니다. 구직자의 역량과 기업 인재상을 분석하여 매칭도를 평가합니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_completion_tokens=1500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                return result

            return None

        except Exception as e:
            print(f"사용자 매칭 분석 실패: {str(e)}")
            return None

    # ==================== 채용공고 기반 분석 ====================

    async def analyze_job_posting(
        self,
        job_url: str = None,
        job_id: str = None,
        job_data: Dict = None
    ) -> Dict:
        """
        특정 채용공고의 요구사항 상세 분석

        Args:
            job_url: 채용공고 URL
            job_id: 채용공고 ID
            job_data: 채용공고 데이터 (직접 제공)

        Returns:
            채용공고 분석 결과
        """
        # 채용공고 데이터 가져오기
        if not job_data and job_id:
            job_data = await self._get_job_by_id(job_id)

        if not job_data:
            return {"error": "채용공고를 찾을 수 없습니다."}

        prompt = f"""다음 채용공고를 상세 분석해주세요.

【채용공고】
- 제목: {job_data.get('title', '')}
- 회사: {job_data.get('company', '')}
- 위치: {job_data.get('location', '')}
- 설명: {job_data.get('description', '')[:1000]}
- 기술스택: {', '.join(job_data.get('techStack', [])[:10])}
- 요구스킬: {', '.join(job_data.get('requiredSkills', [])[:10])}

다음 JSON 형식으로 분석 결과를 제공해주세요:
{{
  "positionSummary": "포지션 요약",
  "keyResponsibilities": ["주요 업무1", "업무2", "업무3"],
  "mustHave": [
    {{"skill": "필수 역량", "level": "요구 수준", "importance": "HIGH/MEDIUM"}}
  ],
  "niceToHave": [
    {{"skill": "우대 역량", "benefit": "있으면 좋은 이유"}}
  ],
  "expectedExperience": {{
    "years": "예상 경력 연차",
    "background": "선호하는 경력 배경"
  }},
  "culturalHints": ["이 포지션에서 중요한 문화적 요소"],
  "preparationTips": ["지원 전 준비하면 좋은 것들"],
  "questionsToPrepare": ["예상 면접 질문"]
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 채용 분석 전문가입니다. 채용공고를 분석하여 지원자에게 유용한 인사이트를 제공합니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_completion_tokens=1500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "jobInfo": job_data,
                    "analysis": result
                }

            return {"jobInfo": job_data, "analysis": {}}

        except Exception as e:
            print(f"채용공고 분석 실패: {str(e)}")
            return {"jobInfo": job_data, "analysis": {}}

    async def _get_job_by_id(self, job_id: str) -> Optional[Dict]:
        """ID로 채용공고 조회"""
        try:
            query = """
                SELECT
                    id, title, company, location, url, description,
                    tech_stack, required_skills, site_name
                FROM job_listings
                WHERE id = %s
            """
            results = self.db_service.execute_query(query, (job_id,))

            if results:
                row = results[0]
                tech_stack = row.get("tech_stack")
                if tech_stack and isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except:
                        tech_stack = []

                required_skills = row.get("required_skills")
                if required_skills and isinstance(required_skills, str):
                    try:
                        required_skills = json.loads(required_skills)
                    except:
                        required_skills = []

                return {
                    "id": row.get("id"),
                    "title": row.get("title"),
                    "company": row.get("company"),
                    "location": row.get("location"),
                    "url": row.get("url"),
                    "description": row.get("description"),
                    "techStack": tech_stack or [],
                    "requiredSkills": required_skills or [],
                    "siteName": row.get("site_name")
                }

            return None

        except Exception as e:
            print(f"채용공고 조회 실패: {str(e)}")
            return None

    # ==================== 기업 비교 분석 ====================

    async def compare_companies(
        self,
        company_names: List[str],
        user_profile: Optional[Dict] = None,
        career_analysis: Optional[Dict] = None
    ) -> Dict:
        """
        여러 기업의 인재상 비교 분석

        Args:
            company_names: 비교할 기업명 목록 (최대 5개)
            user_profile: 사용자 프로필
            career_analysis: 커리어 분석 결과

        Returns:
            기업 비교 분석 결과
        """
        if len(company_names) > 5:
            company_names = company_names[:5]

        # 각 기업 분석
        company_analyses = []
        for name in company_names:
            analysis = await self.analyze_company_talent(
                name, user_profile, career_analysis
            )
            company_analyses.append(analysis)

        # 비교 분석
        comparison = await self._generate_comparison(company_analyses)

        return {
            "companies": company_analyses,
            "comparison": comparison,
            "recommendation": comparison.get("recommendation")
        }

    async def _generate_comparison(self, company_analyses: List[Dict]) -> Dict:
        """기업 간 비교 분석 생성"""

        # 비교 데이터 준비
        comparison_data = []
        for analysis in company_analyses:
            talent = analysis.get("talentAnalysis", {})
            ideal = talent.get("idealCandidate", {})
            culture = talent.get("companyCulture", {})
            matching = analysis.get("userMatching", {})

            comparison_data.append({
                "company": analysis.get("companyName"),
                "coreValues": ideal.get("coreValues", []),
                "keyTraits": ideal.get("keyTraits", []),
                "cultureKeywords": culture.get("keywords", []),
                "matchScore": matching.get("overallMatchScore") if matching else None
            })

        prompt = f"""다음 기업들의 인재상을 비교 분석해주세요.

{json.dumps(comparison_data, ensure_ascii=False, indent=2)}

다음 JSON 형식으로 비교 분석 결과를 제공해주세요:
{{
  "comparisonTable": [
    {{
      "aspect": "비교 항목 (예: 핵심가치, 업무스타일, 기술스택 등)",
      "companies": [
        {{"name": "회사명", "value": "해당 항목 값"}}
      ]
    }}
  ],
  "similarities": ["공통점1", "공통점2"],
  "differences": ["차이점1", "차이점2"],
  "recommendation": {{
    "bestFit": "가장 적합한 기업",
    "reason": "추천 이유",
    "considerations": ["고려사항1", "고려사항2"]
  }}
}}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 기업 비교 분석 전문가입니다. 여러 기업의 인재상을 비교하여 구직자의 선택을 돕습니다. 반드시 JSON으로만 응답하세요."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_completion_tokens=1500
            )

            result_text = response.choices[0].message.content

            # JSON 추출
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                return json.loads(json_match.group())

            return {}

        except Exception as e:
            print(f"비교 분석 생성 실패: {str(e)}")
            return {}

    # ==================== 검색 기능 ====================

    async def search_companies_by_criteria(
        self,
        criteria: Dict
    ) -> List[Dict]:
        """
        조건에 맞는 기업 검색

        Args:
            criteria: 검색 조건
                - industry: 산업/업종
                - companyType: 기업유형 (대기업, 중소기업, 스타트업 등)
                - techStack: 기술스택
                - location: 위치
                - minEmployees: 최소 직원수
                - culture: 문화 키워드

        Returns:
            조건에 맞는 기업 목록
        """
        try:
            conditions = []
            params = []

            if criteria.get("industry"):
                conditions.append("industry ILIKE %s")
                params.append(f"%{criteria['industry']}%")

            if criteria.get("companyType"):
                conditions.append("company_type ILIKE %s")
                params.append(f"%{criteria['companyType']}%")

            if criteria.get("location"):
                conditions.append("address ILIKE %s")
                params.append(f"%{criteria['location']}%")

            where_clause = " AND ".join(conditions) if conditions else "1=1"

            query = f"""
                SELECT DISTINCT
                    company_id, company_name, industry, description,
                    employee_count, company_type, address, homepage_url
                FROM company_info
                WHERE {where_clause}
                ORDER BY company_name
                LIMIT 20
            """

            results = self.db_service.execute_query(query, tuple(params))

            companies = []
            for row in results:
                companies.append({
                    "companyId": row.get("company_id"),
                    "companyName": row.get("company_name"),
                    "industry": row.get("industry"),
                    "description": (row.get("description") or "")[:200],
                    "employeeCount": row.get("employee_count"),
                    "companyType": row.get("company_type"),
                    "address": row.get("address"),
                    "homepageUrl": row.get("homepage_url")
                })

            return companies

        except Exception as e:
            print(f"기업 검색 실패: {str(e)}")
            return []

    # ==================== 유틸리티 ====================

    def _build_user_context(
        self,
        user_profile: Optional[Dict],
        career_analysis: Optional[Dict]
    ) -> str:
        """사용자 데이터를 AI 프롬프트용 컨텍스트로 구성"""

        if not user_profile and not career_analysis:
            return ""

        parts = ["【지원자 정보 (맞춤 분석용)】"]

        # 커리어 분석 결과에서 정보 추출
        if career_analysis:
            # 추천 직업
            if career_analysis.get("recommendedCareers"):
                careers = [c.get("careerName", "") for c in career_analysis["recommendedCareers"][:3] if c.get("careerName")]
                if careers:
                    parts.append(f"- AI 추천 직업: {', '.join(careers)}")

            # 강점
            if career_analysis.get("strengths"):
                strengths = career_analysis["strengths"][:5]
                parts.append(f"- 강점: {', '.join(strengths)}")

            # 약점/개선점
            if career_analysis.get("weaknesses"):
                weaknesses = career_analysis["weaknesses"][:3]
                parts.append(f"- 개선 필요 영역: {', '.join(weaknesses)}")

            # 가치관
            if career_analysis.get("values"):
                values = career_analysis["values"][:3]
                parts.append(f"- 직업 가치관: {', '.join(values)}")

            # 관심사
            if career_analysis.get("interests"):
                interests = career_analysis["interests"][:5]
                parts.append(f"- 관심 분야: {', '.join(interests)}")

            # 성격 유형
            if career_analysis.get("personalityType"):
                parts.append(f"- 성격 유형: {career_analysis['personalityType']}")

            # MBTI
            if career_analysis.get("mbti"):
                parts.append(f"- MBTI: {career_analysis['mbti']}")

        # 사용자 프로필에서 정보 추출
        if user_profile:
            # 학력
            if user_profile.get("education"):
                parts.append(f"- 학력: {user_profile['education']}")

            # 전공
            if user_profile.get("major"):
                parts.append(f"- 전공: {user_profile['major']}")

            # 경력
            if user_profile.get("experience"):
                parts.append(f"- 경력: {user_profile['experience']}")

            # 보유 스킬
            if user_profile.get("skills"):
                skills = user_profile["skills"][:10] if isinstance(user_profile["skills"], list) else [user_profile["skills"]]
                parts.append(f"- 보유 스킬: {', '.join(skills)}")

            # 자격증
            if user_profile.get("certifications"):
                certs = user_profile["certifications"][:5] if isinstance(user_profile["certifications"], list) else [user_profile["certifications"]]
                parts.append(f"- 자격증: {', '.join(certs)}")

            # 프로젝트 경험
            if user_profile.get("projects"):
                projects = user_profile["projects"][:3] if isinstance(user_profile["projects"], list) else [user_profile["projects"]]
                parts.append(f"- 프로젝트 경험: {', '.join(str(p) for p in projects)}")

            # 희망 직무
            if user_profile.get("desiredPosition"):
                parts.append(f"- 희망 직무: {user_profile['desiredPosition']}")

            # 희망 연봉
            if user_profile.get("desiredSalary"):
                parts.append(f"- 희망 연봉: {user_profile['desiredSalary']}")

        if len(parts) <= 1:
            return ""

        return "\n".join(parts)

    def _get_default_talent_analysis(self) -> Dict:
        """기본 인재상 분석 결과"""
        return {
            "idealCandidate": {
                "summary": "분석 중입니다.",
                "coreValues": [],
                "keyTraits": []
            },
            "requirements": {
                "essential": [],
                "preferred": []
            },
            "companyCulture": {
                "workStyle": "정보 없음",
                "environment": "정보 없음",
                "growthOpportunity": "정보 없음",
                "keywords": []
            },
            "hiringTrends": {
                "mainPositions": [],
                "techFocus": [],
                "industryPosition": "정보 없음"
            },
            "interviewTips": []
        }

    def _get_current_time(self) -> str:
        """현재 시간 반환"""
        from datetime import datetime
        return datetime.now().isoformat()
