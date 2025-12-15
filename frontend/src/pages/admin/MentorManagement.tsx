import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/common/Toast";
import { mentorService, userService } from "@/lib/api";

interface User {
  userId: number;
  name: string;
  email: string;
}

interface Mentor {
  mentorId: number;
  userId: number;
  bio: string;
  career: string;
  availableTime: Record<string, string[]> | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: number | null;
  reviewReason: string | null;
}

type SortField = "mentorId" | "userId" | "bio" | "career" | "availableSlots" | "status" | "createdAt";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const FIELD_LABELS: Record<SortField, string> = {
  mentorId: "멘토ID",
  userId: "사용자ID",
  bio: "자기소개",
  career: "경력",
  availableSlots: "가능시간",
  status: "상태",
  createdAt: "신청일",
};

const DAY_LABELS: Record<string, string> = {
  monday: "월",
  tuesday: "화",
  wednesday: "수",
  thursday: "목",
  friday: "금",
  saturday: "토",
  sunday: "일",
};

export default function MentorManagementPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<Set<"PENDING" | "APPROVED" | "REJECTED">>(new Set());
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ field: "mentorId", order: "desc" }]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [usersMap, setUsersMap] = useState<Map<number, User>>(new Map());
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체 (시안색 기반)
  const theme = {
    bg: darkMode
      ? "bg-[#0a0a0f]"
      : "bg-gradient-to-br from-teal-50/30 via-cyan-50/20 to-blue-50/30",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-white/60" : "text-gray-600",
    textSubtle: darkMode ? "text-white/40" : "text-gray-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-gray-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-teal-500/30"
      : "hover:shadow-md hover:border-teal-200",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/40 focus:border-teal-400 focus:ring-teal-400/20"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-teal-100",
    sectionBg: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white/70 backdrop-blur-sm border-teal-100/50 shadow-sm",
    modalBg: darkMode
      ? "bg-[#12141D] border-white/[0.1]"
      : "bg-white border-gray-200 shadow-xl",
    button: {
      primary: "bg-teal-500 text-white hover:bg-teal-600",
      secondary: darkMode
        ? "bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.1]"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
      success: "bg-green-500 text-white hover:bg-green-600",
      danger: "bg-red-500 text-white hover:bg-red-600",
    },
    divider: darkMode ? "border-white/[0.06]" : "border-gray-200",
    accent: darkMode ? "text-teal-400" : "text-teal-500",
    iconBg: darkMode ? "bg-teal-500" : "bg-teal-400",
    tableBg: darkMode ? "bg-white/[0.02]" : "bg-white",
    tableHeader: darkMode ? "bg-white/[0.03]" : "bg-gray-50",
    tableRow: darkMode ? "hover:bg-white/[0.03]" : "hover:bg-gray-50",
    tableRowBorder: darkMode ? "border-white/[0.06]" : "border-gray-200",
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
    fetchMentors();
  }, []);

  useEffect(() => {
    filterAndSortMentors();
  }, [mentors, searchQuery, filterStatuses, sortConfigs]);

  const fetchMentors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [mentorData, userData] = await Promise.all([
        mentorService.getAllApplications(),
        userService.getAllUsers()
      ]);

      const userMap = new Map<number, User>();
      userData.forEach((user: User) => {
        userMap.set(user.userId, user);
      });
      setUsersMap(userMap);
      setMentors(mentorData);
    } catch (err: any) {
      console.error("멘토 목록 로딩 실패:", err);
      setError("멘토 데이터를 불러오는 중 오류가 발생했습니다.");
      showToast("멘토 데이터를 불러오는데 실패했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: number) => {
    const user = usersMap.get(userId);
    return user?.name || `사용자 ${userId}`;
  };

  const getTotalAvailableSlots = (availableTime: Record<string, string[]> | null) => {
    if (!availableTime) return 0;
    return Object.values(availableTime).reduce((sum, times) => sum + times.length, 0);
  };

  const filterAndSortMentors = () => {
    let result = [...mentors];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (mentor) =>
          mentor.bio?.toLowerCase().includes(query) ||
          mentor.career?.toLowerCase().includes(query) ||
          mentor.mentorId.toString().includes(query) ||
          mentor.userId.toString().includes(query) ||
          getUserName(mentor.userId).toLowerCase().includes(query)
      );
    }

    if (filterStatuses.size > 0) {
      result = result.filter((mentor) => filterStatuses.has(mentor.status));
    }

    result.sort((a, b) => {
      for (const config of sortConfigs) {
        let aValue: any;
        let bValue: any;

        if (config.field === "availableSlots") {
          aValue = getTotalAvailableSlots(a.availableTime);
          bValue = getTotalAvailableSlots(b.availableTime);
        } else {
          aValue = a[config.field as keyof Mentor];
          bValue = b[config.field as keyof Mentor];
        }

        if (aValue === null || aValue === undefined) aValue = "";
        if (bValue === null || bValue === undefined) bValue = "";

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }

        if (aValue < bValue) return config.order === "asc" ? -1 : 1;
        if (aValue > bValue) return config.order === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredMentors(result);
  };

  const toggleStatusFilter = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    const newSet = new Set(filterStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setFilterStatuses(newSet);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatuses(new Set());
    setSortConfigs([{ field: "mentorId", order: "desc" }]);
  };

  const handleSort = (field: SortField, e: React.MouseEvent) => {
    const isMultiSort = e.ctrlKey || e.metaKey;

    const existingIndex = sortConfigs.findIndex(c => c.field === field);

    if (isMultiSort) {
      if (existingIndex >= 0) {
        const existing = sortConfigs[existingIndex];
        if (existing.order === "asc") {
          const newConfigs = [...sortConfigs];
          newConfigs[existingIndex] = { ...existing, order: "desc" };
          setSortConfigs(newConfigs);
        } else {
          const newConfigs = sortConfigs.filter((_, i) => i !== existingIndex);
          if (newConfigs.length === 0) {
            setSortConfigs([{ field: "mentorId", order: "desc" }]);
          } else {
            setSortConfigs(newConfigs);
          }
        }
      } else {
        setSortConfigs([...sortConfigs, { field, order: "asc" }]);
      }
    } else {
      if (existingIndex >= 0 && sortConfigs.length === 1) {
        const existing = sortConfigs[0];
        setSortConfigs([{ field, order: existing.order === "asc" ? "desc" : "asc" }]);
      } else {
        setSortConfigs([{ field, order: "asc" }]);
      }
    }
  };

  const getSortInfo = (field: SortField) => {
    const index = sortConfigs.findIndex(c => c.field === field);
    if (index < 0) return null;
    return { index: index + 1, order: sortConfigs[index].order };
  };

  const getSortIcon = (field: SortField) => {
    const info = getSortInfo(field);
    if (!info) return `ri-arrow-up-down-line ${darkMode ? 'text-white/20' : 'text-gray-300'}`;
    return info.order === "asc" ? "ri-arrow-up-line text-teal-500" : "ri-arrow-down-line text-teal-500";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const getStatusLabel = (status: string) => {
    if (darkMode) {
      switch (status) {
        case "PENDING":
          return { text: "심사중", className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" };
        case "APPROVED":
          return { text: "승인됨", className: "bg-green-500/20 text-green-400 border border-green-500/30" };
        case "REJECTED":
          return { text: "거절됨", className: "bg-red-500/20 text-red-400 border border-red-500/30" };
        default:
          return { text: status, className: "bg-white/10 text-white/60" };
      }
    } else {
      switch (status) {
        case "PENDING":
          return { text: "심사중", className: "bg-yellow-100 text-yellow-700" };
        case "APPROVED":
          return { text: "승인됨", className: "bg-green-100 text-green-700" };
        case "REJECTED":
          return { text: "거절됨", className: "bg-red-100 text-red-700" };
        default:
          return { text: status, className: "bg-gray-100 text-gray-700" };
      }
    }
  };

  const handleViewDetail = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setIsDetailModalOpen(true);
  };

  const hasActiveFilters = searchQuery.trim() || filterStatuses.size > 0;
  const hasMultipleSorts = sortConfigs.length > 1;

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
        <div className="text-center relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            onClick={fetchMentors}
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

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(20,184,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-4 sm:py-6 lg:py-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Title Section */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${theme.iconBg} rounded-xl sm:rounded-2xl flex items-center justify-center`}>
                <i className="ri-user-star-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>멘토 관리</h1>
                <p className={`text-sm sm:text-base ${theme.textMuted}`}>멘토 신청 및 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin")}
                className={`${theme.button.secondary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
              >
                <i className="ri-arrow-left-line"></i>
                <span className="hidden sm:inline">대시보드로</span>
              </button>
              <button
                onClick={() => navigate("/admin/mentor-applications?status=PENDING")}
                className={`${theme.button.primary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
              >
                <i className="ri-file-list-3-line"></i>
                <span className="hidden sm:inline">멘토 심사</span>
                {mentors.filter(m => m.status === "PENDING").length > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs sm:text-sm">
                    {mentors.filter(m => m.status === "PENDING").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-teal-500/20' : 'bg-teal-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-team-line text-xl sm:text-2xl ${theme.accent}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 멘토</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{mentors.length}</p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-yellow-500/20' : 'bg-yellow-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-time-line text-xl sm:text-2xl ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>심사중</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {mentors.filter((m) => m.status === "PENDING").length}
              </p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-green-500/20' : 'bg-green-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-check-line text-xl sm:text-2xl ${darkMode ? 'text-green-400' : 'text-green-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>승인됨</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {mentors.filter((m) => m.status === "APPROVED").length}
              </p>
            </div>
            <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${darkMode ? 'bg-red-500/20' : 'bg-red-50'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <i className={`ri-close-line text-xl sm:text-2xl ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>거절됨</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {mentors.filter((m) => m.status === "REJECTED").length}
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-4 sm:mb-6`}>
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <i className={`ri-search-line absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 ${theme.textMuted}`}></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름, 자기소개, 경력, 멘토ID로 검색..."
                    className={`w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 ${theme.input} border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 text-sm sm:text-base`}
                  />
                </div>
                {(hasActiveFilters || hasMultipleSorts) && (
                  <button
                    onClick={clearAllFilters}
                    className={`${theme.button.primary} px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base`}
                  >
                    <i className="ri-refresh-line"></i>
                    <span className="hidden sm:inline">초기화</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                <span className={`text-xs sm:text-sm font-medium ${theme.textMuted}`}>상태:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleStatusFilter("PENDING")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterStatuses.has("PENDING")
                        ? "bg-yellow-500 text-white"
                        : theme.button.secondary
                    }`}
                  >
                    심사중
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("APPROVED")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterStatuses.has("APPROVED")
                        ? "bg-green-500 text-white"
                        : theme.button.secondary
                    }`}
                  >
                    승인됨
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("REJECTED")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterStatuses.has("REJECTED")
                        ? "bg-red-500 text-white"
                        : theme.button.secondary
                    }`}
                  >
                    거절됨
                  </button>
                </div>
              </div>

              {/* Sort Info */}
              {sortConfigs.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-xs sm:text-sm font-medium ${theme.textMuted}`}>정렬:</span>
                  {sortConfigs.map((config, idx) => (
                    <span
                      key={config.field}
                      className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 ${darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'} rounded-full text-xs sm:text-sm`}
                    >
                      <span className="font-medium">{idx + 1}.</span>
                      {FIELD_LABELS[config.field]}
                      <i className={config.order === "asc" ? "ri-arrow-up-line" : "ri-arrow-down-line"}></i>
                    </span>
                  ))}
                  <span className={`text-xs ${theme.textSubtle} ml-2 hidden sm:inline`}>
                    (Ctrl+클릭으로 다중 정렬)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mentor List */}
          <div className={`${theme.tableBg} rounded-xl sm:rounded-2xl border-2 ${darkMode ? 'border-teal-500/30' : 'border-teal-200'} overflow-hidden`}>
            <div className={`p-4 sm:p-6 border-b ${theme.divider}`}>
              <h2 className={`text-lg sm:text-2xl font-bold ${theme.text} flex items-center`}>
                <i className={`ri-list-check ${theme.accent} mr-2 sm:mr-3`}></i>
                멘토 목록 ({filteredMentors.length}명)
              </h2>
            </div>

            {filteredMentors.length === 0 ? (
              <div className={`text-center py-8 sm:py-12 ${darkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                <i className={`ri-user-search-line text-5xl sm:text-6xl ${theme.textSubtle} mb-4`}></i>
                <p className={theme.textMuted}>멘토가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme.tableHeader}>
                    <tr>
                      {[
                        { field: "mentorId" as SortField, label: "멘토ID" },
                        { field: "userId" as SortField, label: "신청자" },
                        { field: "bio" as SortField, label: "자기소개" },
                        { field: "career" as SortField, label: "경력" },
                        { field: "availableSlots" as SortField, label: "가능시간" },
                        { field: "status" as SortField, label: "상태" },
                        { field: "createdAt" as SortField, label: "신청일" },
                      ].map(({ field, label }) => (
                        <th
                          key={field}
                          className={`px-3 sm:px-4 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ${theme.text} cursor-pointer ${darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-100'} whitespace-nowrap transition-colors`}
                          onClick={(e) => handleSort(field, e)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="hidden sm:inline">{label}</span>
                            <span className="sm:hidden">{label.slice(0, 3)}</span>
                            {getSortInfo(field) && (
                              <span className="text-xs text-teal-500 font-bold">{getSortInfo(field)?.index}</span>
                            )}
                            <i className={getSortIcon(field)}></i>
                          </div>
                        </th>
                      ))}
                      <th className={`px-3 sm:px-4 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold ${theme.text} whitespace-nowrap`}>
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.tableRowBorder}`}>
                    {filteredMentors.map((mentor) => {
                      const statusLabel = getStatusLabel(mentor.status);
                      return (
                        <tr key={mentor.mentorId} className={`${theme.tableRow} transition-colors`}>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.text} font-medium whitespace-nowrap`}>
                            #{mentor.mentorId}
                          </td>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.text} font-medium whitespace-nowrap`}>
                            {getUserName(mentor.userId)}
                          </td>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.text} max-w-[100px] sm:max-w-[200px] truncate`} title={mentor.bio}>
                            {mentor.bio || "-"}
                          </td>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.textMuted} max-w-[100px] sm:max-w-[200px] truncate`} title={mentor.career}>
                            {mentor.career || "-"}
                          </td>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.textMuted} whitespace-nowrap`}>
                            {getTotalAvailableSlots(mentor.availableTime)}개
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium ${statusLabel.className}`}>
                              {statusLabel.text}
                            </span>
                          </td>
                          <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm ${theme.textMuted} whitespace-nowrap`}>
                            {formatDate(mentor.createdAt)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewDetail(mentor)}
                              className={`${darkMode ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400' : 'bg-teal-50 hover:bg-teal-100 text-teal-600'} px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all`}
                            >
                              상세
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedMentor && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-black/70' : 'bg-black/50'} flex items-center justify-center z-50 p-3 sm:p-4`}>
          <div className={`${theme.modalBg} rounded-xl sm:rounded-2xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 sm:p-6 border-b ${theme.divider} flex justify-between items-center sticky top-0 ${darkMode ? 'bg-[#12141D]' : 'bg-white'} rounded-t-xl sm:rounded-t-2xl`}>
              <h2 className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                멘토 상세 정보 #{selectedMentor.mentorId}
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className={`w-8 h-8 sm:w-10 sm:h-10 ${theme.button.secondary} rounded-lg flex items-center justify-center transition-all`}
              >
                <i className={`ri-close-line text-lg sm:text-xl ${theme.textMuted}`}></i>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Status */}
              <div>
                <h3 className={`text-xs sm:text-sm font-medium ${theme.textMuted} mb-2`}>상태</h3>
                <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusLabel(selectedMentor.status).className}`}>
                  {getStatusLabel(selectedMentor.status).text}
                </span>
              </div>

              {/* Bio */}
              <div>
                <h3 className={`text-xs sm:text-sm font-medium ${theme.textMuted} mb-2`}>자기소개</h3>
                <p className={`${theme.text} ${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'} p-3 sm:p-4 rounded-xl whitespace-pre-wrap text-sm sm:text-base`}>
                  {selectedMentor.bio || "-"}
                </p>
              </div>

              {/* Career */}
              <div>
                <h3 className={`text-xs sm:text-sm font-medium ${theme.textMuted} mb-2`}>경력</h3>
                <p className={`${theme.text} ${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'} p-3 sm:p-4 rounded-xl whitespace-pre-wrap text-sm sm:text-base`}>
                  {selectedMentor.career || "-"}
                </p>
              </div>

              {/* Available Time */}
              <div>
                <h3 className={`text-xs sm:text-sm font-medium ${theme.textMuted} mb-2`}>가능 시간</h3>
                {selectedMentor.availableTime && Object.keys(selectedMentor.availableTime).length > 0 ? (
                  <div className={`${darkMode ? 'bg-white/[0.03]' : 'bg-gray-50'} p-3 sm:p-4 rounded-xl`}>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedMentor.availableTime).map(([day, times]) => (
                        <div key={day} className={`${darkMode ? 'bg-white/[0.05] border-white/[0.1]' : 'bg-white border-gray-200'} border rounded-lg p-2 sm:p-3`}>
                          <p className={`font-medium ${theme.text} mb-1 text-sm`}>{DAY_LABELS[day] || day}</p>
                          <div className="flex flex-wrap gap-1">
                            {times.map((time, idx) => (
                              <span
                                key={idx}
                                className={`${darkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'} px-2 py-0.5 rounded text-xs`}
                              >
                                {time}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={theme.textMuted}>등록된 시간이 없습니다.</p>
                )}
              </div>

              {/* Review Info */}
              {selectedMentor.reviewedAt && (
                <div className={`${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50'} p-3 sm:p-4 rounded-xl border`}>
                  <h3 className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'} mb-2`}>심사 정보</h3>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    심사일: {formatDate(selectedMentor.reviewedAt)}
                  </p>
                  {selectedMentor.reviewReason && (
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} mt-1`}>
                      사유: {selectedMentor.reviewReason}
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className={theme.textMuted}>신청일:</span>{" "}
                  <span className={theme.text}>{formatDate(selectedMentor.createdAt)}</span>
                </div>
                <div>
                  <span className={theme.textMuted}>수정일:</span>{" "}
                  <span className={theme.text}>{formatDate(selectedMentor.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className={`p-4 sm:p-6 border-t ${theme.divider} flex justify-center`}>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className={`${theme.button.secondary} px-8 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base`}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}