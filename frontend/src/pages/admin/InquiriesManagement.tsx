import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/Toast';
import { backendApi } from '@/lib/api';

interface Inquiry {
  id: number;
  user: {
    userId: number;
    name: string;
    email: string;
  } | null;
  name: string;
  email: string;
  content: string;
  answered: boolean;
  answeredAt: string | null;
  replyContent: string | null;
  createdAt: string;
}


export default function InquiriesManagementPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [isViewReplyModalOpen, setIsViewReplyModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체 (indigo/보라색 기반)
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
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-indigo-500/50"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500",
    modal: darkMode
      ? "bg-[#12141C] border-white/[0.1]"
      : "bg-white border-slate-200",
    modalSection: darkMode
      ? "bg-white/[0.03]"
      : "bg-indigo-50",
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

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await backendApi.get('/inquiry/all');
      setInquiries(response.data);
    } catch (err: any) {
      console.error('문의 로딩 실패:', err);
      setError('문의 데이터를 불러오는 중 오류가 발생했습니다.');
      showToast('문의 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isModalOpen || isReplyModalOpen || isViewReplyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isModalOpen, isReplyModalOpen, isViewReplyModalOpen]);

  const handleViewDetail = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setIsModalOpen(true);
  };

  const handleReplyByEmail = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    // 기본 답변 템플릿 설정
    const defaultReply = `안녕하세요 ${inquiry.name}님,\n\n문의해주신 내용에 대해 답변드립니다.\n\n[여기에 답변 내용을 작성하세요]\n\n감사합니다.\nDreamPath 팀 드림`;
    setReplyContent(defaultReply);
    setIsReplyModalOpen(true);
  };

  const handleViewReply = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setIsViewReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyContent.trim()) {
      showToast('답변 내용을 입력해주세요.', 'warning');
      return;
    }

    try {
      setIsSending(true);
      const response = await backendApi.post('/inquiry/reply', {
        inquiryId: selectedInquiry.id,
        recipientEmail: selectedInquiry.email,
        recipientName: selectedInquiry.name,
        replyContent: replyContent.trim(),
        inquiryContent: selectedInquiry.content
      });

      if (response.data.success) {
        showToast('답변이 성공적으로 전송되었습니다.', 'success');
        setIsReplyModalOpen(false);
        setReplyContent('');
        setSelectedInquiry(null);
        // 문의 목록 새로고침
        fetchInquiries();
      } else {
        showToast(response.data.message || '답변 전송에 실패했습니다.', 'error');
      }
    } catch (err: any) {
      console.error('답변 전송 실패:', err);
      showToast('답변 전송 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-500/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className={`text-base sm:text-lg font-medium ${theme.text}`}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-500/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
        </div>

        <div className="flex-1 flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            <i className={`ri-error-warning-line text-5xl sm:text-6xl mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
            <p className={`text-base sm:text-lg font-medium mb-4 ${theme.text}`}>{error}</p>
            <button
              onClick={fetchInquiries}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 필터링 및 정렬된 문의 목록
  const filteredInquiries = inquiries
    .filter((inquiry) => {
      if (filterTab === 'unanswered') return !inquiry.answered;
      if (filterTab === 'answered') return inquiry.answered;
      return true; // 'all'
    })
    .sort((a, b) => {
      // 전체 탭일 때만 미답변을 먼저 정렬
      if (filterTab === 'all') {
        // 미답변 우선
        if (a.answered !== b.answered) {
          return a.answered ? 1 : -1;
        }
        // 같은 상태 내에서는 최신순 정렬
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // 답변 완료 탭일 때는 답변일 기준 최신순
      if (filterTab === 'answered') {
        const aTime = a.answeredAt ? new Date(a.answeredAt).getTime() : 0;
        const bTime = b.answeredAt ? new Date(b.answeredAt).getTime() : 0;
        return bTime - aTime;
      }

      // 미답변 탭일 때는 접수일 기준 최신순
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unansweredCount = inquiries.filter((i) => !i.answered).length;
  const answeredCount = inquiries.filter((i) => i.answered).length;

  return (
    <div className={`min-h-screen ${theme.bg} relative ${
      (isModalOpen || isReplyModalOpen || isViewReplyModalOpen) ? 'overflow-hidden' : ''
    }`}>
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-500/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-500/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 py-6 sm:py-8 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <i className="ri-mail-line text-white text-xl sm:text-2xl"></i>
                </div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>문의 관리</h1>
                  <p className={`text-sm sm:text-base ${theme.textMuted}`}>챗봇 문의 처리 시스템</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-2 text-sm sm:text-base ${
                  darkMode
                    ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                <i className="ri-arrow-left-line"></i>
                <span className="hidden sm:inline">대시보드로 돌아가기</span>
                <span className="sm:hidden">대시보드</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {/* 전체 문의 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <i className={`ri-inbox-line text-xl sm:text-2xl ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>전체 문의</p>
              <p className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{inquiries.length}</p>
            </div>

            {/* 미답변 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}>
                  <i className={`ri-time-line text-xl sm:text-2xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}></i>
                </div>
                {unansweredCount > 0 && (
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unansweredCount}
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>미답변</p>
              <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{unansweredCount}</p>
            </div>

            {/* 답변 완료 */}
            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 transition-all ${theme.statCard}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${darkMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                  <i className={`ri-check-line text-xl sm:text-2xl ${darkMode ? 'text-green-400' : 'text-green-600'}`}></i>
                </div>
              </div>
              <p className={`text-xs sm:text-sm ${theme.textMuted} mb-1`}>답변 완료</p>
              <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{answeredCount}</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-4 sm:mb-6 ${theme.statCard}`}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm ${
                  filterTab === 'all'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                    : darkMode
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                전체 ({inquiries.length})
              </button>
              <button
                onClick={() => setFilterTab('unanswered')}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm ${
                  filterTab === 'unanswered'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                    : darkMode
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                미답변 ({unansweredCount})
              </button>
              <button
                onClick={() => setFilterTab('answered')}
                className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm ${
                  filterTab === 'answered'
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                    : darkMode
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                답변 완료 ({answeredCount})
              </button>
            </div>
          </div>

          {/* Inquiries List */}
          <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 lg:p-8 ${darkMode ? 'bg-white/[0.02] border-indigo-500/30' : 'bg-white border-indigo-200 shadow-md'}`}>
            <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 flex items-center ${theme.text}`}>
              <i className={`ri-list-check mr-2 sm:mr-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
              {filterTab === 'unanswered' && `미답변 목록 (${filteredInquiries.length}개)`}
              {filterTab === 'answered' && `답변 완료 목록 (${filteredInquiries.length}개)`}
              {filterTab === 'all' && `전체 문의 목록 (${filteredInquiries.length}개)`}
            </h2>

            {filteredInquiries.length === 0 ? (
              <div className={`text-center py-10 sm:py-12 rounded-lg ${theme.sectionBg}`}>
                <i className={`ri-inbox-line text-5xl sm:text-6xl mb-4 ${darkMode ? 'text-white/20' : 'text-slate-300'}`}></i>
                <p className={theme.textMuted}>문의가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all border-2 ${
                      darkMode
                        ? 'bg-white/[0.02] border-white/[0.08] hover:border-indigo-500/30'
                        : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                            darkMode
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {inquiry.user ? '회원' : '비회원'}
                          </span>
                          {inquiry.answered ? (
                            <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              darkMode
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              ✓ 답변 완료
                            </span>
                          ) : (
                            <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              darkMode
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              미답변
                            </span>
                          )}
                          <h3 className={`text-sm sm:text-base lg:text-lg font-bold ${theme.text}`}>{inquiry.name}</h3>
                          <span className={`text-xs sm:text-sm ${theme.textMuted} truncate`}>{inquiry.email}</span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap line-clamp-2 ${theme.textMuted}`}>
                          {inquiry.content}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewDetail(inquiry)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg transition-all flex items-center justify-center ${
                            darkMode
                              ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                          }`}
                          title="상세보기"
                        >
                          <i className="ri-eye-line text-base sm:text-lg"></i>
                        </button>
                        {inquiry.answered ? (
                          <button
                            onClick={() => handleViewReply(inquiry)}
                            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm"
                            title="답변 확인"
                          >
                            <i className="ri-check-line"></i>
                            <span className="hidden sm:inline">답변 확인</span>
                            <span className="sm:hidden">확인</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReplyByEmail(inquiry)}
                            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm shadow-lg shadow-indigo-500/20"
                            title="이메일로 답변"
                          >
                            <i className="ri-mail-send-line"></i>
                            <span className="hidden sm:inline">답변하기</span>
                            <span className="sm:hidden">답변</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm ${theme.textSubtle}`}>
                      접수일: {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
                      {inquiry.user && ` | 사용자 ID: ${inquiry.user.userId}`}
                      {inquiry.answered && inquiry.answeredAt && ` | 답변일: ${new Date(inquiry.answeredAt).toLocaleString('ko-KR')}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Reply Modal */}
      {isViewReplyModalOpen && selectedInquiry && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsViewReplyModalOpen(false)}
        >
          <div
            className={`rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border ${theme.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-white/[0.1]' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>답변 확인</h2>
                <button
                  onClick={() => setIsViewReplyModalOpen(false)}
                  className={`transition-colors ${darkMode ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="ri-close-line text-xl sm:text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 문의자 정보 */}
              <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 ${theme.modalSection}`}>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className={`ri-user-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이름:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-mail-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이메일:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text} break-all`}>{selectedInquiry.email}</span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의 내용</h3>
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] ${theme.sectionBg}`}>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme.textMuted}`}>
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 답변 내용 (읽기 전용) */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2 ${theme.text}`}>
                  <i className={`ri-mail-check-line ${darkMode ? 'text-green-400' : 'text-green-600'}`}></i>
                  전송된 답변 내용
                </h3>
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-[150px] sm:min-h-[200px] border-2 ${
                  darkMode
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme.text}`}>
                    {selectedInquiry.replyContent || '답변 내용이 없습니다.'}
                  </p>
                </div>
                {selectedInquiry.answeredAt && (
                  <p className={`text-xs mt-2 ${theme.textSubtle}`}>
                    답변일: {new Date(selectedInquiry.answeredAt).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-2 sm:pt-4">
                <button
                  onClick={() => setIsViewReplyModalOpen(false)}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                    darkMode
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {isReplyModalOpen && selectedInquiry && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => {
            setIsReplyModalOpen(false);
            setReplyContent('');
          }}
        >
          <div
            className={`rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border ${theme.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-white/[0.1]' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>문의 답변 작성</h2>
                <button
                  onClick={() => {
                    setIsReplyModalOpen(false);
                    setReplyContent('');
                  }}
                  className={`transition-colors ${darkMode ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="ri-close-line text-xl sm:text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 문의자 정보 */}
              <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 ${theme.modalSection}`}>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className={`ri-user-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이름:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-mail-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이메일:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text} break-all`}>{selectedInquiry.email}</span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의 내용</h3>
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] ${theme.sectionBg}`}>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme.textMuted}`}>
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 답변 작성 */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>답변 내용 *</h3>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm sm:text-base ${theme.input}`}
                  rows={10}
                />
                <p className={`text-xs mt-2 ${theme.textSubtle}`}>
                  작성하신 답변이 {selectedInquiry.email}로 전송됩니다.
                </p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-2 sm:pt-4">
                <button
                  onClick={() => {
                    setIsReplyModalOpen(false);
                    setReplyContent('');
                  }}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                    darkMode
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  disabled={isSending}
                >
                  취소
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyContent.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-lg shadow-indigo-500/20"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      전송 중...
                    </>
                  ) : (
                    <>
                      <i className="ri-mail-send-line"></i>
                      답변 전송
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isModalOpen && selectedInquiry && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border ${theme.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-white/[0.1]' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>문의 상세</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`transition-colors ${darkMode ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="ri-close-line text-xl sm:text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 문의자 정보 */}
              <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 ${theme.modalSection}`}>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className={`ri-user-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이름:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-mail-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>이메일:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text} break-all`}>{selectedInquiry.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-shield-user-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>회원 구분:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>
                      {selectedInquiry.user ? `회원 (ID: ${selectedInquiry.user.userId})` : '비회원'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-calendar-line text-sm sm:text-base ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}></i>
                    <span className={`text-xs sm:text-sm ${theme.textMuted}`}>접수일:</span>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}`}>
                      {new Date(selectedInquiry.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 sm:mb-3 ${theme.text}`}>문의 내용</h3>
                <div className={`rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-[150px] sm:min-h-[200px] ${theme.sectionBg}`}>
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme.textMuted}`}>
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-2 sm:pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                    darkMode
                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  닫기
                </button>
                {selectedInquiry.answered ? (
                  <button
                    onClick={() => {
                      handleViewReply(selectedInquiry);
                      setIsModalOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <i className="ri-check-line"></i>
                    답변 확인
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleReplyByEmail(selectedInquiry);
                      setIsModalOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg shadow-indigo-500/20"
                  >
                    <i className="ri-mail-send-line"></i>
                    답변하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}