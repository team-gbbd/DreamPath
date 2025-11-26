"""
채팅 기능 테스트 스크립트
"""
import asyncio
import os
from dotenv import load_dotenv
from services.chat_service import ChatService

load_dotenv()

async def test_chat():
    """채팅 기능 테스트"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OPENAI_API_KEY가 설정되지 않았습니다.")
        return
    
    print("[OK] ChatService 초기화 중...")
    service = ChatService(api_key, "gpt-4o-mini")
    
    # 테스트 대화
    session_id = "test-session-123"
    current_stage = "PRESENT"
    user_message = "안녕하세요"
    
    # 대화 이력 (빈 리스트로 시작)
    conversation_history = []
    
    print(f"\n[1] 채팅 응답 생성 테스트 (단계: {current_stage})...")
    try:
        response = await service.generate_response(
            session_id=session_id,
            user_message=user_message,
            current_stage=current_stage,
            conversation_history=conversation_history
        )
        print(f"   응답: {response[:100]}...")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    # 두 번째 메시지 (대화 이력 포함)
    conversation_history = [
        {"role": "USER", "content": "안녕하세요"},
        {"role": "ASSISTANT", "content": response if 'response' in locals() else "안녕하세요!"}
    ]
    user_message2 = "저는 진로가 고민이에요"
    
    print(f"\n[2] 대화 이력 포함 채팅 테스트...")
    try:
        response2 = await service.generate_response(
            session_id=session_id,
            user_message=user_message2,
            current_stage=current_stage,
            conversation_history=conversation_history
        )
        print(f"   응답: {response2[:100]}...")
    except Exception as e:
        print(f"   [FAIL] 실패: {e}")
    
    print("\n[OK] 테스트 완료!")

if __name__ == "__main__":
    asyncio.run(test_chat())

