"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatHistory } from "@/lib/api/ragChatApi";
import { fetchFaqCategories, fetchFaqByCategory } from "@/lib/api/faqApi";
import { BACKEND_BASE_URL } from "@/lib/api";
import ReactMarkdown from "react-markdown";

// 페이지 로드 시 sessionStorage 초기화 (새로고침 시 대화 내역 삭제)
if (typeof window !== "undefined") {
  sessionStorage.removeItem("chatbot_session_id");
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

function getUserId(): number | null {
  // dreampath:user에서 사용자 정보 가져오기
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

  // 비회원: null 반환
  return null;
}

function getGuestId(): string | null {
  // 로그인한 경우 null 반환 (guest_id 저장하지 않음)
  if (getUserId() !== null) {
    return null;
  }

  // 비회원인 경우 localStorage에서 게스트 ID 가져오기 (없으면 생성)
  let guestId = localStorage.getItem("chatbot_guest_id");
  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem("chatbot_guest_id", guestId);
  }
  return guestId;
}

export default function Chatbot({ onClose }: { onClose?: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [chunkedCategories, setChunkedCategories] = useState<string[][]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [faqList, setFaqList] = useState<any[]>([]);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    name: "",
    email: "",
    content: "",
  });
  const [inquiryErrors, setInquiryErrors] = useState({
    name: "",
    email: "",
    content: "",
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // 컴포넌트 마운트시 sessionStorage에서 sessionId 불러오기
  // - 새로고침 → sessionStorage가 페이지 로드 시 초기화됨 → 새 대화 시작
  // - X로 닫고 다시 열기 → sessionStorage에서 읽어서 대화 복원
  // - 로그인/로그아웃 → 사용자 ID 변경 시 세션 초기화
  useEffect(() => {
    const currentUserId = getUserId();
    const currentGuestId = getGuestId();

    // 마지막 사용자 정보 확인
    const lastUserId = localStorage.getItem("chatbot_last_user_id");
    const lastGuestId = localStorage.getItem("chatbot_last_guest_id");

    // 사용자 ID가 변경되었는지 확인
    const userIdChanged = String(currentUserId) !== lastUserId;
    const guestIdChanged = String(currentGuestId) !== lastGuestId;

    if (userIdChanged || guestIdChanged) {
      // 사용자가 바뀌면 세션 초기화
      console.log("👤 사용자 변경 감지 - 챗봇 세션 초기화");
      sessionStorage.removeItem("chatbot_session_id");
      setSessionId(null);
      setMessages([]);

      // 현재 사용자 정보 저장
      localStorage.setItem("chatbot_last_user_id", String(currentUserId));
      localStorage.setItem("chatbot_last_guest_id", String(currentGuestId));
    } else {
      // 같은 사용자면 기존 세션 복원
      const savedSessionId = sessionStorage.getItem("chatbot_session_id");
      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
    }

    // 현재 사용자 ID를 ref에 저장
    lastUserIdRef.current = String(currentUserId);
  }, []);

  // 챗봇이 열려있는 동안 주기적으로 사용자 ID 변경 감지
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentUserId = getUserId();
      const currentUserIdStr = String(currentUserId);

      // 이전 사용자 ID와 비교
      if (lastUserIdRef.current !== null && lastUserIdRef.current !== currentUserIdStr) {
        console.log("👤 실시간 사용자 변경 감지 - 챗봇 세션 초기화");
        sessionStorage.removeItem("chatbot_session_id");
        setSessionId(null);
        setMessages([]);

        // 현재 사용자 정보 업데이트
        localStorage.setItem("chatbot_last_user_id", currentUserIdStr);
        localStorage.setItem("chatbot_last_guest_id", String(getGuestId()));
      }

      // ref 업데이트
      lastUserIdRef.current = currentUserIdStr;
    }, 1000); // 1초마다 체크

    return () => clearInterval(intervalId);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  /* FAQ 카테고리 로드 */
  useEffect(() => {
    const loadCategories = async () => {
      const categories = await fetchFaqCategories();
      if (!categories || categories.length === 0) return;

      // ---- 2개씩 묶기 ----
      const chunked: string[][] = [];
      for (let i = 0; i < categories.length; i += 2) {
        chunked.push(categories.slice(i, i + 2));
      }
      setChunkedCategories(chunked);
    };

    loadCategories();
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

      try {
        const history = await getChatHistory(sessionId);

        // 대화 내역을 messages에 설정 (기존 내용 덮어쓰기)
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

  /* 메시지 전송 */
  const handleSend = async (text?: string) => {
    const userMsg = text ?? input;
    if (!userMsg.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const userId = getUserId();
      const guestId = getGuestId();

      console.log("🔍 RAG 챗봇 메시지 전송:", { userId, guestId });

      // ✅ 메인페이지: 회원+비회원 모두 RAG (FAQ 기반) 사용
      const res = await sendChatMessage({
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

  /* FAQ 클릭 시 handleSend를 사용하여 서버가 답변을 생성하도록 처리 */
  const sendFaq = async (question: string) => {
    // handleSend를 호출하면 서버가 FAQ에서 답변을 찾아 반환하고
    // user 메시지와 assistant 메시지를 올바르게 저장함
    await handleSend(question);
  };

  /* X 버튼 클릭 시 sessionStorage에 sessionId 저장 */
  const handleClose = () => {
    if (sessionId) {
      sessionStorage.setItem("chatbot_session_id", sessionId);
    }
    onClose?.();
  };

  /* 문의하기 버튼 클릭 */
  const handleInquiryClick = () => {
    // 로그인한 사용자 정보 가져오기
    const userStr = localStorage.getItem("dreampath:user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // 로그인한 사용자는 이름, 이메일 자동 입력
        setInquiryData({
          name: user.name || "",
          email: user.email || "",
          content: "",
        });
      } catch (e) {
        console.error("사용자 정보 파싱 실패:", e);
      }
    } else {
      // 비로그인 사용자는 빈 폼
      setInquiryData({ name: "", email: "", content: "" });
    }

    setShowInquiryForm(true);
    setInquiryErrors({ name: "", email: "", content: "" });
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "DreamPath의 문의 처리는 영업일 이내 1~2일 소요 됩니다. 답변은 이메일로 드리고 있으니 이메일을 꼭 확인해주세요.",
      },
    ]);
  };

  /* 이메일 유효성 검사 */
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /* 입력 필드 변경 시 에러 초기화 */
  const handleInquiryChange = (field: "name" | "email" | "content", value: string) => {
    setInquiryData({ ...inquiryData, [field]: value });

    // 입력하면 해당 필드의 에러 메시지 제거
    if (value.trim()) {
      setInquiryErrors({ ...inquiryErrors, [field]: "" });
    }
  };

  /* 문의 제출 */
  const handleInquirySubmit = async () => {
    const errors = { name: "", email: "", content: "" };
    let hasError = false;

    // 이름 검증
    if (!inquiryData.name.trim()) {
      errors.name = "이름을 입력해주세요.";
      hasError = true;
    }

    // 이메일 검증
    if (!inquiryData.email.trim()) {
      errors.email = "이메일을 입력해주세요.";
      hasError = true;
    } else if (!validateEmail(inquiryData.email)) {
      errors.email = "이메일 형식으로 입력해주세요.";
      hasError = true;
    }

    // 문의 내용 검증
    if (!inquiryData.content.trim()) {
      errors.content = "문의 내용을 입력해주세요.";
      hasError = true;
    }

    if (hasError) {
      setInquiryErrors(errors);
      return;
    }

    try {
      const userId = getUserId();

      // 서버에 전달할 데이터
      const requestData = {
        name: inquiryData.name.trim(),
        email: inquiryData.email.trim(),
        content: inquiryData.content.trim(),
        userId: userId, // 로그인한 경우 userId, 아니면 null
        sessionId: sessionId || null, // 챗봇 세션 ID (null이면 명시적으로 null)
      };

      console.log("🔍 문의 제출 데이터:", requestData);

      // Java 백엔드로 문의 전송 (VITE_BACKEND_URL 환경변수 사용)
      const response = await fetch(`${BACKEND_BASE_URL}/api/inquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(requestData),
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
        setInquiryData({ name: "", email: "", content: "" });
        setInquiryErrors({ name: "", email: "", content: "" });
      } else {
        alert(result.message || "문의 접수에 실패했습니다.");
      }
    } catch (error) {
      console.error("문의 제출 오류:", error);
      alert("문의 접수 중 오류가 발생했습니다.");
    }
  };

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

      {/* 🔥 스크롤 한 개만 존재하는 영역 */}
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
                  : "bg-white text-gray-1000"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
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

        {/* 문의하기 폼 - 스크롤 영역 안에 */}
        {showInquiryForm && (
          <div className="bg-white rounded-xl p-4 shadow-md max-w-[90%]">
            <h3 className="text-sm font-semibold mb-3">문의하기</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">이름</label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    inquiryErrors.name ? "border-red-500" : "border-gray-300"
                  } ${getUserId() !== null ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="이름을 입력하세요"
                  value={inquiryData.name}
                  onChange={(e) => handleInquiryChange("name", e.target.value)}
                  readOnly={getUserId() !== null}
                />
                {inquiryErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{inquiryErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    inquiryErrors.email ? "border-red-500" : "border-gray-300"
                  } ${getUserId() !== null ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="email@example.com"
                  value={inquiryData.email}
                  onChange={(e) => handleInquiryChange("email", e.target.value)}
                  readOnly={getUserId() !== null}
                />
                {inquiryErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{inquiryErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">문의 내용</label>
                <textarea
                  className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${
                    inquiryErrors.content ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="문의 내용을 입력하세요"
                  rows={4}
                  value={inquiryData.content}
                  onChange={(e) => handleInquiryChange("content", e.target.value)}
                />
                {inquiryErrors.content && (
                  <p className="text-red-500 text-xs mt-1">{inquiryErrors.content}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInquirySubmit}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600"
                >
                  보내기
                </button>
                <button
                  onClick={() => {
                    setShowInquiryForm(false);
                    setInquiryErrors({ name: "", email: "", content: "" });
                  }}
                  className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
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
