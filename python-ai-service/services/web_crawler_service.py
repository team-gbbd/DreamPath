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
        except Exception as e:
            print(f"데이터베이스 서비스 초기화 실패: {str(e)}")
            self.db_service = None
    
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
        cache_key = self._generate_cache_key("원티드", "https://www.wanted.co.kr", search_keyword, max_results)
        
        # 강제 새로고침이 아니고 캐시가 있으면 캐시 반환
        if not force_refresh:
            cached_data = self._get_cached_data(cache_key)
            if cached_data:
                cached_data["fromCache"] = True
                cached_data["cachedAt"] = self.cache[cache_key].expires_at.isoformat()
                return cached_data
        
        try:
            # 요청 간 딜레이 (IP 차단 방지)
            await self._wait_if_needed()
            
            base_url = "https://www.wanted.co.kr"
            
            # 검색 URL 생성
            if search_keyword:
                search_url = f"{base_url}/search?query={quote(search_keyword)}"
            else:
                search_url = f"{base_url}/wd/list"
            
            async with httpx.AsyncClient(
                timeout=30.0, 
                headers=self.headers, 
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)  # 연결 제한
            ) as client:
                # 검색 페이지 접근
                response = await client.get(search_url)
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}",
                        "message": "페이지 접근 실패"
                    }
                
                html = response.text
                soup = BeautifulSoup(html, "lxml")
                
                # 원티드는 주로 API를 통해 데이터를 가져오므로, API 엔드포인트를 찾아야 함
                # 또는 페이지에서 JavaScript로 렌더링된 데이터를 찾아야 함
                
                # 방법 1: API 엔드포인트 찾기 시도
                job_listings = []
                
                # 페이지에서 채용 공고 링크 찾기
                job_links = soup.find_all("a", href=re.compile(r"/wd/\d+"))
                
                for link in job_links[:max_results]:
                    job_path = link.get("href", "")
                    if job_path:
                        job_url = urljoin(base_url, job_path)
                        
                        # 요청 간 딜레이 (각 상세 페이지 크롤링 전)
                        await self._wait_if_needed()
                        
                        # 각 채용 공고 상세 페이지 크롤링
                        job_detail = await self._crawl_wanted_job_detail(client, job_url)
                        if job_detail:
                            job_listings.append(job_detail)
                
                # 방법 2: API 직접 호출 시도
                if not job_listings and search_keyword:
                    api_results = await self._crawl_wanted_api(client, search_keyword, max_results)
                    if api_results:
                        job_listings = api_results
                
                # 방법 3: HTML에서 JSON 데이터 찾기 (Next.js의 __NEXT_DATA__ 등)
                if not job_listings:
                    # 원티드는 Next.js를 사용하므로 __NEXT_DATA__ 스크립트 태그에서 데이터 찾기
                    script_tags = soup.find_all("script")
                    for script in script_tags:
                        script_text = script.string or ""
                        if "__NEXT_DATA__" in script_text or "pageProps" in script_text:
                            try:
                                # JSON 데이터 추출 시도
                                if "__NEXT_DATA__" in script_text:
                                    # __NEXT_DATA__ = {...} 형태에서 JSON 추출
                                    json_match = re.search(r'__NEXT_DATA__\s*=\s*({.+?});', script_text, re.DOTALL)
                                    if json_match:
                                        json_data = json.loads(json_match.group(1))
                                        # pageProps에서 채용 공고 데이터 찾기
                                        page_props = json_data.get("props", {}).get("pageProps", {})
                                        
                                        # 다양한 가능한 키 확인
                                        jobs_data = None
                                        if "jobs" in page_props:
                                            jobs_data = page_props["jobs"]
                                        elif "data" in page_props and isinstance(page_props["data"], list):
                                            jobs_data = page_props["data"]
                                        elif "results" in page_props:
                                            jobs_data = page_props["results"]
                                        
                                        if jobs_data and isinstance(jobs_data, list):
                                            for job in jobs_data[:max_results]:
                                                job_id = job.get("id") or job.get("job_id", "")
                                                title = job.get("position") or job.get("title") or job.get("name", "")
                                                company_info = job.get("company", {})
                                                if isinstance(company_info, dict):
                                                    company_name = company_info.get("name", "")
                                                else:
                                                    company_name = str(company_info) if company_info else ""
                                                
                                                location_info = job.get("address", {}) or job.get("location", {})
                                                if isinstance(location_info, dict):
                                                    location = location_info.get("location", "") or location_info.get("name", "")
                                                else:
                                                    location = str(location_info) if location_info else ""
                                                
                                                reward = job.get("reward", "") or job.get("compensation", "")
                                                
                                                if job_id or title:
                                                    job_listings.append({
                                                        "id": str(job_id),
                                                        "title": title or "채용 공고",
                                                        "company": company_name,
                                                        "location": location,
                                                        "reward": reward,
                                                        "url": f"https://www.wanted.co.kr/wd/{job_id}" if job_id else search_url
                                                    })
                                            
                                            if job_listings:
                                                print(f"원티드 __NEXT_DATA__에서 {len(job_listings)}개 공고 발견")
                                                break
                            except Exception as e:
                                print(f"JSON 파싱 실패: {str(e)}")
                                continue
                    
                    # 검색 URL만 제공하는 fallback
                    if not job_listings:
                        print(f"원티드 크롤링: HTML 파싱으로 데이터를 찾을 수 없음. 검색 URL: {search_url}")
                        # 최소한 검색 URL은 제공
                        job_listings = [{
                            "title": f"{search_keyword} 검색 결과",
                            "url": search_url,
                            "description": "원티드 사이트에서 직접 확인해주세요.",
                            "note": "JavaScript로 렌더링되는 페이지이므로 직접 사이트에서 확인이 필요합니다."
                        }]
                
                result = {
                    "success": True,
                    "site": "원티드",
                    "searchKeyword": search_keyword,
                    "totalResults": len(job_listings),
                    "jobListings": job_listings,
                    "searchUrl": search_url,
                    "fromCache": False,
                    "cachedAt": datetime.now().isoformat()
                }
                
                # 데이터베이스에 저장
                if self.db_service and job_listings:
                    try:
                        saved_count = self.db_service.save_job_listings(
                            site_name="원티드",
                            site_url=base_url,
                            job_listings=job_listings,
                            search_keyword=search_keyword
                        )
                        result["savedToDatabase"] = saved_count
                        print(f"원티드 크롤링 결과 {saved_count}개를 데이터베이스에 저장했습니다.")
                    except Exception as e:
                        print(f"데이터베이스 저장 실패: {str(e)}")
                        result["databaseError"] = str(e)
                
                # 결과를 캐시에 저장
                self._set_cached_data(cache_key, result)
                
                return result
                
        except Exception as e:
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
            
            all_job_listings = []
            offset = 0
            page_size = 100  # 한 번에 가져올 최대 개수
            max_pages = 100  # 최대 페이지 수 (안전장치) - 원티드는 페이지당 100개
            page = 0
            
            while page < max_pages:
                # 검색 파라미터 설정
                params = {
                    "country": "kr",
                    "tag_type_ids": "518",
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
                response = await client.get(api_url, params=params)
                
                if response.status_code != 200:
                    print(f"원티드 API 호출 실패: HTTP {response.status_code}")
                    break
                
                data = response.json()
                
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
                    
                    reward = job.get("reward", "") or job.get("compensation", "")
                    experience = job.get("experience_level", "") or job.get("years", "")
                    
                    if job_id or title:
                        page_job_listings.append({
                            "id": str(job_id),
                            "title": title or "채용 공고",
                            "company": company_name,
                            "location": location,
                            "reward": reward,
                            "experience": experience,
                            "url": f"https://www.wanted.co.kr/wd/{job_id}" if job_id else f"https://www.wanted.co.kr/search?query={quote(keyword)}"
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
        job_url: str
    ) -> Optional[Dict]:
        """원티드 채용 공고 상세 페이지 크롤링"""
        try:
            response = await client.get(job_url)
            
            if response.status_code == 200:
                html = response.text
                soup = BeautifulSoup(html, "lxml")
                
                # 채용 공고 정보 추출 (실제 HTML 구조에 맞게 수정 필요)
                title_elem = soup.find("h2", class_=re.compile(r".*title.*", re.I))
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                company_elem = soup.find("a", class_=re.compile(r".*company.*", re.I))
                company = company_elem.get_text(strip=True) if company_elem else ""
                
                location_elem = soup.find("div", class_=re.compile(r".*location.*", re.I))
                location = location_elem.get_text(strip=True) if location_elem else ""
                
                # 상세 정보 추출
                description_elem = soup.find("div", class_=re.compile(r".*description.*", re.I))
                description = description_elem.get_text(strip=True) if description_elem else ""
                
                return {
                    "title": title,
                    "company": company,
                    "location": location,
                    "description": description[:500] if description else "",  # 처음 500자만
                    "url": job_url
                }
            
        except Exception as e:
            print(f"상세 페이지 크롤링 실패: {str(e)}")
        
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
                base_search_url = f"https://www.jobkorea.co.kr/Search/?stext={quote(search_keyword)}"
            else:
                base_search_url = "https://www.jobkorea.co.kr/Recruit"
            
            print(f"[잡코리아] 크롤링 시작: {base_search_url}, 키워드: {search_keyword}, max_results: {max_results}")
            
            all_job_listings = []
            page = 1
            max_pages = 100  # 최대 페이지 수 (안전장치)
            
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
                    # 잡코리아는 여러 가지 구조를 사용할 수 있음
                    job_items = []
                    
                    # 1. data-gno 속성을 가진 요소 찾기 (가장 확실한 방법)
                    job_items = soup.find_all("div", {"data-gno": True})
                    
                    # 2. list-item 클래스 찾기
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*list-item.*|.*listItem.*", re.I))
                    
                    # 3. recruit 관련 클래스 찾기
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*recruit.*", re.I))
                    
                    # 4. tplJobList 클래스 찾기 (잡코리아 검색 결과 리스트)
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*tplJobList.*|.*job-list.*", re.I))
                    
                    # 5. li 태그 내의 공고 찾기
                    if not job_items:
                        list_items = soup.find_all("li", class_=re.compile(r".*list.*|.*item.*", re.I))
                        for li in list_items:
                            if li.find("a", href=re.compile(r"/Recruit/GI_Read")):
                                job_items.append(li)
                    
                    # 6. 더 일반적인 선택자
                    if not job_items:
                        job_items = soup.find_all("div", class_=re.compile(r".*list.*post.*|.*post.*list.*|.*item.*recruit.*|.*recruit.*item.*", re.I))
                    
                    # 7. 모든 링크에서 /Recruit/GI_Read 패턴 찾기
                    if not job_items:
                        recruit_links = soup.find_all("a", href=re.compile(r"/Recruit/GI_Read"))
                        for link in recruit_links:
                            parent = link.find_parent("div") or link.find_parent("li")
                            if parent and parent not in job_items:
                                job_items.append(parent)
                    
                    print(f"[잡코리아] 페이지 {page} 발견된 공고 아이템 수: {len(job_items)}")
                    
                    if not job_items:
                        # 공고가 없으면 마지막 페이지
                        break
                    
                    for item in job_items:
                        try:
                            # 제목 추출 - 잡코리아는 여러 구조를 사용
                            title_elem = None
                            
                            # 1. data-gno를 가진 요소 내의 링크 찾기
                            if not title_elem:
                                title_elem = item.find("a", href=re.compile(r"/Recruit/GI_Read"))
                            
                            # 2. title 클래스를 가진 링크 찾기
                            if not title_elem:
                                title_elem = item.find("a", class_=re.compile(r".*title.*|.*subject.*|.*job.*title.*", re.I))
                            
                            # 3. strong 태그 내의 링크 찾기
                            if not title_elem:
                                strong = item.find("strong")
                                if strong:
                                    title_elem = strong.find("a")
                            
                            # 4. h2, h3 태그 찾기
                            if not title_elem:
                                title_elem = item.find("h2") or item.find("h3")
                            
                            # 5. 첫 번째 링크 사용
                            if not title_elem:
                                title_elem = item.find("a", href=True)
                            
                            # 회사명 추출
                            company_elem = (
                                item.find("a", class_=re.compile(r".*company.*|.*corp.*", re.I)) or
                                item.find("strong", class_=re.compile(r".*company.*", re.I)) or
                                item.find("span", class_=re.compile(r".*company.*", re.I))
                            )
                            
                            # 지역 추출
                            location_elem = (
                                item.find("span", class_=re.compile(r".*location.*|.*area.*|.*region.*|.*local.*", re.I)) or
                                item.find("div", class_=re.compile(r".*location.*", re.I))
                            )
                            
                            # URL 추출 - 잡코리아 상세 페이지 URL 형식: /Recruit/GI_Read/숫자
                            job_url = ""
                            
                            # 1. data-gno가 있으면 URL 생성
                            gno = item.get("data-gno")
                            if gno:
                                job_url = f"https://www.jobkorea.co.kr/Recruit/GI_Read/{gno}"
                            
                            # 2. item 내의 모든 링크에서 채용 공고 상세 페이지 링크 찾기
                            if not job_url:
                                all_links = item.find_all("a", href=True)
                                for link in all_links:
                                    href = link.get("href", "")
                                    if href and ("/Recruit/GI_Read" in href or "/GI_Read" in href):
                                        job_url = urljoin("https://www.jobkorea.co.kr", href)
                                        break
                            
                            # 3. 제목 링크에서 URL 추출
                            if not job_url and title_elem:
                                try:
                                    if hasattr(title_elem, 'get') and title_elem.name == 'a':
                                        href = title_elem.get("href", "")
                                        if href:
                                            job_url = urljoin("https://www.jobkorea.co.kr", href)
                                except:
                                    pass
                            
                            # 4. 마지막으로 item 내의 첫 번째 링크 사용
                            if not job_url:
                                first_link = item.find("a", href=True)
                                if first_link:
                                    href = first_link.get("href", "")
                                    if href and not href.startswith("#") and not href.startswith("javascript:") and not href.startswith("mailto:"):
                                        job_url = urljoin("https://www.jobkorea.co.kr", href)
                            
                            title = title_elem.get_text(strip=True) if title_elem else ""
                            company = company_elem.get_text(strip=True) if company_elem else ""
                            location = location_elem.get_text(strip=True) if location_elem else ""
                            
                            if title:  # 제목이 있으면 추가
                                final_url = job_url if job_url else search_url
                                
                                page_job_listings.append({
                                    "id": gno or "",
                                    "title": title,
                                    "company": company,
                                    "location": location,
                                    "url": final_url,
                                    "description": ""
                                })
                                
                                # 디버깅: URL 추출 확인
                                if not job_url or job_url == search_url:
                                    print(f"[잡코리아] URL 추출 실패 - 제목: {title[:30]}..., URL: {final_url}")
                        except Exception as e:
                            print(f"[잡코리아] 페이지 {page} 공고 파싱 실패: {str(e)}")
                            continue
                    
                    print(f"[잡코리아] 페이지 {page} 파싱된 공고 수: {len(page_job_listings)}")
                    all_job_listings.extend(page_job_listings)
                    
                    # max_results 제한이 있으면 확인
                    if max_results > 0 and len(all_job_listings) >= max_results:
                        all_job_listings = all_job_listings[:max_results]
                        break
                    
                    # 이번 페이지에 공고가 없으면 종료
                    if len(page_job_listings) == 0:
                        print(f"[잡코리아] 페이지 {page}에 파싱된 공고가 없어 종료")
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
                
                print(f"[잡코리아] 총 파싱된 공고 수: {len(all_job_listings)} (페이지: {page})")
                
                result = {
                    "success": True,
                    "site": "잡코리아",
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
                            site_name="잡코리아",
                            site_url="https://www.jobkorea.co.kr",
                            job_listings=all_job_listings,
                            search_keyword=search_keyword
                        )
                        print(f"[잡코리아] {saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")
                        result["savedToDatabase"] = saved_count
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
        """사람인 크롤링 - 페이지네이션 지원"""
        try:
            base_search_url = ""
            if search_keyword:
                base_search_url = f"https://www.saramin.co.kr/zf_user/search?searchType=search&searchword={quote(search_keyword)}"
            else:
                base_search_url = "https://www.saramin.co.kr/zf_user/jobs/list/domestic"
            
            print(f"[사람인] 크롤링 시작: {base_search_url}, 키워드: {search_keyword}, max_results: {max_results}")
            
            all_job_listings = []
            page = 1
            max_pages = 100  # 최대 페이지 수 (안전장치) - 사람인은 페이지당 약 20-40개
            
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
                    
                    # 사람인 HTML 구조에 맞게 파싱
                    # 채용 공고는 보통 .item_recruit 또는 .list_item 등의 클래스를 가짐
                    job_items = soup.find_all("div", class_=re.compile(r".*item.*recruit.*|.*recruit.*item.*|.*list.*item.*", re.I))
                    
                    if not job_items:
                        # 다른 가능한 선택자 시도
                        job_items = soup.find_all("div", {"data-recruit-no": True})
                    
                    if not job_items:
                        # 더 일반적인 선택자
                        job_items = soup.find_all("div", class_=re.compile(r".*job.*|.*position.*", re.I))
                    
                    print(f"[사람인] 페이지 {page} 발견된 공고 아이템 수: {len(job_items)}")
                    
                    if not job_items:
                        # 공고가 없으면 마지막 페이지
                        break
                    
                    for item in job_items:
                        try:
                            # 제목 추출
                            title_elem = (
                                item.find("a", class_=re.compile(r".*title.*|.*subject.*|.*job.*title.*", re.I)) or
                                item.find("h2") or
                                item.find("h3") or
                                item.find("a", href=re.compile(r"/zf_user/jobs/recruit"))
                            )
                            
                            # 회사명 추출
                            company_elem = (
                                item.find("a", class_=re.compile(r".*company.*|.*corp.*", re.I)) or
                                item.find("strong", class_=re.compile(r".*company.*", re.I)) or
                                item.find("span", class_=re.compile(r".*company.*", re.I))
                            )
                            
                            # 지역 추출
                            location_elem = (
                                item.find("span", class_=re.compile(r".*location.*|.*area.*|.*region.*", re.I)) or
                                item.find("div", class_=re.compile(r".*location.*", re.I))
                            )
                            
                            # URL 추출 - 사람인 상세 페이지 URL 형식: /zf_user/jobs/recruit/view?rec_idx=숫자
                            job_url = ""
                            
                            # 1. data-recruit-no가 있으면 URL 생성 (가장 확실한 방법)
                            recruit_no = item.get("data-recruit-no")
                            if recruit_no:
                                job_url = f"https://www.saramin.co.kr/zf_user/jobs/recruit/view?rec_idx={recruit_no}"
                            
                            # 2. item 내의 모든 링크에서 채용 공고 상세 페이지 링크 찾기
                            if not job_url:
                                all_links = item.find_all("a", href=True)
                                for link in all_links:
                                    href = link.get("href", "")
                                    # 사람인 상세 페이지 URL 패턴 확인
                                    if href and ("/zf_user/jobs/recruit/view" in href or "rec_idx=" in href):
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
                            
                            title = title_elem.get_text(strip=True) if title_elem else ""
                            company = company_elem.get_text(strip=True) if company_elem else ""
                            location = location_elem.get_text(strip=True) if location_elem else ""
                            
                            if title:  # 제목이 있으면 추가
                                # URL이 없으면 기본 검색 URL 사용
                                final_url = job_url if job_url else search_url
                                
                                page_job_listings.append({
                                    "id": item.get("data-recruit-no") or "",
                                    "title": title,
                                    "company": company,
                                    "location": location,
                                    "url": final_url,
                                    "description": ""
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
                
                result = {
                    "success": True,
                    "site": "사람인",
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
                            site_name="사람인",
                            site_url="https://www.saramin.co.kr",
                            job_listings=all_job_listings,
                            search_keyword=search_keyword
                        )
                        print(f"[사람인] {saved_count}개의 채용 공고가 데이터베이스에 저장되었습니다.")
                        result["savedToDatabase"] = saved_count
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

