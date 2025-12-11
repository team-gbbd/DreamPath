/**
 * 회원용 AI 챗봇 비서 API
 */
import { PYTHON_AI_SERVICE_URL } from "../api";

export interface AssistantChatRequest {
  userId: number;
  sessionId?: string | null;
  message: string;
  conversationTitle?: string;
  functionName?: string;  // FAQ 직접 호출용
}

export interface AssistantChatResponse {
  session: string;
  response: string;
}

/**
 * 회원용 챗봇 비서에게 메시지 전송
 */
export async function sendAssistantMessage(
  body: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const res = await fetch(`${PYTHON_AI_SERVICE_URL}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "API 오류" }));
    throw new Error(error.detail || "챗봇 비서 API 오류");
  }

  return res.json();
}

/**
 * 회원용 챗봇 비서 대화 히스토리 조회
 */
export async function getAssistantHistory(sessionId: string, userId: number): Promise<any[]> {
  const res = await fetch(
    `${PYTHON_AI_SERVICE_URL}/api/assistant/history/${sessionId}?user_id=${userId}`
  );

  if (!res.ok) throw new Error("대화 내역 조회 오류");

  const data = await res.json();
  return data.history || [];
}
