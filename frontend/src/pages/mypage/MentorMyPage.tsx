import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, userService, bookingService } from '@/lib/api';
import Header from '@/components/feature/Header';

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

interface MentorInfo {
  mentorId: number;
  userId: number;
  company: string;
  job: string;
  experience: string;
  bio: string;
  career: string;
  availableTime: Record<string, string[]>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

interface BookingSession {
  bookingId: number;
  sessionId: number;
  sessionTitle: string;
  menteeId: number;
  menteeName: string;
  mentorId: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  message?: string;
  createdAt: string;
}

type TabType = 'dashboard' | 'sessions' | 'profile' | 'account';

export default function MentorMyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [pendingBookings, setPendingBookings] = useState<BookingSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<BookingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
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

      const mentorData = await mentorService.getMyApplication(userId);
      setMentorInfo(mentorData);

      if (mentorData.status === 'APPROVED') {
        try {
          const sessionsData = await bookingService.getMentorBookings(mentorData.mentorId);
          const pending = sessionsData.filter((s: BookingSession) => s.status === 'PENDING');
          const upcoming = sessionsData.filter((s: BookingSession) => s.status === 'CONFIRMED');
          const completed = sessionsData.filter((s: BookingSession) => s.status === 'COMPLETED').length;
          setPendingBookings(pending);
          setUpcomingSessions(upcoming);
          setCompletedSessions(completed);
        } catch (err) {
          console.error('세션 정보 조회 실패:', err);
        }
      }

    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleConfirmBooking = async (bookingId: number) => {
    if (!confirm('이 예약을 승인하시겠습니까?')) return;

    try {
      await bookingService.confirmBooking(bookingId);
      alert('예약이 승인되었습니다.');
      fetchData();
    } catch (err: any) {
      alert(err.message || '예약 승인에 실패했습니다.');
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await bookingService.rejectBooking(bookingId, reason);
      alert('예약이 거절되었습니다.');
      fetchData();
    } catch (err: any) {
      alert(err.message || '예약 거절에 실패했습니다.');
    }
  };

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
          <i className="ri-error-warning-line text-5xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!userProfile || !mentorInfo) return null;

