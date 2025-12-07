"use client";

import { useState, useEffect, useRef } from "react";
import {
  sendAssistantMessage,
  getAssistantHistory,
} from "@/lib/api/assistantChatApi";
import ChatMessage from "../shared/ChatMessage";
import ChatInput from "../shared/ChatInput";

// 페이지 로드 시 sessionStorage 초기화
if (typeof window !== "undefined") {
  sessionStorage.removeItem("assistant_chatbot_session_id");
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

function getUserId(): number | null {
  const userStr = localStorage.getItem("dreampath:user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.userId || null;
    } catch (e) {
      console.error("사용자 정보 파싱 실패:", e);
      return null;
    }
  }
  return null;
}

export default function AssistantChatbot({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);

  // 세션 초기화 및 복원
  useEffect(() => {
    const savedSessionId = sessionStorage.getItem(
      "assistant_chatbot_session_id"
    );
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // 대화 내역 불러오기
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      const userId = getUserId();
      if (!userId) return;

      try {
        const history = await getAssistantHistory(sessionId, userId);
        setMessages(
          history.map((h: any) => ({
            role: h.role as "user" | "assistant",
            text: h.text,
          }))
        );
      } catch (error) {
        console.error("대화 내역 로드 실패:", error);
      }
    };
    loadHistory();
  }, [sessionId]);

  // 메시지 전송
  const handleSend = async () => {
    const userMsg = input.trim();
    if (!userMsg) return;

    const userId = getUserId();
    if (!userId) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await sendAssistantMessage({
        userId,
        sessionId,
        message: userMsg,
        conversationTitle: sessionId ? undefined : userMsg.slice(0, 20),
      });

      if (!sessionId) setSessionId(res.session);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.response },
      ]);
    } catch (error) {
      console.error("AI 비서 오류:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // X 버튼 클릭 시
  const handleClose = () => {
    if (sessionId) {
      sessionStorage.setItem("assistant_chatbot_session_id", sessionId);
    }
    onClose?.();
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff] rounded-lg overflow-hidden">
      {/* 상단바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span className="font-semibold">AI 비서와 대화 중 ···</span>
          <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
            회원 전용
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-black"
        >
          ✕
        </button>
      </div>

      {/* 메시지 영역 */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* 인사말 */}
        <div className="max-w-[78%] bg-white text-gray-1000 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm text-[14px] leading-relaxed">
          <p>안녕하세요! DreamPath AI 비서입니다✨</p>
          <p>
            멘토링 예약, 진로 추천 결과 등 서비스 관련 궁금한 내용을 모두
            물어보세요!
          </p>
        </div>

        {/* 모든 채팅 메시지 */}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} text={m.text} />
        ))}

        {/* 타이핑 애니메이션 */}
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
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        placeholder="메시지를 입력하세요..."
        disabled={loading}
      />
    </div>
  );
}
