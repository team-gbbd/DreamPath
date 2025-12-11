import { PYTHON_AI_SERVICE_URL } from "../api";

export interface RagChatRequest {
  sessionId?: string | null;
  userId?: number | null;
  guestId?: string | null;
  message: string;
  conversationTitle?: string;
}

export interface ChatResponse {
  session: string;
  response: string;
}

/**
 * RAG 챗봇 메시지 전송 (비회원/회원 공통 - 메인페이지)
 */
export async function sendChatMessage(
  body: RagChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${PYTHON_AI_SERVICE_URL}/api/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "API 오류" }));
    throw new Error(error.detail || "RAG 챗봇 API 오류");
  }

  return res.json();
}

/**
 * RAG 챗봇 대화 히스토리 조회
 */
export async function getChatHistory(sessionId: string): Promise<any[]> {
  const res = await fetch(
    `${PYTHON_AI_SERVICE_URL}/api/rag/history/${sessionId}`
  );

  if (!res.ok) throw new Error("대화 내역 조회 오류");

  const data = await res.json();
  return data.history || [];
}

/**
 * FAQ 챗봇 메시지 전송 (비회원/회원 공통) - RAG 챗봇과 동일 엔드포인트 사용
 */
export async function sendFaqMessage(
  body: RagChatRequest
): Promise<ChatResponse> {
  return sendChatMessage(body);
}

/**
 * FAQ 챗봇 대화 히스토리 조회 - RAG 챗봇과 동일 엔드포인트 사용
 */
export async function getFaqHistory(sessionId: string): Promise<any[]> {
  return getChatHistory(sessionId);
}
