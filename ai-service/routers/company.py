"""
기업정보 API 라우터
"""
from fastapi import APIRouter, Query
from typing import Optional
from pydantic import BaseModel
from services.database_service import DatabaseService

router = APIRouter(prefix="/api/company", tags=["company"])


class CompanyListResponse(BaseModel):
    """기업 목록 응답"""
    success: bool
    total: int
    companies: list
    page: int
    page_size: int


class CompanyDetailResponse(BaseModel):
    """기업 상세 정보 응답"""
    success: bool
    company: dict


@router.get("/list", response_model=CompanyListResponse)
async def get_company_list(
    site_name: Optional[str] = Query(None, description="사이트 이름 (wanted, jobkorea 등)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기")
):
    """
    기업 목록 조회
    """
    db_service = DatabaseService()

    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()

            # 전체 개수 조회
            if site_name:
                cursor.execute(
                    "SELECT COUNT(*) as total FROM company_info WHERE site_name = %s",
                    (site_name,)
                )
            else:
                cursor.execute("SELECT COUNT(*) as total FROM company_info")

            result = cursor.fetchone()
            total = result['total'] if result else 0

            # 페이징 처리
            offset = (page - 1) * page_size

            if site_name:
                cursor.execute("""
                    SELECT
                        id, site_name, company_id, company_name, industry,
                        established_year, employee_count, location, address,
                        description, benefits, average_salary,
                        company_type, revenue, ceo_name, capital,
                        homepage_url, recruitment_url, logo_url, created_at
                    FROM company_info
                    WHERE site_name = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (site_name, page_size, offset))
            else:
                cursor.execute("""
                    SELECT
                        id, site_name, company_id, company_name, industry,
                        established_year, employee_count, location, address,
                        description, benefits, average_salary,
                        company_type, revenue, ceo_name, capital,
                        homepage_url, recruitment_url, logo_url, created_at
                    FROM company_info
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (page_size, offset))

            companies = cursor.fetchall()
            cursor.close()

            return CompanyListResponse(
                success=True,
                total=total,
                companies=companies,
                page=page,
                page_size=page_size
            )
    except Exception as e:
        print(f"기업 목록 조회 실패: {str(e)}")
        return CompanyListResponse(
            success=False,
            total=0,
            companies=[],
            page=page,
            page_size=page_size
        )


@router.get("/{company_id}", response_model=CompanyDetailResponse)
async def get_company_detail(
    company_id: int
):
    """
    기업 상세 정보 조회
    """
    db_service = DatabaseService()

    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id, site_name, company_id, company_name, industry,
                    established_year, employee_count, location, address,
                    description, vision, benefits, culture, average_salary,
                    company_type, revenue, ceo_name, capital,
                    homepage_url, recruitment_url, logo_url,
                    crawled_at, created_at, updated_at
                FROM company_info
                WHERE id = %s
            """, (company_id,))

            company = cursor.fetchone()
            cursor.close()

            if not company:
                return CompanyDetailResponse(
                    success=False,
                    company={}
                )

            return CompanyDetailResponse(
                success=True,
                company=company
            )
    except Exception as e:
        print(f"기업 상세 조회 실패: {str(e)}")
        return CompanyDetailResponse(
            success=False,
            company={}
        )


@router.get("/search/by-name")
async def search_company_by_name(
    name: str = Query(..., description="검색할 회사명"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    회사명으로 기업 검색
    """
    db_service = DatabaseService()

    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()

            # 전체 개수 조회
            cursor.execute(
                "SELECT COUNT(*) as total FROM company_info WHERE company_name LIKE %s",
                (f"%{name}%",)
            )
            result = cursor.fetchone()
            total = result['total'] if result else 0

            # 페이징 처리
            offset = (page - 1) * page_size

            cursor.execute("""
                SELECT
                    id, site_name, company_id, company_name, industry,
                    established_year, employee_count, location, address,
                    description, benefits, average_salary,
                    company_type, revenue, ceo_name, capital,
                    homepage_url, recruitment_url, logo_url, created_at
                FROM company_info
                WHERE company_name LIKE %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (f"%{name}%", page_size, offset))

            companies = cursor.fetchall()
            cursor.close()

            return {
                "success": True,
                "total": total,
                "companies": companies,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        print(f"기업 검색 실패: {str(e)}")
        return {
            "success": False,
            "total": 0,
            "companies": [],
            "page": page,
            "page_size": page_size
        }
