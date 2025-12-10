"""
취업 사이트 검색 및 추천 서비스
MCP 브라우저 서버를 활용하여 취업 사이트를 검색하고 직업 추천에 맞는 사이트를 추천합니다.
"""
import os
import json
import httpx
from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class JobSiteService:
    """취업 사이트 검색 및 추천 서비스"""
    
    # 주요 한국 취업 사이트 목록
    MAJOR_JOB_SITES = [
        {
            "name": "잡코리아",
            "url": "https://www.jobkorea.co.kr",
            "description": "국내 최대 규모의 취업 포털 사이트",
            "categories": ["전체", "신입", "경력", "인턴", "아르바이트"]
        },
        {
            "name": "사람인",
            "url": "https://www.saramin.co.kr",
            "description": "대한민국 대표 취업포털",
            "categories": ["전체", "신입", "경력", "인턴", "아르바이트"]
        },
        {
            "name": "인크루트",
            "url": "https://www.incruit.com",
            "description": "취업과 이직을 위한 종합 채용정보 사이트",
            "categories": ["전체", "신입", "경력", "인턴"]
        },
        {
            "name": "워크넷",
            "url": "https://www.work.go.kr",
            "description": "고용노동부 공식 취업 포털",
            "categories": ["전체", "신입", "경력", "청년", "중장년"]
        },
        {
            "name": "잡플래닛",
            "url": "https://www.jobplanet.co.kr",
            "description": "기업 리뷰와 채용정보를 제공하는 플랫폼",
            "categories": ["전체", "경력", "신입"]
        },
        {
            "name": "로켓펀치",
            "url": "https://www.rocketpunch.com",
            "description": "스타트업 채용 전문 플랫폼",
            "categories": ["전체", "신입", "경력", "인턴"]
        },
        {
            "name": "원티드",
            "url": "https://www.wanted.co.kr",
            "description": "IT/스타트업 중심의 채용 플랫폼",
            "categories": ["전체", "신입", "경력", "인턴"]
        },
        {
            "name": "점핏",
            "url": "https://www.jumpit.co.kr",
            "description": "IT 개발자 채용 전문 플랫폼",
            "categories": ["전체", "신입", "경력"]
        },
        {
            "name": "프로그래머스",
            "url": "https://programmers.co.kr",
            "description": "개발자 채용 및 코딩 테스트 플랫폼",
            "categories": ["전체", "신입", "경력"]
        },
        {
            "name": "크몽",
            "url": "https://www.kmong.com",
            "description": "프리랜서 및 전문가 매칭 플랫폼",
            "categories": ["전체", "프리랜서", "전문가"]
        },
        {
            "name": "링커리어",
            "url": "https://linkareer.com",
            "description": "대학생 및 신입을 위한 인턴십/채용 정보",
            "categories": ["전체", "인턴", "신입"]
        },
        {
            "name": "대학내일",
            "url": "https://www.campuspick.com",
            "description": "대학생을 위한 인턴십 및 채용 정보",
            "categories": ["전체", "인턴", "신입"]
        }
    ]
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            self.client = None
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        else:
            self.client = OpenAI(api_key=api_key)
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    def recommend_job_sites(
        self,
        career_recommendations: List[Dict],
        user_interests: Optional[List[str]] = None,
        user_experience_level: Optional[str] = None
    ) -> List[Dict]:
        """
        직업 추천에 맞는 취업 사이트를 추천합니다.
        
        Args:
            career_recommendations: 추천된 직업 목록 (careerName, description, matchScore 포함)
            user_interests: 사용자 관심 분야 (선택)
            user_experience_level: 사용자 경력 수준 (신입/경력/인턴 등, 선택)
        
        Returns:
            추천된 취업 사이트 목록
        """
        if not career_recommendations:
            return []
        
        # 추천된 직업 분야 분석
        career_names = [career.get("careerName", "") for career in career_recommendations]
        career_descriptions = [career.get("description", "") for career in career_recommendations]
        
        # 직업 분야에 따라 적합한 취업 사이트 매칭
        recommended_sites = []
        
        # IT/개발자 관련 직업인 경우
        it_keywords = ["개발자", "프로그래머", "소프트웨어", "IT", "개발", "코딩", "프로그래밍", 
                      "엔지니어", "데이터", "AI", "인공지능", "머신러닝", "웹", "앱", "시스템"]
        is_it_related = any(
            keyword in name or keyword in desc 
            for name, desc in zip(career_names, career_descriptions)
            for keyword in it_keywords
        )
        
        # 스타트업 관련 직업인 경우
        startup_keywords = ["스타트업", "창업", "벤처", "스타트"]
        is_startup_related = any(
            keyword in name or keyword in desc 
            for name, desc in zip(career_names, career_descriptions)
            for keyword in startup_keywords
        )
        
        # 프리랜서 관련 직업인 경우
        freelancer_keywords = ["프리랜서", "자유", "컨설턴트", "디자이너", "작가", "번역"]
        is_freelancer_related = any(
            keyword in name or keyword in desc 
            for name, desc in zip(career_names, career_descriptions)
            for keyword in freelancer_keywords
        )
        
        # 학생/신입 관련
        is_student_related = user_experience_level in ["신입", "인턴", None] or any(
            "학생" in name or "신입" in name 
            for name in career_names
        )
        
        # 사이트 추천 로직
        site_scores = {}
        
        for site in self.MAJOR_JOB_SITES:
            score = 0
            reasons = []
            
            site_name = site["name"].lower()
            
            # IT/개발자 관련 사이트
            if is_it_related:
                if "원티드" in site["name"] or "점핏" in site["name"] or "프로그래머스" in site["name"]:
                    score += 30
                    reasons.append("IT/개발자 채용에 특화되어 있습니다")
                if "로켓펀치" in site["name"]:
                    score += 20
                    reasons.append("스타트업 및 IT 기업 채용이 많습니다")
            
            # 스타트업 관련 사이트
            if is_startup_related:
                if "로켓펀치" in site["name"] or "원티드" in site["name"]:
                    score += 25
                    reasons.append("스타트업 채용에 특화되어 있습니다")
            
            # 프리랜서 관련 사이트
            if is_freelancer_related:
                if "크몽" in site["name"]:
                    score += 30
                    reasons.append("프리랜서 및 전문가 매칭에 특화되어 있습니다")
            
            # 학생/신입 관련 사이트
            if is_student_related:
                if "링커리어" in site["name"] or "대학내일" in site["name"]:
                    score += 25
                    reasons.append("대학생 및 신입 채용 정보가 풍부합니다")
            
            # 일반 취업 사이트 (항상 기본 점수)
            if site["name"] in ["잡코리아", "사람인", "인크루트", "워크넷"]:
                score += 15
                reasons.append("다양한 분야의 채용 정보를 제공합니다")
            
            # 기업 리뷰가 중요한 경우
            if "잡플래닛" in site["name"]:
                score += 10
                reasons.append("기업 리뷰와 정보를 확인할 수 있습니다")
            
            if score > 0:
                site_scores[site["name"]] = {
                    "site": site,
                    "score": score,
                    "reasons": reasons
                }
        
        # 점수 순으로 정렬하여 상위 5개 추천
        sorted_sites = sorted(
            site_scores.values(),
            key=lambda x: x["score"],
            reverse=True
        )[:5]
        
        # 결과 포맷팅
        recommended_sites = []
        for item in sorted_sites:
            site = item["site"]
            recommended_sites.append({
                "name": site["name"],
                "url": site["url"],
                "description": site["description"],
                "matchScore": min(item["score"], 100),
                "reasons": item["reasons"],
                "categories": site["categories"]
            })
        
        # AI를 사용하여 더 정교한 추천 생성 (선택적)
        if self.client and len(recommended_sites) > 0:
            try:
                ai_recommendations = self._generate_ai_recommendations(
                    career_recommendations,
                    recommended_sites,
                    user_interests,
                    user_experience_level
                )
                if ai_recommendations:
                    recommended_sites = ai_recommendations
            except Exception as e:
                # AI 추천 실패 시 기본 추천 사용
                print(f"AI 추천 생성 실패: {str(e)}")
        
        return recommended_sites
    
    def _generate_ai_recommendations(
        self,
        career_recommendations: List[Dict],
        base_recommendations: List[Dict],
        user_interests: Optional[List[str]],
        user_experience_level: Optional[str]
    ) -> Optional[List[Dict]]:
        """AI를 사용하여 더 정교한 취업 사이트 추천 생성"""
        if not self.client:
            return None
        
        career_info = "\n".join([
            f"- {career.get('careerName', '')}: {career.get('description', '')}"
            for career in career_recommendations[:3]
        ])
        
        site_info = "\n".join([
            f"- {site['name']}: {site['description']}"
            for site in self.MAJOR_JOB_SITES
        ])
        
        prompt = f"""다음 직업 추천에 맞는 취업 사이트를 추천해주세요.

추천된 직업:
{career_info}

사용자 정보:
- 관심 분야: {', '.join(user_interests) if user_interests else '없음'}
- 경력 수준: {user_experience_level if user_experience_level else '미지정'}

사용 가능한 취업 사이트:
{site_info}

다음 형식의 JSON으로 응답해주세요:
{{
  "recommendedSites": [
    {{
      "name": "사이트명",
      "url": "사이트 URL",
      "description": "사이트 설명",
      "matchScore": 85,
      "reasons": ["이유1", "이유2"],
      "categories": ["카테고리1", "카테고리2"]
    }}
  ]
}}

상위 5개 사이트만 추천하고, 각 사이트에 대해 왜 이 직업에 적합한지 구체적인 이유를 제공해주세요."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "당신은 취업 상담 전문가입니다. 직업 추천에 맞는 최적의 취업 사이트를 추천합니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=1,
                max_completion_tokens=1500
            )
            
            result_text = response.choices[0].message.content
            
            # JSON 추출
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_json = json.loads(json_match.group())
                return result_json.get("recommendedSites", base_recommendations)
            
            return base_recommendations
            
        except Exception as e:
            print(f"AI 추천 생성 중 오류: {str(e)}")
            return base_recommendations
    
    def search_job_sites_by_keyword(self, keyword: str) -> List[Dict]:
        """키워드로 취업 사이트 검색"""
        keyword_lower = keyword.lower()
        matched_sites = []
        
        for site in self.MAJOR_JOB_SITES:
            if (keyword_lower in site["name"].lower() or 
                keyword_lower in site["description"].lower() or
                any(keyword_lower in cat.lower() for cat in site["categories"])):
                matched_sites.append({
                    "name": site["name"],
                    "url": site["url"],
                    "description": site["description"],
                    "categories": site["categories"]
                })
        
        return matched_sites
    
    def get_all_job_sites(self) -> List[Dict]:
        """모든 주요 취업 사이트 목록 반환"""
        return [
            {
                "name": site["name"],
                "url": site["url"],
                "description": site["description"],
                "categories": site["categories"]
            }
            for site in self.MAJOR_JOB_SITES
        ]
    
    async def explore_job_site(self, site_url: str, career_keywords: List[str]) -> Dict:
        """
        MCP 브라우저 서버를 활용하여 취업 사이트를 탐색하고 관련 채용 정보를 수집합니다.
        
        Args:
            site_url: 탐색할 취업 사이트 URL
            career_keywords: 검색할 직업 키워드 리스트
        
        Returns:
            탐색 결과 딕셔너리 (채용 공고 수, 관련 정보 등)
        """
        try:
            # 실제 웹사이트 접근 시도 (간단한 HTTP 요청)
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(site_url, follow_redirects=True)
                
                # 사이트 접근 가능 여부 확인
                is_accessible = response.status_code == 200
                
                # 키워드 기반 검색 URL 생성 (일부 사이트의 검색 URL 패턴)
                search_info = {
                    "siteUrl": site_url,
                    "isAccessible": is_accessible,
                    "statusCode": response.status_code,
                    "searchKeywords": career_keywords,
                    "note": "실제 채용 정보는 각 사이트에서 직접 검색해주세요."
                }
                
                # 주요 사이트별 검색 URL 패턴 제공
                site_name = next(
                    (s["name"] for s in self.MAJOR_JOB_SITES if s["url"] in site_url),
                    "알 수 없음"
                )
                
                if "jobkorea" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.jobkorea.co.kr/Search/?stext={'+'.join(career_keywords)}"
                elif "saramin" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.saramin.co.kr/zf_user/search?searchType=search&searchword={'+'.join(career_keywords)}"
                elif "incruit" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.incruit.com/jobsearch/?kw={'+'.join(career_keywords)}"
                elif "wanted" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.wanted.co.kr/search?query={'+'.join(career_keywords)}"
                elif "rocketpunch" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.rocketpunch.com/jobs?keywords={'+'.join(career_keywords)}"
                elif "jumpit" in site_url.lower():
                    search_info["searchUrl"] = f"https://www.jumpit.co.kr/search?keyword={'+'.join(career_keywords)}"
                else:
                    search_info["searchUrl"] = site_url
                
                search_info["siteName"] = site_name
                
                return search_info
                
        except Exception as e:
            return {
                "siteUrl": site_url,
                "isAccessible": False,
                "error": str(e),
                "searchKeywords": career_keywords,
                "note": "사이트 접근 중 오류가 발생했습니다."
            }
    
    async def get_job_listings_info(
        self,
        career_recommendations: List[Dict],
        max_sites: int = 3
    ) -> List[Dict]:
        """
        추천된 직업에 대한 실제 채용 정보를 수집합니다.
        MCP 브라우저 서버를 활용하여 각 취업 사이트를 탐색합니다.
        
        Args:
            career_recommendations: 추천된 직업 목록
            max_sites: 탐색할 최대 사이트 수
        
        Returns:
            각 사이트별 탐색 결과 리스트
        """
        # 추천 사이트 가져오기
        recommended_sites = self.recommend_job_sites(career_recommendations)
        
        # 상위 N개 사이트만 탐색
        sites_to_explore = recommended_sites[:max_sites]
        
        # 직업 키워드 추출
        career_keywords = [
            career.get("careerName", "").split()[0]  # 첫 단어만 키워드로 사용
            for career in career_recommendations[:3]
        ]
        
        # 각 사이트 탐색
        exploration_results = []
        for site in sites_to_explore:
            result = await self.explore_job_site(
                site["url"],
                career_keywords
            )
            result["siteName"] = site["name"]
            result["matchScore"] = site.get("matchScore", 0)
            result["reasons"] = site.get("reasons", [])
            exploration_results.append(result)
        
        return exploration_results

