import shutil
import os
from pathlib import Path

# 소스와 대상 디렉토리
source_dir = Path("services/chatbot/member/tools")
dest_dir = Path("services/chatbot/assistant/tools")

# 복사할 파일 목록
tool_files = [
    "career_analysis_tool.py",
    "inquiry_tool.py",
    "job_recommendation_tool.py",
    "learning_progress_tool.py",
    "mentoring_tool.py",
    "personality_tool.py",
    "recommendation_tool.py"
]

print("📁 Tool 파일 복사 시작...")
for file in tool_files:
    src = source_dir / file
    dst = dest_dir / file
    
    if src.exists():
        shutil.copy2(src, dst)
        print(f"✅ {file} 복사 완료")
    else:
        print(f"❌ {file} 소스 파일 없음")

print("\n📋 복사된 파일 목록:")
for file in dest_dir.glob("*.py"):
    print(f"  - {file.name} ({file.stat().st_size} bytes)")

print("\n✅ 모든 Tool 파일 복사 완료!")
