import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, mentorService } from '@/lib/api';
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

interface MentorApplication {
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

type TabType = 'dashboard' | 'applications' | 'account';

export default function AdminMyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<MentorApplication[]>([]);

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

      // 멘토 신청 데이터 가져오기
      try {
        const applicationsData = await mentorService.getAllApplications();
        setApplications(applicationsData);
      } catch (err) {
        console.error('멘토 신청 데이터 로딩 실패:', err);
      }
    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
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
  };

  if (!userProfile) return null;

  const pendingCount = applications.filter(app => app.status === 'PENDING').length;
  const approvedCount = applications.filter(app => app.status === 'APPROVED').length;
  const rejectedCount = applications.filter(app => app.status === 'REJECTED').length;

  const tabs = [
    { id: 'dashboard' as TabType, label: '대시보드', icon: 'ri-dashboard-line' },
    { id: 'applications' as TabType, label: '멘토 신청 관리', icon: 'ri-user-star-line' },
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
                <div className="w-16 h-16 bg-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-shield-user-line text-3xl text-white"></i>
                </div>
                <h2 className="text-center text-lg font-semibold text-gray-900 mb-1">{userProfile.name}</h2>
                <p className="text-center text-sm text-gray-500">시스템 관리자</p>
                <div className="flex justify-center mt-3">
                  <span className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs font-medium border border-red-100">
                    관리자
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
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                        <i className="ri-file-list-line text-2xl text-pink-500"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">전체 신청</p>
                    <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-yellow-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                        <i className="ri-time-line text-2xl text-yellow-600"></i>
                      </div>
                      {pendingCount > 0 && (
                        <span className="bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">승인 대기</p>
                    <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">승인됨</p>
                    <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-red-100/50 p-6 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                        <i className="ri-close-circle-line text-2xl text-red-600"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">거절됨</p>
                    <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
                  </div>
                </div>

                {/* Recent Applications */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <i className="ri-history-line text-pink-500 mr-3"></i>
                      최근 신청
                    </h2>
                    <button
                      onClick={() => setActiveTab('applications')}
                      className="text-pink-500 hover:text-pink-600 font-semibold text-sm transition-colors"
                    >
                      전체 보기 <i className="ri-arrow-right-line ml-1"></i>
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="text-center py-12 bg-pink-50/50 rounded-xl">
                      <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500">아직 멘토 신청이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications.slice(0, 5).map((app) => (
                        <div
                          key={app.mentorId}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-pink-200 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setActiveTab('applications')}
                        >
                          <div className="flex items-center flex-1">
                            <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center mr-4">
                              <i className="ri-user-line text-white text-lg"></i>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{app.company} - {app.job}</p>
                              <p className="text-sm text-gray-600 truncate max-w-md">{app.bio.substring(0, 60)}...</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                            </span>
                            {app.status === 'PENDING' && (
                              <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-md text-sm font-medium">
                                대기 중
                              </span>
                            )}
                            {app.status === 'APPROVED' && (
                              <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md text-sm font-medium">
                                승인됨
                              </span>
                            )}
                            {app.status === 'REJECTED' && (
                              <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-md text-sm font-medium">
                                거절됨
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mr-4">
                        <i className="ri-user-star-line text-2xl text-pink-500"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">멘토 신청 관리</h2>
                        <p className="text-gray-500 text-sm mt-0.5">멘토 신청을 검토하고 승인/거절하세요</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/admin/mentor-applications')}
                      className="text-pink-500 hover:text-pink-600 font-semibold text-sm transition-colors"
                    >
                      상세 페이지 <i className="ri-arrow-right-line ml-1"></i>
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="text-center py-12 bg-pink-50/50 rounded-xl">
                      <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-500">아직 멘토 신청이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div
                          key={app.mentorId}
                          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-pink-200 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center mr-4">
                                <i className="ri-user-line text-white text-xl"></i>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{app.company} - {app.job}</h3>
                                <p className="text-sm text-gray-500">경력: {app.experience}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {app.status === 'PENDING' && (
                                <>
                                  <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-md text-sm font-medium">
                                    대기 중
                                  </span>
                                  <button
                                    onClick={() => navigate('/admin/mentor-applications')}
                                    className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                  >
                                    검토하기
                                  </button>
                                </>
                              )}
                              {app.status === 'APPROVED' && (
                                <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-md text-sm font-medium">
                                  승인됨
                                </span>
                              )}
                              {app.status === 'REJECTED' && (
                                <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-md text-sm font-medium">
                                  거절됨
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">자기소개</p>
                              <p className="text-gray-700 text-sm">{app.bio.substring(0, 150)}{app.bio.length > 150 ? '...' : ''}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">경력 사항</p>
                              <p className="text-gray-700 text-sm">{app.career.substring(0, 150)}{app.career.length > 150 ? '...' : ''}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-sm text-gray-500">
                                신청일: {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                              <button
                                onClick={() => navigate('/admin/mentor-applications')}
                                className="text-pink-500 hover:text-pink-600 text-sm font-medium transition-colors"
                              >
                                상세 보기 <i className="ri-arrow-right-line ml-1"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mr-4">
                      <i className="ri-user-settings-line text-2xl text-pink-500"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">관리자 계정 정보</h2>
                      <p className="text-gray-500 text-sm mt-0.5">관리자 계정 정보를 확인하세요</p>
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
                      <p className="text-sm text-gray-500 mb-1">가입일</p>
                      <p className="text-base font-medium text-gray-900">{formatDate(userProfile.createdAt)}</p>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">권한</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-100">
                        <i className="ri-shield-star-line mr-1"></i>
                        {userProfile.role}
                      </span>
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
                      <p className="text-sm text-gray-500 mb-1">관리 레벨</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        최고 관리자
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="bg-red-50 border border-red-100/50 rounded-2xl shadow-sm p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mr-4">
                      <i className="ri-alert-line text-2xl text-red-500"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">보안 주의사항</h3>
                      <p className="text-sm text-gray-600 mt-0.5">관리자 계정 보안 안내</p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center">
                      <i className="ri-shield-check-line text-red-600 mr-2"></i>
                      관리자 계정은 시스템 전체 권한을 가집니다
                    </li>
                    <li className="flex items-center">
                      <i className="ri-shield-check-line text-red-600 mr-2"></i>
                      비밀번호는 정기적으로 변경해주세요
                    </li>
                    <li className="flex items-center">
                      <i className="ri-shield-check-line text-red-600 mr-2"></i>
                      로그인 정보를 타인과 공유하지 마세요
                    </li>
                    <li className="flex items-center">
                      <i className="ri-shield-check-line text-red-600 mr-2"></i>
                      의심스러운 활동이 발견되면 즉시 보고하세요
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