  const tabs = [
    { id: 'dashboard' as TabType, label: '대시보드', icon: 'ri-dashboard-line' },
    { id: 'sessions' as TabType, label: '세션 관리', icon: 'ri-calendar-check-line' },
    { id: 'profile' as TabType, label: '멘토 프로필', icon: 'ri-profile-line' },
    { id: 'account' as TabType, label: '계정 설정', icon: 'ri-settings-3-line' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Flat White */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
              {/* Profile Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-star-line text-3xl text-white"></i>
                </div>
                <h2 className="text-center text-lg font-semibold text-gray-900 mb-1">{userProfile.name}</h2>
                <p className="text-center text-sm text-gray-500">{mentorInfo.job}</p>
                <div className="flex justify-center mt-3">
                  <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-md text-xs font-medium border border-yellow-100">
                    멘토
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="p-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2.5 rounded-md text-left transition-all mb-1 ${
                      activeTab === tab.id
                        ? 'bg-pink-50 text-pink-600 border border-pink-100'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <i className={`${tab.icon} text-lg mr-3`}></i>
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards - Soft Style */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <i className="ri-time-line text-2xl text-orange-500"></i>
                      </div>
                      {pendingBookings.length > 0 && (
                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {pendingBookings.length}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">예약 요청</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingBookings.length}<span className="text-xl text-gray-500">건</span></p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                        <i className="ri-checkbox-circle-line text-2xl text-pink-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">완료한 멘토링</p>
                    <p className="text-3xl font-bold text-gray-900">{completedSessions}<span className="text-xl text-gray-500">회</span></p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                        <i className="ri-calendar-line text-2xl text-purple-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">예정된 세션</p>
                    <p className="text-3xl font-bold text-gray-900">{upcomingSessions.length}<span className="text-xl text-gray-500">건</span></p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <i className="ri-star-line text-2xl text-green-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">평균 평점</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {completedSessions > 0 ? '4.8' : '-'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions - Soft Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setActiveTab('sessions')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center">
                        <i className="ri-calendar-line text-2xl text-white"></i>
                      </div>
                      <i className="ri-arrow-right-line text-xl text-gray-400"></i>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">세션 관리</h3>
                    <p className="text-sm text-gray-600">예약된 멘토링 확인하기</p>
                  </div>

                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setActiveTab('profile')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center">
                        <i className="ri-edit-line text-2xl text-white"></i>
                      </div>
                      <i className="ri-arrow-right-line text-xl text-gray-400"></i>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">프로필 수정</h3>
                    <p className="text-sm text-gray-600">멘토 정보 업데이트하기</p>
                  </div>

                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate('/my-bookings')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-400 rounded-xl flex items-center justify-center">
                        <i className="ri-history-line text-2xl text-white"></i>
                      </div>
                      <i className="ri-arrow-right-line text-xl text-gray-400"></i>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">히스토리</h3>
                    <p className="text-sm text-gray-600">멘토링 기록 보기</p>
                  </div>
                </div>

                {/* Statistics - Soft Style */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                      <i className="ri-bar-chart-line text-2xl text-white"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">멘토링 통계</h2>
                      <p className="text-gray-500 text-sm mt-0.5">나의 멘토링 활동 현황</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-orange-50 rounded-xl p-6 text-center border border-orange-100/50">
                      <div className="text-4xl font-bold text-orange-600 mb-2">{pendingBookings.length}</div>
                      <div className="text-sm text-gray-600">예약 요청</div>
                    </div>

                    <div className="bg-pink-50 rounded-xl p-6 text-center border border-pink-100/50">
                      <div className="text-4xl font-bold text-pink-600 mb-2">{completedSessions}</div>
                      <div className="text-sm text-gray-600">완료한 멘토링</div>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-6 text-center border border-purple-100/50">
                      <div className="text-4xl font-bold text-purple-600 mb-2">{upcomingSessions.length}</div>
                      <div className="text-sm text-gray-600">예정된 세션</div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6 text-center border border-green-100/50">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {completedSessions > 0 ? '4.8' : '-'}
                      </div>
                      <div className="text-sm text-gray-600">평균 평점</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                {/* Pending Bookings */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <i className="ri-time-line text-2xl text-white"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">예약 요청</h2>
                        <p className="text-gray-500 text-sm mt-0.5">승인 대기 중인 예약</p>
                      </div>
                    </div>
                    {pendingBookings.length > 0 && (
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold border border-orange-200">
                        {pendingBookings.length}건
                      </span>
                    )}
                  </div>

                  {pendingBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <i className="ri-checkbox-circle-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500 mb-4">대기 중인 예약 요청이 없습니다</p>
                      <p className="text-sm text-gray-400">학생들의 예약 요청이 여기에 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <div
                          key={booking.bookingId}
                          className="bg-orange-50 border border-orange-100/50 rounded-xl p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-xl text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">{booking.menteeName}</h3>
                                <p className="text-sm text-gray-600">멘티</p>
                              </div>
                            </div>
                            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium border border-orange-200">
                              승인 대기
                            </span>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">
                              <i className="ri-bookmark-line mr-1 text-orange-500"></i>
                              {booking.sessionTitle}
                            </p>
                            {booking.message && (
                              <div className="bg-white/50 rounded-lg p-3 mt-2">
                                <p className="text-sm text-gray-700">{booking.message}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center text-gray-600 text-sm mb-4">
                            <i className="ri-calendar-line mr-2 text-orange-500"></i>
                            <span>신청일: {formatDate(booking.createdAt)}</span>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleConfirmBooking(booking.bookingId)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                            >
                              <i className="ri-check-line mr-1"></i>
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectBooking(booking.bookingId)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                            >
                              <i className="ri-close-line mr-1"></i>
                              거절
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmed Sessions */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <i className="ri-calendar-check-line text-2xl text-white"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">확정된 세션</h2>
                        <p className="text-gray-500 text-sm mt-0.5">다가오는 멘토링 일정</p>
                      </div>
                    </div>
                    {upcomingSessions.length > 0 && (
                      <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold border border-pink-200">
                        {upcomingSessions.length}건
                      </span>
                    )}
                  </div>

                  {upcomingSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <i className="ri-calendar-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500 mb-4">확정된 세션이 없습니다</p>
                      <p className="text-sm text-gray-400">예약 요청을 승인하면 여기에 표시됩니다</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {upcomingSessions.map((session) => (
                        <div
                          key={session.bookingId}
                          className="bg-pink-50 border border-pink-100/50 rounded-xl p-6 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-xl text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">{session.menteeName}</h3>
                                <p className="text-sm text-gray-600">멘티</p>
                              </div>
                            </div>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                              확정
                            </span>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-900">
                              <i className="ri-bookmark-line mr-1 text-pink-500"></i>
                              {session.sessionTitle}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => navigate(`/mentoring/meeting/${session.bookingId}`)}
                              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                            >
                              <i className="ri-video-line mr-2"></i>
                              세션 입장
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('멘토링을 완료 처리하시겠습니까?')) {
                                  try {
                                    await bookingService.completeBooking(session.bookingId);
                                    alert('멘토링이 완료되었습니다.');
                                    fetchData();
                                  } catch (err: any) {
                                    alert(err.message || '멘토링 완료 처리에 실패했습니다.');
                                  }
                                }
                              }}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                            >
                              <i className="ri-checkbox-circle-line mr-2"></i>
                              완료
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <i className="ri-profile-line text-2xl text-white"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">멘토 프로필</h2>
                        <p className="text-gray-500 text-sm mt-0.5">학생들에게 보여지는 정보입니다</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/mentors/${mentorInfo.mentorId}/edit`)}
                      className="text-pink-500 hover:text-pink-600 font-semibold text-sm"
                    >
                      <i className="ri-edit-line mr-1"></i>
                      수정하기
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">회사명</p>
                      <p className="text-base font-medium text-gray-900">{mentorInfo.company}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">직업</p>
                      <p className="text-base font-medium text-gray-900">{mentorInfo.job}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">경력</p>
                      <p className="text-base font-medium text-gray-900">{mentorInfo.experience}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">가능 시간</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(mentorInfo.availableTime).slice(0, 3).map(([day, times]) => (
                          <span key={day} className="bg-pink-50 text-pink-600 px-2 py-1 rounded-md text-xs font-medium border border-pink-100">
                            {day}: {times.length}개
                          </span>
                        ))}
                        {Object.keys(mentorInfo.availableTime).length > 3 && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">
                            +{Object.keys(mentorInfo.availableTime).length - 3}개
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">자기소개</p>
                      <p className="text-gray-800 whitespace-pre-line">{mentorInfo.bio}</p>
                    </div>

                    <div className="md:col-span-2 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">경력 사항</p>
                      <p className="text-gray-800 whitespace-pre-line">{mentorInfo.career}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                      <i className="ri-settings-3-line text-2xl text-white"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">계정 정보</h2>
                      <p className="text-gray-500 text-sm mt-0.5">개인정보를 확인하고 관리하세요</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">이름</p>
                      <p className="text-base font-medium text-gray-900">{userProfile.name}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">아이디</p>
                      <p className="text-base font-medium text-gray-900">{userProfile.username}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">이메일</p>
                      <p className="text-base font-medium text-gray-900">{userProfile.email || '미등록'}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">전화번호</p>
                      <p className="text-base font-medium text-gray-900">{userProfile.phone || '미등록'}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">생년월일</p>
                      <p className="text-base font-medium text-gray-900">
                        {userProfile.birth ? formatDate(userProfile.birth) : '미등록'}
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">가입일</p>
                      <p className="text-base font-medium text-gray-900">{formatDate(userProfile.createdAt)}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">계정 상태</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                        userProfile.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {userProfile.isActive ? '활성' : '비활성'}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">역할</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                        <i className="ri-medal-line mr-1"></i>
                        멘토
                      </span>
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
