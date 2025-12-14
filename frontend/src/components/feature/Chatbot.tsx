"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatHistory } from "@/lib/api/ragChatApi";
import { fetchFaqCategories, fetchFaqByCategory } from "@/lib/api/faqApi";
import { BACKEND_BASE_URL } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { X, Send, Mail, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ChatbotProps {
  onClose?: () => void;
  darkMode?: boolean;
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

export default function Chatbot({ onClose, darkMode: propDarkMode }: ChatbotProps) {
  // Use prop if provided, otherwise detect from localStorage
  const [internalDarkMode, setInternalDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  const darkMode = propDarkMode ?? internalDarkMode;

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

  // Theme sync for internal dark mode
  useEffect(() => {
    if (propDarkMode === undefined) {
      const handleThemeChange = () => {
        setInternalDarkMode(localStorage.getItem("dreampath:theme") === "dark");
      };
      window.addEventListener("dreampath-theme-change", handleThemeChange);
      window.addEventListener("storage", handleThemeChange);
      return () => {
        window.removeEventListener("dreampath-theme-change", handleThemeChange);
        window.removeEventListener("storage", handleThemeChange);
      };
    }
  }, [propDarkMode]);

  // Session initialization
  useEffect(() => {
    const currentUserId = getUserId();
    const currentGuestId = getGuestId();
    const lastUserId = localStorage.getItem("chatbot_last_user_id");
    const lastGuestId = localStorage.getItem("chatbot_last_guest_id");

    const userIdChanged = String(currentUserId) !== lastUserId;
    const guestIdChanged = String(currentGuestId) !== lastGuestId;

    if (userIdChanged || guestIdChanged) {
      console.log("👤 사용자 변경 감지 - 챗봇 세션 초기화");
      sessionStorage.removeItem("chatbot_session_id");
      sessionStorage.removeItem("chatbot_messages");
      setSessionId(null);
      setMessages([]);

      localStorage.setItem("chatbot_last_user_id", String(currentUserId));
      localStorage.setItem("chatbot_last_guest_id", String(currentGuestId));
    } else {
      const savedSessionId = sessionStorage.getItem("chatbot_session_id");
      const savedMessages = sessionStorage.getItem("chatbot_messages");

      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error("대화 내용 복원 실패:", e);
        }
      }
    }

    lastUserIdRef.current = String(currentUserId);
  }, []);

  // Save messages to session storage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("chatbot_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Load FAQ categories
  const loadFaqCategories = async () => {
    const categories = await fetchFaqCategories();
    if (!categories || categories.length === 0) return;

    const chunked: string[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      chunked.push(categories.slice(i, i + 2));
    }
    setChunkedCategories(chunked);
  };

  // Auth change handler
  useEffect(() => {
    const handleAuthChange = () => {
      const currentUserId = getUserId();
      const currentUserIdStr = String(currentUserId);

      console.log("👤 로그인/로그아웃 감지 - 챗봇 세션 초기화");
      sessionStorage.removeItem("chatbot_session_id");
      sessionStorage.removeItem("chatbot_messages");
      setSessionId(null);
      setMessages([]);
      setSelectedCategory(null);
      setFaqList([]);
      setChunkedCategories([]);

      localStorage.setItem("chatbot_last_user_id", currentUserIdStr);
      localStorage.setItem("chatbot_last_guest_id", String(getGuestId()));
      lastUserIdRef.current = currentUserIdStr;

      loadFaqCategories();
    };

    window.addEventListener("dreampath-auth-change", handleAuthChange);
    return () => window.removeEventListener("dreampath-auth-change", handleAuthChange);
  }, []);

  // Auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial FAQ categories load
  useEffect(() => {
    loadFaqCategories();
  }, []);

  // Load FAQ by category
  useEffect(() => {
    const loadFaq = async () => {
      if (!selectedCategory) return;
      const list = await fetchFaqByCategory(selectedCategory);
      setFaqList(list);
    };
    loadFaq();
  }, [selectedCategory]);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      try {
        const history = await getChatHistory(sessionId);
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

  // Send message
  const handleSend = async (text?: string) => {
    const userMsg = text ?? input;
    if (!userMsg.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const userId = getUserId();
      const guestId = getGuestId();

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

  const sendFaq = async (question: string) => {
    await handleSend(question);
  };

  const handleClose = () => {
    if (sessionId) {
      sessionStorage.setItem("chatbot_session_id", sessionId);
    }
    onClose?.();
  };

  const handleInquiryClick = () => {
    const userStr = localStorage.getItem("dreampath:user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setInquiryData({
          name: user.name || "",
          email: user.email || "",
          content: "",
        });
      } catch (e) {
        console.error("사용자 정보 파싱 실패:", e);
      }
    } else {
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInquiryChange = (field: "name" | "email" | "content", value: string) => {
    setInquiryData({ ...inquiryData, [field]: value });
    if (value.trim()) {
      setInquiryErrors({ ...inquiryErrors, [field]: "" });
    }
  };

  const handleInquirySubmit = async () => {
    const errors = { name: "", email: "", content: "" };
    let hasError = false;

    if (!inquiryData.name.trim()) {
      errors.name = "이름을 입력해주세요.";
      hasError = true;
    }

    if (!inquiryData.email.trim()) {
      errors.email = "이메일을 입력해주세요.";
      hasError = true;
    } else if (!validateEmail(inquiryData.email)) {
      errors.email = "이메일 형식으로 입력해주세요.";
      hasError = true;
    }

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

      const requestData = {
        name: inquiryData.name.trim(),
        email: inquiryData.email.trim(),
        content: inquiryData.content.trim(),
        userId: userId,
        sessionId: sessionId || null,
      };

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

  // Theme styles
  const theme = {
    container: darkMode
      ? "bg-[#0B0D14] border-white/[0.08]"
      : "bg-gradient-to-br from-[#eef2ff] to-[#f5e8ff]",
    header: darkMode
      ? "bg-[#0B0D14]/95 border-white/[0.06]"
      : "bg-white border-gray-200",
    headerText: darkMode ? "text-white" : "text-gray-900",
    headerSubtext: darkMode ? "text-white/50" : "text-gray-500",
    closeBtn: darkMode
      ? "text-white/50 hover:text-white hover:bg-white/[0.05]"
      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
    chatBg: darkMode ? "" : "",
    userBubble: "bg-gradient-to-r from-violet-600 to-violet-500 text-white",
    assistantBubble: darkMode
      ? "bg-white/[0.05] text-white/90 border border-white/[0.08]"
      : "bg-white text-gray-900 shadow-sm",
    input: darkMode
      ? "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40 focus:border-violet-500/50"
      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-500",
    inputContainer: darkMode
      ? "bg-[#0B0D14]/95 border-white/[0.06]"
      : "bg-white border-gray-200",
    sendBtn: "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white",
    categoryBtn: darkMode
      ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.08] border border-white/[0.08]"
      : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
    categoryBtnActive: "bg-gradient-to-r from-violet-600 to-violet-500 text-white",
    inquiryBtn: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
    faqBtn: darkMode
      ? "bg-white/[0.03] text-white/80 hover:bg-white/[0.06] border border-white/[0.06]"
      : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
    formContainer: darkMode
      ? "bg-white/[0.03] border border-white/[0.08]"
      : "bg-white shadow-md",
    formLabel: darkMode ? "text-white/60" : "text-gray-600",
    formInput: darkMode
      ? "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40 focus:border-violet-500/50"
      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",
    formInputDisabled: darkMode
      ? "bg-white/[0.02] cursor-not-allowed"
      : "bg-gray-100 cursor-not-allowed",
  };

  // Custom scrollbar styles
  const scrollbarStyles = darkMode ? `
    .chatbot-scroll::-webkit-scrollbar { width: 6px; }
    .chatbot-scroll::-webkit-scrollbar-track { background: transparent; }
    .chatbot-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .chatbot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  ` : `
    .chatbot-scroll::-webkit-scrollbar { width: 6px; }
    .chatbot-scroll::-webkit-scrollbar-track { background: transparent; }
    .chatbot-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
    .chatbot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
  `;

  return (
    <div className={cn(
      "w-full max-w-full h-full flex flex-col rounded-xl sm:rounded-2xl overflow-hidden border shadow-xl box-border",
      theme.container,
      darkMode && "border-white/[0.08]"
    )}>
      <style>{scrollbarStyles}</style>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 sm:px-4 py-3 border-b shrink-0",
        theme.header
      )}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center",
            darkMode
              ? "bg-gradient-to-br from-violet-600 to-violet-500"
              : "bg-gradient-to-br from-violet-500 to-purple-600"
          )}>
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <span className={cn("font-semibold text-sm sm:text-base", theme.headerText)}>
              AI 챗봇
            </span>
            <p className={cn("text-xs hidden sm:block", theme.headerSubtext)}>
              무엇이든 물어보세요
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-lg transition-colors",
              theme.closeBtn
            )}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div ref={chatRef} className="chatbot-scroll flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3">
        {/* Welcome message */}
        <div className={cn(
          "max-w-[85%] sm:max-w-[78%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-bl-none text-sm leading-relaxed",
          theme.assistantBubble
        )}>
          <p>안녕하세요! DreamPath AI 챗봇이에요</p>
          <p>무엇을 도와드릴까요?</p>
        </div>

        {/* FAQ Categories */}
        <div className="flex flex-col gap-2">
          {chunkedCategories.map((row, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              {row.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={cn(
                    "py-2 px-3 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all",
                    selectedCategory === c
                      ? theme.categoryBtnActive
                      : theme.categoryBtn
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}

          {/* Inquiry button */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleInquiryClick}
              className={cn(
                "flex items-center gap-1.5 py-2 px-3 sm:px-4 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all",
                theme.inquiryBtn
              )}
            >
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>문의하기</span>
            </button>
          </div>
        </div>

        {/* FAQ List */}
        {selectedCategory && (
          <div className="flex flex-col items-start gap-2">
            {faqList.map((q) => (
              <button
                key={q.id}
                onClick={() => sendFaq(q.question)}
                className={cn(
                  "py-2 sm:py-3 px-3 text-xs sm:text-sm rounded-lg sm:rounded-xl text-left transition-all",
                  theme.faqBtn
                )}
              >
                {q.question}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "mb-2 flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "px-3 sm:px-4 py-2 rounded-2xl max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed break-words",
                m.role === "user"
                  ? theme.userBubble
                  : theme.assistantBubble
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className={cn(
                          "font-semibold",
                          darkMode ? "text-white" : "text-gray-900"
                        )}>
                          {children}
                        </strong>
                      ),
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

        {/* Loading indicator */}
        {loading && (
          <div className="mb-2 flex justify-start">
            <div className={cn(
              "px-4 py-3 rounded-2xl max-w-[75%] text-sm flex gap-1.5 items-center",
              theme.assistantBubble
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                darkMode ? "bg-white/40" : "bg-gray-400"
              )} style={{ animationDelay: "0ms" }} />
              <span className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                darkMode ? "bg-white/40" : "bg-gray-400"
              )} style={{ animationDelay: "150ms" }} />
              <span className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                darkMode ? "bg-white/40" : "bg-gray-400"
              )} style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Inquiry Form */}
        {showInquiryForm && (
          <div className={cn(
            "rounded-xl p-3 sm:p-4 max-w-[95%] sm:max-w-[90%]",
            theme.formContainer
          )}>
            <h3 className={cn("text-sm font-semibold mb-3", theme.headerText)}>문의하기</h3>
            <div className="space-y-3">
              <div>
                <label className={cn("block text-xs mb-1", theme.formLabel)}>이름</label>
                <input
                  type="text"
                  className={cn(
                    "w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all",
                    theme.formInput,
                    inquiryErrors.name && "border-red-500",
                    getUserId() !== null && theme.formInputDisabled
                  )}
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
                <label className={cn("block text-xs mb-1", theme.formLabel)}>이메일</label>
                <input
                  type="email"
                  className={cn(
                    "w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all",
                    theme.formInput,
                    inquiryErrors.email && "border-red-500",
                    getUserId() !== null && theme.formInputDisabled
                  )}
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
                <label className={cn("block text-xs mb-1", theme.formLabel)}>문의 내용</label>
                <textarea
                  className={cn(
                    "w-full border rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all",
                    theme.formInput,
                    inquiryErrors.content && "border-red-500"
                  )}
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
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    theme.inquiryBtn
                  )}
                >
                  보내기
                </button>
                <button
                  onClick={() => {
                    setShowInquiryForm(false);
                    setInquiryErrors({ name: "", email: "", content: "" });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition-all",
                    darkMode
                      ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.08]"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={cn(
        "p-3 sm:p-4 border-t",
        theme.inputContainer
      )}>
        <div className="flex gap-2">
          <input
            className={cn(
              "flex-1 border px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm outline-none transition-all",
              theme.input
            )}
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            className={cn(
              "px-4 sm:px-5 rounded-xl transition-all flex items-center justify-center",
              theme.sendBtn
            )}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}