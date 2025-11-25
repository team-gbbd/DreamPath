"""
OpenAI API 키 테스트
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# 1. 세션 시작
print("\n[1] 세션 시작...")
response = requests.post(
    f"{BASE_URL}/api/chat/start",
    json={"userId": None}
)

if response.status_code == 200:
    data = response.json()
    session_id = data.get("sessionId")
    print(f"[OK] 세션 ID: {session_id}")

    # 2. 메시지 전송
    print("\n[2] 메시지 전송 (API 키 테스트)...")
    response = requests.post(
        f"{BASE_URL}/api/chat",
        json={
            "sessionId": session_id,
            "message": "안녕하세요",
            "userId": None
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] AI 응답: {data.get('reply', '')[:100]}...")
        print("\n[SUCCESS] API 키가 정상적으로 작동합니다!")
    else:
        print(f"[ERROR] 메시지 전송 실패: {response.status_code}")
        print(response.text)
else:
    print(f"[ERROR] 세션 시작 실패: {response.status_code}")
    print(response.text)
