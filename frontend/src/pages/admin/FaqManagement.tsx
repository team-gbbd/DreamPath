import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/common/Toast";
import axios from "axios";

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  user_type: "guest" | "member" | "both" | "assistant";
  answer_type: "static" | "function";
  function_name?: string;
  function_description?: string;
  keywords?: string[];
  priority: number;
  is_active: boolean;
  updated_at: string;
}

const API_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export default function FaqManagementPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    question: "",
    answer: "",
    user_type: "both" as "guest" | "member" | "both" | "assistant",
    answer_type: "static" as "static" | "function",
    function_name: "",
    function_description: "",
    keywords: [] as string[],
    keywordInput: "",
    priority: 5,
    is_active: true,
  });
  const [filterUserType, setFilterUserType] = useState<
    "all" | "guest" | "member" | "both" | "assistant"
  >("all");
  const [filterCategory, setFilterCategory] = useState<string>("전체");
  const [validationError, setValidationError] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCategoryDirectInput, setIsCategoryDirectInput] = useState(false);
  const [categories, setCategories] = useState<string[]>(["전체"]);
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체 (파란색 기반)
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-blue-500/30"
      : "hover:shadow-md hover:border-blue-200",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-100",
    sectionBg: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-sm",
    modalBg: darkMode
      ? "bg-[#12141D] border-white/[0.1]"
      : "bg-white border-slate-200 shadow-xl",
    button: {
      primary: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700",
      secondary: darkMode
        ? "bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.1]"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      danger: "bg-red-500 text-white hover:bg-red-600",
    },
    divider: darkMode ? "border-white/[0.06]" : "border-slate-200",
    accent: darkMode ? "text-blue-400" : "text-blue-500",
    accentBg: darkMode ? "bg-blue-500/20" : "bg-blue-50",
    iconBg: darkMode ? "bg-blue-500" : "bg-blue-500",
    filterActive: darkMode
      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
      : "bg-blue-500 text-white shadow-sm",
    filterInactive: darkMode
      ? "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const t = localStorage.getItem('dreampath:theme');
      setDarkMode(t === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);
    return () => window.removeEventListener('dreampath-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, []);

  useEffect(() => {
    fetchCategories(filterUserType);
    setFilterCategory("전체");
  }, [filterUserType]);

  const fetchCategories = async (userType: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/faq/categories?user_type=${userType}`);
      if (response.data && Array.isArray(response.data)) {
        setCategories(["전체", ...response.data]);
      }
    } catch (err) {
      console.error("카테고리 로딩 실패:", err);
      setCategories(["전체"]);
    }
  };

  const fetchFaqs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/faq/all`);
      setFaqs(response.data);
    } catch (err: any) {
      console.error("FAQ 로딩 실패:", err);
      setError("FAQ 데이터를 불러오는 중 오류가 발생했습니다.");
      showToast("FAQ 데이터를 불러오는데 실패했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({
      category: "",
      question: "",
      answer: "",
      user_type: "both",
      answer_type: "static",
      function_name: "",
      function_description: "",
      keywords: [],
      keywordInput: "",
      priority: 5,
      is_active: true,
    });
    setValidationError("");
    setIsCategoryDirectInput(false);
    setIsModalOpen(true);
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer || "",
      user_type: faq.user_type,
      answer_type: faq.answer_type,
      function_name: faq.function_name || "",
      function_description: faq.function_description || "",
      keywords: faq.keywords || [],
      keywordInput: "",
      priority: faq.priority,
      is_active: faq.is_active,
    });
    setValidationError("");
    setIsCategoryDirectInput(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/faq/${id}`);
      if (response.data.success) {
        showToast("FAQ가 삭제되었습니다.", "success");
        fetchFaqs();
      } else {
        showToast(response.data.message || "삭제 실패", "error");
      }
    } catch (err: any) {
      console.error("FAQ 삭제 실패:", err);
      showToast("FAQ 삭제 중 오류가 발생했습니다.", "error");
    }
  };

  const handleSyncPinecone = async () => {
    if (!confirm("Pinecone에 모든 FAQ를 동기화하시겠습니까?")) return;

    try {
      setIsSyncing(true);
      const response = await axios.post(`${API_BASE_URL}/api/faq/sync-pinecone`);

      if (response.data.success) {
        showToast(
          `Pinecone 동기화 완료 (성공: ${response.data.successCount}, 실패: ${response.data.failedCount})`,
          "success"
        );
      } else {
        showToast(response.data.message || "Pinecone 동기화 실패", "error");
      }
    } catch (err: any) {
      console.error("Pinecone 동기화 실패:", err);
      showToast("Pinecone 동기화 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      setValidationError("카테고리를 선택해주세요.");
      return;
    }
    if (!formData.question.trim()) {
      setValidationError("질문을 입력해주세요.");
      return;
    }
    if (formData.answer_type === "static" && !formData.answer.trim()) {
      setValidationError("답변을 입력해주세요.");
      return;
    }

    setValidationError("");

    try {
      if (editingFaq) {
        const response = await axios.put(`${API_BASE_URL}/api/faq/${editingFaq.id}`, formData);
        if (response.data.success) {
          showToast("FAQ가 수정되었습니다.", "success");
          setIsModalOpen(false);
          fetchFaqs();
        } else {
          showToast(response.data.message || "수정 실패", "error");
        }
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/faq`, formData);
        if (response.data.success) {
          showToast("FAQ가 생성되었습니다.", "success");
          setIsModalOpen(false);
          fetchFaqs();
          fetchCategories(filterUserType);
        } else {
          showToast(response.data.message || "생성 실패", "error");
        }
      }
    } catch (err: any) {
      console.error("FAQ 저장 실패:", err);
      showToast("FAQ 저장 중 오류가 발생했습니다.", "error");
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (filterUserType !== "all") {
      if (filterUserType === "guest") {
        if (faq.user_type !== "guest" && faq.user_type !== "both") return false;
      } else if (filterUserType === "member") {
        if (faq.user_type !== "member" && faq.user_type !== "both") return false;
      } else {
        if (faq.user_type !== filterUserType) return false;
      }
    }
    if (filterCategory !== "전체" && faq.category !== filterCategory) return false;
    return true;
  });

  const getUserTypeBadge = (userType: string) => {
    if (darkMode) {
      switch (userType) {
        case "member": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
        case "guest": return "bg-green-500/20 text-green-400 border border-green-500/30";
        case "assistant": return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
        default: return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      }
    } else {
      switch (userType) {
        case "member": return "bg-blue-100 text-blue-700";
        case "guest": return "bg-green-100 text-green-700";
        case "assistant": return "bg-cyan-100 text-cyan-700";
        default: return "bg-purple-100 text-purple-700";
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
        <div className="text-center relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-base sm:text-lg font-medium ${theme.text}`}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
        <div className="text-center relative z-10">
          <i className={`ri-error-warning-line text-5xl sm:text-6xl ${darkMode ? 'text-red-400' : 'text-red-400'} mb-4`}></i>
          <p className={`text-base sm:text-lg font-medium ${theme.text} mb-4`}>{error}</p>
          <button
            onClick={fetchFaqs}
            className={`${theme.button.primary} px-6 py-3 rounded-xl font-medium transition-all`}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-blue-500/10" : "bg-blue-500/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-500/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-4 sm:py-6 lg:py-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Title Section */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${theme.iconBg} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20`}>
                <i className="ri-question-answer-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>FAQ 관리</h1>
                <p className={`text-sm sm:text-base ${theme.textMuted}`}>자주 묻는 질문 관리 시스템</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className={`${theme.button.secondary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
            >
              <i className="ri-arrow-left-line"></i>
              <span className="hidden sm:inline">대시보드로</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-file-list-line text-xl sm:text-2xl ${theme.accent}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 FAQ</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqs.length}</p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-user-line text-xl sm:text-2xl ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>회원용</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqs.filter((f) => f.user_type === "member").length}</p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-green-500/20' : 'bg-green-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-user-smile-line text-xl sm:text-2xl ${darkMode ? 'text-green-400' : 'text-green-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>비회원용</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqs.filter((f) => f.user_type === "guest").length}</p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-purple-500/20' : 'bg-purple-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-group-line text-xl sm:text-2xl ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>공통</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqs.filter((f) => f.user_type === "both").length}</p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 col-span-2 sm:col-span-1`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-cyan-500/20' : 'bg-cyan-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-dashboard-line text-xl sm:text-2xl ${darkMode ? 'text-cyan-400' : 'text-cyan-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>대시보드</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqs.filter((f) => f.user_type === "assistant").length}</p>
            </div>
          </div>

          {/* User Type Filter */}
          <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-3 sm:mb-4`}>
            <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>사용자 유형</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "전체" },
                { key: "member", label: "회원" },
                { key: "guest", label: "비회원" },
                { key: "both", label: "공통" },
                { key: "assistant", label: "챗봇 비서" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterUserType(key as any)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                    filterUserType === key ? theme.filterActive : theme.filterInactive
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-4 sm:mb-6`}>
            <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                    filterCategory === cat ? theme.filterActive : theme.filterInactive
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className={`${darkMode ? 'bg-white/[0.02]' : 'bg-white'} rounded-xl sm:rounded-2xl border-2 ${darkMode ? 'border-blue-500/30' : 'border-blue-200'} p-4 sm:p-6 lg:p-8`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className={`text-lg sm:text-2xl font-bold ${theme.text} flex items-center`}>
                <i className={`ri-list-check ${theme.accent} mr-2 sm:mr-3`}></i>
                FAQ 목록 ({filteredFaqs.length}개)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncPinecone}
                  disabled={isSyncing}
                  className={`${darkMode ? 'bg-purple-500/80 hover:bg-purple-500' : 'bg-purple-500 hover:bg-purple-600'} disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2`}
                >
                  {isSyncing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span className="hidden sm:inline">동기화 중...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-refresh-line"></i>
                      <span className="hidden sm:inline">Pinecone 동기화</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCreate}
                  className={`${theme.button.primary} px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm`}
                >
                  <i className="ri-add-line"></i>
                  <span className="hidden sm:inline">FAQ 추가</span>
                  <span className="sm:hidden">추가</span>
                </button>
              </div>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className={`text-center py-8 sm:py-12 ${darkMode ? 'bg-white/[0.02]' : 'bg-slate-50'} rounded-lg sm:rounded-xl`}>
                <i className={`ri-inbox-line text-5xl sm:text-6xl ${theme.textSubtle} mb-4`}></i>
                <p className={theme.textMuted}>FAQ가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className={`${theme.card} border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all ${theme.cardHover}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <span className={`inline-block ${darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700'} px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium`}>
                            {faq.category}
                          </span>
                          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getUserTypeBadge(faq.user_type)}`}>
                            {faq.user_type === "member" ? "회원" : faq.user_type === "guest" ? "비회원" : faq.user_type === "assistant" ? "대시보드" : "공통"}
                          </span>
                          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                            faq.answer_type === "function"
                              ? (darkMode ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-orange-100 text-orange-700")
                              : (darkMode ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-600")
                          }`}>
                            {faq.answer_type === "function" ? "함수" : "정적"}
                          </span>
                        </div>
                        <h3 className={`text-base sm:text-lg font-bold ${theme.text} mb-2`}>{faq.question}</h3>
                        <p className={`${theme.textMuted} whitespace-pre-wrap text-sm sm:text-base`}>{faq.answer}</p>
                        {faq.keywords && faq.keywords.length > 0 && (
                          <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                            {faq.keywords.map((kw, idx) => (
                              <span key={idx} className={`text-xs ${darkMode ? 'bg-white/[0.05] text-white/50' : 'bg-slate-100 text-slate-500'} px-2 py-0.5 rounded`}>
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 self-start">
                        <button
                          onClick={() => handleEdit(faq)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 ${darkMode ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} rounded-lg transition-all flex items-center justify-center`}
                          title="수정"
                        >
                          <i className="ri-edit-line text-base sm:text-lg"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 ${darkMode ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'} rounded-lg transition-all flex items-center justify-center`}
                          title="삭제"
                        >
                          <i className="ri-delete-bin-line text-base sm:text-lg"></i>
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm ${theme.textSubtle}`}>
                      마지막 수정: {(() => {
                        const dateStr = faq.updated_at.endsWith("Z") ? faq.updated_at : faq.updated_at + "Z";
                        return new Date(dateStr).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
                      })()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-black/70' : 'bg-black/50'} flex items-center justify-center z-50 p-3 sm:p-4`}>
          <div className={`${theme.modalBg} rounded-xl sm:rounded-2xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 sm:p-6 border-b ${theme.divider} sticky top-0 ${darkMode ? 'bg-[#12141D]' : 'bg-white'} rounded-t-xl sm:rounded-t-2xl`}>
              <h2 className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                {editingFaq ? "FAQ 수정" : "FAQ 추가"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {validationError && (
                <div className={`${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl flex items-center gap-2 text-sm`}>
                  <i className={`ri-error-warning-line ${darkMode ? 'text-red-400' : 'text-red-600'}`}></i>
                  <span className={darkMode ? 'text-red-400' : 'text-red-700'}>{validationError}</span>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>카테고리 *</label>
                <div className="space-y-2">
                  <select
                    value={isCategoryDirectInput ? "DIRECT_INPUT" : formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "DIRECT_INPUT") {
                        setIsCategoryDirectInput(true);
                        setFormData({ ...formData, category: "" });
                      } else {
                        setIsCategoryDirectInput(false);
                        setFormData({ ...formData, category: val });
                      }
                      setValidationError("");
                    }}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                  >
                    <option value="">선택하세요</option>
                    {categories.filter((c) => c !== "전체").map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="DIRECT_INPUT">+ 직접 입력</option>
                  </select>
                  {isCategoryDirectInput && (
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                      placeholder="새로운 카테고리 이름을 입력하세요"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>질문 *</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => { setFormData({ ...formData, question: e.target.value }); setValidationError(""); }}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                  placeholder="질문을 입력하세요"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>답변 *</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => { setFormData({ ...formData, answer: e.target.value }); setValidationError(""); }}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 h-28 sm:h-32 text-sm sm:text-base resize-none`}
                  placeholder="답변을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>사용자 유형 *</label>
                  <select
                    value={formData.user_type}
                    onChange={(e) => setFormData({ ...formData, user_type: e.target.value as any })}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                  >
                    <option value="both">공통</option>
                    <option value="member">회원</option>
                    <option value="guest">비회원</option>
                    <option value="assistant">대시보드</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>답변 유형 *</label>
                  <select
                    value={formData.answer_type}
                    onChange={(e) => setFormData({ ...formData, answer_type: e.target.value as any })}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                  >
                    <option value="static">정적 답변</option>
                    <option value="function">함수 호출</option>
                  </select>
                </div>
              </div>

              {formData.answer_type === "function" && (
                <div className={`space-y-3 sm:space-y-4 p-3 sm:p-4 ${darkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50'} rounded-lg sm:rounded-xl border`}>
                  <div>
                    <label className={`block text-sm font-medium ${theme.text} mb-2`}>함수 이름</label>
                    <input
                      type="text"
                      value={formData.function_name}
                      onChange={(e) => setFormData({ ...formData, function_name: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                      placeholder="예: get_mentoring_bookings"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.text} mb-2`}>함수 설명</label>
                    <textarea
                      value={formData.function_description}
                      onChange={(e) => setFormData({ ...formData, function_description: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 h-20 text-sm sm:text-base resize-none`}
                      placeholder="함수에 대한 설명"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-2`}>키워드</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.keywordInput}
                      onChange={(e) => setFormData({ ...formData, keywordInput: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const keyword = formData.keywordInput.trim();
                          if (keyword && !formData.keywords.includes(keyword)) {
                            setFormData({ ...formData, keywords: [...formData.keywords, keyword], keywordInput: "" });
                          }
                        }
                      }}
                      className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                      placeholder="키워드 입력 후 Enter"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const keyword = formData.keywordInput.trim();
                        if (keyword && !formData.keywords.includes(keyword)) {
                          setFormData({ ...formData, keywords: [...formData.keywords, keyword], keywordInput: "" });
                        }
                      }}
                      className={`${theme.button.primary} px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm`}
                    >
                      추가
                    </button>
                  </div>
                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.keywords.map((kw, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1 ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'} px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm`}>
                          #{kw}
                          <button type="button" onClick={() => setFormData({ ...formData, keywords: formData.keywords.filter((_, i) => i !== idx) })} className="hover:opacity-70">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>우선순위</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                    min="0"
                    max="10"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${theme.text}`}>활성화</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setValidationError(""); }}
                  className={`flex-1 ${theme.button.secondary} px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base`}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`flex-1 ${theme.button.primary} px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base`}
                >
                  {editingFaq ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}