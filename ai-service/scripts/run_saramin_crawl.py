"""사람인 크롤링 실행"""
import sys
sys.path.insert(0, 'C:/Users/301/dev/qwer/DreamPath/ai-service')

# .env 로드
from dotenv import load_dotenv
load_dotenv('C:/Users/301/dev/qwer/DreamPath/ai-service/.env')

import asyncio
from services.web_crawler_service import WebCrawlerService

async def main():
    crawler = WebCrawlerService()

    print("=== 사람인 크롤링 시작 ===")
    saramin_result = await crawler.crawl_job_site(
        site_name='saramin',
        site_url='https://www.saramin.co.kr',
        max_results=100,
        force_refresh=True
    )
    print(f"사람인 결과: success={saramin_result.get('success')}, total={saramin_result.get('totalResults')}, saved={saramin_result.get('savedToDatabase')}")

    print("\n=== 크롤링 완료 ===")

if __name__ == "__main__":
    asyncio.run(main())
