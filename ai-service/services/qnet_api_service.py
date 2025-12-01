"""
한국산업인력공단 Q-net API 연동 서비스

공공데이터포털 API:
1. 국가기술자격 종목 정보
2. 국가기술자격 종목별 시험정보
3. Q-net 컨텐츠 관련 정보

참고: Q-net API가 매우 불안정하여 캐싱 및 재시도 로직 적용
"""
import os
import httpx
import json
import asyncio
from typing import List, Dict, Optional
from urllib.parse import quote
from datetime import datetime, timedelta
from pathlib import Path
import xml.etree.ElementTree as ET


class QnetApiService:
    """한국산업인력공단 Q-net API 서비스"""

    # 캐시 저장 경로
    CACHE_DIR = Path(__file__).parent.parent / "cache" / "qnet"
    CACHE_EXPIRY_HOURS = 24  # 캐시 유효기간 (시간)
    MAX_RETRIES = 3  # 최대 재시도 횟수
    RETRY_DELAY = 2  # 재시도 간격 (초)

    def __init__(self):
        # 공공데이터포털 인증키 (URL 인코딩된 키)
        self.service_key = os.getenv("QNET_API_KEY", "")

        # API 엔드포인트
        self.base_urls = {
            # 국가기술자격 종목 정보
            "qualification_list": "http://openapi.q-net.or.kr/api/service/rest/InquiryQualInfo/getList",
            # 기사/산업기사 시험정보
            "exam_schedule_e": "http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getEList",
            # 기능사 시험정보
            "exam_schedule_pe": "http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getPEList",
            # 서비스 분야 시험정보
            "exam_schedule_mc": "http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC/getMCList",
            # Q-net 컨텐츠 관련 정보
            "qnet_content": "http://openapi.q-net.or.kr/api/service/rest/InquiryContentsSVC/getList",
        }

        self.timeout = 120.0  # InquiryQualInfo API는 응답이 느림

        # 캐시 디렉토리 생성
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, cache_key: str) -> Path:
        """캐시 파일 경로 생성"""
        safe_key = cache_key.replace("/", "_").replace(":", "_").replace("?", "_")
        return self.CACHE_DIR / f"{safe_key}.json"

    def _is_cache_valid(self, cache_path: Path) -> bool:
        """캐시 유효성 확인"""
        if not cache_path.exists():
            return False

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache_data = json.load(f)

            cached_time = datetime.fromisoformat(cache_data.get("cached_at", "2000-01-01"))
            expiry_time = cached_time + timedelta(hours=self.CACHE_EXPIRY_HOURS)
            return datetime.now() < expiry_time
        except:
            return False

    def _get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """캐시된 데이터 조회"""
        cache_path = self._get_cache_path(cache_key)

        if not self._is_cache_valid(cache_path):
            return None

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
            return cache_data.get("data")
        except:
            return None

    def _save_to_cache(self, cache_key: str, data: Dict):
        """데이터를 캐시에 저장"""
        cache_path = self._get_cache_path(cache_key)

        try:
            cache_data = {
                "cached_at": datetime.now().isoformat(),
                "data": data
            }
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"캐시 저장 실패: {e}")

    async def get_qualification_list(
        self,
        series_code: Optional[str] = None,
        qualification_name: Optional[str] = None,
        page_no: int = 1,
        num_of_rows: int = 100
    ) -> Dict:
        """
        국가기술자격 종목 목록 조회 (캐싱 및 재시도 적용)

        Args:
            series_code: 계열코드 (예: 01-기계, 02-금속 등)
            qualification_name: 자격명 (검색어)
            page_no: 페이지 번호
            num_of_rows: 한 페이지 결과 수

        Returns:
            자격증 목록 및 상세 정보
        """
        if not self.service_key:
            return {"success": False, "message": "API 키가 설정되지 않았습니다.", "items": []}

        # 캐시 키 생성
        cache_key = f"qual_{series_code or 'all'}_{qualification_name or 'all'}_{page_no}_{num_of_rows}"

        # 캐시된 데이터 확인
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            print(f"[QNET] 캐시 사용: {cache_key}")
            return cached_data

        params = {
            "serviceKey": self.service_key,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }

        if series_code:
            params["seriesCd"] = series_code
        if qualification_name:
            params["jmNm"] = qualification_name

        # 재시도 로직 적용
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(
                        self.base_urls["qualification_list"],
                        params=params
                    )

                    if response.status_code == 200:
                        result = self._parse_xml_response(response.text, "qualification")

                        # 성공 시 캐시에 저장
                        if result.get("success") and result.get("items"):
                            self._save_to_cache(cache_key, result)
                            print(f"[QNET] API 성공 및 캐시 저장: {cache_key} ({len(result['items'])}건)")

                        return result
                    else:
                        last_error = f"API 오류: {response.status_code}"

            except Exception as e:
                last_error = str(e)
                print(f"[QNET] 시도 {attempt + 1}/{self.MAX_RETRIES} 실패: {last_error}")

            # 재시도 전 대기
            if attempt < self.MAX_RETRIES - 1:
                await asyncio.sleep(self.RETRY_DELAY)

        # 모든 재시도 실패 시 캐시된 데이터 반환 (만료되어도)
        expired_cache = self._get_expired_cache(cache_key)
        if expired_cache:
            print(f"[QNET] 만료된 캐시 사용: {cache_key}")
            expired_cache["message"] = "(캐시된 데이터 - API 일시 불안정)"
            return expired_cache

        return {
            "success": False,
            "message": f"API 호출 실패 (재시도 {self.MAX_RETRIES}회): {last_error}",
            "items": []
        }

    def _get_expired_cache(self, cache_key: str) -> Optional[Dict]:
        """만료된 캐시라도 가져오기 (API 완전 실패 시 대비)"""
        cache_path = self._get_cache_path(cache_key)

        if not cache_path.exists():
            return None

        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
            return cache_data.get("data")
        except:
            return None

    async def get_exam_schedule(
        self,
        exam_type: str = "all",
        page_no: int = 1,
        num_of_rows: int = 50
    ) -> Dict:
        """
        국가기술자격 시험 일정 조회 (캐싱 및 재시도 적용)

        Args:
            exam_type: 시험 유형 ("e": 기사/산업기사, "pe": 기능사, "mc": 서비스분야, "all": 전체)
            page_no: 페이지 번호
            num_of_rows: 한 페이지 결과 수

        Returns:
            시험 일정 정보
        """
        if not self.service_key:
            return {"success": False, "message": "API 키가 설정되지 않았습니다.", "items": []}

        # 캐시 키 생성
        cache_key = f"exam_{exam_type}_{page_no}_{num_of_rows}"

        # 캐시된 데이터 확인
        cached_data = self._get_cached_data(cache_key)
        if cached_data:
            print(f"[QNET] 시험일정 캐시 사용: {cache_key}")
            return cached_data

        params = {
            "serviceKey": self.service_key,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }

        all_items = []
        last_error = None

        # 재시도 로직
        for attempt in range(self.MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    all_items = []

                    # 기사/산업기사 시험정보
                    if exam_type in ["e", "all"]:
                        response = await client.get(
                            self.base_urls["exam_schedule_e"],
                            params=params
                        )
                        if response.status_code == 200:
                            result = self._parse_xml_response(response.text, "exam")
                            if result.get("success"):
                                for item in result.get("items", []):
                                    item["examCategory"] = "기사/산업기사"
                                all_items.extend(result.get("items", []))

                    # 기능사 시험정보
                    if exam_type in ["pe", "all"]:
                        response = await client.get(
                            self.base_urls["exam_schedule_pe"],
                            params=params
                        )
                        if response.status_code == 200:
                            result = self._parse_xml_response(response.text, "exam")
                            if result.get("success"):
                                for item in result.get("items", []):
                                    item["examCategory"] = "기능사"
                                all_items.extend(result.get("items", []))

                    # 서비스 분야 시험정보
                    if exam_type in ["mc", "all"]:
                        response = await client.get(
                            self.base_urls["exam_schedule_mc"],
                            params=params
                        )
                        if response.status_code == 200:
                            result = self._parse_xml_response(response.text, "exam")
                            if result.get("success"):
                                for item in result.get("items", []):
                                    item["examCategory"] = "서비스"
                                all_items.extend(result.get("items", []))

                    result = {
                        "success": True,
                        "totalCount": len(all_items),
                        "items": all_items
                    }

                    # 성공 시 캐시에 저장
                    if all_items:
                        self._save_to_cache(cache_key, result)
                        print(f"[QNET] 시험일정 API 성공 및 캐시 저장: {cache_key} ({len(all_items)}건)")

                    return result

            except Exception as e:
                last_error = str(e)
                print(f"[QNET] 시험일정 시도 {attempt + 1}/{self.MAX_RETRIES} 실패: {last_error}")

            # 재시도 전 대기
            if attempt < self.MAX_RETRIES - 1:
                await asyncio.sleep(self.RETRY_DELAY)

        # 모든 재시도 실패 시 캐시된 데이터 반환
        expired_cache = self._get_expired_cache(cache_key)
        if expired_cache:
            print(f"[QNET] 시험일정 만료된 캐시 사용: {cache_key}")
            expired_cache["message"] = "(캐시된 데이터 - API 일시 불안정)"
            return expired_cache

        return {
            "success": False,
            "message": f"API 호출 실패 (재시도 {self.MAX_RETRIES}회): {last_error}",
            "items": []
        }

    async def get_qnet_content(
        self,
        content_type: Optional[str] = None,
        keyword: Optional[str] = None,
        page_no: int = 1,
        num_of_rows: int = 50
    ) -> Dict:
        """
        Q-net 컨텐츠 정보 조회

        Args:
            content_type: 컨텐츠 유형
            keyword: 검색 키워드
            page_no: 페이지 번호
            num_of_rows: 한 페이지 결과 수

        Returns:
            Q-net 컨텐츠 정보
        """
        if not self.service_key:
            return {"success": False, "message": "API 키가 설정되지 않았습니다.", "items": []}

        params = {
            "serviceKey": self.service_key,
            "pageNo": page_no,
            "numOfRows": num_of_rows,
        }

        if content_type:
            params["contentType"] = content_type
        if keyword:
            params["keyword"] = keyword

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.base_urls["qnet_content"],
                    params=params
                )

                if response.status_code == 200:
                    return self._parse_xml_response(response.text, "content")
                else:
                    return {
                        "success": False,
                        "message": f"API 오류: {response.status_code}",
                        "items": []
                    }

        except Exception as e:
            return {
                "success": False,
                "message": f"API 호출 실패: {str(e)}",
                "items": []
            }

    async def search_certifications_for_job(
        self,
        job_keywords: List[str]
    ) -> Dict:
        """
        직업 키워드로 관련 자격증 검색

        Args:
            job_keywords: 직업 관련 키워드 (예: ["백엔드", "개발자", "Python"])

        Returns:
            관련 자격증 목록
        """
        all_certifications = []

        # 직업 키워드를 계열코드로 매핑
        series_codes = self._map_job_to_series_codes(job_keywords)

        for series_code in series_codes:
            try:
                result = await self.get_qualification_list(series_code=series_code, num_of_rows=30)
                if result.get("success") and result.get("items"):
                    for item in result["items"]:
                        # 중복 제거
                        if not any(c.get("code") == item.get("code") for c in all_certifications):
                            all_certifications.append(item)
            except Exception as e:
                # API 오류 시 해당 계열 건너뛰기
                print(f"계열 {series_code} 조회 실패: {e}")
                continue

        # fallback 제거 - 관련 없는 자격증 추천 방지
        # 결과가 없으면 빈 배열 반환 (기계/건축 자격증이 엉뚱하게 추천되는 문제 해결)

        return {
            "success": True,
            "totalCount": len(all_certifications),
            "certifications": all_certifications
        }

    def _map_job_to_series_codes(self, job_keywords: List[str]) -> List[str]:
        """직업 키워드를 계열코드로 매핑"""
        # 직업 -> 계열코드 매핑
        job_to_series = {
            # IT/개발
            "개발": ["05"],  # 정보통신
            "개발자": ["05"],
            "백엔드": ["05"],
            "프론트엔드": ["05"],
            "프로그래머": ["05"],
            "it": ["05"],
            "소프트웨어": ["05"],
            "데이터": ["05"],
            "ai": ["05"],
            "인공지능": ["05"],
            "보안": ["05"],
            "네트워크": ["05"],
            "정보처리": ["05"],
            "컴퓨터": ["05"],

            # 기계
            "기계": ["01"],
            "자동차": ["01"],
            "설비": ["01"],

            # 전기/전자
            "전기": ["03"],
            "전자": ["04"],

            # 건설/건축
            "건축": ["10"],
            "건설": ["10"],
            "토목": ["10"],
            "인테리어": ["10"],

            # 화학
            "화학": ["06"],
            "화공": ["06"],

            # 경영/사무
            "회계": ["15"],
            "경영": ["15"],
            "사무": ["15"],
            "인사": ["15"],

            # 서비스
            "요리": ["16"],
            "조리": ["16"],
            "미용": ["16"],
            "서비스": ["16"],

            # 안전
            "안전": ["12"],
            "소방": ["12"],

            # 환경
            "환경": ["13"],
            "에너지": ["13"],
        }

        series_codes = set()

        for job_kw in job_keywords:
            job_kw_lower = job_kw.lower().strip()
            for job, codes in job_to_series.items():
                if job in job_kw_lower or job_kw_lower in job:
                    series_codes.update(codes)

        # 기본값: 정보통신(05)
        if not series_codes:
            series_codes = {"05"}

        return list(series_codes)

    async def get_certification_with_schedule(
        self,
        qualification_name: str
    ) -> Dict:
        """
        자격증 상세 정보 + 시험 일정 통합 조회

        Args:
            qualification_name: 자격증 이름

        Returns:
            자격증 상세 정보 및 시험 일정
        """
        # 자격증 기본 정보
        cert_info = await self.get_qualification_list(qualification_name=qualification_name)

        if not cert_info.get("success") or not cert_info.get("items"):
            return {
                "success": False,
                "message": f"'{qualification_name}' 자격증을 찾을 수 없습니다."
            }

        certification = cert_info["items"][0]
        cert_code = certification.get("code")

        # 시험 일정 조회
        schedule_info = await self.get_exam_schedule(
            qualification_code=cert_code,
            year="2025"
        )

        return {
            "success": True,
            "certification": certification,
            "examSchedules": schedule_info.get("items", [])
        }

    def _parse_xml_response(self, xml_text: str, response_type: str) -> Dict:
        """XML 응답 파싱"""
        try:
            root = ET.fromstring(xml_text)

            # 결과 코드 확인
            result_code = root.find(".//resultCode")
            if result_code is not None and result_code.text != "00":
                result_msg = root.find(".//resultMsg")
                return {
                    "success": False,
                    "message": result_msg.text if result_msg is not None else "알 수 없는 오류",
                    "items": []
                }

            # 전체 건수
            total_count_elem = root.find(".//totalCount")
            total_count = int(total_count_elem.text) if total_count_elem is not None else 0

            # 항목 파싱
            items = []
            for item in root.findall(".//item"):
                parsed_item = self._parse_item(item, response_type)
                if parsed_item:
                    items.append(parsed_item)

            return {
                "success": True,
                "totalCount": total_count,
                "items": items
            }

        except ET.ParseError as e:
            return {
                "success": False,
                "message": f"XML 파싱 오류: {str(e)}",
                "items": []
            }

    def _parse_item(self, item: ET.Element, response_type: str) -> Optional[Dict]:
        """개별 항목 파싱"""
        if response_type == "qualification":
            return {
                "code": self._get_text(item, "jmCd"),  # 종목코드
                "name": self._get_text(item, "jmNm"),  # 종목명
                "engName": self._get_text(item, "engJmNm"),  # 영문명
                "seriesCode": self._get_text(item, "seriesCd"),  # 계열코드
                "seriesName": self._get_text(item, "seriesNm"),  # 계열명
                "obligFldName": self._get_text(item, "mdobligFldNm"),  # 직무분야명
                "implNm": self._get_text(item, "implNm"),  # 시행기관명
                "instiNm": self._get_text(item, "instiNm"),  # 출제기관명
                "summary": self._get_text(item, "summary"),  # 요약
                "career": self._get_text(item, "career"),  # 관련 진로
                "job": self._get_text(item, "job"),  # 직무내용
                "trend": self._get_text(item, "trend"),  # 동향
                "hist": self._get_text(item, "hist"),  # 변천이력
            }

        elif response_type == "exam":
            return {
                "description": self._get_text(item, "description"),  # 설명 (예: 기사(2025년도 제1회))
                "docRegStartDt": self._get_text(item, "docregstartdt"),  # 필기 접수 시작일
                "docRegEndDt": self._get_text(item, "docregenddt"),  # 필기 접수 종료일
                "docExamDt": self._get_text(item, "docexamdt"),  # 필기 시험일
                "docPassDt": self._get_text(item, "docpassdt"),  # 필기 합격 발표일
                "docSubmitStartDt": self._get_text(item, "docsubmitstartdt"),  # 응시자격 서류제출 시작일
                "docSubmitEndDt": self._get_text(item, "docsubmitentdt"),  # 응시자격 서류제출 종료일
                "pracRegStartDt": self._get_text(item, "pracregstartdt"),  # 실기 접수 시작일
                "pracRegEndDt": self._get_text(item, "pracregenddt"),  # 실기 접수 종료일
                "pracExamStartDt": self._get_text(item, "pracexamstartdt"),  # 실기 시험 시작일
                "pracExamEndDt": self._get_text(item, "pracexamenddt"),  # 실기 시험 종료일
                "pracPassDt": self._get_text(item, "pracpassdt"),  # 실기 합격 발표일
            }

        elif response_type == "content":
            return {
                "ctsId": self._get_text(item, "ctsId"),  # 컨텐츠 ID
                "ctsNm": self._get_text(item, "ctsNm"),  # 컨텐츠명
                "deptNm": self._get_text(item, "deptNm"),  # 부서명
                "pubYnCcd": self._get_text(item, "pubYnCcd"),  # 공개여부
                "title": self._get_text(item, "title"),  # 제목
            }

        return None

    def _get_text(self, element: ET.Element, tag: str) -> Optional[str]:
        """XML 요소에서 텍스트 추출"""
        child = element.find(tag)
        return child.text if child is not None else None

    def _map_job_to_cert_keywords(self, job_keywords: List[str]) -> List[str]:
        """직업 키워드를 자격증 검색 키워드로 매핑"""
        # 직업 -> 관련 자격증 키워드 매핑
        job_to_cert_mapping = {
            # IT/개발
            "개발자": ["정보처리", "정보보안", "빅데이터", "클라우드"],
            "백엔드": ["정보처리", "리눅스마스터", "SQL"],
            "프론트엔드": ["정보처리", "웹디자인"],
            "데이터": ["빅데이터", "데이터분석", "SQL", "정보처리"],
            "AI": ["빅데이터", "정보처리", "인공지능"],
            "보안": ["정보보안", "네트워크관리사"],
            "네트워크": ["네트워크관리사", "정보통신"],

            # 디자인
            "디자이너": ["컴퓨터그래픽스", "웹디자인", "시각디자인"],
            "UI": ["웹디자인", "컴퓨터그래픽스"],
            "UX": ["컴퓨터그래픽스", "제품디자인"],

            # 기계/전기
            "기계": ["기계설계", "기계정비", "용접"],
            "전기": ["전기기사", "전기공사"],
            "전자": ["전자기기", "전자계산기"],

            # 건축/건설
            "건축": ["건축기사", "건축설계", "실내건축"],
            "토목": ["토목기사", "측량"],

            # 경영/사무
            "회계": ["전산회계", "세무", "재경관리사"],
            "사무": ["컴퓨터활용능력", "워드프로세서", "정보처리"],
            "경영": ["경영지도사", "ERP정보관리사"],

            # 요리/서비스
            "요리": ["조리기능사", "한식", "양식", "제과제빵"],
            "미용": ["미용사", "피부관리사"],
        }

        cert_keywords = set()

        for job_kw in job_keywords:
            job_kw_lower = job_kw.lower()
            for job, certs in job_to_cert_mapping.items():
                if job in job_kw_lower or job_kw_lower in job:
                    cert_keywords.update(certs)

        # 기본 키워드가 없으면 일반적인 자격증 추가
        if not cert_keywords:
            cert_keywords = {"정보처리", "컴퓨터활용능력"}

        return list(cert_keywords)


# 계열 코드 참조 (seriesCd)
SERIES_CODES = {
    "01": "기계",
    "02": "금속",
    "03": "전기",
    "04": "전자",
    "05": "정보통신",
    "06": "화공",
    "07": "섬유",
    "08": "식품가공",
    "09": "농림어업",
    "10": "건설",
    "11": "광업자원",
    "12": "안전관리",
    "13": "환경·에너지",
    "14": "산업응용",
    "15": "경영·회계·사무",
    "16": "서비스",
}
