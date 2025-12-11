"use client";

import { useState, useEffect, useRef } from "react";
import { sendFaqMessage, getFaqHistory } from "@/lib/api/ragChatApi";
import { fetchAllFaq, fetchFaqByCategory } from "@/lib/api/faqApi";
import ChatMessage from "../shared/ChatMessage";
import ChatInput from "../shared/ChatInput";
import InquiryForm, { InquiryData } from "../shared/InquiryForm";
import { BACKEND_BASE_URL } from "@/lib/api";

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

function getGuestId(): string | null {
  if (getUserId() !== null) {
    return null;
  }

  let guestId = localStorage.getItem("chatbot_guest_id");
  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem("chatbot_guest_id", guestId);
  }
  return guestId;
}

// 컴포넌트 외부에 상태 저장 (메모리에만 유지, 새로고침 시 초기화)
let cachedSessionId: string | null = null;
let cachedMessages: Message[] = [];
let cachedSelectedCategory: string | null = null;
let cachedUserId: number | null = null;

// 캐시 초기화 함수
function clearFaqCache() {
  cachedSessionId = null;
  cachedMessages = [];
  cachedSelectedCategory = null;
}

export default function FaqChatbot({ onClose }: { onClose?: () => void }) {
  // 마운트 시 사용자 변경 감지
  const currentUserId = getUserId();
  if (currentUserId !== cachedUserId) {
    clearFaqCache();
    cachedUserId = currentUserId;
  }

  const [sessionId, setSessionId] = useState<string | null>(cachedSessionId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(cachedMessages);
  const [loading, setLoading] = useState(false);
  const [chunkedCategories, setChunkedCategories] = useState<string[][]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(cachedSelectedCategory);
  const [faqList, setFaqList] = useState<any[]>([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);

  // 상태 변경 시 캐시 업데이트
  useEffect(() => {
    cachedSessionId = sessionId;
  }, [sessionId]);

  useEffect(() => {
    cachedMessages = messages;
  }, [messages]);

  useEffect(() => {
    cachedSelectedCategory = selectedCategory;
  }, [selectedCategory]);

  // FAQ 카테고리 로드 함수
  const loadFaqCategories = async () => {
    const all = await fetchAllFaq();
    if (!all) return;

    const uniqueCats = [...new Set(all.map((f: any) => f.category))];
    const chunked: string[][] = [];
    for (let i = 0; i < uniqueCats.length; i += 2) {
      chunked.push(uniqueCats.slice(i, i + 2));
    }
    setChunkedCategories(chunked);
  };

  // 로그인/로그아웃 이벤트 감지 (즉시 반응)
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("👤 로그인/로그아웃 감지 - FAQ 챗봇 세션 초기화");
      // 캐시 초기화
      cachedSessionId = null;
      cachedMessages = [];
      cachedSelectedCategory = null;
      // 상태 초기화
      setSessionId(null);
      setMessages([]);
      setSelectedCategory(null);
      setFaqList([]);
      setChunkedCategories([]);

      // FAQ 카테고리 다시 로드
      loadFaqCategories();
    };

    window.addEventListener("dreampath-auth-change", handleAuthChange);
    return () => window.removeEventListener("dreampath-auth-change", handleAuthChange);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // FAQ 카테고리 로드
  useEffect(() => {
    const loadFaq = async () => {
      const all = await fetchAllFaq();
      if (!all) return;

      const uniqueCats = [...new Set(all.map((f: any) => f.category))];
      const chunked: string[][] = [];
      for (let i = 0; i < uniqueCats.length; i += 2) {
        chunked.push(uniqueCats.slice(i, i + 2));
      }
      setChunkedCategories(chunked);
    };

    loadFaq();
  }, []);

  // 선택된 카테고리 FAQ 로드
  useEffect(() => {
    const loadFaq = async () => {
      if (!selectedCategory) return;
      const list = await fetchFaqByCategory(selectedCategory);
      setFaqList(list);
    };
    loadFaq();
  }, [selectedCategory]);

  // 대화 내역 불러오기
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      try {
        const history = await getFaqHistory(sessionId);
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
  const handleSend = async (text?: string) => {
    const userMsg = text ?? input;
    if (!userMsg.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const userId = getUserId();
      const guestId = getGuestId();

      const res = await sendFaqMessage({
        sessionId,
        userId,
        guestId,
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

  // FAQ 클릭 시
  const sendFaq = async (question: string) => {
    await handleSend(question);
  };

  // X 버튼 클릭 시
  const handleClose = () => {
    onClose?.();
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

  const isLoggedIn = getUserId() !== null;
  const userStr = isLoggedIn ? localStorage.getItem("dreampath:user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff] rounded-lg overflow-hidden">
      {/* 상단바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-semibold">AI 챗봇과 대화 중 ···</span>
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
          <p>안녕하세요! DreamPath AI 챗봇이에요😊</p>
          <p>무엇을 도와드릴까요?</p>
        </div>

        {/* FAQ 카테고리 */}
        <div className="flex flex-col gap-2">
          {chunkedCategories.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              {row.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`inline-flex items-center justify-center py-2 px-2 text-sm rounded-xl shadow ${
                    selectedCategory === c
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                      : "bg-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}

          {/* 문의하기 버튼 */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleInquiryClick}
              className="inline-flex items-center justify-center py-2 px-4 text-sm rounded-xl shadow bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            >
              📧 문의하기
            </button>
          </div>
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
        disabled={loading}
      />
    </div>
  );
}
