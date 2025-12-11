import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/feature/Header";
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

      // 사용자 맵 생성
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

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (mentor) =>
          mentor.bio?.toLowerCase().includes(query) ||
          mentor.career?.toLowerCase().includes(query) ||
          mentor.mentorId.toString().includes(query) ||
          mentor.userId.toString().includes(query)
      );
    }

    // 상태 필터 (다중 선택)
    if (filterStatuses.size > 0) {
      result = result.filter((mentor) => filterStatuses.has(mentor.status));
    }

    // 다중 정렬
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

  // 다중 정렬: Ctrl/Cmd 클릭으로 추가, 일반 클릭으로 단일 정렬
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
    if (!info) return "ri-arrow-up-down-line text-gray-300";
    return info.order === "asc" ? "ri-arrow-up-line text-teal-500" : "ri-arrow-down-line text-teal-500";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const getStatusLabel = (status: string) => {
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
  };

  const handleViewDetail = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setIsDetailModalOpen(true);
  };

  const hasActiveFilters = searchQuery.trim() || filterStatuses.size > 0;
  const hasMultipleSorts = sortConfigs.length > 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-cyan-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-cyan-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchMentors}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-cyan-50/20 to-blue-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center">
                <i className="ri-user-star-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">멘토 관리</h1>
                <p className="text-gray-600">멘토 신청 및 관리</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/admin")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <i className="ri-arrow-left-line"></i>
                대시보드로
              </button>
              <button
                onClick={() => navigate("/admin/mentor-applications?status=PENDING")}
                className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <i className="ri-file-list-3-line"></i>
                멘토 심사
                {mentors.filter(m => m.status === "PENDING").length > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {mentors.filter(m => m.status === "PENDING").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-teal-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                  <i className="ri-team-line text-2xl text-teal-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 멘토</p>
              <p className="text-3xl font-bold text-gray-900">{mentors.length}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-yellow-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <i className="ri-time-line text-2xl text-yellow-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">심사중</p>
              <p className="text-3xl font-bold text-gray-900">
                {mentors.filter((m) => m.status === "PENDING").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <i className="ri-check-line text-2xl text-green-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">승인됨</p>
              <p className="text-3xl font-bold text-gray-900">
                {mentors.filter((m) => m.status === "APPROVED").length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-red-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <i className="ri-close-line text-2xl text-red-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">거절됨</p>
              <p className="text-3xl font-bold text-gray-900">
                {mentors.filter((m) => m.status === "REJECTED").length}
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-teal-100/50 p-6 mb-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름, 자기소개, 경력, 멘토ID로 검색..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {(hasActiveFilters || hasMultipleSorts) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
                  >
                    <i className="ri-refresh-line"></i>
                    초기화
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-sm font-medium text-gray-600">상태:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStatusFilter("PENDING")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterStatuses.has("PENDING")
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    심사중
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("APPROVED")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterStatuses.has("APPROVED")
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    승인됨
                  </button>
                  <button
                    onClick={() => toggleStatusFilter("REJECTED")}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      filterStatuses.has("REJECTED")
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    거절됨
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
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

          {/* Mentor List */}
          <div className="bg-white rounded-xl shadow-md border-2 border-teal-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <i className="ri-list-check text-teal-500 mr-3"></i>
                멘토 목록 ({filteredMentors.length}명)
              </h2>
            </div>

            {filteredMentors.length === 0 ? (
              <div className="text-center py-12 bg-gray-50">
                <i className="ri-user-search-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">멘토가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("mentorId", e)}
                      >
                        <div className="flex items-center gap-1">
                          멘토ID
                          {getSortInfo("mentorId") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("mentorId")?.index}</span>
                          )}
                          <i className={getSortIcon("mentorId")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("userId", e)}
                      >
                        <div className="flex items-center gap-1">
                          신청자
                          {getSortInfo("userId") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("userId")?.index}</span>
                          )}
                          <i className={getSortIcon("userId")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("bio", e)}
                      >
                        <div className="flex items-center gap-1">
                          자기소개
                          {getSortInfo("bio") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("bio")?.index}</span>
                          )}
                          <i className={getSortIcon("bio")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("career", e)}
                      >
                        <div className="flex items-center gap-1">
                          경력
                          {getSortInfo("career") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("career")?.index}</span>
                          )}
                          <i className={getSortIcon("career")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("availableSlots", e)}
                      >
                        <div className="flex items-center gap-1">
                          가능시간
                          {getSortInfo("availableSlots") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("availableSlots")?.index}</span>
                          )}
                          <i className={getSortIcon("availableSlots")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("status", e)}
                      >
                        <div className="flex items-center gap-1">
                          상태
                          {getSortInfo("status") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("status")?.index}</span>
                          )}
                          <i className={getSortIcon("status")}></i>
                        </div>
                      </th>
                      <th
                        className="px-4 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                        onClick={(e) => handleSort("createdAt", e)}
                      >
                        <div className="flex items-center gap-1">
                          신청일
                          {getSortInfo("createdAt") && (
                            <span className="text-xs text-teal-500 font-bold">{getSortInfo("createdAt")?.index}</span>
                          )}
                          <i className={getSortIcon("createdAt")}></i>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMentors.map((mentor) => {
                      const statusLabel = getStatusLabel(mentor.status);
                      return (
                        <tr key={mentor.mentorId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                            #{mentor.mentorId}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{getUserName(mentor.userId)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-[200px] truncate" title={mentor.bio}>
                            {mentor.bio || "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={mentor.career}>
                            {mentor.career || "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {getTotalAvailableSlots(mentor.availableTime)}개
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-medium ${statusLabel.className}`}>
                              {statusLabel.text}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(mentor.createdAt)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewDetail(mentor)}
                              className="bg-teal-50 hover:bg-teal-100 text-teal-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                            >
                              상세보기
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                멘토 상세 정보 #{selectedMentor.mentorId}
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all"
              >
                <i className="ri-close-line text-xl text-gray-600"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">상태</h3>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                    getStatusLabel(selectedMentor.status).className
                  }`}
                >
                  {getStatusLabel(selectedMentor.status).text}
                </span>
              </div>

              {/* Bio */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">자기소개</h3>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-xl whitespace-pre-wrap">
                  {selectedMentor.bio || "-"}
                </p>
              </div>

              {/* Career */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">경력</h3>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-xl whitespace-pre-wrap">
                  {selectedMentor.career || "-"}
                </p>
              </div>

              {/* Available Time */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">가능 시간</h3>
                {selectedMentor.availableTime && Object.keys(selectedMentor.availableTime).length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedMentor.availableTime).map(([day, times]) => (
                        <div key={day} className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="font-medium text-gray-900 mb-1">{DAY_LABELS[day] || day}</p>
                          <div className="flex flex-wrap gap-1">
                            {times.map((time, idx) => (
                              <span
                                key={idx}
                                className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs"
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
                  <p className="text-gray-500">등록된 시간이 없습니다.</p>
                )}
              </div>

              {/* Review Info */}
              {selectedMentor.reviewedAt && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">심사 정보</h3>
                  <p className="text-sm text-blue-600">
                    심사일: {formatDate(selectedMentor.reviewedAt)}
                  </p>
                  {selectedMentor.reviewReason && (
                    <p className="text-sm text-blue-600 mt-1">
                      사유: {selectedMentor.reviewReason}
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">신청일:</span>{" "}
                  <span className="text-gray-900">{formatDate(selectedMentor.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">수정일:</span>{" "}
                  <span className="text-gray-900">{formatDate(selectedMentor.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/mentors/${selectedMentor.mentorId}`);
                }}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
              >
                프로필 페이지로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}