
from services.ingest.careernet_client import CareerNetClient

def check_careernet():
    print("Checking CareerNet Job data (JOB)...")
    data = CareerNetClient.call('JOB')
    print(f"Full Response: {data}")
    rows = data.get('dataSearch', {}).get('content', [])
    print(f"CareerNet Job rows: {len(rows)}")

    print("\nChecking CareerNet Department data (MAJOR)...")
    data = CareerNetClient.call('MAJOR')
    print(f"Full Response: {data}")
    rows = data.get('dataSearch', {}).get('content', [])
    print(f"CareerNet Department rows: {len(rows)}")

    print("\nChecking CareerNet Counseling data (COUNSEL)...")
    data = CareerNetClient.call('COUNSEL')
    print(f"Full Response: {data}")
    rows = data.get('dataSearch', {}).get('content', [])
    print(f"CareerNet Counseling rows: {len(rows)}")

    import requests
    API_KEY = '6cb0f6894242191036656369ada53be0'
    BASE_URL = 'https://www.career.go.kr/cnet/openapi/getOpenApi.json'

    print("\n[Direct Test] MAJOR with gubun='대학교' and thisPage...")
    params = {
        'apiKey': API_KEY,
        'svcType': 'api',
        'svcCode': 'MAJOR',
        'contentType': 'json',
        'gubun': '대학교',
        'perPage': 100,
        'thisPage': 1
    }
    res = requests.get(BASE_URL, params=params).json()
    rows = res.get('dataSearch', {}).get('content', [])
    print(f"MAJOR rows (thisPage): {len(rows)}")

    print("\n[Direct Test] SCHOOL...")
    params = {
        'apiKey': API_KEY,
        'svcType': 'api',
        'svcCode': 'SCHOOL',
        'contentType': 'json',
        'perPage': 100,
        'thisPage': 1
    }
    res = requests.get(BASE_URL, params=params).json()
    rows = res.get('dataSearch', {}).get('content', [])
    print(f"SCHOOL rows: {len(rows)}")

    print("\n[Direct Test] COUNSEL without gubun...")
    params = {
        'apiKey': API_KEY,
        'svcType': 'api',
        'svcCode': 'COUNSEL',
        'contentType': 'json',
        'perPage': 100,
        'page': 1
    }
    res = requests.get(BASE_URL, params=params).json()
    rows = res.get('dataSearch', {}).get('content', [])
    print(f"COUNSEL rows (no gubun): {len(rows)}")

if __name__ == "__main__":
    check_careernet()
