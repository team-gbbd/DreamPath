import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/Toast.tsx';
import { authFetch } from '@/lib/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [faqCount, setFaqCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [mentorCount, setMentorCount] = useState(0);
  const [pendingMentorCount, setPendingMentorCount] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-white/[0.15]"
      : "hover:shadow-md hover:border-slate-300",
    statCard: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white/70 backdrop-blur-sm border-slate-200/50 shadow-sm",
    sectionCard: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white border-slate-200 shadow-md",
    sectionBg: darkMode
      ? "bg-white/[0.03]"
      : "bg-gradient-to-br from-slate-50 to-slate-100",
  };

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

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
      const JAVA_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

      const faqResponse = await fetch(`${AI_SERVICE_URL}/api/faq/all`);
      if (faqResponse.ok) {
        const faqData = await faqResponse.json();
        setFaqCount(faqData.length);
      }

      const inquiryResponse = await authFetch(`${JAVA_BACKEND_URL}/api/inquiry/all`);
      if (inquiryResponse.ok) {
        const inquiryData = await inquiryResponse.json();
        const unansweredCount = inquiryData.filter((inquiry: any) => !inquiry.answered).length;
        setInquiryCount(unansweredCount);
      }

      const usersResponse = await authFetch(`${JAVA_BACKEND_URL}/api/users`);
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUserCount(usersData.length);
      }

      const mentorsResponse = await authFetch(`${JAVA_BACKEND_URL}/api/mentors/applications`);
      if (mentorsResponse.ok) {
        const mentorsData = await mentorsResponse.json();
        setMentorCount(mentorsData.length);
        const pendingCount = mentorsData.filter((m: any) => m.status === 'PENDING').length;
        setPendingMentorCount(pendingCount);
      }
    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-full flex flex-col ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
        </div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className={`text-base sm:text-lg font-medium ${theme.text}`}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(90,123,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90,123,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-6 sm:py-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <i className="ri-admin-line text-white text-xl sm:text-2xl"></i>
                </div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>관리자 대시보드</h1>
                  <p className={`text-sm sm:text-base ${theme.textMuted}`}>시스템 관리 및 콘텐츠 관리</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/crawler')}
                className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] hover:opacity-90 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base shadow-lg shadow-purple-500/20"
              >
                <i className="ri-search-eye-line"></i>
                <span className="hidden sm:inline">채용정보 크롤러</span>
                <span className="sm:hidden">크롤러</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {/* FAQ */}
            <div
              className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 cursor-pointer transition-all ${theme.statCard} ${theme.cardHover}`}
              onClick={() => navigate('/admin/faq')}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <i className={`ri-question-answer-line text-xl sm:text-2xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>FAQ</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{faqCount}</p>
              <p className={`text-xs mt-2 flex items-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <i className="ri-arrow-right-s-line mr-1"></i>
                관리하기
              </p>
            </div>

            {/* 미답변 문의 */}
            <div
              className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 cursor-pointer transition-all ${theme.statCard} ${theme.cardHover}`}
              onClick={() => navigate('/admin/inquiries')}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <i className={`ri-mail-line text-xl sm:text-2xl ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                </div>
                {inquiryCount > 0 && (
                  <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {inquiryCount}
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>미답변 문의</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{inquiryCount}</p>
              <p className={`text-xs mt-2 flex items-center ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                <i className="ri-arrow-right-s-line mr-1"></i>
                확인하기
              </p>
            </div>

            {/* 전체 사용자 */}
            <div
              className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 cursor-pointer transition-all ${theme.statCard} ${theme.cardHover}`}
              onClick={() => navigate('/admin/users')}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                  <i className={`ri-user-settings-line text-xl sm:text-2xl ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 사용자</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{userCount}</p>
              <p className={`text-xs mt-2 flex items-center ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                <i className="ri-arrow-right-s-line mr-1"></i>
                관리하기
              </p>
            </div>

            {/* 전체 멘토 */}
            <div
              className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 cursor-pointer transition-all ${theme.statCard} ${theme.cardHover}`}
              onClick={() => navigate('/admin/mentors')}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-teal-500/20' : 'bg-teal-50'}`}>
                  <i className={`ri-user-star-line text-xl sm:text-2xl ${darkMode ? 'text-teal-400' : 'text-teal-500'}`}></i>
                </div>
                {pendingMentorCount > 0 && (
                  <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingMentorCount}
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 멘토</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{mentorCount}</p>
              <p className={`text-xs mt-2 flex items-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                <i className="ri-arrow-right-s-line mr-1"></i>
                관리하기
              </p>
            </div>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* FAQ 관리 */}
            <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 ${darkMode ? 'bg-white/[0.02] border-blue-500/30' : 'bg-white border-blue-200 shadow-md'}`}>
              <div className="mb-3 sm:mb-4">
                <h2 className={`text-lg sm:text-xl font-bold ${theme.text} flex items-center`}>
                  <i className={`ri-question-answer-line mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                  FAQ 관리
                </h2>
              </div>
              <div className={`text-center py-6 sm:py-8 rounded-lg ${theme.sectionBg}`}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <i className={`ri-edit-2-line text-2xl sm:text-3xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
                </div>
                <p className={`text-sm sm:text-base font-semibold ${theme.text} mb-1`}>FAQ 콘텐츠 관리</p>
                <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>FAQ를 추가, 수정, 삭제할 수 있습니다.</p>
                <p className={`text-xs ${theme.textSubtle} mb-4`}>총 {faqCount}개의 FAQ</p>
                <button
                  onClick={() => navigate('/admin/faq')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2 text-xs sm:text-sm"
                >
                  <i className="ri-settings-4-line"></i>
                  FAQ 관리하기
                </button>
              </div>
            </div>

            {/* 문의 관리 */}
            <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 ${darkMode ? 'bg-white/[0.02] border-indigo-500/30' : 'bg-white border-indigo-200 shadow-md'}`}>
              <div className="mb-3 sm:mb-4">
                <h2 className={`text-lg sm:text-xl font-bold ${theme.text} flex items-center`}>
                  <i className={`ri-mail-line mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                  문의 관리
                </h2>
              </div>
              <div className={`text-center py-6 sm:py-8 rounded-lg ${theme.sectionBg}`}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                  <i className={`ri-customer-service-line text-2xl sm:text-3xl ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                </div>
                <p className={`text-sm sm:text-base font-semibold ${theme.text} mb-1`}>사용자 문의 관리</p>
                <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>챗봇을 통해 접수된 문의를 확인하고 답변합니다.</p>
                <p className={`text-xs ${theme.textSubtle} mb-4`}>{inquiryCount}개의 미답변 문의</p>
                <button
                  onClick={() => navigate('/admin/inquiries')}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2 text-xs sm:text-sm"
                >
                  <i className="ri-mail-open-line"></i>
                  문의 확인하기
                </button>
              </div>
            </div>

            {/* 사용자 관리 */}
            <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 ${darkMode ? 'bg-white/[0.02] border-purple-500/30' : 'bg-white border-purple-200 shadow-md'}`}>
              <div className="mb-3 sm:mb-4">
                <h2 className={`text-lg sm:text-xl font-bold ${theme.text} flex items-center`}>
                  <i className={`ri-user-settings-line mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                  사용자 관리
                </h2>
              </div>
              <div className={`text-center py-6 sm:py-8 rounded-lg ${theme.sectionBg}`}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <i className={`ri-group-line text-2xl sm:text-3xl ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}></i>
                </div>
                <p className={`text-sm sm:text-base font-semibold ${theme.text} mb-1`}>사용자 계정 관리</p>
                <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>역할 변경, 계정 활성화/비활성화를 관리합니다.</p>
                <p className={`text-xs ${theme.textSubtle} mb-4`}>총 {userCount}명의 사용자</p>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2 text-xs sm:text-sm"
                >
                  <i className="ri-user-settings-line"></i>
                  사용자 관리하기
                </button>
              </div>
            </div>

            {/* 멘토 관리 */}
            <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 ${darkMode ? 'bg-white/[0.02] border-teal-500/30' : 'bg-white border-teal-200 shadow-md'}`}>
              <div className="mb-3 sm:mb-4">
                <h2 className={`text-lg sm:text-xl font-bold ${theme.text} flex items-center`}>
                  <i className={`ri-user-star-line mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-500'}`}></i>
                  멘토 관리
                </h2>
              </div>
              <div className={`text-center py-6 sm:py-8 rounded-lg ${theme.sectionBg}`}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                  <i className={`ri-team-line text-2xl sm:text-3xl ${darkMode ? 'text-teal-400' : 'text-teal-500'}`}></i>
                </div>
                <p className={`text-sm sm:text-base font-semibold ${theme.text} mb-1`}>멘토 신청 및 관리</p>
                <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>멘토 신청을 심사하고 관리할 수 있습니다.</p>
                <p className={`text-xs ${theme.textSubtle} mb-4`}>
                  총 {mentorCount}명
                  {pendingMentorCount > 0 && (
                    <span className={`ml-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>({pendingMentorCount}명 대기)</span>
                  )}
                </p>
                <button
                  onClick={() => navigate('/admin/mentors')}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all inline-flex items-center gap-2 text-xs sm:text-sm"
                >
                  <i className="ri-user-star-line"></i>
                  멘토 관리하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}