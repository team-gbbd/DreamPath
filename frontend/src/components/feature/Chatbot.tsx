"use client";

import { useState, useEffect } from "react";
import { sendChatMessage, getChatHistory } from "@/lib/Chatbot";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function Chatbot() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;
      const history = await getChatHistory(sessionId);

      setMessages((prev) => {
        // 이미 채팅창에 있는 메시지 + DB에서 불러온 메시지 합치기
        // 중복 제거까지 포함
        const merged = [...prev];

        history.forEach((h) => {
          if (!merged.some((m) => m.text === h.text && m.role === h.role)) {
            merged.push(h);
          }
        });

        return merged;
      });
    };

    loadHistory();
  }, [sessionId]);

  /* =============================
     🔥 2) 메시지 전송 함수
     ============================= */
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    setLoading(true);

    // 1) 먼저 유저 메시지 추가
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      const res = await sendChatMessage({
        sessionId,
        userId: "00000000-0000-0000-0000-000000000000",
        message: userMsg,
        conversationTitle: "대화 테스트",
      });

      // 2) 세션 ID 업데이트
      if (!sessionId) setSessionId(res.session);

      // 3) AI 답변도 이어서 추가
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.response },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff]">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 px-4 py-2 rounded-2xl max-w-[75%] shadow-sm text-[15px] leading-relaxed ${
              m.role === "user"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white ml-auto rounded-br-none"
                : "bg-gray-100 text-gray-800 mr-auto rounded-bl-none"
            }`}
          >
            {m.text}
          </div>
        ))}

        {/* typing indicator */}
        {loading && (
          <div className="flex gap-1 items-center text-gray-500 text-sm mt-2 ml-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite]"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite_0.2s]"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite_0.4s]"></span>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-5 rounded-xl hover:opacity-90 transition"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
