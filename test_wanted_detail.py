import asyncio
import httpx
import json

async def test_wanted_company_detail():
    """원티드 기업 상세 정보 크롤링 테스트"""
    # 위 결과에서 job_id 사용
    job_id = "324360"

    url = "http://localhost:8000/api/company-info/crawl-and-save"
    payload = {
        "siteName": "wanted",
        "jobId": job_id
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        print(f"\n원티드 기업 상세 크롤링 시작 (job_id: {job_id})...")
        response = await client.post(url, json=payload)

        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"에러 ({response.status_code}): {response.text}")

if __name__ == "__main__":
    asyncio.run(test_wanted_company_detail())
