import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import { useToast } from '@/components/common/Toast';
import axios from 'axios';

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

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

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

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/inquiry/all`);
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
      const response = await axios.post(`${API_BASE_URL}/api/inquiry/reply`, {
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
            onClick={fetchInquiries}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            다시 시도
          </button>
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
    <div className={`min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30 ${
      (isModalOpen || isReplyModalOpen || isViewReplyModalOpen) ? 'overflow-hidden' : ''
    }`}>
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center">
                <i className="ri-mail-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">문의 관리</h1>
                <p className="text-gray-600">챗봇 문의 처리 시스템</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <i className="ri-arrow-left-line"></i>
                대시보드로
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center">
                  <i className="ri-inbox-line text-2xl text-pink-500"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">전체 문의</p>
              <p className="text-3xl font-bold text-gray-900">{inquiries.length}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-yellow-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                  <i className="ri-time-line text-2xl text-yellow-600"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">미답변</p>
              <p className="text-3xl font-bold text-yellow-600">{unansweredCount}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <i className="ri-check-line text-2xl text-green-600"></i>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">답변 완료</p>
              <p className="text-3xl font-bold text-green-600">{answeredCount}</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterTab === 'all'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({inquiries.length})
              </button>
              <button
                onClick={() => setFilterTab('unanswered')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterTab === 'unanswered'
                    ? 'bg-yellow-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                미답변 ({unansweredCount})
              </button>
              <button
                onClick={() => setFilterTab('answered')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterTab === 'answered'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                답변 완료 ({answeredCount})
              </button>
            </div>
          </div>

          {/* Inquiries List */}
          <div className="bg-white rounded-xl shadow-md border-2 border-pink-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="ri-list-check text-pink-500 mr-3"></i>
              {filterTab === 'unanswered' && `미답변 목록 (${filteredInquiries.length}개)`}
              {filterTab === 'answered' && `답변 완료 목록 (${filteredInquiries.length}개)`}
              {filterTab === 'all' && `전체 문의 목록 (${filteredInquiries.length}개)`}
            </h2>

            {filteredInquiries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">문의가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-pink-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-block bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                            {inquiry.user ? '회원' : '비회원'}
                          </span>
                          {inquiry.answered ? (
                            <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                              ✓ 답변 완료
                            </span>
                          ) : (
                            <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                              미답변
                            </span>
                          )}
                          <h3 className="text-lg font-bold text-gray-900">{inquiry.name}</h3>
                          <span className="text-sm text-gray-500">{inquiry.email}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap line-clamp-2">
                          {inquiry.content}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleViewDetail(inquiry)}
                          className="w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all flex items-center justify-center"
                          title="상세보기"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </button>
                        {inquiry.answered ? (
                          <button
                            onClick={() => handleViewReply(inquiry)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
                            title="답변 확인"
                          >
                            <i className="ri-check-line"></i>
                            답변 확인
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReplyByEmail(inquiry)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
                            title="이메일로 답변"
                          >
                            <i className="ri-mail-send-line"></i>
                            답변하기
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setIsViewReplyModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">답변 확인</h2>
                <button
                  onClick={() => setIsViewReplyModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* 문의자 정보 */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="ri-user-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이름:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-mail-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이메일:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.email}</span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의 내용</h3>
                <div className="bg-gray-50 rounded-xl p-4 min-h-[120px]">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 답변 내용 (읽기 전용) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="ri-mail-check-line text-green-600"></i>
                  전송된 답변 내용
                </h3>
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 min-h-[200px]">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInquiry.replyContent || '답변 내용이 없습니다.'}
                  </p>
                </div>
                {selectedInquiry.answeredAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    답변일: {new Date(selectedInquiry.answeredAt).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsViewReplyModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setIsReplyModalOpen(false);
            setReplyContent('');
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">문의 답변 작성</h2>
                <button
                  onClick={() => {
                    setIsReplyModalOpen(false);
                    setReplyContent('');
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* 문의자 정보 */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="ri-user-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이름:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-mail-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이메일:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.email}</span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의 내용</h3>
                <div className="bg-gray-50 rounded-xl p-4 min-h-[120px]">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 답변 작성 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">답변 내용 *</h3>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  rows={12}
                />
                <p className="text-xs text-gray-500 mt-2">
                  작성하신 답변이 {selectedInquiry.email}로 전송됩니다.
                </p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsReplyModalOpen(false);
                    setReplyContent('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
                  disabled={isSending}
                >
                  취소
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyContent.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">문의 상세</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* 문의자 정보 */}
              <div className="bg-pink-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의자 정보</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="ri-user-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이름:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-mail-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">이메일:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInquiry.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-shield-user-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">회원 구분:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedInquiry.user ? `회원 (ID: ${selectedInquiry.user.userId})` : '비회원'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-calendar-line text-pink-500"></i>
                    <span className="text-sm text-gray-600">접수일:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(selectedInquiry.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">문의 내용</h3>
                <div className="bg-gray-50 rounded-xl p-4 min-h-[200px]">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInquiry.content}
                  </p>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
                >
                  닫기
                </button>
                {selectedInquiry.answered ? (
                  <button
                    onClick={() => {
                      handleViewReply(selectedInquiry);
                      setIsModalOpen(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
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
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
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