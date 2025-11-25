import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, paymentService, userService, bookingService } from '@/lib/api';
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

      const pathsResponse = await fetch(`http://localhost:8080/api/learning-paths/user/${userId}`);
      if (!pathsResponse.ok) throw new Error('학습 경로를 불러오는데 실패했습니다.');
      const pathsData = await pathsResponse.json();
      setLearningPaths(pathsData);

      try {
        const mentorData = await mentorService.getMyApplication(userId);
        setMentorApplication(mentorData);
      } catch (err: any) {
        // 204 No Content (멘토 신청 없음) 또는 404는 정상적인 상황이므로 로그 출력 안 함
        if (err.response?.status !== 404 && err.response?.status !== 204) {
          console.error('멘토 신청 현황 조회 실패:', err);
        }
      }

      try {
        const sessions = await paymentService.getRemainingSessions(userId);
        setRemainingSessions(sessions);
      } catch (err: any) {
        console.error('잔여 횟수 조회 실패:', err);
      }

      try {
        const bookingsData = await bookingService.getMyBookings(userId);
        setMyBookings(bookingsData);
      } catch (err: any) {
        console.error('예약 목록 조회 실패:', err);
      }

    } catch (err: any) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-5xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!userProfile) return null;

  const totalPaths = learningPaths.length;
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
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-user-line text-3xl text-white"></i>
                </div>
                <h2 className="text-center text-lg font-semibold text-gray-900 mb-1">{userProfile.name}</h2>
                <p className="text-center text-sm text-gray-500">{userProfile.username}</p>
                <div className="flex justify-center mt-3">
                  <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-md text-xs font-medium border border-pink-100">
                    학생
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Summary - Soft Card Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                        <i className="ri-line-chart-line text-2xl text-pink-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">학습 진행률</p>
                    <p className="text-3xl font-bold text-gray-900">{overallProgress}<span className="text-xl text-gray-500">%</span></p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center">
                        <i className="ri-checkbox-circle-line text-2xl text-purple-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">완료한 주차</p>
                    <p className="text-3xl font-bold text-gray-900">{completedWeeks}<span className="text-xl text-gray-500">/{totalWeeks}</span></p>
                  </div>

                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate(remainingSessions === 0 ? '/payments/purchase' : '/payments/history')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                        <i className="ri-ticket-line text-2xl text-orange-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">잔여 멘토링 횟수</p>
                    <p className="text-3xl font-bold text-gray-900">{remainingSessions}<span className="text-xl text-gray-500">회</span></p>
                  </div>
                </div>

                {/* Career Summary - Soft Card */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                      <i className="ri-compass-3-line text-2xl text-white"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">나의 진로 요약</h2>
                      <p className="text-gray-500 text-sm mt-0.5">AI가 분석한 당신의 진로 방향</p>
                    </div>
                  </div>

                  {learningPaths.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-pink-50 rounded-xl p-6 border border-pink-100/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold text-gray-900 flex items-center">
                            <i className="ri-star-fill text-pink-500 mr-2"></i>
                            추천 직업
                          </h3>
                          <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                            TOP 1
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-pink-600 mb-2">{learningPaths[0].domain}</div>
                        <p className="text-gray-600 text-sm">현재 학습 중인 경로입니다</p>
                      </div>

                      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="ri-sparkle-fill text-green-500 mr-2"></i>
                          강점 분석
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <i className="ri-check-line text-green-600 text-sm"></i>
                            </div>
                            <span className="text-gray-700 text-sm">꾸준한 학습 의지</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <i className="ri-check-line text-green-600 text-sm"></i>
                            </div>
                            <span className="text-gray-700 text-sm">체계적인 학습 접근</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <i className="ri-check-line text-green-600 text-sm"></i>
                            </div>
                            <span className="text-gray-700 text-sm">진로에 대한 명확한 목표</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-compass-line text-4xl text-gray-300"></i>
                      </div>
                      <p className="text-gray-500 mb-6">아직 진로 분석 데이터가 없습니다</p>
                      <button
                        onClick={() => navigate('/career-chat')}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-xl transition-all font-medium"
                      >
                        <i className="ri-chat-3-line mr-2"></i>
                        AI 진로 상담 시작하기
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Learning */}
                {learningPaths.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-pink-400 rounded-lg flex items-center justify-center mr-3">
                            <i className="ri-book-open-line text-xl text-white"></i>
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">최근 학습</h2>
                            <p className="text-gray-500 text-sm">진행 중인 학습 로드맵</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('learning')}
                          className="text-pink-600 hover:text-pink-700 font-medium text-sm"
                        >
                          전체 보기 <i className="ri-arrow-right-line ml-1"></i>
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      {learningPaths.slice(0, 1).map((path) => {
                        const progress = calculateProgress(path);
                        const totalWeeks = path.weeklySessions?.length || 0;
                        const completedWeeks = path.weeklySessions?.filter(w => w.isCompleted).length || 0;

                        return (
                          <div key={path.pathId} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{path.domain}</h3>
                                <p className="text-sm text-gray-500">
                                  <i className="ri-calendar-line mr-1"></i>
                                  {formatDate(path.createdAt)} 시작
                                </p>
                              </div>
                              <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg text-base font-semibold">
                                {progress}%
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>진행률</span>
                                <span>{completedWeeks} / {totalWeeks} 주차</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/learning/${path.pathId}`)}
                              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-lg font-medium transition-all"
                            >
                              <i className="ri-play-circle-line mr-2"></i>
                              학습 이어하기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Learning Tab */}
            {activeTab === 'learning' && (
              <div className="space-y-6">
                {/* Dashboard Quick Access Card */}
                {learningPaths.length > 0 && (
                  <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-pink-200/50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl flex items-center justify-center mr-4 shadow-md">
                          <i className="ri-dashboard-line text-2xl text-white"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">학습 대시보드</h3>
                          <p className="text-sm text-gray-600">주차별 상세 분석, 통계, 약점 분석을 확인하세요</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/learning/dashboard')}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        대시보드 열기
                        <i className="ri-arrow-right-line ml-2"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pink-400 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-book-open-line text-xl text-white"></i>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">학습 로드맵</h2>
                        <p className="text-gray-500 text-sm">주차별 학습 현황을 확인하세요</p>
                      </div>
                    </div>
                  </div>

                  {learningPaths.length === 0 ? (
                    <div className="p-12 text-center">
                      <i className="ri-book-2-line text-5xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500 mb-6">아직 시작한 학습 경로가 없습니다</p>
                      <button
                        onClick={() => navigate('/career-chat')}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-lg transition-all font-medium"
                      >
                        <i className="ri-rocket-line mr-2"></i>
                        학습 시작하기
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 space-y-6">
                      {learningPaths.map((path) => {
                        const progress = calculateProgress(path);
                        const totalWeeks = path.weeklySessions?.length || 0;
                        const completedWeeks = path.weeklySessions?.filter(w => w.isCompleted).length || 0;

                        return (
                          <div
                            key={path.pathId}
                            className="border border-gray-200 rounded-lg p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{path.domain}</h3>
                                <p className="text-sm text-gray-500">
                                  <i className="ri-calendar-line mr-1"></i>
                                  {formatDate(path.createdAt)} 시작
                                </p>
                              </div>
                              <div className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-4 py-2 rounded-lg text-base font-semibold">
                                {progress}%
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3 mb-4">
                              {path.weeklySessions?.map((week) => (
                                <div
                                  key={week.weeklyId}
                                  className={`p-3 rounded-lg text-center ${
                                    week.isCompleted
                                      ? 'bg-green-50 border border-green-200'
                                      : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <div className="text-xl mb-1">
                                    {week.isCompleted ? (
                                      <i className="ri-checkbox-circle-fill text-green-500"></i>
                                    ) : (
                                      <i className="ri-lock-line text-gray-400"></i>
                                    )}
                                  </div>
                                  <div className="text-xs font-medium text-gray-700">{week.weekNumber}주차</div>
                                </div>
                              ))}
                            </div>

                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>진행률</span>
                                <span>{completedWeeks} / {totalWeeks} 주차</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-gradient-to-r from-pink-400 to-purple-400 h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/learning/${path.pathId}`)}
                              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-lg font-medium transition-all"
                            >
                              <i className="ri-play-circle-line mr-2"></i>
                              학습 이어하기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mentoring Tab */}
            {activeTab === 'mentoring' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate(remainingSessions === 0 ? '/payments/purchase' : '/payments/history')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <i className="ri-ticket-line text-2xl text-orange-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">잔여 멘토링 횟수</p>
                    <p className="text-3xl font-bold text-gray-900">{remainingSessions}<span className="text-xl text-gray-500">회</span></p>
                  </div>

                  <div
                    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate('/mentoring')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                        <i className="ri-search-line text-2xl text-purple-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">멘토 찾기</p>
                    <p className="text-base font-semibold text-purple-600">세션 둘러보기</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                        <i className="ri-calendar-check-line text-2xl text-pink-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">내 예약</p>
                    <p className="text-3xl font-bold text-gray-900">{myBookings.length}<span className="text-xl text-gray-500">건</span></p>
                  </div>
                </div>

                {/* My Bookings */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-pink-400 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <i className="ri-calendar-line text-2xl text-white"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">나의 예약</h2>
                        <p className="text-gray-500 text-sm mt-0.5">예약한 멘토링 세션 목록</p>
                      </div>
                    </div>
                  </div>

                  {myBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <i className="ri-calendar-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500 mb-4">예약한 세션이 없습니다</p>
                      <p className="text-sm text-gray-400 mb-6">멘토링 세션을 예약해보세요</p>
                      <button
                        onClick={() => navigate('/mentoring')}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-lg transition-all font-medium"
                      >
                        <i className="ri-search-line mr-2"></i>
                        세션 찾아보기
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myBookings.map((booking) => (
                        <div
                          key={booking.bookingId}
                          className={`rounded-xl p-6 border ${
                            booking.status === 'PENDING' ? 'bg-yellow-50 border-yellow-100/50' :
                            booking.status === 'CONFIRMED' ? 'bg-green-50 border-green-100/50' :
                            booking.status === 'REJECTED' ? 'bg-red-50 border-red-100/50' :
                            booking.status === 'CANCELLED' ? 'bg-gray-50 border-gray-100/50' :
                            'bg-blue-50 border-blue-100/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                booking.status === 'PENDING' ? 'bg-yellow-400' :
                                booking.status === 'CONFIRMED' ? 'bg-green-400' :
                                booking.status === 'REJECTED' ? 'bg-red-400' :
                                booking.status === 'CANCELLED' ? 'bg-gray-400' :
                                'bg-blue-400'
                              }`}>
                                <i className="ri-user-star-line text-xl text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">{booking.mentorName}</h3>
                                <p className="text-sm text-gray-600">멘토</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 border-green-200' :
                              booking.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                              booking.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                              'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                              {booking.status === 'PENDING' && '승인 대기'}
                              {booking.status === 'CONFIRMED' && '확정'}
                              {booking.status === 'REJECTED' && '거절됨'}
                              {booking.status === 'CANCELLED' && '취소됨'}
                              {booking.status === 'COMPLETED' && '완료'}
                            </span>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-900 mb-2">
                              <i className={`ri-bookmark-line mr-1 ${
                                booking.status === 'PENDING' ? 'text-yellow-500' :
                                booking.status === 'CONFIRMED' ? 'text-green-500' :
                                booking.status === 'REJECTED' ? 'text-red-500' :
                                booking.status === 'CANCELLED' ? 'text-gray-500' :
                                'text-blue-500'
                              }`}></i>
                              {booking.sessionTitle}
                            </p>
                            {booking.rejectionReason && (
                              <div className="bg-white/50 rounded-lg p-3 mt-2">
                                <p className="text-sm text-red-700 font-medium">거절 사유:</p>
                                <p className="text-sm text-gray-700">{booking.rejectionReason}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center text-gray-600 text-sm mb-4">
                            <i className={`ri-calendar-line mr-2 ${
                              booking.status === 'PENDING' ? 'text-yellow-500' :
                              booking.status === 'CONFIRMED' ? 'text-green-500' :
                              booking.status === 'REJECTED' ? 'text-red-500' :
                              booking.status === 'CANCELLED' ? 'text-gray-500' :
                              'text-blue-500'
                            }`}></i>
                            <span>신청일: {formatDate(booking.createdAt)}</span>
                          </div>

                          {booking.status === 'CONFIRMED' && (
                            <button
                              onClick={() => navigate(`/mentoring/meeting/${booking.bookingId}`)}
                              className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
                            >
                              <i className="ri-video-line mr-2"></i>
                              세션 입장하기
                            </button>
                          )}
                          {booking.status === 'PENDING' && (
                            <div className="text-center text-sm text-gray-600">
                              <i className="ri-time-line mr-1"></i>
                              멘토의 승인을 기다리고 있습니다
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mentor Application */}
                {mentorApplication ? (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">멘토 신청 현황</h3>
                      {mentorApplication.status === 'PENDING' && (
                        <span className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-md text-sm font-medium border border-yellow-200">
                          <i className="ri-time-line mr-1"></i>
                          승인 대기 중
                        </span>
                      )}
                      {mentorApplication.status === 'APPROVED' && (
                        <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-md text-sm font-medium border border-green-200">
                          <i className="ri-checkbox-circle-line mr-1"></i>
                          승인됨
                        </span>
                      )}
                      {mentorApplication.status === 'REJECTED' && (
                        <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-md text-sm font-medium border border-red-200">
                          <i className="ri-close-circle-line mr-1"></i>
                          거절됨
                        </span>
                      )}
                    </div>

                    {mentorApplication.status === 'APPROVED' && (
                      <button
                        onClick={() => navigate('/mypage/mentor')}
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-lg font-medium transition-all"
                      >
                        멘토 대시보드로 이동 <i className="ri-arrow-right-line ml-2"></i>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-purple-100/50 to-blue-100/50 rounded-2xl p-8 text-center border border-purple-200/30">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-user-star-line text-white text-3xl"></i>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">멘토가 되어보세요!</h3>
                    <p className="text-gray-600 mb-6">
                      후배들의 성장을 도와주실 멘토를 모집합니다.
                    </p>
                    <button
                      onClick={() => navigate('/mentor/apply')}
                      className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-8 py-3 rounded-lg hover:shadow-md transition-all font-semibold"
                    >
                      <i className="ri-send-plane-fill mr-2"></i>
                      멘토 신청하기
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-pink-400 rounded-lg flex items-center justify-center mr-3">
                          <i className="ri-settings-3-line text-xl text-white"></i>
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
                          <p className="text-gray-500 text-sm">개인정보를 확인하고 관리하세요</p>
                        </div>
                      </div>
                      <button
                        className="text-pink-600 hover:text-pink-700 font-medium text-sm"
                        onClick={() => alert('개인정보 수정 기능은 추후 구현 예정입니다.')}
                      >
                        <i className="ri-edit-line mr-1"></i>
                        수정하기
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
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
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-pink-50 text-pink-600 border border-pink-100">
                          {userProfile.role === 'USER' ? '학생' : userProfile.role}
                        </span>
                      </div>
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
