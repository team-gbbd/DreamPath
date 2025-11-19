export async function sendChatMessage(body: any) {
  const res = await fetch("http://localhost:8080/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("API 오류");

  return res.json();
}
