"use client";

import { useState } from "react";
import { sendChatMessage } from "@/lib/Chatbot";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const Chatbot = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage({
        sessionId: sessionId,
        userId: "00000000-0000-0000-0000-000000000000", // 비회원용
        message: userMsg,
        conversationTitle: "대화 테스트",
      });

      if (!sessionId) setSessionId(res.session);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.response },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 border rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-semibold mb-4">AI 챗봇</h2>

      <div className="h-80 overflow-y-auto mb-3 p-3 bg-gray-50 rounded-lg">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 p-2 rounded-xl max-w-[80%] ${
              m.role === "user"
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-300 text-black mr-auto"
            }`}
          >
            {m.text}
          </div>
        ))}

        {loading && <div className="text-gray-500 text-sm">AI 입력 중...</div>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded-lg"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
