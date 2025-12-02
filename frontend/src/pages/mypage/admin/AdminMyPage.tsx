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

      try {
        const applicationsData = await mentorService.getAllApplications();
        setApplications(applicationsData);
      } catch (err) {
        console.error('멘토 신청 데이터 로딩 실패:', err);
      }
    } catch (err) {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userProfile) return null;

  const pendingCount = applications.filter(app => app.status === 'PENDING').length;
  const approvedCount = applications.filter(app => app.status === 'APPROVED').length;
  const rejectedCount = applications.filter(app => app.status === 'REJECTED').length;

  const tabs = [
    { id: 'dashboard' as TabType, label: '대시보드', icon: 'ri-dashboard-line' },
    { id: 'applications' as TabType, label: '멘토 신청 관리', icon: 'ri-user-star-line' },
    { id: 'account' as TabType, label: '계정 설정', icon: 'ri-settings-3-line' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: '대기중' };
      case 'APPROVED': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: '승인됨' };
      case 'REJECTED': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: '거절됨' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-8">
        <div className="flex gap-6">
          {/* 사이드바 */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg sticky top-24">
              <div className="p-5 border-b border-gray-100">
                <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-shield-user-line text-2xl text-white"></i>
                </div>
                <h2 className="text-center text-sm font-semibold text-gray-900">{userProfile.name}</h2>
                <p className="text-center text-xs text-gray-500 mt-0.5">시스템 관리자</p>
                <div className="flex justify-center mt-2">
                  <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-xs font-medium">관리자</span>
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
                    <span className="w-8 h-8 bg-pink-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-file-list-line text-pink-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">전체 신청</p>
                    <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center">
                        <i className="ri-time-line text-amber-500"></i>
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">승인 대기</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <span className="w-8 h-8 bg-emerald-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-checkbox-circle-line text-emerald-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">승인됨</p>
                    <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <span className="w-8 h-8 bg-rose-50 rounded flex items-center justify-center mb-2">
                      <i className="ri-close-circle-line text-rose-500"></i>
                    </span>
                    <p className="text-xs text-gray-500">거절됨</p>
                    <p className="text-2xl font-bold text-rose-600">{rejectedCount}</p>
                  </div>
                </div>

                {/* 최근 신청 */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                        <i className="ri-history-line text-white"></i>
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">최근 신청</h2>
                        <p className="text-xs text-gray-500">멘토 신청 목록</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('applications')}
                      className="text-xs text-pink-600 hover:text-pink-700"
                    >
                      전체 보기 <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-inbox-line text-2xl text-gray-300"></i>
                      </div>
                      <p className="text-sm text-gray-500">멘토 신청이 없습니다</p>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3">
                      {applications.slice(0, 5).map((app) => {
                        const status = getStatusStyle(app.status);
                        return (
                          <div
                            key={app.mentorId}
                            onClick={() => setActiveTab('applications')}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-pink-200 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-white"></i>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{app.company} - {app.job}</p>
                                <p className="text-xs text-gray-500 truncate max-w-xs">{app.bio.substring(0, 40)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 멘토 신청 관리 */}
            {activeTab === 'applications' && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-user-star-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">멘토 신청 관리</h2>
                      <p className="text-xs text-gray-500">신청을 검토하고 승인/거절하세요</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/mentor-applications')}
                    className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded transition-colors"
                  >
                    상세 페이지
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="ri-inbox-line text-2xl text-gray-300"></i>
                    </div>
                    <p className="text-sm text-gray-500">멘토 신청이 없습니다</p>
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    {applications.map((app) => {
                      const status = getStatusStyle(app.status);
                      return (
                        <div key={app.mentorId} className={`border ${status.border} rounded-lg p-4 ${status.bg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-white"></i>
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">{app.company} - {app.job}</h3>
                                <p className="text-xs text-gray-500">경력: {app.experience}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${status.bg} ${status.text} border ${status.border}`}>
                                {status.label}
                              </span>
                              {app.status === 'PENDING' && (
                                <button
                                  onClick={() => navigate('/admin/mentor-applications')}
                                  className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded transition-colors"
                                >
                                  검토하기
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-0.5">자기소개</p>
                              <p className="text-sm text-gray-700">{app.bio.substring(0, 100)}{app.bio.length > 100 && '...'}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                              <span className="text-xs text-gray-500">
                                신청일: {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                              <button
                                onClick={() => navigate('/admin/mentor-applications')}
                                className="text-xs text-pink-600 hover:text-pink-700"
                              >
                                상세 보기 <i className="ri-arrow-right-s-line"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 계정 설정 */}
            {activeTab === 'account' && (
              <>
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center">
                      <i className="ri-user-settings-line text-white"></i>
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">관리자 계정 정보</h2>
                      <p className="text-xs text-gray-500">계정 정보를 확인하세요</p>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-2 gap-3">
                    {[
                      { label: '이름', value: userProfile.name },
                      { label: '아이디', value: userProfile.username },
                      { label: '이메일', value: userProfile.email || '미등록' },
                      { label: '전화번호', value: userProfile.phone || '미등록' },
                      { label: '가입일', value: formatDate(userProfile.createdAt) },
                    ].map((item, i) => (
                      <div key={i} className="border border-gray-200 rounded p-3">
                        <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                        <p className="text-sm font-medium text-gray-900">{item.value}</p>
                      </div>
                    ))}

                    <div className="border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-500 mb-0.5">권한</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-600">{userProfile.role}</span>
                    </div>

                    <div className="border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-500 mb-0.5">계정 상태</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        userProfile.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {userProfile.isActive ? '활성' : '비활성'}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-500 mb-0.5">관리 레벨</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-600">최고 관리자</span>
                    </div>
                  </div>
                </div>

                {/* 보안 안내 */}
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 bg-rose-500 rounded flex items-center justify-center">
                      <i className="ri-alert-line text-white"></i>
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">보안 주의사항</h3>
                      <p className="text-xs text-gray-600">관리자 계정 보안 안내</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {[
                      '관리자 계정은 시스템 전체 권한을 가집니다',
                      '비밀번호는 정기적으로 변경해주세요',
                      '로그인 정보를 타인과 공유하지 마세요',
                      '의심스러운 활동이 발견되면 즉시 보고하세요',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                        <i className="ri-shield-check-line text-rose-500"></i>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
