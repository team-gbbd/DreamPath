const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export async function sendChatMessage(body: any) {
  const res = await fetch(`${AI_SERVICE_URL}/api/chat-rag/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("API 오류");

  return res.json();
}

export async function getChatHistory(sessionId: string) {
  const res = await fetch(
    `${AI_SERVICE_URL}/api/chat-rag/history/${sessionId}`
  );

  if (!res.ok) throw new Error("대화 내역 조회 오류");

  const data = await res.json();
  return data.history;
}
