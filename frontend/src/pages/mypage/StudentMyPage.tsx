import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, paymentService, userService, bookingService, API_BASE_URL, authFetch } from '@/lib/api';

interface UserProfile {
  userId: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  birth: string;
  provider: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

interface LearningPath {
  pathId: number;
  domain: string;
  createdAt: string;
  weeklySessions?: {
    weeklyId: number;
    weekNumber: number;
    isCompleted: boolean;
  }[];
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

interface Booking {
  bookingId: number;
  sessionId: number;
  sessionTitle: string;
  mentorId: number;
  mentorName: string;
  menteeId: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  message?: string;
  rejectionReason?: string;
  createdAt: string;
}

type TabType = 'overview' | 'learning' | 'mentoring' | 'account';

export default function StudentMyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [mentorApplication, setMentorApplication] = useState<MentorApplication | null>(null);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      const profileData = await userService.getUserProfile(userId);
      setUserProfile(profileData);

      const pathsResponse = await authFetch(`${API_BASE_URL}/learning-paths/user/${userId}`);
      if (!pathsResponse.ok) throw new Error('학습 경로를 불러오는데 실패했습니다.');
      const pathsData = await pathsResponse.json();
      setLearningPaths(pathsData);

      try {
        const mentorData = await mentorService.getMyApplication(userId);
        setMentorApplication(mentorData);
      } catch (err) {
        if (err.response?.status !== 404 && err.response?.status !== 204) {
          console.error('멘토 신청 현황 조회 실패:', err);
        }
      }

      try {
        const sessions = await paymentService.getRemainingSessions(userId);
        setRemainingSessions(sessions);
      } catch (err) {
        console.error('잔여 횟수 조회 실패:', err);
      }

