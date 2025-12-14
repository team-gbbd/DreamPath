"""기존 데이터 삭제 후 깨끗한 크롤링 실행"""
import sys
sys.path.insert(0, 'C:/Users/301/dev/qwer/DreamPath/ai-service')

from dotenv import load_dotenv
load_dotenv('C:/Users/301/dev/qwer/DreamPath/ai-service/.env')

import asyncio
from services.database_service import DatabaseService
from services.web_crawler_service import WebCrawlerService

async def main():
    db = DatabaseService()

    # 1. 기존 saramin, jobkorea 데이터 삭제
    print("=== 기존 데이터 삭제 ===")
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM job_listings WHERE site_name IN ('saramin', 'jobkorea')")
            deleted = cursor.rowcount
            conn.commit()
            cursor.close()
        print(f"삭제 완료: {deleted}개")
    except Exception as e:
        print(f"삭제 실패: {e}")

    # 2. 크롤링 실행
    crawler = WebCrawlerService()

    print("\n=== 잡코리아 크롤링 시작 ===")
    jobkorea_result = await crawler.crawl_job_site(
        site_name='jobkorea',
        site_url='https://www.jobkorea.co.kr',
        max_results=50,
        force_refresh=True
    )
    print(f"잡코리아 결과: success={jobkorea_result.get('success')}, total={jobkorea_result.get('totalResults')}, saved={jobkorea_result.get('savedToDatabase')}")

    print("\n=== 사람인 크롤링 시작 ===")
    saramin_result = await crawler.crawl_job_site(
        site_name='saramin',
        site_url='https://www.saramin.co.kr',
        max_results=50,
        force_refresh=True
    )
    print(f"사람인 결과: success={saramin_result.get('success')}, total={saramin_result.get('totalResults')}, saved={saramin_result.get('savedToDatabase')}")

    print("\n=== 크롤링 완료 ===")

if __name__ == "__main__":
    asyncio.run(main())
