import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/feature/Header";
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
    if (!info) return "ri-arrow-up-down-line text-gray-300";
    return info.order === "asc" ? "ri-arrow-up-line text-purple-500" : "ri-arrow-down-line text-purple-500";
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-blue-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-purple-400 rounded-full flex items-center justify-center">
                <i className="ri-user-settings-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
                <p className="text-gray-600">등록된 사용자 관리</p>
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
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <i className="ri-group-line text-2xl text-purple-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 사용자</p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <i className="ri-user-line text-2xl text-blue-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">일반 사용자</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.role === "USER").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-red-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <i className="ri-admin-line text-2xl text-red-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">관리자</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.role === "ADMIN").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <i className="ri-user-follow-line text-2xl text-green-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">활성 사용자</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => u.isActive).length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <i className="ri-user-unfollow-line text-2xl text-gray-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">비활성 사용자</p>
              <p className="text-3xl font-bold text-gray-900">
                {users.filter((u) => !u.isActive).length}
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 mb-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름, 아이디, 이메일, 전화번호로 검색..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {(hasActiveFilters || hasMultipleSorts) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
                  >
                    <i className="ri-refresh-line"></i>
                    초기화
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-sm font-medium text-gray-600">역할:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRoleFilter("USER")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterRoles.has("USER")
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    일반
                  </button>
                  <button
                    onClick={() => toggleRoleFilter("ADMIN")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterRoles.has("ADMIN")
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    관리자
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300 mx-2"></div>

                <span className="text-sm font-medium text-gray-600">상태:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatusFilter("active")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterStatuses.has("active")
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    활성
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("inactive")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterStatuses.has("inactive")
                        ? "bg-gray-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    비활성
                  </button>
                </div>
              </div>

              {/* Sort Info */}
              {sortConfigs.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium text-gray-600">정렬:</span>
                  {sortConfigs.map((config, idx) => (
                    <span
                      key={config.field}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      <span className="font-medium">{idx + 1}.</span>
                      {FIELD_LABELS[config.field]}
                      <i className={config.order === "asc" ? "ri-arrow-up-line" : "ri-arrow-down-line"}></i>
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 ml-2">
                    (Ctrl+클릭으로 다중 정렬)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="bg-white rounded-xl shadow-md border-2 border-purple-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <i className="ri-list-check text-purple-500 mr-3"></i>
                사용자 목록 ({filteredUsers.length}명)
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50">
                <i className="ri-user-search-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">사용자가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("userId", e)}
                      >
                        <div className="flex items-center gap-1">
                          ID
                          {getSortInfo("userId") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("userId")?.index}</span>
                          )}
                          <i className={getSortIcon("userId")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("username", e)}
                      >
                        <div className="flex items-center gap-1">
                          아이디
                          {getSortInfo("username") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("username")?.index}</span>
                          )}
                          <i className={getSortIcon("username")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("name", e)}
                      >
                        <div className="flex items-center gap-1">
                          이름
                          {getSortInfo("name") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("name")?.index}</span>
                          )}
                          <i className={getSortIcon("name")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("email", e)}
                      >
                        <div className="flex items-center gap-1">
                          이메일
                          {getSortInfo("email") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("email")?.index}</span>
                          )}
                          <i className={getSortIcon("email")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("phone", e)}
                      >
                        <div className="flex items-center gap-1">
                          전화번호
                          {getSortInfo("phone") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("phone")?.index}</span>
                          )}
                          <i className={getSortIcon("phone")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("role", e)}
                      >
                        <div className="flex items-center gap-1">
                          역할
                          {getSortInfo("role") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("role")?.index}</span>
                          )}
                          <i className={getSortIcon("role")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("isActive", e)}
                      >
                        <div className="flex items-center gap-1">
                          상태
                          {getSortInfo("isActive") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("isActive")?.index}</span>
                          )}
                          <i className={getSortIcon("isActive")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("remainingSessions", e)}
                      >
                        <div className="flex items-center gap-1">
                          멘토링
                          {getSortInfo("remainingSessions") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("remainingSessions")?.index}</span>
                          )}
                          <i className={getSortIcon("remainingSessions")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("createdAt", e)}
                      >
                        <div className="flex items-center gap-1">
                          가입일
                          {getSortInfo("createdAt") && (
                            <span className="text-xs text-purple-500 font-bold">{getSortInfo("createdAt")?.index}</span>
                          )}
                          <i className={getSortIcon("createdAt")}></i>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{user.userId}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{user.username}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{user.name}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{user.email || "-"}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{user.phone || "-"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.userId, e.target.value as "USER" | "ADMIN")}
                            disabled={updatingUserId === user.userId}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 ${
                              user.role === "ADMIN"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            } ${updatingUserId === user.userId ? "opacity-50" : ""}`}
                          >
                            <option value="USER">일반</option>
                            <option value="ADMIN">관리자</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <select
                            value={user.isActive ? "active" : "inactive"}
                            onChange={(e) => handleStatusChangeFromSelect(user.userId, e.target.value)}
                            disabled={updatingUserId === user.userId}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 ${
                              user.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-700"
                            } ${updatingUserId === user.userId ? "opacity-50" : ""}`}
                          >
                            <option value="active">활성</option>
                            <option value="inactive">비활성</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {user.remainingSessions}회
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
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