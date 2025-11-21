"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatHistory } from "@/lib/Chatbot";
import { fetchAllFaq, fetchFaqByCategory } from "@/lib/getFaq";

interface Message {
  role: "user" | "assistant";
  text: string;
}

function getUserId() {
  const loggedInUser = localStorage.getItem("auth_user_id");
  if (loggedInUser) return loggedInUser;

  let guestId = localStorage.getItem("guest_id");
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("guest_id", guestId);
  }
  return guestId;
}

export default function Chatbot({ onClose }: { onClose?: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [faqList, setFaqList] = useState<any[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  /* FAQ 전체 로드 */
  useEffect(() => {
    const loadFaq = async () => {
      const all = await fetchAllFaq();
      if (!all) return;

      const uniqueCats = [...new Set(all.map((f: any) => f.category))];
      setCategories(uniqueCats);
    };
    loadFaq();
  }, []);

  /* 선택된 카테고리 FAQ 로드 */
  useEffect(() => {
    const loadFaq = async () => {
      if (!selectedCategory) return;
      const list = await fetchFaqByCategory(selectedCategory);
      setFaqList(list);
    };
    loadFaq();
  }, [selectedCategory]);

  /* 기존 대화 불러오기 */
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;
      const history = await getChatHistory(sessionId);

      setMessages((prev) => {
        const newItems = history.map((h: any) => ({
          role: h.role,
          text: h.text,
        }));

        // 중복 제거
        const merged = [...prev];

        newItems.forEach((h) => {
          if (!merged.some((m) => m.text === h.text && m.role === h.role)) {
            merged.push(h);
          }
        });

        return merged;
      });
    };
    loadHistory();
  }, [sessionId]);

  /* 메시지 전송 */
  const handleSend = async (text?: string) => {
    const userMsg = text ?? input;
    if (!userMsg.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const userId = getUserId();
      const res = await sendChatMessage({
        sessionId,
        userId,
        message: userMsg,
        conversationTitle: sessionId ? undefined : userMsg.slice(0, 20),
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

  /* FAQ 클릭 시 DB에도 저장되도록 처리 */
  const sendFaq = async (question: string, answer: string) => {
    const userId = getUserId();

    // 1) 유저 메시지 DB 저장
    const res1 = await sendChatMessage({
      sessionId,
      userId,
      message: question,
      conversationTitle: sessionId ? undefined : question.slice(0, 20),
    });

    if (!sessionId) setSessionId(res1.session);

    // 2) 화면에 유저 메시지 추가
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    // 3) 챗봇 메시지(FAQ 답변)도 DB에 저장
    await sendChatMessage({
      sessionId: res1.session ?? sessionId,
      userId,
      message: answer,
    });

    // 4) 화면에 챗봇 메시지 표시
    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff] rounded-lg overflow-hidden">
      {/* 상단바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-semibold">챗봇과 대화 중</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-black">
          ✕
        </button>
      </div>

      {/* 🔥 스크롤 한 개만 존재하는 영역 */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 인사말 */}
        <div className="bg-white shadow p-4 rounded-2xl text-gray-700">
          <p>안녕하세요! DreamPath AI 챗봇이에요 😊</p>
          <p>무엇을 도와드릴까요?</p>
        </div>

        {/* FAQ 카테고리 */}
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`p-2 text-sm rounded-xl shadow ${
                selectedCategory === c ? "bg-indigo-500 text-white" : "bg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 선택된 카테고리의 질문 리스트 */}
        {selectedCategory && (
          <div className="space-y-2">
            {faqList.map((q) => (
              <button
                key={q.id}
                onClick={() => sendFaq(q.question, q.answer)}
                className="bg-white p-3 rounded-xl shadow hover:bg-gray-100 text-left"
              >
                {q.question}
              </button>
            ))}
          </div>
        )}

        {/* 모든 채팅 메시지 */}
        {/* 모든 채팅 메시지 */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm leading-relaxed break-words ${
                m.role === "user"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* 🔥 챗봇 타이핑 애니메이션 */}
        {loading && (
          <div className="mb-2 flex justify-start">
            <div className="px-4 py-2 rounded-2xl bg-white text-gray-500 max-w-[75%] text-sm flex gap-1 items-center shadow-sm">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite_0.2s]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-[typing_1s_infinite_0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 border p-3 rounded-xl"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-5 rounded-xl"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
