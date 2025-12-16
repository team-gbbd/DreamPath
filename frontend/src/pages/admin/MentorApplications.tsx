import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { mentorService, userService } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

interface User {
  userId: number;
  name: string;
  email: string;
}

interface MentorApplication {
  mentorId: number;
  userId: number;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS = {
  PENDING: '승인 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
};

const DAY_LABELS: Record<string, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};

export default function MentorApplicationsPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  const highlightId = searchParams.get('highlight');

  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<MentorApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [statusCounts, setStatusCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [usersMap, setUsersMap] = useState<Map<number, User>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
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
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-teal-100",
    sectionBg: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white/70 backdrop-blur-sm border-teal-100/50 shadow-sm",
    modalBg: darkMode
      ? "bg-[#12141D] border-white/[0.1]"
      : "bg-white border-gray-200 shadow-xl",
    filterBg: darkMode
      ? "bg-white/[0.03]"
      : "bg-teal-50/50",
    filterActive: darkMode
      ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
      : "bg-teal-500 text-white shadow-sm",
    filterInactive: darkMode
      ? "text-white/60 hover:bg-white/[0.05]"
      : "text-gray-600 hover:bg-white",
    contentBg: darkMode
      ? "bg-white/[0.03]"
      : "bg-gray-50",
    badge: {
      pending: darkMode
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: darkMode
        ? "bg-green-500/20 text-green-400 border-green-500/30"
        : "bg-green-100 text-green-800 border-green-300",
      rejected: darkMode
        ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-red-100 text-red-800 border-red-300",
    },
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
    accentBg: darkMode ? "bg-teal-500/20" : "bg-teal-50",
    iconBg: darkMode ? "bg-teal-500" : "bg-teal-400",
  };

  const getLoggedInUserId = (): number | null => {
    try {
      const userStr = localStorage.getItem('dreampath:user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.userId || null;
    } catch {
      return null;
    }
  };

  const userId = getLoggedInUserId();

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
    if (!userId) {
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [allData, allUsers] = await Promise.all([
        mentorService.getAllApplications(),
        userService.getAllUsers()
      ]);

      const userMap = new Map<number, User>();
      allUsers.forEach((user: User) => {
        userMap.set(user.userId, user);
      });
      setUsersMap(userMap);

      const counts = {
        total: allData.length,
        pending: allData.filter((app: MentorApplication) => app.status === 'PENDING').length,
        approved: allData.filter((app: MentorApplication) => app.status === 'APPROVED').length,
        rejected: allData.filter((app: MentorApplication) => app.status === 'REJECTED').length,
      };
      setStatusCounts(counts);

      let data;
      if (statusFilter) {
        data = await mentorService.getApplicationsByStatus(statusFilter);
      } else {
        data = allData;
      }
      setApplications(data);

      if (highlightId) {
        const highlighted = data.find((app: MentorApplication) => app.mentorId === parseInt(highlightId));
        if (highlighted) {
          setSelectedApp(highlighted);
          setShowDetailModal(true);
        }
      }
    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
      setError(err.response?.data || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: number) => {
    const user = usersMap.get(userId);
    return user?.name || `사용자 ${userId}`;
  };

  const handleReview = async () => {
    if (!selectedApp || !reviewAction || !userId) return;

    if (reviewAction === 'reject' && reviewReason.trim().length < 10) {
      showToast('거절 사유는 최소 10자 이상 작성해주세요.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);

      await mentorService.reviewApplication(
        selectedApp.mentorId,
        reviewAction === 'approve',
        reviewReason || '승인됨',
        userId
      );

      showToast(reviewAction === 'approve' ? '승인되었습니다.' : '거절되었습니다.', 'success');
      setShowReviewModal(false);
      setShowDetailModal(false);
      setReviewReason('');
      setReviewAction(null);
      setSelectedApp(null);
      fetchData();
    } catch (err: any) {
      console.error('처리 실패:', err);
      showToast(err.response?.data || '처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setReviewReason('');
    setShowReviewModal(true);
  };

  const toggleCard = (mentorId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(mentorId)) {
      newExpanded.delete(mentorId);
    } else {
      newExpanded.add(mentorId);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { text: '승인 대기', style: theme.badge.pending, icon: 'ri-time-line' },
      APPROVED: { text: '승인됨', style: theme.badge.approved, icon: 'ri-checkbox-circle-line' },
      REJECTED: { text: '거절됨', style: theme.badge.rejected, icon: 'ri-close-circle-line' },
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
        <div className="text-center relative z-10">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 border-4 ${darkMode ? 'border-teal-400' : 'border-teal-400'} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={`text-base sm:text-lg font-medium ${theme.text}`}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <ToastContainer />

      {/* Grid Pattern - 바둑판 무늬 */}
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
                <i className="ri-file-list-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>멘토 심사</h1>
                <p className={`text-sm sm:text-base ${theme.textMuted}`}>
                  {statusFilter ? STATUS_LABELS[statusFilter] : '전체'} ({applications.length}건)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin')}
                className={`${theme.button.secondary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
              >
                <i className="ri-dashboard-line"></i>
                <span className="hidden sm:inline">대시보드로</span>
              </button>
              <button
                onClick={() => navigate('/admin/mentors')}
                className={`${theme.button.secondary} px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base`}
              >
                <i className="ri-arrow-left-line"></i>
                <span className="hidden sm:inline">멘토 관리로</span>
              </button>
            </div>
          </div>

          {/* Main Container */}
          <div className={`${theme.sectionBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
            {/* Filter Tabs with Counts */}
            <div className={`${theme.filterBg} rounded-lg sm:rounded-xl p-1.5 sm:p-2 mb-4 sm:mb-6 flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2`}>
              <button
                onClick={() => navigate('/admin/mentor-applications')}
                className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  !statusFilter ? theme.filterActive : theme.filterInactive
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span>전체</span>
                  <span className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full ${!statusFilter ? (darkMode ? 'bg-white/20' : 'bg-teal-600') : (darkMode ? 'bg-white/10' : 'bg-slate-200')}`}>
                    {statusCounts.total}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=PENDING')}
                className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  statusFilter === 'PENDING'
                    ? (darkMode ? 'bg-yellow-500/80 text-white shadow-lg shadow-yellow-500/20' : 'bg-yellow-500 text-white shadow-sm')
                    : theme.filterInactive
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span>심사중</span>
                  <span className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full ${statusFilter === 'PENDING' ? (darkMode ? 'bg-white/20' : 'bg-yellow-600') : (darkMode ? 'bg-white/10' : 'bg-slate-200')}`}>
                    {statusCounts.pending}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=APPROVED')}
                className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  statusFilter === 'APPROVED'
                    ? (darkMode ? 'bg-green-500/80 text-white shadow-lg shadow-green-500/20' : 'bg-green-500 text-white shadow-sm')
                    : theme.filterInactive
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span>승인</span>
                  <span className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full ${statusFilter === 'APPROVED' ? (darkMode ? 'bg-white/20' : 'bg-green-600') : (darkMode ? 'bg-white/10' : 'bg-slate-200')}`}>
                    {statusCounts.approved}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=REJECTED')}
                className={`flex-1 min-w-[calc(50%-4px)] sm:min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  statusFilter === 'REJECTED'
                    ? (darkMode ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/20' : 'bg-red-500 text-white shadow-sm')
                    : theme.filterInactive
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span>거절</span>
                  <span className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full ${statusFilter === 'REJECTED' ? (darkMode ? 'bg-white/20' : 'bg-red-600') : (darkMode ? 'bg-white/10' : 'bg-slate-200')}`}>
                    {statusCounts.rejected}
                  </span>
                </div>
              </button>
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Search */}
              <div className="relative flex-1 max-w-full sm:max-w-md">
                <i className={`ri-search-line absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 ${theme.textMuted} text-base sm:text-lg`}></i>
                <input
                  type="text"
                  placeholder="이름, 자기소개, 경력으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 sm:pl-11 pr-10 py-2 sm:py-2.5 ${theme.input} border rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 transition-all`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:${theme.text}`}
                  >
                    <i className="ri-close-circle-fill"></i>
                  </button>
                )}
              </div>

              {/* Sort */}
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className={`${theme.button.secondary} flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base`}
              >
                <i className="ri-calendar-line"></i>
                <span className="hidden sm:inline">신청일</span>
                {sortOrder === 'desc' ? (
                  <i className={`ri-arrow-down-line ${theme.accent}`}></i>
                ) : (
                  <i className={`ri-arrow-up-line ${theme.accent}`}></i>
                )}
                <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>
                  ({sortOrder === 'desc' ? '최신순' : '오래된순'})
                </span>
              </button>
            </div>

            {error && (
              <div className={`mb-4 sm:mb-6 ${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start`}>
                <i className="ri-error-warning-line text-red-500 text-lg sm:text-xl mr-2 sm:mr-3 mt-0.5"></i>
                <p className={`${darkMode ? 'text-red-400' : 'text-red-700'} text-sm sm:text-base`}>{error}</p>
              </div>
            )}

            {/* Applications List */}
            {(() => {
              const filteredApps = applications.filter((app) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const userName = getUserName(app.userId).toLowerCase();
                return (
                  userName.includes(query) ||
                  app.bio?.toLowerCase().includes(query) ||
                  app.career?.toLowerCase().includes(query) ||
                  app.mentorId.toString().includes(query) ||
                  app.userId.toString().includes(query)
                );
              });

              if (filteredApps.length === 0) {
                return (
                  <div className={`${theme.contentBg} rounded-lg sm:rounded-xl p-8 sm:p-12 text-center`}>
                    <i className={`ri-inbox-line text-5xl sm:text-6xl ${theme.textSubtle} mb-4`}></i>
                    <p className={`${theme.textMuted} text-sm sm:text-base`}>
                      {searchQuery
                        ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
                        : statusFilter
                          ? `${STATUS_LABELS[statusFilter]} 신청이 없습니다.`
                          : '신청이 없습니다.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 sm:space-y-4">
                  {[...filteredApps]
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt).getTime();
                      const dateB = new Date(b.createdAt).getTime();
                      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                    })
                    .map((app) => {
                      const badge = getStatusBadge(app.status);
                      const isExpanded = expandedCards.has(app.mentorId);

                      return (
                        <div
                          key={app.mentorId}
                          className={`${theme.card} rounded-lg sm:rounded-xl border overflow-hidden transition-all ${theme.cardHover} ${
                            highlightId && app.mentorId === parseInt(highlightId)
                              ? 'ring-2 ring-teal-500'
                              : ''
                          }`}
                        >
                          {/* 상태 배지 헤더 */}
                          <div className={`${badge.style} border-b px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                              <i className={badge.icon}></i>
                              <span className="font-semibold text-sm sm:text-base">{badge.text}</span>
                            </div>
                            <div className={`text-xs sm:text-sm ${darkMode ? 'opacity-80' : ''}`}>
                              신청일: {new Date(app.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>

                          {/* 메인 콘텐츠 */}
                          <div className="p-4 sm:p-6">
                            {/* 사용자 정보 */}
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${theme.iconBg} rounded-full flex items-center justify-center`}>
                                <i className="ri-user-line text-white text-xl sm:text-2xl"></i>
                              </div>
                              <div>
                                <h3 className={`text-base sm:text-lg font-semibold ${theme.text}`}>{getUserName(app.userId)}</h3>
                                <p className={`text-xs sm:text-sm ${theme.textMuted}`}>멘토 ID: {app.mentorId}</p>
                              </div>
                            </div>

                            {/* 자기소개 */}
                            <div className="mb-3 sm:mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <i className="ri-chat-quote-line text-teal-500 text-base sm:text-lg"></i>
                                <h4 className={`font-bold text-sm sm:text-base ${theme.text}`}>자기소개</h4>
                              </div>
                              <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                                <p className={`${theme.textMuted} whitespace-pre-wrap text-sm sm:text-base ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                  {app.bio || '-'}
                                </p>
                                {app.bio && app.bio.length > 100 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCard(app.mentorId);
                                    }}
                                    className="text-teal-500 text-sm mt-2 hover:text-teal-600 font-medium"
                                  >
                                    {isExpanded ? '접기' : '더보기'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 경력 */}
                            <div className="mb-3 sm:mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <i className="ri-briefcase-line text-teal-500 text-base sm:text-lg"></i>
                                <h4 className={`font-bold text-sm sm:text-base ${theme.text}`}>경력 사항</h4>
                              </div>
                              <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                                <p className={`${theme.textMuted} whitespace-pre-wrap text-sm sm:text-base ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                  {app.career || '-'}
                                </p>
                                {app.career && app.career.length > 100 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCard(app.mentorId);
                                    }}
                                    className="text-teal-500 text-sm mt-2 hover:text-teal-600 font-medium"
                                  >
                                    {isExpanded ? '접기' : '더보기'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 가능 시간 */}
                            <div className="mb-4 sm:mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <i className="ri-calendar-check-line text-teal-500 text-base sm:text-lg"></i>
                                <h4 className={`font-bold text-sm sm:text-base ${theme.text}`}>가능 시간</h4>
                              </div>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {app.availableTime && Object.entries(app.availableTime).map(([day, times]) => (
                                  <span
                                    key={day}
                                    className={`${darkMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100 text-teal-700 border-teal-300'} border px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium`}
                                  >
                                    {DAY_LABELS[day]} {times.length}회
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* 버튼 영역 */}
                            <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t ${theme.divider}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                  setShowDetailModal(true);
                                }}
                                className={`${theme.button.secondary} flex-1 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base`}
                              >
                                <i className="ri-eye-line mr-2"></i>
                                상세보기
                              </button>
                              {app.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedApp(app);
                                      openReviewModal('reject');
                                    }}
                                    className={`${theme.button.danger} flex-1 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base`}
                                  >
                                    <i className="ri-close-circle-line mr-2"></i>
                                    거절하기
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedApp(app);
                                      openReviewModal('approve');
                                    }}
                                    className={`${theme.button.success} flex-1 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base`}
                                  >
                                    <i className="ri-checkbox-circle-line mr-2"></i>
                                    승인하기
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-black/70' : 'bg-black/50'} flex items-center justify-center z-50 p-3 sm:p-4`}>
          <div className={`${theme.modalBg} rounded-xl sm:rounded-2xl border max-w-3xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 sm:p-6 border-b ${theme.divider} flex items-center justify-between sticky top-0 ${darkMode ? 'bg-[#12141D]' : 'bg-white'} rounded-t-xl sm:rounded-t-2xl`}>
              <h3 className={`text-lg sm:text-xl font-bold ${theme.text}`}>멘토 신청 상세</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`${theme.textMuted} hover:${theme.text} text-xl sm:text-2xl transition-colors`}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Info */}
              <div>
                <h3 className={`font-bold ${theme.text} mb-2 flex items-center text-sm sm:text-base`}>
                  <i className="ri-user-line mr-2 text-teal-500"></i>
                  신청자 정보
                </h3>
                <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                  <p className={`${theme.text} font-medium text-sm sm:text-base`}>{getUserName(selectedApp.userId)}</p>
                  <p className={`text-xs sm:text-sm ${theme.textMuted} mt-1`}>
                    신청일: {new Date(selectedApp.createdAt).toLocaleString('ko-KR')}
                  </p>
                  <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
                    수정일: {new Date(selectedApp.updatedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h3 className={`font-bold ${theme.text} mb-2 flex items-center text-sm sm:text-base`}>
                  <i className="ri-quill-pen-line mr-2 text-teal-500"></i>
                  자기소개
                </h3>
                <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                  <p className={`${theme.textMuted} whitespace-pre-wrap text-sm sm:text-base`}>{selectedApp.bio}</p>
                </div>
              </div>

              {/* Career */}
              <div>
                <h3 className={`font-bold ${theme.text} mb-2 flex items-center text-sm sm:text-base`}>
                  <i className="ri-briefcase-line mr-2 text-teal-500"></i>
                  경력 사항
                </h3>
                <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                  <p className={`${theme.textMuted} whitespace-pre-wrap text-sm sm:text-base`}>{selectedApp.career}</p>
                </div>
              </div>

              {/* Available Time */}
              <div>
                <h3 className={`font-bold ${theme.text} mb-2 flex items-center text-sm sm:text-base`}>
                  <i className="ri-calendar-check-line mr-2 text-teal-500"></i>
                  가능 시간
                </h3>
                <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4 space-y-3`}>
                  {selectedApp.availableTime && Object.keys(selectedApp.availableTime).length > 0 ? (
                    Object.entries(selectedApp.availableTime).map(([day, times]) => (
                      <div key={day}>
                        <p className={`font-semibold ${theme.text} mb-2 text-sm sm:text-base`}>
                          {DAY_LABELS[day] || day}요일
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {times.map((time) => (
                            <span
                              key={time}
                              className={`${darkMode ? 'bg-teal-500/20 text-teal-500' : 'bg-teal-500/10 text-teal-500'} px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm`}
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={theme.textMuted}>등록된 시간이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className={`font-bold ${theme.text} mb-2 flex items-center text-sm sm:text-base`}>
                  <i className="ri-information-line mr-2 text-teal-500"></i>
                  현재 상태
                </h3>
                <div className={`${theme.contentBg} rounded-lg p-3 sm:p-4`}>
                  {(() => {
                    const badge = getStatusBadge(selectedApp.status);
                    return (
                      <span className={`${badge.style} border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-1`}>
                        <i className={badge.icon}></i>
                        {badge.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApp.status === 'PENDING' && (
                <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t ${theme.divider}`}>
                  <button
                    onClick={() => openReviewModal('approve')}
                    className={`${theme.button.success} flex-1 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base`}
                  >
                    <i className="ri-checkbox-circle-line mr-2"></i>
                    승인
                  </button>
                  <button
                    onClick={() => openReviewModal('reject')}
                    className={`${theme.button.danger} flex-1 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base`}
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    거절
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedApp && (
        <div className={`fixed inset-0 ${darkMode ? 'bg-black/80' : 'bg-black/60'} flex items-center justify-center z-[60] p-3 sm:p-4`}>
          <div className={`${theme.modalBg} rounded-xl sm:rounded-2xl border max-w-md w-full`}>
            <div className={`p-4 sm:p-6 border-b ${theme.divider}`}>
              <h3 className={`text-base sm:text-lg font-bold ${theme.text}`}>
                {reviewAction === 'approve' ? '멘토 신청 승인' : '멘토 신청 거절'}
              </h3>
            </div>

            <div className="p-4 sm:p-6">
              <p className={`${theme.textMuted} mb-4 text-sm sm:text-base`}>
                <span className={`font-medium ${theme.text}`}>{getUserName(selectedApp.userId)}</span>님의 멘토 신청을{' '}
                {reviewAction === 'approve' ? '승인' : '거절'}하시겠습니까?
              </p>

              <div className="mb-4">
                <label className={`block text-xs sm:text-sm font-medium ${theme.text} mb-2`}>
                  {reviewAction === 'approve' ? '승인 메시지 (선택)' : '거절 사유 (필수, 최소 10자)'}
                </label>
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className={`w-full h-28 sm:h-32 p-3 ${theme.input} border-2 rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors text-sm sm:text-base`}
                  placeholder={
                    reviewAction === 'approve'
                      ? '승인 메시지를 입력하세요 (선택사항)'
                      : '거절 사유를 최소 10자 이상 입력해주세요'
                  }
                  required={reviewAction === 'reject'}
                />
                {reviewAction === 'reject' && (
                  <p className={`text-xs mt-1 ${reviewReason.length >= 10 ? 'text-green-500' : theme.textSubtle}`}>
                    {reviewReason.length} / 10자 이상
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewReason('');
                    setReviewAction(null);
                  }}
                  className={`${theme.button.secondary} flex-1 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base`}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  onClick={handleReview}
                  disabled={isSubmitting || (reviewAction === 'reject' && reviewReason.trim().length < 10)}
                  className={`flex-1 py-2.5 sm:py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                    reviewAction === 'approve' ? theme.button.success : theme.button.danger
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      처리 중...
                    </span>
                  ) : (
                    <span>{reviewAction === 'approve' ? '승인' : '거절'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
