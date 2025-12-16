import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/common/Toast";
import { userService } from "@/lib/api";

interface User {
  userId: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  birth: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  remainingSessions: number;
  createdAt: string;
  updatedAt: string;
}

type SortField = "userId" | "username" | "name" | "email" | "phone" | "role" | "isActive" | "remainingSessions" | "createdAt";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const FIELD_LABELS: Record<SortField, string> = {
  userId: "ID",
  username: "아이디",
  name: "이름",
  email: "이메일",
  phone: "전화번호",
  role: "역할",
  isActive: "상태",
  remainingSessions: "멘토링",
  createdAt: "가입일",
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoles, setFilterRoles] = useState<Set<"USER" | "ADMIN">>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<"active" | "inactive">>(new Set());
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ field: "userId", order: "asc" }]);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체 (purple 기반)
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-white/[0.15]"
      : "hover:shadow-md hover:border-slate-300",
    statCard: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-sm",
    sectionBg: darkMode
      ? "bg-white/[0.03]"
      : "bg-gradient-to-br from-slate-50 to-slate-100",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-purple-500/50"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500",
    tableHeader: darkMode
      ? "bg-white/[0.03]"
      : "bg-slate-50",
    tableRow: darkMode
      ? "hover:bg-white/[0.03]"
      : "hover:bg-slate-50",
    tableBorder: darkMode
      ? "border-white/[0.06]"
      : "border-slate-200",
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
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, filterRoles, filterStatuses, sortConfigs]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      console.error("사용자 목록 로딩 실패:", err);
      setError("사용자 데이터를 불러오는 중 오류가 발생했습니다.");
      showToast("사용자 데이터를 불러오는데 실패했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let result = [...users];

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.includes(query)
      );
    }

    // 역할 필터 (다중 선택)
    if (filterRoles.size > 0) {
      result = result.filter((user) => filterRoles.has(user.role));
    }

    // 상태 필터 (다중 선택)
    if (filterStatuses.size > 0) {
      result = result.filter((user) => {
        if (filterStatuses.has("active") && user.isActive) return true;
        if (filterStatuses.has("inactive") && !user.isActive) return true;
        return false;
      });
    }

    // 다중 정렬
    result.sort((a, b) => {
      for (const config of sortConfigs) {
        let aValue: any = a[config.field];
        let bValue: any = b[config.field];

        if (aValue === null || aValue === undefined) aValue = "";
        if (bValue === null || bValue === undefined) bValue = "";

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return config.order === "asc" ? -1 : 1;
        if (aValue > bValue) return config.order === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredUsers(result);
  };

  const toggleRoleFilter = (role: "USER" | "ADMIN") => {
    const newSet = new Set(filterRoles);
    if (newSet.has(role)) {
      newSet.delete(role);
    } else {
      newSet.add(role);
    }
    setFilterRoles(newSet);
  };

  const toggleStatusFilter = (status: "active" | "inactive") => {
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
    setFilterRoles(new Set());
    setFilterStatuses(new Set());
    setSortConfigs([{ field: "userId", order: "asc" }]);
  };

  // 다중 정렬: Ctrl/Cmd 클릭으로 추가, 일반 클릭으로 단일 정렬
  const handleSort = (field: SortField, e: React.MouseEvent) => {
    const isMultiSort = e.ctrlKey || e.metaKey;

    const existingIndex = sortConfigs.findIndex(c => c.field === field);

    if (isMultiSort) {
      // 다중 정렬 모드
      if (existingIndex >= 0) {
        // 이미 있으면 순서 토글 또는 제거
        const existing = sortConfigs[existingIndex];
        if (existing.order === "asc") {
          // asc -> desc
          const newConfigs = [...sortConfigs];
          newConfigs[existingIndex] = { ...existing, order: "desc" };
          setSortConfigs(newConfigs);
        } else {
          // desc -> 제거
          const newConfigs = sortConfigs.filter((_, i) => i !== existingIndex);
          if (newConfigs.length === 0) {
            setSortConfigs([{ field: "userId", order: "asc" }]);
          } else {
            setSortConfigs(newConfigs);
          }
        }
      } else {
        // 없으면 추가
        setSortConfigs([...sortConfigs, { field, order: "asc" }]);
      }
    } else {
      // 단일 정렬 모드
      if (existingIndex >= 0 && sortConfigs.length === 1) {
        // 같은 필드 클릭: 순서 토글
        const existing = sortConfigs[0];
        setSortConfigs([{ field, order: existing.order === "asc" ? "desc" : "asc" }]);
      } else {
        // 다른 필드 클릭: 새로 설정
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
    return info.order === "asc"
      ? `ri-arrow-up-line ${darkMode ? 'text-purple-400' : 'text-purple-500'}`
      : `ri-arrow-down-line ${darkMode ? 'text-purple-400' : 'text-purple-500'}`;
  };

  const handleRoleChange = async (userId: number, newRole: "USER" | "ADMIN") => {
    const user = users.find(u => u.userId === userId);
    if (user?.role === newRole) return;

    if (!confirm(`이 사용자의 역할을 ${newRole === "ADMIN" ? "관리자" : "일반"}(으)로 변경하시겠습니까?`)) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      await userService.updateUserRole(userId, newRole);
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      showToast("역할이 변경되었습니다.", "success");
    } catch (err: any) {
      console.error("역할 변경 실패:", err);
      showToast("역할 변경에 실패했습니다.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusChangeFromSelect = async (userId: number, value: string) => {
    const newStatus = value === "active";
    const user = users.find(u => u.userId === userId);
    if (user?.isActive === newStatus) return;

    if (!confirm(`이 사용자를 ${newStatus ? "활성화" : "비활성화"} 하시겠습니까?`)) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      await userService.updateUserStatus(userId, newStatus);
      setUsers(users.map(u => u.userId === userId ? { ...u, isActive: newStatus } : u));
      showToast(`사용자가 ${newStatus ? "활성화" : "비활성화"} 되었습니다.`, "success");
    } catch (err: any) {
      console.error("상태 변경 실패:", err);
      showToast("상태 변경에 실패했습니다.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const hasActiveFilters = searchQuery.trim() || filterRoles.size > 0 || filterStatuses.size > 0;
  const hasMultipleSorts = sortConfigs.length > 1;

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-pink-500/10" : "bg-pink-500/20"}`} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className={`text-base sm:text-lg font-medium ${theme.text}`}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-pink-500/10" : "bg-pink-500/20"}`} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <i className={`ri-error-warning-line text-5xl sm:text-6xl mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
            <p className={`text-base sm:text-lg font-medium mb-4 ${theme.text}`}>{error}</p>
            <button
              onClick={fetchUsers}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-pink-500/10" : "bg-pink-500/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(147,51,234,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-6 sm:py-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <i className="ri-user-settings-line text-white text-xl sm:text-2xl"></i>
                </div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>사용자 관리</h1>
                  <p className={`text-sm sm:text-base ${theme.textMuted}`}>등록된 사용자 관리</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/admin")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base ${
                  darkMode
                    ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                <i className="ri-arrow-left-line"></i>
                <span className="hidden sm:inline">대시보드로 돌아가기</span>
                <span className="sm:hidden">대시보드</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {/* 전체 사용자 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                  <i className={`ri-group-line text-xl sm:text-2xl ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 사용자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{users.length}</p>
            </div>

            {/* 일반 사용자 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <i className={`ri-user-line text-xl sm:text-2xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>일반 사용자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {users.filter((u) => u.role === "USER").length}
              </p>
            </div>

            {/* 관리자 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <i className={`ri-admin-line text-xl sm:text-2xl ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>관리자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {users.filter((u) => u.role === "ADMIN").length}
              </p>
            </div>

            {/* 활성 사용자 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                  <i className={`ri-user-follow-line text-xl sm:text-2xl ${darkMode ? 'text-green-400' : 'text-green-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>활성 사용자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {users.filter((u) => u.isActive).length}
              </p>
            </div>

            {/* 비활성 사용자 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all col-span-2 sm:col-span-1 ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-gray-500/20' : 'bg-gray-100'}`}>
                  <i className={`ri-user-unfollow-line text-xl sm:text-2xl ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>비활성 사용자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>
                {users.filter((u) => !u.isActive).length}
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-4 sm:mb-6 ${theme.statCard}`}>
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <i className={`ri-search-line absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 ${theme.textMuted}`}></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름, 아이디, 이메일, 전화번호로 검색..."
                    className={`w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base ${theme.input}`}
                  />
                </div>
                {(hasActiveFilters || hasMultipleSorts) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm sm:text-base"
                  >
                    <i className="ri-refresh-line"></i>
                    초기화
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                <span className={`text-xs sm:text-sm font-medium ${theme.textMuted}`}>역할:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRoleFilter("USER")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterRoles.has("USER")
                        ? "bg-blue-500 text-white"
                        : darkMode
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    일반
                  </button>
                  <button
                    onClick={() => toggleRoleFilter("ADMIN")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterRoles.has("ADMIN")
                        ? "bg-red-500 text-white"
                        : darkMode
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    관리자
                  </button>
                </div>

                <div className={`hidden sm:block w-px h-6 ${darkMode ? 'bg-white/[0.1]' : 'bg-gray-300'} mx-2`}></div>

                <span className={`text-xs sm:text-sm font-medium ${theme.textMuted}`}>상태:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatusFilter("active")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterStatuses.has("active")
                        ? "bg-green-500 text-white"
                        : darkMode
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    활성
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("inactive")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      filterStatuses.has("inactive")
                        ? "bg-gray-500 text-white"
                        : darkMode
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    비활성
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
                      className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                        darkMode
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-purple-100 text-purple-700'
                      }`}
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

          {/* User List */}
          <div className={`rounded-xl sm:rounded-2xl border-2 overflow-hidden ${darkMode ? 'bg-white/[0.02] border-purple-500/30' : 'bg-white border-purple-200 shadow-md'}`}>
            <div className={`p-4 sm:p-6 border-b ${theme.tableBorder}`}>
              <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold flex items-center ${theme.text}`}>
                <i className={`ri-list-check mr-2 sm:mr-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                사용자 목록 ({filteredUsers.length}명)
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={`text-center py-10 sm:py-12 ${theme.sectionBg}`}>
                <i className={`ri-user-search-line text-5xl sm:text-6xl mb-4 ${darkMode ? 'text-white/20' : 'text-slate-300'}`}></i>
                <p className={theme.textMuted}>사용자가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme.tableHeader}>
                    <tr>
                      {(["userId", "username", "name", "email", "phone", "role", "isActive", "remainingSessions", "createdAt"] as SortField[]).map((field) => (
                        <th
                          key={field}
                          className={`px-3 sm:px-4 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap ${theme.text} ${
                            darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-100'
                          }`}
                          onClick={(e) => handleSort(field, e)}
                        >
                          <div className="flex items-center gap-1">
                            {FIELD_LABELS[field]}
                            {getSortInfo(field) && (
                              <span className={`text-xs font-bold ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}>
                                {getSortInfo(field)?.index}
                              </span>
                            )}
                            <i className={getSortIcon(field)}></i>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.tableBorder}`}>
                    {filteredUsers.map((user) => (
                      <tr key={user.userId} className={`transition-colors ${theme.tableRow}`}>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.text}`}>{user.userId}</td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${theme.text}`}>{user.username}</td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.text}`}>{user.name}</td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.textMuted}`}>{user.email || "-"}</td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.textMuted}`}>{user.phone || "-"}</td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.userId, e.target.value as "USER" | "ADMIN")}
                            disabled={updatingUserId === user.userId}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 ${
                              user.role === "ADMIN"
                                ? darkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700"
                                : darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                            } ${updatingUserId === user.userId ? "opacity-50" : ""}`}
                          >
                            <option value="USER">일반</option>
                            <option value="ADMIN">관리자</option>
                          </select>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          <select
                            value={user.isActive ? "active" : "inactive"}
                            onChange={(e) => handleStatusChangeFromSelect(user.userId, e.target.value)}
                            disabled={updatingUserId === user.userId}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 ${
                              user.isActive
                                ? darkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                                : darkMode ? "bg-gray-500/20 text-gray-300" : "bg-gray-200 text-gray-700"
                            } ${updatingUserId === user.userId ? "opacity-50" : ""}`}
                          >
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                          </select>
                        </td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.textMuted}`}>
                          {user.remainingSessions}회
                        </td>
                        <td className={`px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap ${theme.textMuted}`}>
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}