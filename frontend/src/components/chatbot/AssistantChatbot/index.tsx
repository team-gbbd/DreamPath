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

// 컴포넌트 외부에 상태 저장 (메모리에만 유지, 새로고침 시 초기화)
let cachedSessionId: string | null = null;
let cachedMessages: Message[] = [];
let cachedSelectedCategory: string | null = null;
let cachedUserId: number | null = null;

// 캐시 초기화 함수
function clearAssistantCache() {
  cachedSessionId = null;
  cachedMessages = [];
  cachedSelectedCategory = null;
}

export default function AssistantChatbot({
  onClose,
}: {
  onClose?: () => void;
}) {
  // 다크모드 상태
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("dreampath:theme") !== "light";
  });

  // 테마 변경 감지
  useEffect(() => {
    const handleThemeChange = () => {
      setDarkMode(localStorage.getItem("dreampath:theme") !== "light");
    };
    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  // 마운트 시 사용자 변경 감지
  const currentUserId = getUserId();
  if (currentUserId !== cachedUserId) {
    clearAssistantCache();
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

  // 로그인/로그아웃 이벤트 감지 (즉시 반응)
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("👤 로그인/로그아웃 감지 - Assistant 챗봇 세션 초기화");
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
    };

    window.addEventListener("dreampath-auth-change", handleAuthChange);
    return () => window.removeEventListener("dreampath-auth-change", handleAuthChange);
  }, []);

  // 진로 상담 완료 시 캐시 초기화 (최신 진로 데이터 기반 응답을 위해)
  useEffect(() => {
    const handleCareerUpdated = () => {
      console.log("🎯 진로 상담 완료 감지 - Assistant 챗봇 세션 초기화");
      // 캐시 초기화
      cachedSessionId = null;
      cachedMessages = [];
      cachedSelectedCategory = null;
      // 상태 초기화
      setSessionId(null);
      setMessages([]);
      setSelectedCategory(null);
      setFaqList([]);
    };

    window.addEventListener("dreampath-career-updated", handleCareerUpdated);
    return () => window.removeEventListener("dreampath-career-updated", handleCareerUpdated);
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
  const handleSend = async (text?: string, functionName?: string) => {
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
        functionName,  // FAQ 직접 호출용
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

  // FAQ 클릭 시 (function_name 포함)
  const sendFaq = async (question: string, functionName?: string) => {
    await handleSend(question, functionName);
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
    onClose?.();
  };

  const isLoggedIn = getUserId() !== null;
  const userStr = isLoggedIn ? localStorage.getItem("dreampath:user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

  // 테마 스타일
  const theme = {
    container: darkMode
      ? "bg-[#0f0f14]"
      : "bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff]",
    header: darkMode
      ? "bg-[#1a1a24] border-white/10"
      : "bg-white border-gray-200",
    headerText: darkMode ? "text-white" : "text-gray-800",
    headerSubtle: darkMode ? "text-white/60" : "text-gray-500",
    closeBtn: darkMode
      ? "text-white/60 hover:text-white"
      : "text-gray-500 hover:text-black",
    messageBg: darkMode
      ? "bg-white/[0.05] text-white/90"
      : "bg-white text-gray-800",
    categoryBtn: darkMode
      ? "bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
      : "bg-white text-gray-700 hover:bg-gray-50",
    categoryBtnActive: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    faqBtn: darkMode
      ? "bg-white/[0.05] text-white/80 hover:bg-white/[0.1]"
      : "bg-white text-gray-700 hover:bg-gray-100",
    loadingDot: darkMode ? "bg-white/40" : "bg-gray-400",
    scrollbar: darkMode
      ? "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      : "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
  };

  return (
    <div className={`w-full h-full flex flex-col rounded-lg sm:rounded-2xl overflow-hidden ${theme.container}`}>
      {/* 상단바 */}
      <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b ${theme.header}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">✨</span>
          <span className={`font-semibold text-sm sm:text-base ${theme.headerText}`}>
            <span className="hidden sm:inline">AI 챗봇 비서와 대화 중 ···</span>
            <span className="sm:hidden">AI 비서</span>
          </span>
          <span className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full">
            Assistant
          </span>
        </div>
        <button
          onClick={handleClose}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${theme.closeBtn} ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={chatRef}
        className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 ${theme.scrollbar}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: darkMode ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.15) transparent',
        }}
      >
        {/* 인사말 */}
        <div className={`max-w-[85%] sm:max-w-[78%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-bl-none shadow-sm text-[13px] sm:text-[14px] leading-relaxed ${theme.messageBg}`}>
          <p>안녕하세요! DreamPath AI 챗봇 비서입니다✨</p>
          <p className="mt-1">
            멘토링 예약, 진로 추천 결과 등 서비스 관련 궁금한 내용을 모두
            물어보세요!
          </p>
        </div>

        {/* FAQ 카테고리 + 문의하기 (한 줄에 배치) */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {chunkedCategories.flat().map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`inline-flex items-center justify-center py-1.5 sm:py-2 px-2.5 sm:px-3 text-xs sm:text-sm rounded-lg sm:rounded-xl shadow-sm transition-all ${
                selectedCategory === c
                  ? theme.categoryBtnActive
                  : theme.categoryBtn
              }`}
            >
              {c}
            </button>
          ))}
          {/* 문의하기 버튼 */}
          <button
            onClick={handleInquiryClick}
            className="inline-flex items-center justify-center py-1.5 sm:py-2 px-2.5 sm:px-3 text-xs sm:text-sm rounded-lg sm:rounded-xl shadow-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            <span className="hidden sm:inline">📧 문의하기</span>
            <span className="sm:hidden">📧 문의</span>
          </button>
        </div>

        {/* 선택된 카테고리의 질문 리스트 */}
        {selectedCategory && (
          <div className="flex flex-col items-start gap-1.5 sm:gap-2">
            {faqList.map((q) => (
              <button
                key={q.id}
                onClick={() => sendFaq(q.question, q.function_name)}
                className={`inline-flex items-center py-2 sm:py-3 px-2.5 sm:px-3 text-xs sm:text-sm rounded-lg sm:rounded-xl shadow-sm transition-all ${theme.faqBtn}`}
              >
                {q.question}
              </button>
            ))}
          </div>
        )}

        {/* 모든 채팅 메시지 */}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} text={m.text} darkMode={darkMode} />
        ))}

        {/* 타이핑 애니메이션 */}
        {loading && (
          <div className="mb-2 flex justify-start">
            <div className={`px-3 sm:px-4 py-2 rounded-2xl max-w-[75%] text-xs sm:text-sm flex gap-1 items-center shadow-sm ${theme.messageBg}`}>
              <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 ${theme.loadingDot} rounded-full animate-[typing_1s_infinite]`}></span>
              <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 ${theme.loadingDot} rounded-full animate-[typing_1s_infinite_0.2s]`}></span>
              <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 ${theme.loadingDot} rounded-full animate-[typing_1s_infinite_0.4s]`}></span>
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
            darkMode={darkMode}
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
        darkMode={darkMode}
      />
    </div>
  );
}