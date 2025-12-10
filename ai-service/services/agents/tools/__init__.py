# 각 Tool 클래스 import
from .summarizer_tool import SummarizerTool
from .profile_document_tool import ProfileDocumentTool

# 🔥 dev 브랜치에서 요구하는 전체 Tool 목록
TOOLS = {
    "summarizer": SummarizerTool,
    "profile_document": ProfileDocumentTool,
}

# 🔥 Lazy 초기화 — import 시점에 생성하지 않음
def get_tool_map():
    return {
        "summarizer": SummarizerTool(),
        "profile_document": ProfileDocumentTool(),
    }

# ⚠️ import 시점 자동 실행 금지
# TOOL_MAP은 더 이상 즉시 생성하지 않고 None으로 둔다.
# 사용하는 쪽은 반드시 get_tool_map()을 호출해 가져가야 한다.
TOOL_MAP = None
