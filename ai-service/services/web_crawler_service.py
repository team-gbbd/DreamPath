"""
웹 크롤링 서비스
MCP 브라우저 서버를 활용하여 취업 사이트에서 채용 정보를 크롤링합니다.
하루에 한 번만 업데이트되도록 캐싱 기능을 제공합니다.
IP 차단 방지를 위해 요청 간 딜레이와 재시도 로직을 포함합니다.
크롤링한 데이터는 데이터베이스에 저장됩니다.
"""
import re
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin, urlencode, quote
from services.database_service import DatabaseService
from services.company_crawler_service import CompanyCrawlerService


class CacheEntry:
    """캐시 엔트리"""
    def __init__(self, data: Dict, expires_at: datetime):
        self.data = data
        self.expires_at = expires_at
    
    def is_expired(self) -> bool:
        """캐시가 만료되었는지 확인"""
        return datetime.now() > self.expires_at


class WebCrawlerService:
    """웹 크롤링 서비스"""
    
    def __init__(self, cache_ttl_hours: int = 24, request_delay_seconds: float = 2.0):
        """
        Args:
            cache_ttl_hours: 캐시 유지 시간 (시간 단위, 기본값: 24시간 = 하루)
            request_delay_seconds: 요청 간 딜레이 시간 (초 단위, IP 차단 방지용, 기본값: 2초)
        """
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://www.google.com/"  # 자연스러운 접근처럼 보이게
        }
        # 메모리 기반 캐시 (키: 캐시 키, 값: CacheEntry)
        self.cache: Dict[str, CacheEntry] = {}
        self.cache_ttl_hours = cache_ttl_hours
        self.request_delay_seconds = request_delay_seconds
        self.last_request_time: Optional[datetime] = None  # 마지막 요청 시간 추적
        # 데이터베이스 서비스 초기화
        try:
            self.db_service = DatabaseService()
            self.company_service = CompanyCrawlerService()
        except Exception as e:
            print(f"데이터베이스 서비스 초기화 실패: {str(e)}")
            self.db_service = None
            self.company_service = None
    
    def _generate_cache_key(self, site_name: str, site_url: str, search_keyword: Optional[str] = None, max_results: int = 10) -> str:
        """캐시 키 생성"""
        key_string = f"{site_name}:{site_url}:{search_keyword or 'all'}:{max_results}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """캐시된 데이터 가져오기"""
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if not entry.is_expired():
                return entry.data
            else:
                # 만료된 캐시 제거
                del self.cache[cache_key]
        return None
    
    def _set_cached_data(self, cache_key: str, data: Dict):
        """데이터 캐시에 저장"""
        expires_at = datetime.now() + timedelta(hours=self.cache_ttl_hours)
        self.cache[cache_key] = CacheEntry(data, expires_at)
    
    def clear_expired_cache(self):
        """만료된 캐시 정리"""
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry.is_expired()
        ]
        for key in expired_keys:
            del self.cache[key]
    
    def clear_all_cache(self):
        """모든 캐시 삭제"""
        self.cache.clear()
    
    async def _wait_if_needed(self):
        """요청 간 딜레이 처리 (IP 차단 방지)"""
        if self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < self.request_delay_seconds:
                wait_time = self.request_delay_seconds - elapsed
                await asyncio.sleep(wait_time)
        self.last_request_time = datetime.now()
    
    async def crawl_wanted(
        self,
        search_keyword: Optional[str] = None,
        max_results: int = 10,
        force_refresh: bool = False
    ) -> Dict:
        """
        원티드(https://www.wanted.co.kr) 사이트에서 채용 정보를 크롤링합니다.
        하루에 한 번만 업데이트되도록 캐싱됩니다.
        
        Args:
            search_keyword: 검색 키워드 (선택)
            max_results: 최대 결과 수
            force_refresh: 캐시를 무시하고 강제로 새로 크롤링할지 여부
        
        Returns:
            크롤링 결과 딕셔너리
        """
        # 캐시 키 생성
        cache_key = self._generate_cache_key("wanted", "https://www.wanted.co.kr", search_keyword, max_results)
        
        print(f"[원티드] force_refresh: {force_refresh}, cache_key: {cache_key[:16]}...")
        
        # 강제 새로고침이 아니고 캐시가 있으면 캐시 반환
        if not force_refresh:
            cached_data = self._get_cached_data(cache_key)
            if cached_data:
                print(f"[원티드] 캐시에서 데이터 반환 (총 {cached_data.get('totalResults', 0)}개)")
                cached_data["fromCache"] = True
                cached_data["cachedAt"] = self.cache[cache_key].expires_at.isoformat()
                return cached_data
            else:
                print(f"[원티드] 캐시에 데이터 없음, 새로 크롤링 시작")
        else:
            print(f"[원티드] force_refresh=True, 캐시 무시하고 새로 크롤링")
        
        try:
            base_url = "https://www.wanted.co.kr"
            search_url = f"{base_url}/wdlist" if not search_keyword else f"{base_url}/search?query={quote(search_keyword)}"
            
            print(f"[원티드] 크롤링 시작, 키워드: {search_keyword}, max_results: {max_results}")
            
            # 요청 간 딜레이 (IP 차단 방지)
            await self._wait_if_needed()
            
            async with httpx.AsyncClient(
                timeout=30.0, 
                headers=self.headers, 
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)  # 연결 제한
            ) as client:
                # 원티드는 React/Next.js 기반이므로 HTML 파싱 대신 바로 API 호출
                print(f"[원티드] API 직접 호출 시도...")
                job_listings = await self._crawl_wanted_api(client, search_keyword or "", max_results)
                
                if job_listings:
                    print(f"[원티드] API에서 {len(job_listings)}개 공고 발견")
                else:
                    print(f"[원티드] API 호출 결과 없음")
                result = {
                    "success": True,
                    "site": "wanted",
                    "searchKeyword": search_keyword,
                    "totalResults": len(job_listings),
                    "jobListings": job_listings,
                    "searchUrl": search_url,
                    "fromCache": False,
                    "cachedAt": datetime.now().isoformat()
                }
                
                print(f"[원티드] 총 {len(job_listings)}개 공고 크롤링 완료")
                
                # 데이터베이스에 저장
                if self.db_service and job_listings:
                    try:
                        saved_count = self.db_service.save_job_listings(
                            site_name="wanted",
                            site_url=base_url,
                            job_listings=job_listings,
                            search_keyword=search_keyword
                        )
                        result["savedToDatabase"] = saved_count
                        print(f"[원티드] {saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")

                        # 기업정보도 저장
                        if self.company_service:
                            try:
                                company_count = await self.company_service.crawl_and_save_companies_from_jobs(
                                    site_name="wanted",
                                    job_listings=job_listings
                                )
                                result["savedCompanies"] = company_count
                            except Exception as e:
                                print(f"[원티드] 기업정보 저장 실패: {str(e)}")
                    except Exception as e:
                        print(f"[원티드] 데이터베이스 저장 실패: {str(e)}")
                        result["databaseError"] = str(e)
                else:
                    print(f"[원티드] 저장할 공고가 없거나 DB 서비스가 없습니다.")
                
                # 결과를 캐시에 저장
                self._set_cached_data(cache_key, result)
                
                return result
                
        except Exception as e:
            print(f"[원티드] 크롤링 중 오류 발생: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "message": "크롤링 중 오류 발생",
                "fromCache": False
            }
    
    async def _crawl_wanted_api(
        self,
        client: httpx.AsyncClient,
        keyword: str,
        max_results: int
    ) -> List[Dict]:
        """
        원티드 API를 통해 채용 정보 가져오기
        모든 페이지를 순회하여 가능한 모든 공고를 가져옵니다.
        """
        try:
            # 원티드의 실제 API 엔드포인트 시도
            api_url = "https://www.wanted.co.kr/api/v4/jobs"
            
            print(f"[원티드 API] 크롤링 시작 - 키워드: '{keyword}', max_results: {max_results}")
            
            all_job_listings = []
            offset = 0
            page_size = 100  # 한 번에 가져올 최대 개수
            max_pages = 100  # 최대 페이지 수
            page = 0
            
            while page < max_pages:
                # 검색 파라미터 설정 (전체 직군 크롤링 - tag_type_ids 제거)
                params = {
                    "country": "kr",
                    "job_sort": "job.latest_order",
                    "locations": "all",
                    "years": "-1",
                    "limit": page_size,
                    "offset": offset
                }
                
                if keyword:
                    params["query"] = keyword
                
                # API 호출 시도
                await self._wait_if_needed()  # IP 차단 방지
                print(f"[원티드 API] 페이지 {page} 요청 - offset: {offset}, limit: {page_size}")
                response = await client.get(api_url, params=params)
                
                if response.status_code != 200:
                    print(f"[원티드 API] 페이지 {page} 호출 실패: HTTP {response.status_code}")
                    print(f"[원티드 API] 응답 내용: {response.text[:200]}")
                    break
                
                data = response.json()
                print(f"[원티드 API] 페이지 {page} 응답 수신 완료")
                
                # 디버깅: 첫 페이지에서 응답 구조 확인
                if page == 0:
                    print(f"[DEBUG] 원티드 API 응답 구조: {list(data.keys()) if isinstance(data, dict) else '리스트'}")
                    if isinstance(data, dict):
                        for key in data.keys():
                            if isinstance(data[key], (list, dict)):
                                print(f"[DEBUG] {key}: {type(data[key])}, 길이/크기: {len(data[key]) if isinstance(data[key], (list, dict)) else 'N/A'}")
                
                # 응답 구조에 따라 데이터 추출
                jobs = []
                if isinstance(data, dict):
                    if "data" in data and isinstance(data["data"], list):
                        jobs = data["data"]
                    elif "results" in data and isinstance(data["results"], list):
                        jobs = data["results"]
                    elif isinstance(data.get("jobs"), list):
                        jobs = data["jobs"]
                    # 원티드 API의 실제 구조 확인 (data.data 또는 data.results 등)
                    elif "data" in data and isinstance(data["data"], dict):
                        nested_data = data["data"]
                        if "data" in nested_data and isinstance(nested_data["data"], list):
                            jobs = nested_data["data"]
                        elif "results" in nested_data and isinstance(nested_data["results"], list):
                            jobs = nested_data["results"]
                elif isinstance(data, list):
                    jobs = data
                
                # 이번 페이지에 공고가 없으면 종료
                if not jobs:
                    print(f"[DEBUG] 페이지 {page}: 공고가 없어 종료")
                    break
                
                print(f"[DEBUG] 페이지 {page}: {len(jobs)}개 공고 발견 (offset: {offset})")
                
                # 공고 데이터 변환
                page_job_listings = []
                for job in jobs:
                    job_id = job.get("id") or job.get("job_id", "")
                    title = job.get("position") or job.get("title") or job.get("name", "")
                    company_info = job.get("company", {})
                    
                    if isinstance(company_info, dict):
                        company_name = company_info.get("name", "")
                    else:
                        company_name = str(company_info) if company_info else ""
                    
                    location_info = job.get("address", {}) or job.get("location", {})
                    if isinstance(location_info, dict):
                        location = location_info.get("location", "") or location_info.get("name", "") or location_info.get("address", "")
                    else:
                        location = str(location_info) if location_info else ""

                    # reward 처리 - dict인 경우 문자열로 변환
                    reward_data = job.get("reward", "") or job.get("compensation", "")
                    if isinstance(reward_data, dict):
                        reward = reward_data.get("formatted_total") or reward_data.get("formatted_recommender") or str(reward_data)
                    else:
                        reward = str(reward_data) if reward_data else ""

                    experience = job.get("experience_level", "") or job.get("years", "")
                    
                    # 상세정보 추출 (description 필드)
                    details = []
                    
                    # 마감일 (due_time, deadline 등)
                    deadline = job.get("due_time") or job.get("deadline") or job.get("closing_timestamp")
                    if deadline:
                        details.append(f"마감: {deadline}")
                    
                    # 학력 (education, required_education 등)
                    education = job.get("required_education_level") or job.get("education")
                    if education:
                        details.append(f"학력: {education}")
                    
                    # 고용형태 (employment_type, job_type 등)
                    employment_type = job.get("employment_type") or job.get("job_type")
                    if employment_type:
                        details.append(f"고용형태: {employment_type}")
                    
                    description = " | ".join(details) if details else ""
                    
                    # 필터링: 유효한 공고만 추가
                    # 1. job_id가 반드시 있어야 함
                    # 2. 회사명이 있어야 함
                    # 3. 제목이 유효해야 함 (검색 결과, UI 요소 등 제외)
                    # 필터/메뉴 항목만 제외 (완화된 필터)
                    invalid_patterns = [
                        "..검색 결과", ".. 검색"
                    ]
                    
                    if job_id and company_name and title:
                        # 제목에 이상한 패턴이 있으면 제외
                        if any(invalid in title for invalid in invalid_patterns):
                            continue
                        # 제목이 온점(.)으로 시작하면서 "검색"이 포함되면 제외
                        if title.startswith('..') and '검색' in title:
                            continue
                        
                        page_job_listings.append({
                            "id": str(job_id),
                            "title": title,
                            "company": company_name,
                            "location": location,
                            "reward": reward,
                            "experience": experience,
                            "description": description,
                            "url": f"https://www.wanted.co.kr/wd/{job_id}"
                        })
                
                all_job_listings.extend(page_job_listings)
                
                # max_results 제한이 있으면 확인
                if max_results > 0 and len(all_job_listings) >= max_results:
                    all_job_listings = all_job_listings[:max_results]
                    break
                
                # 다음 페이지로 이동
                offset += page_size
                page += 1
                
                # 이번 페이지의 공고 수가 page_size보다 적으면 마지막 페이지
                if len(jobs) < page_size:
                    print(f"[DEBUG] 페이지 {page}: 공고 수({len(jobs)})가 page_size({page_size})보다 적어 종료")
                    break
            
            if all_job_listings:
                print(f"원티드 API에서 총 {len(all_job_listings)}개 공고 발견 (페이지: {page})")

                # 각 공고의 상세 정보 가져오기 (모든 공고)
                total_jobs = len(all_job_listings)
                print(f"[원티드] 전체 {total_jobs}개 공고의 상세 정보 가져오기...")

                for i, job in enumerate(all_job_listings):
                    job_id = job.get("id", "")
                    if job_id:
                        detail_info = await self._crawl_wanted_job_detail(client, job_id)
                        if detail_info:
                            # 상세 정보 업데이트
                            if detail_info.get("description"):
                                job["description"] = detail_info["description"]
                            if detail_info.get("tech_stack"):
                                job["tech_stack"] = ",".join(detail_info["tech_stack"])
                            if detail_info.get("requirements"):
                                job["required_skills"] = detail_info["requirements"][:500]
                            # 새 필드 추가
                            if detail_info.get("company"):
                                job["company"] = detail_info["company"]
                            if detail_info.get("deadline"):
                                job["deadline"] = detail_info["deadline"]
                            if detail_info.get("salary"):
                                job["salary"] = detail_info["salary"]
                            if detail_info.get("work_location"):
                                job["work_location"] = detail_info["work_location"]
                            if detail_info.get("preferred_majors"):
                                job["preferred_majors"] = detail_info["preferred_majors"]
                            if detail_info.get("core_competencies"):
                                job["core_competencies"] = detail_info["core_competencies"]
                            print(f"[원티드] ({i+1}/{total_jobs}) {job.get('title', '')[:30]}... 상세 정보 추가 완료")

                print(f"[원티드] 상세 정보 가져오기 완료")
                return all_job_listings
            
            # API 호출 실패 시 빈 리스트 반환 (HTML 파싱으로 fallback)
            return []
            
        except Exception as e:
            print(f"원티드 API 크롤링 실패: {str(e)}")
            # API 실패 시 빈 리스트 반환 (HTML 파싱으로 fallback)
            return []
    
    async def _crawl_wanted_job_detail(
        self,
        client: httpx.AsyncClient,
        job_id: str
    ) -> Optional[Dict]:
        """원티드 채용 공고 상세 정보 API로 가져오기 (2024년 구조)"""
        try:
            # 원티드 상세 API 엔드포인트
            detail_api_url = f"https://www.wanted.co.kr/api/v4/jobs/{job_id}"

            await self._wait_if_needed()  # IP 차단 방지
            response = await client.get(detail_api_url)

            if response.status_code == 200:
                data = response.json()
                job_data = data.get("job", {})

                # 상세 정보 추출
                detail = job_data.get("detail", {})

                # 주요업무, 자격요건, 우대사항, 혜택 추출
                intro = detail.get("intro", "")  # 회사 소개
                main_tasks = detail.get("main_tasks", "")  # 주요업무
                requirements = detail.get("requirements", "")  # 자격요건
                preferred = detail.get("preferred_points", "")  # 우대사항
                benefits = detail.get("benefits", "")  # 혜택

                # 기술스택 추출
                skill_tags = job_data.get("skill_tags", [])
                tech_stack = []
                if skill_tags:
                    for tag in skill_tags:
                        if isinstance(tag, dict):
                            tech_stack.append(tag.get("title", ""))
                        elif isinstance(tag, str):
                            tech_stack.append(tag)

                # ===== 추가 정보 추출 (2024년 업데이트) =====

                # 1. 회사명 추출
                company = job_data.get("company", {})
                company_name = company.get("name", "") if isinstance(company, dict) else ""

                # 2. 마감일 추출
                deadline = ""
                due_time = job_data.get("due_time", "")
                if due_time:
                    # ISO 형식에서 날짜만 추출 (2025-02-20T...)
                    deadline = due_time.split("T")[0] if "T" in due_time else due_time

                # 3. 급여 추출 (annual_from, annual_to 사용 - 단위: 천만원)
                salary = ""
                annual_from = job_data.get("annual_from")
                annual_to = job_data.get("annual_to")
                if annual_from and annual_to:
                    # 천만원 단위 -> 만원 단위로 변환
                    from_val = int(annual_from) * 1000
                    to_val = int(annual_to) * 1000
                    if from_val == to_val:
                        salary = f"연봉 {from_val:,}만원"
                    else:
                        salary = f"연봉 {from_val:,}~{to_val:,}만원"
                elif annual_from:
                    from_val = int(annual_from) * 1000
                    salary = f"연봉 {from_val:,}만원 이상"
                elif annual_to:
                    to_val = int(annual_to) * 1000
                    salary = f"연봉 ~{to_val:,}만원"

                # 4. 근무지 추출
                work_location = ""
                address = job_data.get("address", {})
                if isinstance(address, dict):
                    full_location = address.get("full_location", "")
                    location = address.get("location", "")
                    work_location = full_location or location
                elif isinstance(address, str):
                    work_location = address

                # 5. 경력 조건
                career = ""
                position = job_data.get("position", "")
                if position:
                    career = position

                # 6. 우대전공 (원티드는 보통 없음)
                preferred_majors = []

                # 7. 핵심역량 (원티드는 보통 없음)
                core_competencies = []

                # 전체 설명 조합
                description_parts = []
                if main_tasks:
                    description_parts.append(f"[주요업무] {main_tasks}")
                if requirements:
                    description_parts.append(f"[자격요건] {requirements}")
                if preferred:
                    description_parts.append(f"[우대사항] {preferred}")
                if benefits:
                    description_parts.append(f"[혜택] {benefits}")

                full_description = "\n".join(description_parts)

                result = {
                    "description": full_description[:2000] if full_description else "",
                    "tech_stack": tech_stack,
                    "requirements": requirements,
                    "preferred": preferred,
                    "deadline": deadline,
                    "salary": salary,
                    "work_location": work_location,
                    "preferred_majors": preferred_majors,
                    "core_competencies": core_competencies
                }

                # 회사명이 있으면 추가
                if company_name:
                    result["company"] = company_name

                return result
            else:
                print(f"[원티드] 상세 API 호출 실패 (job_id: {job_id}): HTTP {response.status_code}")

        except Exception as e:
            print(f"[원티드] 상세 정보 크롤링 실패 (job_id: {job_id}): {str(e)}")

        return None


    async def _crawl_jobkorea_job_detail(
        self,
        client: httpx.AsyncClient,
        job_url: str
    ) -> Optional[Dict]:
        """잡코리아 채용 공고 상세 페이지 크롤링 (RSC JSON 파싱 - 2024년 구조)"""
        try:
            await self._wait_if_needed()  # IP 차단 방지
            response = await client.get(job_url)

            if response.status_code == 200:
                html = response.text
                soup = BeautifulSoup(html, "lxml")

                # 결과 초기화
                company_name = ""
                tech_stack = []
                deadline = ""
                work_location = ""
                salary = ""
                preferred_majors = []
                core_competencies = []
                description_parts = []
                requirements = ""
                preferred = ""

                # 방법 1: RSC (React Server Components) JSON 파싱 - 2024년 신규 구조
                rsc_matches = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html)
                if rsc_matches:
                    try:
                        # 가장 긴 청크에서 JSON 추출
                        longest_chunk = max(rsc_matches, key=len)
                        decoded = longest_chunk.encode('utf-8').decode('unicode_escape')

                        # jobHubId로 시작하는 JSON 객체 찾기
                        json_match = re.search(r'(\{"jobHubId".*)', decoded)
                        if json_match:
                            json_str = json_match.group(1)
                            # brace 카운트로 JSON 끝 찾기
                            brace = 0
                            end_idx = 0
                            for i, c in enumerate(json_str):
                                if c == '{': brace += 1
                                elif c == '}': brace -= 1
                                if brace == 0:
                                    end_idx = i + 1
                                    break

                            recruit_data = json.loads(json_str[:end_idx])

                            # 1. 제목에서 정보 추출
                            title = recruit_data.get("title", "")

                            # 2. 회사명
                            post_info = recruit_data.get("post", {})
                            company_name = post_info.get("postingCompanyName", "")

                            # 3. 마감일
                            posting_end = post_info.get("postingEndAt", "")
                            if posting_end:
                                deadline = posting_end.split("T")[0]

                            # 4. 근무조건
                            work_condition = recruit_data.get("workCondition", {})
                            if work_condition:
                                # 급여
                                salary_info = work_condition.get("salary", {})
                                if isinstance(salary_info, dict):
                                    sal_type = salary_info.get("salaryType", "")
                                    sal_range = salary_info.get("salaryRange", {})
                                    if sal_range:
                                        min_sal = sal_range.get("min", "")
                                        max_sal = sal_range.get("max", "")
                                        if min_sal and max_sal:
                                            salary = f"{min_sal}~{max_sal}만원"
                                        elif min_sal:
                                            salary = f"{min_sal}만원 이상"

                                # 근무지
                                workplaces = work_condition.get("workplaces", [])
                                if workplaces and isinstance(workplaces, list):
                                    for wp in workplaces:
                                        if isinstance(wp, dict):
                                            addr = wp.get("address", "")
                                            if addr:
                                                work_location = addr
                                                break

                            # 5. 자격요건
                            requirement = recruit_data.get("requirement", {})
                            if requirement:
                                # 경력
                                careers = requirement.get("careers", [])
                                career_types = [c.get("type", "") for c in careers if isinstance(c, dict)]
                                if career_types:
                                    requirements = ", ".join(career_types)

                            # 6. 기술스택
                            skills = recruit_data.get("skills", [])
                            if isinstance(skills, list):
                                for skill in skills:
                                    if isinstance(skill, dict):
                                        skill_name = skill.get("name", "")
                                        if skill_name:
                                            tech_stack.append(skill_name)
                                    elif isinstance(skill, str):
                                        tech_stack.append(skill)

                            # 7. 상세 설명 구성
                            overview = recruit_data.get("overview", {})
                            if overview:
                                # 모집 분야
                                recruitment = overview.get("recruitment", {})
                                work_fields = recruitment.get("workFields", [])
                                if work_fields:
                                    description_parts.append(f"[모집분야] {', '.join(work_fields)}")

                                # 고용형태
                                employments = overview.get("employments", [])
                                emp_types = [e.get("employmentType", "") for e in employments if isinstance(e, dict)]
                                if emp_types:
                                    emp_text = ", ".join(emp_types).replace("PERMANENT", "정규직").replace("CONTRACT", "계약직")
                                    description_parts.append(f"[고용형태] {emp_text}")

                            # 추가정보
                            additional = recruit_data.get("additionalInfo", {})
                            if additional:
                                benefits = additional.get("benefits", [])
                                if benefits:
                                    description_parts.append(f"[복리후생] {', '.join(benefits)}")

                            print(f"[잡코리아] RSC JSON 파싱 성공: {title[:30]}...")
                    except Exception as e:
                        print(f"[잡코리아] RSC JSON 파싱 실패: {str(e)}")

                # 방법 2: og:description 메타태그 (fallback)
                if not description_parts:
                    og_desc = soup.find("meta", property="og:description")
                    if og_desc:
                        meta_content = og_desc.get("content", "")
                        if meta_content:
                            description_parts.append(meta_content)

                    og_title = soup.find("meta", property="og:title")
                    if og_title and not company_name:
                        title_content = og_title.get("content", "")
                        # "회사명 채용 - 제목" 형식에서 회사명 추출
                        if " 채용 - " in title_content:
                            company_name = title_content.split(" 채용 - ")[0]

                # 방법 3: JSON-LD 스키마 (가장 안정적)
                script_tags = soup.find_all("script", type="application/ld+json")
                for script in script_tags:
                    try:
                        json_data = json.loads(script.string)
                        if isinstance(json_data, dict) and json_data.get("@type") == "JobPosting":
                            if not deadline:
                                deadline = json_data.get("validThrough", "")
                                if deadline:
                                    deadline = deadline.split("T")[0] if "T" in deadline else deadline

                            if not work_location:
                                job_location = json_data.get("jobLocation", {})
                                if isinstance(job_location, dict):
                                    address = job_location.get("address", {})
                                    if isinstance(address, dict):
                                        work_location = address.get("addressLocality", "") or address.get("streetAddress", "")
                                    elif isinstance(address, str):
                                        work_location = address

                            if not salary:
                                base_salary = json_data.get("baseSalary", {})
                                if isinstance(base_salary, dict):
                                    sal_value = base_salary.get("value", {})
                                    if isinstance(sal_value, dict):
                                        min_val = sal_value.get("minValue", "")
                                        max_val = sal_value.get("maxValue", "")
                                        if min_val and max_val:
                                            salary = f"{min_val}~{max_val}원"
                                        elif min_val:
                                            salary = f"{min_val}원"
                            break
                    except:
                        pass

                # 중복 제거
                tech_stack = list(dict.fromkeys(tech_stack))
                preferred_majors = list(dict.fromkeys(preferred_majors))
                core_competencies = list(dict.fromkeys(core_competencies))

                full_description = "\n".join(description_parts)[:2000]

                result = {
                    "description": full_description if full_description else "",
                    "tech_stack": tech_stack,
                    "requirements": requirements,
                    "preferred": preferred,
                    "preferred_majors": preferred_majors,
                    "deadline": deadline,
                    "work_location": work_location,
                    "salary": salary,
                    "core_competencies": core_competencies
                }

                if company_name:
                    result["company"] = company_name

                return result
            else:
                print(f"[잡코리아] 상세 페이지 호출 실패: HTTP {response.status_code}")

        except Exception as e:
            print(f"[잡코리아] 상세 페이지 크롤링 실패: {str(e)}")

        return None

    async def _crawl_saramin_job_detail(
        self,
        client: httpx.AsyncClient,
        job_url: str
    ) -> Optional[Dict]:
        """사람인 채용 공고 상세 페이지 크롤링 (2024년 구조 - jv_detail 파싱)"""
        try:
            await self._wait_if_needed()  # IP 차단 방지

            # relay URL을 view URL로 변환 (더 많은 정보 포함)
            if '/relay/view' in job_url:
                # rec_idx 추출
                rec_idx_match = re.search(r'rec_idx=(\d+)', job_url)
                if rec_idx_match:
                    rec_idx = rec_idx_match.group(1)
                    job_url = f"https://www.saramin.co.kr/zf_user/jobs/view?rec_idx={rec_idx}"

            response = await client.get(job_url)

            if response.status_code == 200:
                html = response.text
                soup = BeautifulSoup(html, "lxml")

                # 결과 초기화
                company_name = ""
                deadline = ""
                salary = ""
                work_location = ""
                description_parts = []
                requirements = ""
                preferred = ""
                tech_stack = []
                preferred_majors = []
                core_competencies = []
                applicant_count = 0

                # ===== 방법 1: jv_detail 클래스에서 상세 내용 추출 (가장 정확) =====
                jv_detail = soup.find("div", class_="jv_detail")
                if jv_detail:
                    detail_text = jv_detail.get_text(separator="\n", strip=True)
                    if detail_text:
                        description_parts.append(detail_text[:1500])
                        print(f"[사람인] jv_detail에서 {len(detail_text)}자 추출")

                # ===== 방법 2: wrap_jv_cont에서 핵심 정보 추출 =====
                wrap_jv = soup.find("div", class_="wrap_jv_cont")
                if wrap_jv:
                    # 경력, 학력, 근무형태, 급여, 근무지역 등 추출
                    info_text = wrap_jv.get_text(separator=" ", strip=True)

                    # 급여 추출
                    salary_match = re.search(r'급여[:\s]*([\d,]+\s*만원|면접\s*후\s*결정|회사\s*내규)', info_text)
                    if salary_match:
                        salary = salary_match.group(1)

                    # 근무지역 추출
                    location_match = re.search(r'근무지역[:\s]*([^최저]+?)(?:최저임금|지도|$)', info_text)
                    if location_match:
                        work_location = location_match.group(1).strip()[:100]

                # ===== 방법 3: 메타태그에서 정보 추출 (fallback) =====
                meta_desc = soup.find("meta", {"name": "description"})
                meta_content = meta_desc.get("content", "") if meta_desc else ""

                if meta_content and not description_parts:
                    description_parts.append(meta_content)

                # 마감일 추출
                deadline_match = re.search(r'마감일?[:\s~]*(\d{4}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2})', meta_content)
                if deadline_match:
                    deadline = deadline_match.group(1)

                # 마감일 다른 패턴 (예: ~01.09(목))
                if not deadline:
                    deadline_match2 = re.search(r'~\s*(\d{2}\.\d{2})', html)
                    if deadline_match2:
                        deadline = deadline_match2.group(1)

                # 회사명 추출 (og:title에서)
                og_title = soup.find("meta", property="og:title")
                if og_title:
                    title_content = og_title.get("content", "")
                    # "제목 - 회사명" 형식에서 회사명 추출
                    if " - " in title_content:
                        company_name = title_content.split(" - ")[-1].strip()

                # ===== 방법 4: 자격요건/우대사항 추출 =====
                # jv_detail 내에서 섹션별로 추출
                if jv_detail:
                    sections = jv_detail.find_all(["dt", "th", "strong", "h3", "h4"])
                    for section in sections:
                        section_text = section.get_text(strip=True)
                        next_elem = section.find_next_sibling()

                        if re.search(r'자격.*요건|지원.*자격', section_text, re.I):
                            if next_elem:
                                requirements = next_elem.get_text(strip=True)[:500]
                        elif re.search(r'우대.*사항|우대.*조건', section_text, re.I):
                            if next_elem:
                                preferred = next_elem.get_text(strip=True)[:500]

                # ===== 방법 5: 기술스택 추출 =====
                skill_tags = soup.find_all("span", class_=re.compile(r".*skill.*|.*tech.*|.*stack.*|.*keyword.*", re.I))
                for tag in skill_tags:
                    tag_text = tag.get_text(strip=True)
                    if tag_text and len(tag_text) < 30:
                        tech_stack.append(tag_text)

                # ===== 방법 6: 지원자 수 추출 =====
                # 조회수 근처에서 찾기
                full_text = soup.get_text()
                patterns = [
                    r'지원자\s*(\d{1,5})\s*명',
                    r'(\d{1,5})\s*명\s*지원',
                    r'현재\s*(\d{1,5})\s*명',
                ]
                for pattern in patterns:
                    match = re.search(pattern, full_text)
                    if match:
                        applicant_count = int(match.group(1))
                        break

                # 중복 제거
                tech_stack = list(dict.fromkeys(tech_stack))

                full_description = "\n".join(description_parts)[:2000]

                result = {
                    "description": full_description if full_description else "",
                    "tech_stack": tech_stack,
                    "requirements": requirements,
                    "preferred": preferred,
                    "applicant_count": applicant_count,
                    "deadline": deadline,
                    "salary": salary,
                    "work_location": work_location,
                    "preferred_majors": preferred_majors,
                    "core_competencies": core_competencies
                }

                if company_name:
                    result["company"] = company_name

                return result
            else:
                print(f"[사람인] 상세 페이지 호출 실패: HTTP {response.status_code}")

        except Exception as e:
            print(f"[사람인] 상세 페이지 크롤링 실패: {str(e)}")

        return None

    async def crawl_job_site(
        self,
        site_name: str,
        site_url: str,
        search_keyword: Optional[str] = None,
        max_results: int = 10,
        force_refresh: bool = False
    ) -> Dict:
        """
        지정된 취업 사이트에서 채용 정보를 크롤링합니다.
        하루에 한 번만 업데이트되도록 캐싱됩니다.
        
        Args:
            site_name: 사이트 이름
            site_url: 사이트 URL
            search_keyword: 검색 키워드
            max_results: 최대 결과 수
            force_refresh: 캐시를 무시하고 강제로 새로 크롤링할지 여부
        
        Returns:
            크롤링 결과 딕셔너리
        """
        # 캐시 키 생성
        cache_key = self._generate_cache_key(site_name, site_url, search_keyword, max_results)
        
        # 강제 새로고침이 아니고 캐시가 있으면 캐시 반환
        if not force_refresh:
            cached_data = self._get_cached_data(cache_key)
            if cached_data:
                cached_data["fromCache"] = True
                cached_data["cachedAt"] = self.cache[cache_key].expires_at.isoformat()
                return cached_data
        
        site_name_lower = site_name.lower()
        
        if "원티드" in site_name_lower or "wanted" in site_name_lower:
            result = await self.crawl_wanted(search_keyword, max_results, force_refresh)
        elif "잡코리아" in site_name_lower or "jobkorea" in site_name_lower:
            result = await self._crawl_jobkorea(site_url, search_keyword, max_results)
        elif "사람인" in site_name_lower or "saramin" in site_name_lower:
            result = await self._crawl_saramin(site_url, search_keyword, max_results)
        else:
            result = {
                "success": False,
                "error": "지원하지 않는 사이트",
                "message": f"{site_name}은(는) 아직 지원하지 않습니다.",
                "fromCache": False
            }
        
        # 성공한 경우에만 캐시에 저장
        if result.get("success", False) and not result.get("fromCache", False):
            # 데이터베이스에 저장 (아직 저장되지 않은 경우)
            if self.db_service and result.get("jobListings"):
                try:
                    saved_count = self.db_service.save_job_listings(
                        site_name=site_name,
                        site_url=site_url,
                        job_listings=result.get("jobListings", []),
                        search_keyword=search_keyword
                    )
                    result["savedToDatabase"] = saved_count
                except Exception as e:
                    print(f"데이터베이스 저장 실패: {str(e)}")
                    result["databaseError"] = str(e)
            
            self._set_cached_data(cache_key, result)
            result["cachedAt"] = datetime.now().isoformat()
        
        return result
    
    async def _crawl_jobkorea(
        self,
        site_url: str,
        search_keyword: Optional[str],
        max_results: int
    ) -> Dict:
        """잡코리아 크롤링 - 페이지네이션 지원"""
        try:
            base_search_url = ""
            if search_keyword:
                # /Search/ URL은 SPA라서 파싱 불가, /recruit/joblist 사용
                base_search_url = f"https://www.jobkorea.co.kr/recruit/joblist?menucode=duty&stext={quote(search_keyword)}"
            else:
                # 검색어 없으면 전체 채용 공고 페이지 (menucode=local 추가)
                base_search_url = "https://www.jobkorea.co.kr/recruit/joblist?menucode=local"
            
            print(f"[잡코리아] 크롤링 시작: {base_search_url}, 키워드: {search_keyword}, max_results: {max_results}")
            
            all_job_listings = []
            page = 1
            max_pages = 300  # 최대 300페이지까지 크롤링
            
            # 타임아웃을 더 길게 설정하고 재시도 로직 추가
            timeout = httpx.Timeout(60.0, connect=30.0)  # 전체 60초, 연결 30초
            
            async with httpx.AsyncClient(timeout=timeout, headers=self.headers, follow_redirects=True) as client:
                while page <= max_pages:
                    # 페이지 URL 생성
                    if "?" in base_search_url:
                        search_url = f"{base_search_url}&Page_No={page}"
                    else:
                        search_url = f"{base_search_url}?Page_No={page}"
                    
                    await self._wait_if_needed()  # IP 차단 방지
                    
                    # 재시도 로직
                    max_retries = 3
                    retry_count = 0
                    response = None
                    
                    while retry_count < max_retries:
                        try:
                            response = await client.get(search_url)
                            break  # 성공하면 루프 종료
                        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as e:
                            retry_count += 1
                            if retry_count < max_retries:
                                wait_time = retry_count * 2  # 재시도마다 대기 시간 증가
                                print(f"[잡코리아] 페이지 {page} 연결 실패 (재시도 {retry_count}/{max_retries}): {str(e)}")
                                await asyncio.sleep(wait_time)
                            else:
                                print(f"[잡코리아] 페이지 {page} 연결 최종 실패: {str(e)}")
                                raise e
                    
                    if not response:
                        break
                    
                    print(f"[잡코리아] 페이지 {page} HTTP 응답 코드: {response.status_code}")
                    
                    if response.status_code != 200:
                        print(f"[잡코리아] 페이지 {page} 접근 실패: HTTP {response.status_code}")
                        break
                    
                    html = response.text
                    soup = BeautifulSoup(html, "lxml")
                    
                    # 잡코리아 채용 공고 추출
                    page_job_listings = []
                    
                    # 잡코리아 HTML 구조에 맞게 파싱
                    job_items = []

                    # 1. devloopArea 클래스를 가진 li 요소 찾기 (2024년 기준 실제 구조)
                    job_items = soup.find_all("li", class_="devloopArea")

                    # 2. data-gno 속성을 가진 요소 찾기
                    if not job_items:
                        job_items = soup.find_all("div", {"data-gno": True})

                    # 3. 채용 링크에서 부모 li 찾기
                    if not job_items:
                        recruit_links = soup.find_all("a", href=re.compile(r"/Recruit/GI_Read"))
                        seen_parents = set()
                        for link in recruit_links:
                            parent = link.find_parent("li")
                            if parent and id(parent) not in seen_parents:
                                job_items.append(parent)
                                seen_parents.add(id(parent))
                    
                    print(f"[잡코리아] 페이지 {page} 발견된 공고 아이템 수: {len(job_items)}")
                    
                    if not job_items:
                        # 공고가 없으면 마지막 페이지
                        break
                    
                    # 디버깅: 첫 5개 item HTML 샘플 출력 (페이지 1에서만)
                    if page == 1 and job_items:
                        for idx in range(min(3, len(job_items))):
                            item_html = str(job_items[idx])[:800]  # 첫 800자만
                            print(f"[잡코리아 DEBUG {idx+1}] item HTML:\n{item_html}\n")
                    
                    item_count = 0
                    for item in job_items:
                        try:
                            item_count += 1

                            # ===== 잡코리아 2024년 HTML 구조에 맞게 파싱 =====
                            # 구조:
                            # <li class="devloopArea">
                            #   <div class="company">
                            #     <span class="name">
                            #       <a href="..."><span class="logo">...</span>회사명</a>
                            #     </span>
                            #     <button>관심기업 등록하기</button>
                            #   </div>
                            #   <div class="description">
                            #     <a href="...">
                            #       <span class="text">채용공고 제목</span>
                            #       <span class="dday">...</span>
                            #     </a>
                            #   </div>
                            # </li>

                            title = ""
                            company = ""
                            location = ""
                            job_url = ""

                            # 1. 제목 추출: div.description > a > span.text
                            desc_div = item.find("div", class_="description")
                            if desc_div:
                                text_span = desc_div.find("span", class_="text")
                                if text_span:
                                    title = text_span.get_text(strip=True)

                            # 2. 회사명 추출: div.company > span.name > a (logo span 제외)
                            company_div = item.find("div", class_="company")
                            if company_div:
                                name_span = company_div.find("span", class_="name")
                                if name_span:
                                    company_link = name_span.find("a", href=True)
                                    if company_link:
                                        # logo span을 제외한 텍스트만 추출
                                        logo_span = company_link.find("span", class_="logo")
                                        if logo_span:
                                            logo_span.decompose()  # logo span 제거
                                        company = company_link.get_text(strip=True)

                            # 3. URL 추출: description 영역의 링크 또는 data-info에서 추출
                            # data-info 형식: "48212272|50048904|themaison|C|AM|04" (첫번째가 공고 ID)
                            data_info = item.get("data-info", "")
                            if data_info:
                                recruit_no = data_info.split("|")[0] if "|" in data_info else data_info
                                if recruit_no and recruit_no.isdigit():
                                    job_url = f"https://www.jobkorea.co.kr/Recruit/GI_Read/{recruit_no}"

                            # URL이 없으면 링크에서 찾기
                            if not job_url:
                                all_links = item.find_all("a", href=re.compile(r"/Recruit/GI_Read"))
                                if all_links:
                                    job_url = urljoin("https://www.jobkorea.co.kr", all_links[0].get("href", ""))

                            # 4. 지역 추출 (있으면)
                            location_elem = item.find("span", class_=re.compile(r"location|area|region", re.I))
                            if location_elem:
                                location = location_elem.get_text(strip=True)

                            # 전체 텍스트 추출 (item 전체에서 - 경력, 학력 등 추출용)
                            full_text = item.get_text(strip=True)

                            # 경력 정보 추출 (experience 필드)
                            experience = ""
                            experience_patterns = [
                                r'신입',
                                r'경력무관',
                                r'경력\s*\d+년',
                                r'\d+년\s*이상',
                                r'신입/경력',
                                r'경력'
                            ]
                            for pattern in experience_patterns:
                                exp_match = re.search(pattern, full_text)
                                if exp_match:
                                    experience = exp_match.group(0)
                                    break

                            # 상세정보 추출 (description 필드)
                            details = []

                            # 마감일
                            deadline_match = re.search(r'(~\d+\.\d+\([월화수목금토일]\)|D-\d+|마감임박)', full_text)
                            if deadline_match:
                                details.append(f"마감: {deadline_match.group(1)}")

                            # 학력
                            education_patterns = [
                                r'학력무관', r'고졸\s*이상', r'대졸\s*이상',
                                r'초대졸\s*이상', r'석사', r'박사'
                            ]
                            for pattern in education_patterns:
                                edu_match = re.search(pattern, full_text)
                                if edu_match:
                                    details.append(f"학력: {edu_match.group(0)}")
                                    break

                            # 고용형태
                            employment_patterns = [
                                r'정규직', r'계약직', r'인턴', r'아르바이트',
                                r'파견직', r'프리랜서'
                            ]
                            for pattern in employment_patterns:
                                emp_match = re.search(pattern, full_text)
                                if emp_match:
                                    details.append(f"고용형태: {emp_match.group(0)}")
                                    break

                            description = " | ".join(details) if details else ""

                            # 제목 정리
                            clean_title = title
                            clean_title = re.sub(r'~\d+\.\d+\([월화수목금토일]\).*$', '', clean_title)
                            clean_title = re.sub(r'D-\d+', '', clean_title)
                            clean_title = re.sub(r'(신입|경력무관|경력\s*\d+년|\d+년\s*이상|경력|신입/경력)', '', clean_title)
                            clean_title = re.sub(r'(학력무관|고졸|대졸|초대졸|석사|박사)\s*(이상)?', '', clean_title)
                            clean_title = re.sub(r'(정규직|계약직|인턴|아르바이트|파견직|프리랜서)', '', clean_title)
                            clean_title = re.sub(r'마감임박', '', clean_title)
                            # 회사명이 제목에 붙어있는 경우 제거
                            if company:
                                clean_title = clean_title.replace(company, '')
                            clean_title = re.sub(r'\s+', ' ', clean_title).strip()
                            
                            # 필터/메뉴 항목만 제외 (완화된 필터)
                            invalid_patterns = [
                                "근무요일...", "근무형태...", "업종...", 
                                "재택근무...", "직업 선택...", "지역...", "경력..."
                            ]
                            
                            if clean_title:  # 제목이 있으면 검증
                                # 제목에 이상한 패턴이 있으면 제외
                                if any(invalid in clean_title for invalid in invalid_patterns):
                                    continue
                                # 제목이 온점(.)으로만 시작하거나 "..."로만 구성되면 제외
                                if clean_title.strip() in ['...', '..', '.'] or clean_title.startswith('...'):
                                    continue
                                
                                final_url = job_url if job_url else search_url

                                # job_id 추출: data-info 또는 URL에서 추출
                                job_id = ""
                                # data-info에서 recruit_no 추출
                                data_info = item.get("data-info", "")
                                if data_info and "|" in data_info:
                                    recruit_no = data_info.split("|")[0]
                                    if recruit_no.isdigit():
                                        job_id = recruit_no

                                if not job_id and final_url:
                                    # URL에서 GI_Read/숫자 패턴 또는 일반 숫자 ID 패턴 추출
                                    job_id_match = re.search(r'/GI_Read/(\d+)', final_url)
                                    if not job_id_match:
                                        # 일반적인 URL 패턴: /숫자
                                        job_id_match = re.search(r'/(\d+)(?:[/?#]|$)', final_url)
                                    if job_id_match:
                                        job_id = job_id_match.group(1)
                                
                                # job_id가 없으면 건너뛰기 (저장 불가)
                                if not job_id:
                                    print(f"[잡코리아] job_id 추출 실패 - data_info: {data_info}, URL: {final_url[:100]}")
                                    continue
                                
                                # 중복 체크 없이 모두 수집 (DB 저장 시에 중복 처리)
                                page_job_listings.append({
                                    "id": job_id,
                                    "title": clean_title,
                                    "company": company,
                                    "location": location,
                                    "url": final_url,
                                    "description": description,
                                    "experience": experience
                                })
                                
                                # 디버깅: URL 추출 확인
                                if not job_url or job_url == search_url:
                                    print(f"[잡코리아] URL 추출 실패 - 제목: {title[:30]}..., URL: {final_url}")
                        except Exception as e:
                            print(f"[잡코리아] 페이지 {page} 공고 파싱 실패: {str(e)}")
                            continue
                    
                    print(f"[잡코리아] 페이지 {page} 파싱된 공고 수: {len(page_job_listings)} (누적 {len(all_job_listings) + len(page_job_listings)}개)")
                    all_job_listings.extend(page_job_listings)
                    
                    # max_results 제한이 있으면 확인
                    if max_results > 0 and len(all_job_listings) >= max_results:
                        all_job_listings = all_job_listings[:max_results]
                        break
                    
                    # 다음 페이지가 있는지 확인 (페이지네이션 링크 확인)
                    pagination = soup.find("div", class_=re.compile(r".*pagination.*|.*paging.*", re.I))
                    has_next_page = True
                    
                    if pagination:
                        next_page_link = pagination.find("a", class_=re.compile(r".*next.*", re.I))
                        if next_page_link:
                            if "disabled" in next_page_link.get("class", []) or not next_page_link.get("href"):
                                has_next_page = False
                        else:
                            current_page_links = pagination.find_all("a", class_=re.compile(r".*active.*|.*current.*", re.I))
                            page_numbers = pagination.find_all("a", href=re.compile(r".*Page_No=\d+.*"))
                            if page_numbers:
                                max_page_num = 0
                                for link in page_numbers:
                                    href = link.get("href", "")
                                    page_match = re.search(r'Page_No=(\d+)', href)
                                    if page_match:
                                        max_page_num = max(max_page_num, int(page_match.group(1)))
                                if page >= max_page_num:
                                    has_next_page = False
                    
                    if not has_next_page:
                        print(f"[잡코리아] 다음 페이지가 없어 종료 (현재 페이지: {page})")
                        break
                    
                    page += 1
                
                print(f"[잡코리아] 총 파싱된 공고 수 (중복 포함): {len(all_job_listings)} (페이지: {page})")
                
                # 디버깅: 첫 10개 공고의 제목+회사명 확인
                if all_job_listings:
                    debug_sample = [(job.get("title", "")[:40], job.get("company", "")[:20]) for job in all_job_listings[:10]]
                    print(f"[잡코리아 DEBUG] 첫 10개 공고 샘플:")
                    for i, (t, c) in enumerate(debug_sample):
                        print(f"  {i+1}. 제목: '{t}' | 회사: '{c}'")
                
                # 중복 제거: job_id 기반으로 체크 (회사명 없어도 문제없도록)
                seen_keys = set()
                unique_listings = []
                duplicate_count = 0
                for job in all_job_listings:
                    job_id = job.get("id", "").strip()
                    title = job.get("title", "").strip()
                    company = job.get("company", "").strip()

                    # 1순위: job_id로 중복 체크
                    if job_id:
                        unique_key = job_id
                    # 2순위: 제목+회사명 조합 (회사명이 있는 경우만)
                    elif company:
                        unique_key = f"{title}|{company}"
                    # 3순위: 제목만 (회사명이 없는 경우)
                    else:
                        unique_key = title

                    if unique_key and unique_key not in seen_keys:
                        seen_keys.add(unique_key)
                        unique_listings.append(job)
                    else:
                        duplicate_count += 1

                all_job_listings = unique_listings
                print(f"[잡코리아] 중복 제거: {duplicate_count}개 중복, {len(all_job_listings)}개 고유")
                
                # 디버깅: job_id 확인
                if all_job_listings:
                    job_ids_sample = [(job.get("id", "NO_ID"), job.get("title", "NO_TITLE")[:30]) for job in all_job_listings[:5]]
                    print(f"[잡코리아] 첫 5개 job_id 샘플: {job_ids_sample}")
                

                    # 각 공고의 상세 정보 가져오기 (모든 공고)
                    total_jobs = len(all_job_listings)
                    print(f"[잡코리아] 전체 {total_jobs}개 공고의 상세 정보 가져오기...")

                    for i, job in enumerate(all_job_listings):
                        job_url = job.get("url", "")
                        if job_url and "jobkorea.co.kr" in job_url:
                            detail_info = await self._crawl_jobkorea_job_detail(client, job_url)
                            if detail_info:
                                if detail_info.get("description"):
                                    job["description"] = detail_info["description"]
                                if detail_info.get("tech_stack"):
                                    job["tech_stack"] = ",".join(detail_info["tech_stack"])
                                if detail_info.get("requirements"):
                                    job["required_skills"] = detail_info["requirements"][:500]
                                # 새 필드 추가
                                if detail_info.get("company"):
                                    job["company"] = detail_info["company"]
                                if detail_info.get("deadline"):
                                    job["deadline"] = detail_info["deadline"]
                                if detail_info.get("salary"):
                                    job["salary"] = detail_info["salary"]
                                if detail_info.get("work_location"):
                                    job["work_location"] = detail_info["work_location"]
                                if detail_info.get("preferred_majors"):
                                    job["preferred_majors"] = detail_info["preferred_majors"]
                                if detail_info.get("core_competencies"):
                                    job["core_competencies"] = detail_info["core_competencies"]
                                print(f"[잡코리아] ({i+1}/{total_jobs}) {job.get('title', '')[:30]}... 상세 정보 추가 완료")

                    print(f"[잡코리아] 상세 정보 가져오기 완료")

                result = {
                    "success": True,
                    "site": "jobkorea",
                    "searchKeyword": search_keyword,
                    "totalResults": len(all_job_listings),
                    "jobListings": all_job_listings,
                    "searchUrl": base_search_url,
                    "fromCache": False,
                    "cachedAt": datetime.now().isoformat()
                }
                
                # 데이터베이스에 저장
                if self.db_service and all_job_listings:
                    try:
                        saved_count = self.db_service.save_job_listings(
                            site_name="jobkorea",
                            site_url="https://www.jobkorea.co.kr",
                            job_listings=all_job_listings,
                            search_keyword=search_keyword
                        )
                        print(f"[잡코리아] {saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")
                        result["savedToDatabase"] = saved_count

                        # 기업정보도 저장
                        if self.company_service:
                            try:
                                company_count = await self.company_service.crawl_and_save_companies_from_jobs(
                                    site_name="jobkorea",
                                    job_listings=all_job_listings
                                )
                                result["savedCompanies"] = company_count
                            except Exception as e:
                                print(f"[잡코리아] 기업정보 저장 실패: {str(e)}")
                    except Exception as e:
                        print(f"[잡코리아] 데이터베이스 저장 실패: {str(e)}")
                        result["databaseError"] = str(e)
                
                return result
            
        except Exception as e:
            import traceback
            error_detail = f"{str(e)}\n{traceback.format_exc()}"
            print(f"[잡코리아] 크롤링 실패: {error_detail}")
            return {
                "success": False,
                "error": str(e),
                "message": "크롤링 중 오류 발생"
            }
    
    async def _crawl_saramin(
        self,
        site_url: str,
        search_keyword: Optional[str],
        max_results: int
    ) -> Dict:
        """사람인 크롤링 - 채용공고 페이지 크롤링, 페이지네이션 지원"""
        try:
            base_search_url = ""
            if search_keyword:
                # 채용공고 검색 (채용정보가 아닌 채용공고)
                base_search_url = f"https://www.saramin.co.kr/zf_user/jobs/list/domestic?searchword={quote(search_keyword)}"
            else:
                # 검색어 없으면 전체 채용 공고 페이지
                base_search_url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic"
            
            print(f"[사람인] 크롤링 시작: {base_search_url}, 키워드: {search_keyword}, max_results: {max_results}")
            
            all_job_listings = []
            page = 1
            max_pages = 100  # 최대 페이지 수
            
            # 타임아웃을 더 길게 설정하고 재시도 로직 추가
            timeout = httpx.Timeout(60.0, connect=30.0)  # 전체 60초, 연결 30초
            
            async with httpx.AsyncClient(timeout=timeout, headers=self.headers, follow_redirects=True) as client:
                while page <= max_pages:
                    # 페이지 URL 생성
                    if "?" in base_search_url:
                        search_url = f"{base_search_url}&page={page}"
                    else:
                        search_url = f"{base_search_url}?page={page}"
                    
                    await self._wait_if_needed()  # IP 차단 방지
                    
                    # 재시도 로직
                    max_retries = 3
                    retry_count = 0
                    response = None
                    
                    while retry_count < max_retries:
                        try:
                            response = await client.get(search_url)
                            break  # 성공하면 루프 종료
                        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as e:
                            retry_count += 1
                            if retry_count < max_retries:
                                wait_time = retry_count * 2  # 재시도마다 대기 시간 증가
                                print(f"[사람인] 페이지 {page} 연결 실패 (재시도 {retry_count}/{max_retries}): {str(e)}")
                                await asyncio.sleep(wait_time)
                            else:
                                print(f"[사람인] 페이지 {page} 연결 최종 실패: {str(e)}")
                                raise e
                    
                    if not response:
                        break
                    
                    print(f"[사람인] 페이지 {page} HTTP 응답 코드: {response.status_code}")
                    
                    if response.status_code != 200:
                        print(f"[사람인] 페이지 {page} 접근 실패: HTTP {response.status_code}")
                        break
                    
                    html = response.text
                    soup = BeautifulSoup(html, "lxml")
                    
                    # 사람인 채용 공고 추출
                    page_job_listings = []
                    
                    # 사람인 채용공고 페이지 HTML 구조에 맞게 파싱
                    # 1순위: 채용공고 리스트 아이템 (일반적으로 data-recruit-no 속성 보유)
                    job_items = soup.find_all("div", {"data-recruit-no": True})
                    
                    # 2순위: 채용공고 아이템 클래스
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*item.*recruit.*|.*recruit.*item.*", re.I))
                    
                    # 3순위: 리스트 아이템
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*list.*item.*|.*job.*list.*", re.I))
                    
                    # 4순위: article 태그로 채용공고 찾기
                    if not job_items:
                        job_items = soup.find_all("article", class_=re.compile(r".*recruit.*|.*job.*", re.I))
                    
                    # 5순위: 채용공고 상세 링크가 있는 부모 요소 찾기
                    if not job_items:
                        recruit_links = soup.find_all("a", href=re.compile(r"/zf_user/jobs/relay/view"))
                        job_items = []
                        for link in recruit_links:
                            parent = link.find_parent("div") or link.find_parent("article") or link.find_parent("li")
                            if parent and parent not in job_items:
                                job_items.append(parent)
                    
                    print(f"[사람인] 페이지 {page} 발견된 공고 아이템 수: {len(job_items)}")
                    
                    if not job_items:
                        # 공고가 없으면 마지막 페이지
                        break
                    
                    for item in job_items:
                        try:
                            # 제목 추출 (채용공고용)
                            title_elem = (
                                item.find("a", class_=re.compile(r".*job_tit.*|.*title.*|.*subject.*", re.I)) or
                                item.find("h2", class_=re.compile(r".*job_tit.*|.*title.*", re.I)) or
                                item.find("a", href=re.compile(r"/zf_user/jobs/relay/view")) or
                                item.find("a", href=re.compile(r"/zf_user/jobs/recruit/view")) or
                                item.find("h2") or
                                item.find("h3")
                            )
                            
                            # 회사명 추출 - 여러 방법 시도
                            company_elem = (
                                item.find("a", class_=re.compile(r".*company.*|.*corp.*", re.I)) or
                                item.find("strong", class_=re.compile(r".*company.*", re.I)) or
                                item.find("span", class_=re.compile(r".*company.*", re.I))
                            )

                            # 회사명이 비어있거나 없으면 title에서 추출 시도
                            company = company_elem.get_text(strip=True) if company_elem else ""
                            if not company and title_elem:
                                # 제목에서 [회사명] 패턴 추출
                                title_text = title_elem.get_text(strip=True)
                                company_match = re.search(r'^\[([^\]]+)\]', title_text)
                                if company_match:
                                    company = company_match.group(1)
                            
                            # 지역 추출
                            location_elem = (
                                item.find("span", class_=re.compile(r".*location.*|.*area.*|.*region.*", re.I)) or
                                item.find("div", class_=re.compile(r".*location.*", re.I))
                            )
                            
                            # URL 추출 - 사람인 채용공고 상세 페이지 URL 형식
                            # /zf_user/jobs/relay/view?rec_idx=숫자 또는 /zf_user/jobs/recruit/view?rec_idx=숫자
                            job_url = ""
                            
                            # 1. data-recruit-no가 있으면 URL 생성 (가장 확실한 방법)
                            recruit_no = item.get("data-recruit-no")
                            if recruit_no:
                                job_url = f"https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={recruit_no}"
                            
                            # 2. item 내의 모든 링크에서 채용 공고 상세 페이지 링크 찾기
                            if not job_url:
                                all_links = item.find_all("a", href=True)
                                for link in all_links:
                                    href = link.get("href", "")
                                    # 사람인 채용공고 상세 페이지 URL 패턴 확인
                                    if href and ("/zf_user/jobs/relay/view" in href or "/zf_user/jobs/recruit/view" in href or "rec_idx=" in href):
                                        job_url = urljoin("https://www.saramin.co.kr", href)
                                        break
                            
                            # 3. 제목 링크에서 URL 추출
                            if not job_url and title_elem:
                                try:
                                    # title_elem이 Tag 객체이고 href 속성이 있는지 확인
                                    if hasattr(title_elem, 'get') and title_elem.name == 'a':
                                        href = title_elem.get("href", "")
                                        if href:
                                            job_url = urljoin("https://www.saramin.co.kr", href)
                                except:
                                    pass
                            
                            # 4. 마지막으로 item 내의 첫 번째 링크 사용
                            if not job_url:
                                first_link = item.find("a", href=True)
                                if first_link:
                                    href = first_link.get("href", "")
                                    if href and not href.startswith("#") and not href.startswith("javascript:") and not href.startswith("mailto:"):
                                        job_url = urljoin("https://www.saramin.co.kr", href)
                            
                            # 제목 추출 - 사람인은 <strong class="tit"> 또는 <h2 class="job_tit"> 안에 제목이 있음
                            title = ""

                            # 방법 1: item 또는 title_elem 내에서 실제 제목 요소 찾기
                            actual_title_elem = (
                                item.find("strong", class_=re.compile(r".*tit.*", re.I)) or
                                item.find("h2", class_=re.compile(r".*job_tit.*|.*tit.*", re.I)) or
                                item.find("span", class_=re.compile(r".*job_tit.*|.*tit.*", re.I))
                            )

                            if actual_title_elem:
                                title = actual_title_elem.get_text(strip=True)

                            # 방법 2: title_elem이 있고 title 속성이 있으면 사용
                            if not title and title_elem and title_elem.get('title'):
                                title = title_elem.get('title')

                            # 방법 3: title_elem의 직접 텍스트만 추출 (회사명 등 제외)
                            if not title and title_elem:
                                # tit 클래스를 가진 자식 요소만 추출
                                tit_child = title_elem.find(class_=re.compile(r".*tit.*", re.I))
                                if tit_child:
                                    title = tit_child.get_text(strip=True)

                            # 방법 4: 최후의 수단 - get_text에서 회사명/지역 패턴 제거
                            if not title and title_elem:
                                full_text = title_elem.get_text(strip=True)
                                # 회사명 패턴 제거 (주식회사, (주), ㈜ 등 포함 문자열)
                                title = re.sub(r'(주식회사|㈜|\(주\))[가-힣A-Za-z0-9\s]+', '', full_text)
                                # 지역 패턴 제거
                                title = re.sub(r'(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)(전체|[가-힣]+구|[가-힣]+시)?(\s*외)?', '', title)
                                # 경력/학력 패턴 제거
                                title = re.sub(r'(신입|경력무관|경력|학력무관|대졸|고졸|석사|박사)[/\s]*', '', title)
                                # 마감일 패턴 제거
                                title = re.sub(r'~\d+\.\d+\([월화수목금토일]\)', '', title)
                                title = re.sub(r'D-\d+', '', title)
                                # 합격 축하금 패턴 제거
                                title = re.sub(r'합격\s*시?\s*\d+만원', '', title)
                                title = title.strip()

                            # 전체 텍스트 (경력, 학력 등 추출용)
                            full_text = item.get_text(strip=True)

                            # 경력 정보 추출 (experience 필드에 저장)
                            experience = ""
                            experience_patterns = [
                                r'신입',
                                r'경력무관',
                                r'경력\s*\d+년',
                                r'\d+년\s*이상',
                                r'신입/경력',
                                r'경력'
                            ]
                            for pattern in experience_patterns:
                                exp_match = re.search(pattern, full_text)
                                if exp_match:
                                    experience = exp_match.group(0)
                                    break

                            # 상세정보 추출 (description 필드에 저장할 학력, 고용형태, 마감일)
                            details = []

                            # 마감일
                            deadline_match = re.search(r'(~\d+\.\d+\([월화수목금토일]\)|D-\d+)', full_text)
                            if deadline_match:
                                details.append(f"마감: {deadline_match.group(1)}")

                            # 학력
                            education_patterns = [
                                r'학력무관', r'고졸\s*이상', r'대졸\s*이상',
                                r'초대졸\s*이상', r'석사', r'박사'
                            ]
                            for pattern in education_patterns:
                                edu_match = re.search(pattern, full_text)
                                if edu_match:
                                    details.append(f"학력: {edu_match.group(0)}")
                                    break

                            # 고용형태
                            employment_patterns = [
                                r'정규직', r'계약직', r'인턴', r'아르바이트',
                                r'파견직', r'프리랜서'
                            ]
                            for pattern in employment_patterns:
                                emp_match = re.search(pattern, full_text)
                                if emp_match:
                                    details.append(f"고용형태: {emp_match.group(0)}")
                                    break

                            description = " | ".join(details) if details else ""

                            # 제목 정리 - 깔끔한 제목만 남김
                            # [회사명] 패턴 제거
                            title = re.sub(r'^\[[^\]]+\]\s*', '', title)
                            title = re.sub(r'~\d+\.\d+\([월화수목금토일]\).*$', '', title)
                            title = re.sub(r'D-\d+', '', title)
                            title = re.sub(r'\([^)]*[서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주][^)]*\)', '', title)
                            title = re.sub(r'(신입|경력무관|경력\s*\d+년|\d+년\s*이상|경력|신입/경력)', '', title)
                            title = re.sub(r'(학력무관|고졸|대졸|초대졸|석사|박사)\s*(이상)?', '', title)
                            title = re.sub(r'(정규직|계약직|인턴|아르바이트|파견직|프리랜서)', '', title)
                            title = re.sub(r'\([^)]*\)$', '', title)
                            # 회사명이 제목 끝에 붙어있는 경우 제거 (회사명은 별도로 추출됨)
                            if company:
                                title = title.replace(company, '')
                            title = re.sub(r'\s+', ' ', title).strip()
                            if len(title) > 200:
                                title = title[:200] + '...'

                            location = location_elem.get_text(strip=True) if location_elem else ""
                            
                            # 필터/메뉴 항목만 제외 (완화된 필터)
                            invalid_patterns = [
                                "근무요일...", "근무형태...", "업종...", 
                                "재택근무...", "직업 선택...", "지역...", "경력..."
                            ]
                            
                            if title:  # 제목이 있으면 검증
                                # 제목에 이상한 패턴이 있으면 제외
                                if any(invalid in title for invalid in invalid_patterns):
                                    continue
                                # 제목이 온점(.)으로만 시작하거나 "..."로만 구성되면 제외
                                if title.strip() in ['...', '..', '.'] or title.startswith('...'):
                                    continue
                                
                                # URL이 없으면 기본 검색 URL 사용
                                final_url = job_url if job_url else search_url
                                
                                page_job_listings.append({
                                    "id": item.get("data-recruit-no") or "",
                                    "title": title,
                                    "company": company,
                                    "location": location,
                                    "url": final_url,
                                    "description": description,
                                    "experience": experience
                                })
                                
                                # 디버깅: URL 추출 확인
                                if not job_url or job_url == search_url:
                                    print(f"[사람인] URL 추출 실패 - 제목: {title[:30]}..., URL: {final_url}")
                        except Exception as e:
                            print(f"[사람인] 페이지 {page} 공고 파싱 실패: {str(e)}")
                            continue
                    
                    print(f"[사람인] 페이지 {page} 파싱된 공고 수: {len(page_job_listings)}")
                    all_job_listings.extend(page_job_listings)
                    
                    # max_results 제한이 있으면 확인
                    if max_results > 0 and len(all_job_listings) >= max_results:
                        all_job_listings = all_job_listings[:max_results]
                        break
                    
                    # 이번 페이지에 공고가 없으면 종료
                    if len(page_job_listings) == 0:
                        print(f"[사람인] 페이지 {page}에 파싱된 공고가 없어 종료")
                        break
                    
                    # 다음 페이지가 있는지 확인 (페이지네이션 링크 확인)
                    pagination = soup.find("div", class_=re.compile(r".*pagination.*|.*paging.*", re.I))
                    has_next_page = True
                    
                    if pagination:
                        # 다음 페이지 링크 찾기
                        next_page_link = pagination.find("a", class_=re.compile(r".*next.*", re.I))
                        if next_page_link:
                            # disabled 클래스가 있거나 href가 없으면 다음 페이지 없음
                            if "disabled" in next_page_link.get("class", []) or not next_page_link.get("href"):
                                has_next_page = False
                        else:
                            # 다음 페이지 링크가 없으면 현재 페이지 번호 확인
                            current_page_links = pagination.find_all("a", class_=re.compile(r".*active.*|.*current.*", re.I))
                            page_numbers = pagination.find_all("a", href=re.compile(r".*page=\d+.*"))
                            if page_numbers:
                                max_page_num = 0
                                for link in page_numbers:
                                    href = link.get("href", "")
                                    page_match = re.search(r'page=(\d+)', href)
                                    if page_match:
                                        max_page_num = max(max_page_num, int(page_match.group(1)))
                                if page >= max_page_num:
                                    has_next_page = False
                    
                    if not has_next_page:
                        print(f"[사람인] 다음 페이지가 없어 종료 (현재 페이지: {page})")
                        break
                    
                    page += 1
                
                print(f"[사람인] 총 파싱된 공고 수: {len(all_job_listings)} (페이지: {page})")
                

                # 각 공고의 상세 정보 가져오기 (모든 공고)
                total_jobs = len(all_job_listings)
                print(f"[사람인] 전체 {total_jobs}개 공고의 상세 정보 가져오기...")

                for i, job in enumerate(all_job_listings):
                    job_url = job.get("url", "")
                    if job_url and "saramin.co.kr" in job_url:
                        detail_info = await self._crawl_saramin_job_detail(client, job_url)
                        if detail_info:
                            if detail_info.get("description"):
                                job["description"] = detail_info["description"]
                            if detail_info.get("tech_stack"):
                                job["tech_stack"] = ",".join(detail_info["tech_stack"])
                            if detail_info.get("requirements"):
                                job["required_skills"] = detail_info["requirements"][:500]
                            if detail_info.get("applicant_count"):
                                job["applicant_count"] = detail_info["applicant_count"]
                            # 새 필드 추가
                            if detail_info.get("company"):
                                job["company"] = detail_info["company"]
                            if detail_info.get("deadline"):
                                job["deadline"] = detail_info["deadline"]
                            if detail_info.get("salary"):
                                job["salary"] = detail_info["salary"]
                            if detail_info.get("work_location"):
                                job["work_location"] = detail_info["work_location"]
                            if detail_info.get("preferred_majors"):
                                job["preferred_majors"] = detail_info["preferred_majors"]
                            if detail_info.get("core_competencies"):
                                job["core_competencies"] = detail_info["core_competencies"]
                            print(f"[사람인] ({i+1}/{total_jobs}) {job.get('title', '')[:30]}... 상세 정보 추가 완료 (지원자: {detail_info.get('applicant_count', 0)}명)")

                print(f"[사람인] 상세 정보 가져오기 완료")

                result = {
                    "success": True,
                    "site": "saramin",
                    "searchKeyword": search_keyword,
                    "totalResults": len(all_job_listings),
                    "jobListings": all_job_listings,
                    "searchUrl": base_search_url,
                    "fromCache": False,
                    "cachedAt": datetime.now().isoformat()
                }
                
                # 데이터베이스에 저장
                if self.db_service and all_job_listings:
                    try:
                        saved_count = self.db_service.save_job_listings(
                            site_name="saramin",
                            site_url="https://www.saramin.co.kr",
                            job_listings=all_job_listings,
                            search_keyword=search_keyword
                        )
                        print(f"[사람인] {saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")
                        result["savedToDatabase"] = saved_count

                        # 기업정보도 저장
                        print(f"[사람인] company_service 존재 여부: {self.company_service is not None}")
                        if self.company_service:
                            try:
                                print(f"[사람인] 기업정보 추출 시작... (job_listings: {len(all_job_listings)}개)")
                                company_count = await self.company_service.crawl_and_save_companies_from_jobs(
                                    site_name="saramin",
                                    job_listings=all_job_listings
                                )
                                print(f"[사람인] {company_count}개 기업 정보 저장 완료")
                                result["savedCompanies"] = company_count
                            except Exception as e:
                                import traceback
                                print(f"[사람인] 기업정보 저장 실패: {str(e)}")
                                print(f"[사람인] Traceback: {traceback.format_exc()}")
                    except Exception as e:
                        print(f"[사람인] 데이터베이스 저장 실패: {str(e)}")
                        result["databaseError"] = str(e)

                return result
            
        except Exception as e:
            import traceback
            error_detail = f"{str(e)}\n{traceback.format_exc()}"
            print(f"[사람인] 크롤링 실패: {error_detail}")
            return {
                "success": False,
                "error": str(e),
                "message": "크롤링 중 오류 발생"
            }
    
    async def crawl_multiple_sites(
        self,
        site_urls: List[Dict],
        search_keyword: Optional[str] = None,
        max_results_per_site: int = 5,
        force_refresh: bool = False
    ) -> Dict:
        """
        여러 취업 사이트에서 동시에 채용 정보를 크롤링합니다.
        
        Args:
            site_urls: 사이트 정보 리스트 (name, url 포함)
            search_keyword: 검색 키워드
            max_results_per_site: 사이트당 최대 결과 수
        
        Returns:
            모든 사이트의 크롤링 결과
        """
        import asyncio
        
        tasks = []
        for site_info in site_urls:
            task = self.crawl_job_site(
                site_info.get("name", ""),
                site_info.get("url", ""),
                search_keyword,
                max_results_per_site,
                force_refresh
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 결과 정리
        all_results = {
            "success": True,
            "searchKeyword": search_keyword,
            "sites": []
        }
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                all_results["sites"].append({
                    "site": site_urls[i].get("name", ""),
                    "success": False,
                    "error": str(result)
                })
            else:
                all_results["sites"].append(result)
        
        return all_results

