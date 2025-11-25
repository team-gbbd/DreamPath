import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '@/lib/api';
import Header from '@/components/feature/Header';
import { useToast } from '@/components/common/Toast';

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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<MentorApplication[]>([]);
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
    // TODO: 실제로는 사용자의 role을 확인해야 함
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await mentorService.getAllApplications();
      setApplications(data);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      const apiError = err as { response?: { data?: string } };
      setError(apiError.response?.data || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
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
          <i className="ri-error-warning-line text-6xl text-red-400 mb-4"></i>
          <p className="text-lg text-gray-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = applications.filter(app => app.status === 'PENDING').length;
  const approvedCount = applications.filter(app => app.status === 'APPROVED').length;
  const rejectedCount = applications.filter(app => app.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center">
                <i className="ri-dashboard-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-gray-600">멘토 신청 관리 시스템</p>
              </div>
            </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* 전체 신청 */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/mentor-applications')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                  <i className="ri-file-list-line text-2xl text-pink-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 신청</p>
              <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
            </div>

            {/* 승인 대기 */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-yellow-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/mentor-applications?status=PENDING')}
            >
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
              {pendingCount > 0 && (
                <p className="text-xs text-yellow-700 mt-2 flex items-center">
                  <i className="ri-arrow-right-s-line mr-1"></i>
                  클릭하여 확인
                </p>
              )}
            </div>

            {/* 승인됨 */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/mentor-applications?status=APPROVED')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">승인됨</p>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </div>

            {/* 거절됨 */}
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-red-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/mentor-applications?status=REJECTED')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <i className="ri-close-circle-line text-2xl text-red-600"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">거절됨</p>
              <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-flashlight-line text-pink-500 mr-3"></i>
              빠른 작업
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/admin/mentor-applications')}
                className="flex items-center justify-between p-5 bg-pink-50 border border-pink-100/50 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-list-check text-pink-500 text-2xl"></i>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-base">모든 신청 보기</h3>
                    <p className="text-sm text-gray-600">전체 멘토 신청 목록 확인</p>
                  </div>
                </div>
                <i className="ri-arrow-right-line text-xl text-pink-500 group-hover:translate-x-1 transition-transform"></i>
              </button>

              <button
                onClick={() => navigate('/admin/mentor-applications?status=PENDING')}
                className="flex items-center justify-between p-5 bg-yellow-50 border border-yellow-100/50 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mr-4">
                    <i className="ri-alert-line text-yellow-500 text-2xl"></i>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-base">
                      대기 중 처리
                      {pendingCount > 0 && (
                        <span className="ml-2 text-yellow-600">({pendingCount})</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">승인 대기 중인 신청 검토</p>
                  </div>
                </div>
                <i className="ri-arrow-right-line text-xl text-yellow-600 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-xl shadow-md border-2 border-pink-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <i className="ri-history-line text-pink-500 mr-3"></i>
                최근 신청
              </h2>
              <button
                onClick={() => navigate('/admin/mentor-applications')}
                className="text-pink-500 hover:text-pink-600 font-bold transition-colors"
              >
                전체 보기 <i className="ri-arrow-right-line ml-1"></i>
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">아직 멘토 신청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div
                    key={app.mentorId}
                    className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-pink-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/admin/mentor-applications?highlight=${app.mentorId}`)}
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mr-4">
                        <i className="ri-user-line text-white text-lg"></i>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">사용자 ID: {app.userId}</p>
                        <p className="text-sm text-gray-600 truncate max-w-md">{app.bio.substring(0, 60)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      {app.status === 'PENDING' && (
                        <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded-full text-sm font-bold">
                          대기 중
                        </span>
                      )}
                      {app.status === 'APPROVED' && (
                        <span className="bg-green-100 text-green-800 border border-green-300 px-3 py-1 rounded-full text-sm font-bold">
                          승인됨
                        </span>
                      )}
                      {app.status === 'REJECTED' && (
                        <span className="bg-red-100 text-red-800 border border-red-300 px-3 py-1 rounded-full text-sm font-bold">
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
      </div>
    </div>
  );
}
