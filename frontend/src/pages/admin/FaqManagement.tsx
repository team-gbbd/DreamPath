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
    keywordInput: "", // 키워드 입력용 임시 필드
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

  useEffect(() => {
    fetchFaqs();
  }, []);

  // 사용자 유형이 변경될 때마다 카테고리 다시 조회
  useEffect(() => {
    fetchCategories(filterUserType);
    setFilterCategory("전체"); // 카테고리 필터 초기화
  }, [filterUserType]);

  const fetchCategories = async (userType: string) => {
    try {
      // 사용자 유형에 맞는 카테고리만 조회
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
      const response = await axios.post(
        `${API_BASE_URL}/api/faq/sync-pinecone`
      );

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

    // Validation
    if (!formData.category) {
      setValidationError("카테고리를 선택해주세요.");
      return;
    }
    if (!formData.question.trim()) {
      setValidationError("질문을 입력해주세요.");
      return;
    }
    // 정적 답변일 때만 답변 필수
    if (formData.answer_type === "static" && !formData.answer.trim()) {
      setValidationError("답변을 입력해주세요.");
      return;
    }

    setValidationError("");

    try {
      if (editingFaq) {
        // 수정
        const response = await axios.put(
          `${API_BASE_URL}/api/faq/${editingFaq.id}`,
          formData
        );
        if (response.data.success) {
          showToast("FAQ가 수정되었습니다.", "success");
          setIsModalOpen(false);
          fetchFaqs();
        } else {
          showToast(response.data.message || "수정 실패", "error");
        }
      } else {
        // 생성
        const response = await axios.post(`${API_BASE_URL}/api/faq`, formData);
        if (response.data.success) {
          showToast("FAQ가 생성되었습니다.", "success");
          setIsModalOpen(false);
          fetchFaqs();
          fetchCategories(filterUserType); // 카테고리가 새로 생겼을 수 있으므로 갱신
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
    // User Type 필터
    if (filterUserType !== "all") {
      if (filterUserType === "guest") {
        // 비회원: guest + both
        if (faq.user_type !== "guest" && faq.user_type !== "both") {
          return false;
        }
      } else if (filterUserType === "member") {
        // 회원: member + both
        if (faq.user_type !== "member" && faq.user_type !== "both") {
          return false;
        }
      } else {
        // both, assistant 등: 정확히 일치
        if (faq.user_type !== filterUserType) {
          return false;
        }
      }
    }
    // Category 필터
    if (filterCategory !== "전체" && faq.category !== filterCategory) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchFaqs}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <ToastContainer />
      

      <div className="py-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center">
                <i className="ri-question-answer-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">FAQ 관리</h1>
                <p className="text-gray-600">자주 묻는 질문 관리 시스템</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <i className="ri-arrow-left-line"></i>
              대시보드로
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                  <i className="ri-file-list-line text-2xl text-pink-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">{faqs.length}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <i className="ri-user-line text-2xl text-blue-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">회원용 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">
                {faqs.filter((f) => f.user_type === "member").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <i className="ri-user-smile-line text-2xl text-green-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">비회원용 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">
                {faqs.filter((f) => f.user_type === "guest").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <i className="ri-group-line text-2xl text-purple-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">공통 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">
                {faqs.filter((f) => f.user_type === "both").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-cyan-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                  <i className="ri-dashboard-line text-2xl text-cyan-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">대시보드 FAQ</p>
              <p className="text-3xl font-bold text-gray-900">
                {faqs.filter((f) => f.user_type === "assistant").length}
              </p>
            </div>
          </div>

          {/* User Type Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100/50 p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              사용자 유형
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterUserType("all")}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterUserType === "all"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterUserType("member")}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterUserType === "member"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                회원
              </button>
              <button
                onClick={() => setFilterUserType("guest")}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterUserType === "guest"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                비회원
              </button>
              <button
                onClick={() => setFilterUserType("both")}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterUserType === "both"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                공통
              </button>
              <button
                onClick={() => setFilterUserType("assistant")}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterUserType === "assistant"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                챗봇 비서
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              카테고리
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterCategory === cat
                      ? "bg-pink-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className="bg-white rounded-xl shadow-md border-2 border-pink-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <i className="ri-list-check text-pink-500 mr-3"></i>
                FAQ 목록 ({filteredFaqs.length}개)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncPinecone}
                  disabled={isSyncing}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                  title="Pinecone 동기화"
                >
                  {isSyncing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>동기화 중...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-refresh-line"></i>
                      <span>Pinecone 동기화</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCreate}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  <i className="ri-add-line"></i>
                  FAQ 추가
                </button>
              </div>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">FAQ가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-pink-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="inline-block bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                            {faq.category}
                          </span>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              faq.user_type === "member"
                                ? "bg-blue-100 text-blue-700"
                                : faq.user_type === "guest"
                                ? "bg-green-100 text-green-700"
                                : faq.user_type === "assistant"
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {faq.user_type === "member"
                              ? "회원"
                              : faq.user_type === "guest"
                              ? "비회원"
                              : faq.user_type === "assistant"
                              ? "대시보드"
                              : "공통"}
                          </span>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              faq.answer_type === "function"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {faq.answer_type === "function" ? "함수" : "정적"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                        {faq.keywords && faq.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {faq.keywords.map((kw, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(faq)}
                          className="w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all flex items-center justify-center"
                          title="수정"
                        >
                          <i className="ri-edit-line text-lg"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all flex items-center justify-center"
                          title="삭제"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      마지막 수정:{" "}
                      {(() => {
                        // 시간대 정보가 없으면 'Z' 붙여서 UTC로 처리
                        const dateStr = faq.updated_at.endsWith("Z")
                          ? faq.updated_at
                          : faq.updated_at + "Z";
                        const date = new Date(dateStr);
                        return date.toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        });
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingFaq ? "FAQ 수정" : "FAQ 추가"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                  <i className="ri-error-warning-line text-lg"></i>
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 *
                </label>
                <div className="space-y-2">
                  <select
                    value={
                      isCategoryDirectInput ? "DIRECT_INPUT" : formData.category
                    }
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">선택하세요</option>
                    {categories
                      .filter((c) => c !== "전체")
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    <option value="DIRECT_INPUT">+ 직접 입력</option>
                  </select>

                  {isCategoryDirectInput && (
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-gray-50"
                      placeholder="새로운 카테고리 이름을 입력하세요"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  질문 *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => {
                    setFormData({ ...formData, question: e.target.value });
                    setValidationError("");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="질문을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  답변 *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => {
                    setFormData({ ...formData, answer: e.target.value });
                    setValidationError("");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 h-32"
                  placeholder="답변을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사용자 유형 *
                  </label>
                  <select
                    value={formData.user_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        user_type: e.target.value as
                          | "guest"
                          | "member"
                          | "both"
                          | "assistant",
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="both">공통</option>
                    <option value="member">회원</option>
                    <option value="guest">비회원</option>
                    <option value="assistant">대시보드</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    답변 유형 *
                  </label>
                  <select
                    value={formData.answer_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        answer_type: e.target.value as "static" | "function",
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="static">정적 답변</option>
                    <option value="function">함수 호출</option>
                  </select>
                </div>
              </div>

              {formData.answer_type === "function" && (
                <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      함수 이름
                    </label>
                    <input
                      type="text"
                      value={formData.function_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          function_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="예: get_mentoring_bookings"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      함수 설명
                    </label>
                    <textarea
                      value={formData.function_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          function_description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 h-20"
                      placeholder="함수에 대한 설명"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  키워드
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.keywordInput}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          keywordInput: e.target.value,
                        })
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const keyword = formData.keywordInput.trim();
                          if (keyword && !formData.keywords.includes(keyword)) {
                            setFormData({
                              ...formData,
                              keywords: [...formData.keywords, keyword],
                              keywordInput: "",
                            });
                          }
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="키워드 입력 후 Enter"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const keyword = formData.keywordInput.trim();
                        if (keyword && !formData.keywords.includes(keyword)) {
                          setFormData({
                            ...formData,
                            keywords: [...formData.keywords, keyword],
                            keywordInput: "",
                          });
                        }
                      }}
                      className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
                    >
                      추가
                    </button>
                  </div>
                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                        >
                          #{kw}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                keywords: formData.keywords.filter(
                                  (_, i) => i !== idx
                                ),
                              });
                            }}
                            className="hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    우선순위
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    min="0"
                    max="10"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-pink-500 rounded focus:ring-2 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      활성화
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setValidationError("");
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
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
