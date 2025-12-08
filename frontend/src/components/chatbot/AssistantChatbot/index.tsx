"use client";

import { useState, useEffect, useRef } from "react";
import {
  sendAssistantMessage,
  getAssistantHistory,
} from "@/lib/api/assistantChatApi";
import { fetchFaqCategories, fetchFaqByCategory } from "@/lib/api/faqApi";
import ChatMessage from "../shared/ChatMessage";
import ChatInput from "../shared/ChatInput";
import InquiryForm, { InquiryData } from "../shared/InquiryForm";
import { BACKEND_BASE_URL } from "@/lib/api";

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
  const [chunkedCategories, setChunkedCategories] = useState<string[][]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [faqList, setFaqList] = useState<any[]>([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

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

  // FAQ 카테고리 로드 (assistant 전용)
  useEffect(() => {
    const loadCategories = async () => {
      const categories = await fetchFaqCategories("assistant");
      if (!categories || categories.length === 0) return;

      // 2개씩 묶기
      const chunked: string[][] = [];
      for (let i = 0; i < categories.length; i += 2) {
        chunked.push(categories.slice(i, i + 2));
      }
      setChunkedCategories(chunked);
    };

    loadCategories();
  }, []);

  // 선택된 카테고리 FAQ 로드
  useEffect(() => {
    const loadFaq = async () => {
      if (!selectedCategory) return;
      const list = await fetchFaqByCategory(selectedCategory, "assistant");
      setFaqList(list);
    };
    loadFaq();
  }, [selectedCategory]);

  // 메시지 전송
  const handleSend = async (text?: string) => {
    const userMsg = text ?? input.trim();
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

  // FAQ 클릭 시
  const sendFaq = async (question: string) => {
    await handleSend(question);
  };

  // 문의하기 버튼 클릭
  const handleInquiryClick = () => {
    setShowInquiryForm(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "DreamPath의 문의 처리는 영업일 이내 1~2일 소요 됩니다. 답변은 이메일로 드리고 있으니 이메일을 꼭 확인해주세요.",
      },
    ]);
  };

  // 문의 제출
  const handleInquirySubmit = async (data: InquiryData) => {
    try {
      const userId = getUserId();

      // Java 백엔드로 문의 전송 (VITE_BACKEND_URL 환경변수 사용)
      const response = await fetch(`${BACKEND_BASE_URL}/api/inquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          content: data.content.trim(),
          userId: userId,
          sessionId: sessionId || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다. 감사합니다!",
          },
        ]);
        setShowInquiryForm(false);
      } else {
        alert(result.message || "문의 접수에 실패했습니다.");
      }
    } catch (error) {
      console.error("문의 제출 오류:", error);
      alert("문의 접수 중 오류가 발생했습니다.");
    }
  };

  // X 버튼 클릭 시
  const handleClose = () => {
    if (sessionId) {
      sessionStorage.setItem("assistant_chatbot_session_id", sessionId);
    }
    onClose?.();
  };

  const isLoggedIn = getUserId() !== null;
  const userStr = isLoggedIn ? localStorage.getItem("dreampath:user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

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

        {/* FAQ 카테고리 + 문의하기 (한 줄에 배치) */}
        <div className="flex flex-wrap gap-2">
          {chunkedCategories.flat().map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`inline-flex items-center justify-center py-2 px-3 text-sm rounded-xl shadow ${
                selectedCategory === c
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-white"
              }`}
            >
              {c}
            </button>
          ))}
          {/* 문의하기 버튼 */}
          <button
            onClick={handleInquiryClick}
            className="inline-flex items-center justify-center py-2 px-3 text-sm rounded-xl shadow bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
          >
            📧 문의하기
          </button>
        </div>

        {/* 선택된 카테고리의 질문 리스트 */}
        {selectedCategory && (
          <div className="flex flex-col items-start gap-2">
            {faqList.map((q) => (
              <button
                key={q.id}
                onClick={() => sendFaq(q.question)}
                className="bg-white inline-flex items-center py-3 px-3 text-sm rounded-xl shadow hover:bg-gray-100"
              >
                {q.question}
              </button>
            ))}
          </div>
        )}

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

        {/* 문의하기 폼 */}
        {showInquiryForm && (
          <InquiryForm
            onSubmit={handleInquirySubmit}
            onCancel={() => setShowInquiryForm(false)}
            defaultName={user?.name || ""}
            defaultEmail={user?.email || ""}
            isLoggedIn={isLoggedIn}
          />
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
