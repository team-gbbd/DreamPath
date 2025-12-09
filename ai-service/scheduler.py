"""
채용 공고 크롤링 스케줄러
매일 자동으로 채용 사이트에서 공고를 크롤링합니다.
"""
import os
import asyncio
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# 스케줄러 인스턴스
scheduler: Optional[AsyncIOScheduler] = None


async def crawl_wanted():
    """원티드 크롤링"""
    from services.web_crawler_service import WebCrawlerService

    print(f"[스케줄러] 원티드 크롤링 시작 - {datetime.now()}")
    try:
        crawler = WebCrawlerService()
        result = await crawler.crawl_wanted(
            search_keyword=None,
            max_results=0,  # 0 = 전체 크롤링
            force_refresh=True
        )

        if result.get("success"):
            print(f"[스케줄러] 원티드 크롤링 완료 - {result.get('totalResults', 0)}개 수집")
        else:
            print(f"[스케줄러] 원티드 크롤링 실패 - {result.get('error', '알 수 없는 오류')}")

    except Exception as e:
        print(f"[스케줄러] 원티드 크롤링 오류 - {str(e)}")


async def crawl_saramin():
    """사람인 크롤링"""
    from services.web_crawler_service import WebCrawlerService

    print(f"[스케줄러] 사람인 크롤링 시작 - {datetime.now()}")
    try:
        crawler = WebCrawlerService()
        result = await crawler.crawl_job_site(
            site_name="사람인",
            site_url="https://www.saramin.co.kr",
            search_keyword=None,
            max_results=0,  # 0 = 전체 크롤링
            force_refresh=True
        )

        if result.get("success"):
            print(f"[스케줄러] 사람인 크롤링 완료 - {result.get('totalResults', 0)}개 수집")
        else:
            print(f"[스케줄러] 사람인 크롤링 실패 - {result.get('error', '알 수 없는 오류')}")

    except Exception as e:
        print(f"[스케줄러] 사람인 크롤링 오류 - {str(e)}")


async def crawl_jobkorea():
    """잡코리아 크롤링"""
    from services.web_crawler_service import WebCrawlerService

    print(f"[스케줄러] 잡코리아 크롤링 시작 - {datetime.now()}")
    try:
        crawler = WebCrawlerService()
        result = await crawler.crawl_job_site(
            site_name="잡코리아",
            site_url="https://www.jobkorea.co.kr",
            search_keyword=None,
            max_results=0,  # 0 = 전체 크롤링
            force_refresh=True
        )

        if result.get("success"):
            print(f"[스케줄러] 잡코리아 크롤링 완료 - {result.get('totalResults', 0)}개 수집")
        else:
            print(f"[스케줄러] 잡코리아 크롤링 실패 - {result.get('error', '알 수 없는 오류')}")

    except Exception as e:
        print(f"[스케줄러] 잡코리아 크롤링 오류 - {str(e)}")


async def calculate_job_recommendations():
    """채용공고 추천 계산 (모든 사용자)"""
    from services.job_recommendation_calculator import JobRecommendationCalculator

    print(f"[스케줄러] 채용공고 추천 계산 시작 - {datetime.now()}")
    try:
        calculator = JobRecommendationCalculator()
        result = await calculator.calculate_all_user_recommendations(
            batch_size=10,  # 동시에 10명씩 처리
            max_recommendations=50  # 사용자당 최대 50개 추천
        )

        if result.get("success"):
            print(f"[스케줄러] 추천 계산 완료 - {result.get('processed_users', 0)}명 처리, "
                  f"{result.get('total_recommendations', 0)}개 추천 생성")
        else:
            print(f"[스케줄러] 추천 계산 실패")

        return result

    except Exception as e:
        print(f"[스케줄러] 추천 계산 오류 - {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


async def daily_crawl_job():
    """매일 실행되는 크롤링 작업"""
    print(f"\n{'='*50}")
    print(f"[스케줄러] 일일 채용공고 크롤링 시작 - {datetime.now()}")
    print(f"{'='*50}\n")

    start_time = datetime.now()

    # 순차적으로 크롤링 (IP 차단 방지)
    await crawl_wanted()
    await asyncio.sleep(5)  # 5초 대기

    await crawl_saramin()
    await asyncio.sleep(5)

    await crawl_jobkorea()

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print(f"\n{'='*50}")
    print(f"[스케줄러] 일일 크롤링 완료 - 소요시간: {duration:.1f}초")
    print(f"{'='*50}\n")

    # 크롤링 완료 후 추천 계산
    print(f"\n{'='*50}")
    print(f"[스케줄러] 추천 계산 시작")
    print(f"{'='*50}\n")

    await calculate_job_recommendations()

    final_time = datetime.now()
    total_duration = (final_time - start_time).total_seconds()

    print(f"\n{'='*50}")
    print(f"[스케줄러] 전체 작업 완료 - 총 소요시간: {total_duration:.1f}초")
    print(f"{'='*50}\n")


def start_scheduler():
    """스케줄러 시작"""
    global scheduler

    # 환경변수로 스케줄러 ON/OFF 제어
    enabled = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"

    if not enabled:
        print("[스케줄러] 비활성화 상태 (SCHEDULER_ENABLED=false)")
        return

    scheduler = AsyncIOScheduler(timezone="Asia/Seoul")

    # 매일 새벽 3시에 실행
    scheduler.add_job(
        daily_crawl_job,
        CronTrigger(hour=3, minute=0),
        id="daily_crawl",
        name="일일 채용공고 크롤링",
        replace_existing=True
    )

    scheduler.start()
    print("[스케줄러] 시작됨 - 매일 새벽 3시에 크롤링 실행")

    # 다음 실행 시간 출력
    job = scheduler.get_job("daily_crawl")
    if job:
        next_run = job.next_run_time
        print(f"[스케줄러] 다음 실행 예정: {next_run}")


def stop_scheduler():
    """스케줄러 중지"""
    global scheduler

    if scheduler and scheduler.running:
        scheduler.shutdown()
        print("[스케줄러] 중지됨")


async def trigger_crawl_now():
    """수동으로 즉시 크롤링 실행 (테스트/관리자용)"""
    print("[스케줄러] 수동 크롤링 트리거됨")
    await daily_crawl_job()
    return {"success": True, "message": "크롤링이 완료되었습니다."}