      try {
        const bookingsData = await bookingService.getMyBookings(userId);
        setMyBookings(bookingsData);
      } catch (err) {
        console.error('예약 목록 조회 실패:', err);
      }

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (path: LearningPath) => {
    if (!path.weeklySessions || path.weeklySessions.length === 0) return 0;
    const completed = path.weeklySessions.filter(w => w.isCompleted).length;
    return Math.round((completed / path.weeklySessions.length) * 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!userProfile) return null;

  const totalWeeks = learningPaths.reduce((sum, path) =>
    sum + (path.weeklySessions?.length || 0), 0);
  const completedWeeks = learningPaths.reduce((sum, path) =>
    sum + (path.weeklySessions?.filter(w => w.isCompleted).length || 0), 0);
  const overallProgress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  const tabs = [
    { id: 'overview' as TabType, label: '대시보드', icon: 'ri-dashboard-line' },
    { id: 'learning' as TabType, label: '학습 현황', icon: 'ri-book-open-line' },
    { id: 'mentoring' as TabType, label: '멘토링', icon: 'ri-user-star-line' },
    { id: 'account' as TabType, label: '계정 설정', icon: 'ri-settings-3-line' },
  ];

  const getBookingStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: '승인 대기' };
      case 'CONFIRMED': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: '확정' };
      case 'REJECTED': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: '거절됨' };
      case 'CANCELLED': return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: '취소됨' };
      case 'COMPLETED': return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', label: '완료' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      

      <div className="max-w-6xl mx-auto px-6 py-8 pb-8">
        <div className="flex gap-6">
          {/* 사이드바 */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg sticky top-24">
              {/* 프로필 */}
              <div className="p-5 border-b border-gray-100">
                <div className="w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-line text-2xl text-white"></i>
                </div>
                <h2 className="text-center text-sm font-semibold text-gray-900">{userProfile.name}</h2>
                <p className="text-center text-xs text-gray-500 mt-0.5">{userProfile.username}</p>
                <div className="flex justify-center gap-1 mt-2">
                  {userProfile.role === 'ADMIN' ? (
                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-medium">관리자</span>
                  ) : (
                    <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded text-xs font-medium">학생</span>
                  )}
                  {mentorApplication?.status === 'APPROVED' && (
                    <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded text-xs font-medium">멘토</span>
                  )}
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 rounded text-left transition-colors text-sm ${
                      activeTab === tab.id
                        ? 'bg-pink-50 text-pink-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`${tab.icon} mr-2`}></i>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 space-y-5">
            {/* 대시보드 탭 */}
            {activeTab === 'overview' && (
              <>
                {/* 통계 카드 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 bg-pink-50 rounded flex items-center justify-center">
                        <i className="ri-line-chart-line text-pink-500"></i>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">학습 진행률</p>
                    <p className="text-2xl font-bold text-gray-900">{overallProgress}<span className="text-sm text-gray-400">%</span></p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 bg-emerald-50 rounded flex items-center justify-center">
                        <i className="ri-checkbox-circle-line text-emerald-500"></i>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">완료한 주차</p>
                    <p className="text-2xl font-bold text-gray-900">{completedWeeks}<span className="text-sm text-gray-400">/{totalWeeks}</span></p>
                  </div>

                  <div
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-pink-200 transition-colors"
                    onClick={() => navigate(remainingSessions === 0 ? '/payments/purchase' : '/payments/history')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center">
                        <i className="ri-ticket-line text-amber-500"></i>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">멘토링 잔여</p>
                    <p className="text-2xl font-bold text-gray-900">{remainingSessions}<span className="text-sm text-gray-400">회</span></p>
                  </div>
                </div>

                {/* 진로 요약 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-compass-3-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">나의 진로 요약</h2>
                      <p className="text-xs text-gray-500">AI가 분석한 진로 방향</p>
                    </div>
                  </div>

                  <div className="p-5">
                    {learningPaths.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-pink-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-pink-600 font-medium">추천 직업</span>
                            <span className="text-xs bg-pink-500 text-white px-1.5 py-0.5 rounded">TOP</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{learningPaths[0].domain}</p>
                          <p className="text-xs text-gray-500 mt-1">현재 학습 중</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-xs text-gray-600 font-medium">강점 분석</span>
                          <div className="mt-2 space-y-1.5">
                            {['꾸준한 학습 의지', '체계적 학습 접근', '명확한 목표'].map((s, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                <i className="ri-check-line text-emerald-500"></i>
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="ri-compass-line text-2xl text-gray-300"></i>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">아직 진로 분석 데이터가 없습니다</p>
                        <button
                          onClick={() => navigate('/career-chat')}
                          className="text-sm bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded transition-colors"
                        >
                          AI 진로 상담 시작하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 최근 학습 */}
                {learningPaths.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                          <i className="ri-book-open-line text-white"></i>
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-gray-900">최근 학습</h2>
                          <p className="text-xs text-gray-500">진행 중인 학습 로드맵</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('learning')}
                        className="text-xs text-pink-600 hover:text-pink-700"
                      >
                        전체 보기 <i className="ri-arrow-right-s-line"></i>
                      </button>
                    </div>

                    <div className="p-5">
                      {learningPaths.slice(0, 1).map((path) => {
                        const progress = calculateProgress(path);
                        const totalW = path.weeklySessions?.length || 0;
                        const completedW = path.weeklySessions?.filter(w => w.isCompleted).length || 0;

                        return (
                          <div key={path.pathId} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{path.domain}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{formatDate(path.createdAt)} 시작</p>
                              </div>
                              <span className="text-lg font-bold text-pink-600">{progress}%</span>
                            </div>

                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>진행률</span>
                                <span>{completedW}/{totalW} 주차</span>
                              </div>
                              <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/learning/${path.pathId}`)}
                              className="w-full text-sm bg-pink-500 hover:bg-pink-600 text-white py-2 rounded transition-colors"
                            >
                              학습 이어하기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 학습 현황 탭 */}
            {activeTab === 'learning' && (
              <>
                {learningPaths.length > 0 && (
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                        <i className="ri-dashboard-line text-white"></i>
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">학습 대시보드</h3>
                        <p className="text-xs text-gray-600">주차별 상세 분석, 통계, 약점 분석</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/learning')}
                      className="text-sm bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      대시보드 열기
                    </button>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-book-open-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">학습 로드맵</h2>
                      <p className="text-xs text-gray-500">주차별 학습 현황</p>
                    </div>
                  </div>

                  {learningPaths.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-book-2-line text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">아직 시작한 학습 경로가 없습니다</p>
                      <button
                        onClick={() => navigate('/career-chat')}
                        className="text-sm bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded transition-colors"
                      >
                        학습 시작하기
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      {learningPaths.map((path) => {
                        const progress = calculateProgress(path);
                        const totalW = path.weeklySessions?.length || 0;
                        const completedW = path.weeklySessions?.filter(w => w.isCompleted).length || 0;

                        return (
                          <div key={path.pathId} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{path.domain}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{formatDate(path.createdAt)} 시작</p>
                              </div>
                              <span className="text-lg font-bold text-pink-600">{progress}%</span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {path.weeklySessions?.map((week) => (
                                <div
                                  key={week.weeklyId}
                                  className={`p-2 rounded text-center text-xs ${
                                    week.isCompleted
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                                  }`}
                                >
                                  <i className={week.isCompleted ? 'ri-checkbox-circle-fill' : 'ri-lock-line'}></i>
                                  <div className="mt-0.5">{week.weekNumber}주차</div>
                                </div>
                              ))}
                            </div>

                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>진행률</span>
                                <span>{completedW}/{totalW} 주차</span>
                              </div>
                              <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/learning/${path.pathId}`)}
                              className="w-full text-sm bg-pink-500 hover:bg-pink-600 text-white py-2 rounded transition-colors"
                            >
                              학습 이어하기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 멘토링 탭 */}
            {activeTab === 'mentoring' && (
              <>
                {/* 통계 */}
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-pink-200 transition-colors"
                    onClick={() => navigate(remainingSessions === 0 ? '/payments/purchase' : '/payments/history')}
                  >
                    <div className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-ticket-line text-amber-500"></i>
                    </div>
                    <p className="text-xs text-gray-500">잔여 횟수</p>
                    <p className="text-2xl font-bold text-gray-900">{remainingSessions}<span className="text-sm text-gray-400">회</span></p>
                  </div>

                  <div
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-pink-200 transition-colors"
                    onClick={() => navigate('/mentoring')}
                  >
                    <div className="w-8 h-8 bg-violet-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-search-line text-violet-500"></i>
                    </div>
                    <p className="text-xs text-gray-500">멘토 찾기</p>
                    <p className="text-sm font-medium text-violet-600 mt-1">세션 둘러보기</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="w-8 h-8 bg-pink-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-calendar-check-line text-pink-500"></i>
                    </div>
                    <p className="text-xs text-gray-500">내 예약</p>
                    <p className="text-2xl font-bold text-gray-900">{myBookings.length}<span className="text-sm text-gray-400">건</span></p>
                  </div>
                </div>

                {/* 예약 목록 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-calendar-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">나의 예약</h2>
                      <p className="text-xs text-gray-500">예약한 멘토링 세션</p>
                    </div>
                  </div>

                  {myBookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-calendar-line text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">예약한 세션이 없습니다</p>
                      <button
                        onClick={() => navigate('/mentoring')}
                        className="text-sm bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded transition-colors"
                      >
                        세션 찾아보기
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3">
                      {myBookings.map((booking) => {
                        const status = getBookingStatusStyle(booking.status);
                        return (
                          <div key={booking.bookingId} className={`border ${status.border} rounded-lg p-4 ${status.bg}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                                  <i className="ri-user-star-line text-white"></i>
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-900">{booking.mentorName}</h3>
                                  <p className="text-xs text-gray-500">멘토</p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text} border ${status.border}`}>
                                {status.label}
                              </span>
                            </div>

                            <p className="text-sm font-medium text-gray-900 mb-2">{booking.sessionTitle}</p>

                            {booking.rejectionReason && (
                              <div className="bg-white/50 rounded p-2 mb-2">
                                <p className="text-xs text-rose-600">거절 사유: {booking.rejectionReason}</p>
                              </div>
                            )}

                            <p className="text-xs text-gray-500 mb-3">신청일: {formatDate(booking.createdAt)}</p>

                            {booking.status === 'CONFIRMED' && (
                              <button
                                onClick={() => navigate(`/mentoring/meeting/${booking.bookingId}`)}
                                className="w-full text-sm bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded transition-colors"
                              >
                                세션 입장하기
                              </button>
                            )}
                            {booking.status === 'PENDING' && (
                              <p className="text-center text-xs text-gray-500">멘토의 승인을 기다리고 있습니다</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 멘토 신청 */}
                {mentorApplication ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">멘토 신청 현황</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        mentorApplication.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                        mentorApplication.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {mentorApplication.status === 'PENDING' && '승인 대기'}
                        {mentorApplication.status === 'APPROVED' && '승인됨'}
                        {mentorApplication.status === 'REJECTED' && '거절됨'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 text-center">
                    <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="ri-user-star-line text-white text-xl"></i>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">멘토가 되어보세요!</h3>
                    <p className="text-xs text-gray-600 mb-4">후배들의 성장을 도와주실 멘토를 모집합니다.</p>
                    <button
                      onClick={() => navigate('/mentor/apply')}
                      className="text-sm bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      멘토 신청하기
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 계정 설정 탭 */}
            {activeTab === 'account' && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-settings-3-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">계정 정보</h2>
                      <p className="text-xs text-gray-500">개인정보 확인 및 관리</p>
                    </div>
                  </div>
                  <button className="text-xs text-pink-600 hover:text-pink-700">
                    <i className="ri-edit-line mr-1"></i>수정하기
                  </button>
                </div>

                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: '이름', value: userProfile.name },
                    { label: '아이디', value: userProfile.username },
                    { label: '이메일', value: userProfile.email || '미등록' },
                    { label: '전화번호', value: userProfile.phone || '미등록' },
                    { label: '생년월일', value: userProfile.birth ? formatDate(userProfile.birth) : '미등록' },
                    { label: '가입일', value: formatDate(userProfile.createdAt) },
                  ].map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}

                  <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-500 mb-0.5">계정 상태</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      userProfile.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {userProfile.isActive ? '활성' : '비활성'}
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-500 mb-0.5">역할</p>
                    <div className="flex flex-wrap gap-1">
                      {userProfile.role === 'ADMIN' ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600">관리자</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-pink-50 text-pink-600">학생</span>
                      )}
                      {mentorApplication?.status === 'APPROVED' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-600">멘토</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
