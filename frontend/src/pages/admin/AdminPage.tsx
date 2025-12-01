import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header.tsx';
import { useToast } from '@/components/common/Toast.tsx';

export default function AdminPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [faqCount, setFaqCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);

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

  const getUserRole = (): string | null => {
    try {
      const userStr = localStorage.getItem('dreampath:user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch {
      return null;
    }
  };

  const userId = getLoggedInUserId();
  const userRole = getUserRole();

  useEffect(() => {
    if (!userId) {
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }

    // if (userRole !== 'ADMIN') {
    //   showToast('관리자만 접근 가능합니다.', 'error');
    //   navigate('/');
    //   return;
    // }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const faqResponse = await fetch('http://localhost:8080/api/faq/all');
      if (faqResponse.ok) {
        const faqData = await faqResponse.json();
        setFaqCount(faqData.length);
      }

      const inquiryResponse = await fetch('http://localhost:8080/api/inquiry/all');
      if (inquiryResponse.ok) {
        const inquiryData = await inquiryResponse.json();
        // 미답변 개수만 세기
        const unansweredCount = inquiryData.filter((inquiry: any) => !inquiry.answered).length;
        setInquiryCount(unansweredCount);
      }
    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <i className="ri-admin-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-gray-600">시스템 관리 및 콘텐츠 관리</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/faq')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <i className="ri-question-answer-line text-2xl text-blue-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">FAQ</p>
              <p className="text-3xl font-bold text-gray-900">{faqCount}</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center">
                <i className="ri-arrow-right-s-line mr-1"></i>
                관리하기
              </p>
            </div>

            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-indigo-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate('/admin/inquiries')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <i className="ri-mail-line text-2xl text-indigo-500"></i>
                </div>
                {inquiryCount > 0 && (
                  <span className="bg-indigo-400 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {inquiryCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-1">미답변 문의</p>
              <p className="text-3xl font-bold text-gray-900">{inquiryCount}</p>
              <p className="text-xs text-indigo-600 mt-2 flex items-center">
                <i className="ri-arrow-right-s-line mr-1"></i>
                확인하기
              </p>
            </div>

            <div
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => showToast('개발 예정입니다.', 'info')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <i className="ri-user-settings-line text-2xl text-purple-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">사용자 관리</p>
              <p className="text-3xl font-bold text-gray-900">-</p>
              <p className="text-xs text-purple-600 mt-2 flex items-center">
                <i className="ri-time-line mr-1"></i>
                개발 예정
              </p>
            </div>
              <div
                  className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100/50 p-6 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => showToast('개발 예정입니다.', 'info')}
              >
                  <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                          <i className="ri-user-settings-line text-2xl text-purple-500"></i>
                      </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">멘토 관리</p>
                  <p className="text-3xl font-bold text-gray-900">-</p>
                  <p className="text-xs text-purple-600 mt-2 flex items-center">
                      <i className="ri-time-line mr-1"></i>
                      개발 예정
                  </p>
              </div>
          </div>

            {/* FAQ 관리 */}
            <div className="bg-white rounded-xl shadow-md border-2 border-blue-200 p-8 mb-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <i className="ri-question-answer-line text-blue-500 mr-3"></i>
                        FAQ 관리
                    </h2>
                </div>

                <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-edit-2-line text-4xl text-blue-500"></i>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-2">FAQ 콘텐츠 관리</p>
                    <p className="text-gray-600 mb-2">FAQ를 추가하거나 수정, 삭제할 수 있습니다.</p>
                    <p className="text-sm text-gray-500 mb-6">총 {faqCount}개의 FAQ</p>
                    <button
                        onClick={() => navigate('/admin/faq')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
                    >
                        <i className="ri-settings-4-line"></i>
                        FAQ 관리하기
                    </button>
                </div>
            </div>


            <div className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <i className="ri-mail-line text-indigo-500 mr-3"></i>
                문의 관리
              </h2>
            </div>

            <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-customer-service-line text-4xl text-indigo-500"></i>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">사용자 문의 관리</p>
              <p className="text-gray-600 mb-2">챗봇을 통해 접수된 문의를 확인하고 답변할 수 있습니다.</p>
              <p className="text-sm text-gray-500 mb-6">{inquiryCount}개의 미답변 문의</p>
              <button
                onClick={() => navigate('/admin/inquiries')}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
              >
                <i className="ri-mail-open-line"></i>
                문의 확인 및 답변하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
