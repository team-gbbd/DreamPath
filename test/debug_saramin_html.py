import asyncio
import httpx

async def save_html():
    """Save actual HTML from saramin page"""
    url = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=52371239'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)

        with open('saramin_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)

        print(f"HTML saved (length: {len(response.text)} chars)")
        print(f"URL: {response.url}")
        print(f"Status: {response.status_code}")

        # Search for key terms
        html = response.text
        if 'company' in html.lower():
            print("Found 'company' in HTML")
        if 'csn=' in html:
            print("Found 'csn=' in HTML")
        if 'rec_idx' in html:
            print("Found 'rec_idx' in HTML")

if __name__ == "__main__":
    asyncio.run(save_html())
