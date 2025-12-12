import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, userService, bookingService } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

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
  const { showToast, ToastContainer } = useToast();
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
      showToast('로그인이 필요합니다.', 'warning');
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

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      const apiError = err as { message?: string };
      setError(apiError.message || '데이터를 불러오는 중 오류가 발생했습니다.');
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
      showToast('예약이 승인되었습니다.', 'success');
      fetchData();
    } catch (err) {
      const apiError = err as { message?: string };
      showToast(apiError.message || '예약 승인에 실패했습니다.', 'error');
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await bookingService.rejectBooking(bookingId, reason);
      showToast('예약이 거절되었습니다.', 'success');
      fetchData();
    } catch (err) {
      const apiError = err as { message?: string };
      showToast(apiError.message || '예약 거절에 실패했습니다.', 'error');
    }
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
        <p className="text-gray-500">{error}</p>
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
    <div className="min-h-screen bg-white">
      <ToastContainer />
      

      <div className="max-w-6xl mx-auto px-6 py-8 pb-8">
        <div className="flex gap-6">
          {/* 사이드바 */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg sticky top-24">
              <div className="p-5 border-b border-gray-100">
                <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-star-line text-2xl text-white"></i>
                </div>
                <h2 className="text-center text-sm font-semibold text-gray-900">{userProfile.name}</h2>
                <p className="text-center text-xs text-gray-500 mt-0.5">{mentorInfo.job}</p>
                <div className="flex justify-center mt-2">
                  <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-medium">멘토</span>
                </div>
              </div>

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
            {/* 대시보드 */}
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center">
                        <i className="ri-time-line text-amber-500"></i>
                      </span>
                      {pendingBookings.length > 0 && (
                        <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center">
                          {pendingBookings.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">예약 요청</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingBookings.length}<span className="text-sm text-gray-400">건</span></p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <span className="w-8 h-8 bg-pink-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-checkbox-circle-line text-pink-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">완료한 멘토링</p>
                    <p className="text-2xl font-bold text-gray-900">{completedSessions}<span className="text-sm text-gray-400">회</span></p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <span className="w-8 h-8 bg-violet-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-calendar-line text-violet-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">예정된 세션</p>
                    <p className="text-2xl font-bold text-gray-900">{upcomingSessions.length}<span className="text-sm text-gray-400">건</span></p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <span className="w-8 h-8 bg-emerald-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-star-line text-emerald-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">평균 평점</p>
                    <p className="text-2xl font-bold text-gray-900">{completedSessions > 0 ? '4.8' : '-'}</p>
                  </div>
                </div>

                {/* 퀵 액션 */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: 'ri-calendar-line', color: 'pink', label: '세션 관리', desc: '예약된 멘토링 확인', action: () => setActiveTab('sessions') },
                    { icon: 'ri-edit-line', color: 'violet', label: '프로필 수정', desc: '멘토 정보 업데이트', action: () => setActiveTab('profile') },
                    { icon: 'ri-history-line', color: 'emerald', label: '히스토리', desc: '멘토링 기록 보기', action: () => navigate('/mypage/bookings') },
                  ].map((item, i) => (
                    <div
                      key={i}
                      onClick={item.action}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-pink-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`w-10 h-10 bg-${item.color}-500 rounded-lg flex items-center justify-center`}>
                          <i className={`${item.icon} text-white`}></i>
                        </span>
                        <i className="ri-arrow-right-s-line text-gray-400"></i>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{item.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* 통계 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-bar-chart-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">멘토링 통계</h2>
                      <p className="text-xs text-gray-500">활동 현황</p>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-4 gap-4">
                    {[
                      { value: pendingBookings.length, label: '예약 요청', color: 'amber' },
                      { value: completedSessions, label: '완료 멘토링', color: 'pink' },
                      { value: upcomingSessions.length, label: '예정 세션', color: 'violet' },
                      { value: completedSessions > 0 ? '4.8' : '-', label: '평균 평점', color: 'emerald' },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-${stat.color}-50 rounded-lg p-4 text-center`}>
                        <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                        <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 세션 관리 */}
            {activeTab === 'sessions' && (
              <>
                {/* 예약 요청 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                        <i className="ri-time-line text-white"></i>
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">예약 요청</h2>
                        <p className="text-xs text-gray-500">승인 대기 중인 예약</p>
                      </div>
                    </div>
                    {pendingBookings.length > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">{pendingBookings.length}건</span>
                    )}
                  </div>

                  {pendingBookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-checkbox-circle-line text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-sm text-gray-500">대기 중인 예약이 없습니다</p>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3">
                      {pendingBookings.map((booking) => (
                        <div key={booking.bookingId} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">{booking.menteeName}</h3>
                                <p className="text-xs text-gray-500">멘티</p>
                              </div>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded">승인 대기</span>
                          </div>

                          <p className="text-sm font-medium text-gray-900 mb-2">{booking.sessionTitle}</p>
                          {booking.message && (
                            <div className="bg-white/50 rounded p-2 mb-2">
                              <p className="text-xs text-gray-700">{booking.message}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mb-3">신청일: {formatDate(booking.createdAt)}</p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmBooking(booking.bookingId)}
                              className="flex-1 text-sm bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded transition-colors"
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectBooking(booking.bookingId)}
                              className="flex-1 text-sm bg-rose-500 hover:bg-rose-600 text-white py-2 rounded transition-colors"
                            >
                              거절
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 확정된 세션 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                        <i className="ri-calendar-check-line text-white"></i>
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">확정된 세션</h2>
                        <p className="text-xs text-gray-500">다가오는 멘토링</p>
                      </div>
                    </div>
                    {upcomingSessions.length > 0 && (
                      <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded">{upcomingSessions.length}건</span>
                    )}
                  </div>

                  {upcomingSessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-calendar-line text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-sm text-gray-500">확정된 세션이 없습니다</p>
                    </div>
                  ) : (
                    <div className="p-5 grid grid-cols-2 gap-4">
                      {upcomingSessions.map((session) => (
                        <div key={session.bookingId} className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">{session.menteeName}</h3>
                                <p className="text-xs text-gray-500">멘티</p>
                              </div>
                            </div>
                            <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">확정</span>
                          </div>

                          <p className="text-sm font-medium text-gray-900 mb-3">{session.sessionTitle}</p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/mentoring/meeting/${session.bookingId}`)}
                              className="flex-1 text-sm bg-pink-500 hover:bg-pink-600 text-white py-2 rounded transition-colors"
                            >
                              세션 입장
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('멘토링을 완료 처리하시겠습니까?')) {
                                  try {
                                    await bookingService.completeBooking(session.bookingId);
                                    showToast('멘토링이 완료되었습니다.', 'success');
                                    fetchData();
                                  } catch (err) {
                                    const apiError = err as { message?: string };
                                    showToast(apiError.message || '완료 처리 실패', 'error');
                                  }
                                }
                              }}
                              className="flex-1 text-sm bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded transition-colors"
                            >
                              완료
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 프로필 */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-profile-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">멘토 프로필</h2>
                      <p className="text-xs text-gray-500">학생들에게 보여지는 정보</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/mypage/mentor/edit')}
                    className="text-xs text-pink-600 hover:text-pink-700"
                  >
                    <i className="ri-edit-line mr-1"></i>수정하기
                  </button>
                </div>

                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: '회사명', value: mentorInfo.company },
                    { label: '직업', value: mentorInfo.job },
                    { label: '경력', value: mentorInfo.experience },
                  ].map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}

                  <div className="border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-500 mb-1">가능 시간</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(mentorInfo.availableTime).slice(0, 3).map(([day, times]) => (
                        <span key={day} className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">
                          {day}: {times.length}개
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-500 mb-1">자기소개</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line">{mentorInfo.bio}</p>
                  </div>

                  <div className="col-span-2 border border-gray-200 rounded p-3">
                    <p className="text-xs text-gray-500 mb-1">경력 사항</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line">{mentorInfo.career}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 계정 설정 */}
            {activeTab === 'account' && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                    <i className="ri-settings-3-line text-white"></i>
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">계정 정보</h2>
                    <p className="text-xs text-gray-500">개인정보 확인 및 관리</p>
                  </div>
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
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-600">멘토</span>
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
