import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const STATUS_LABELS = {
  PENDING: '승인 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
};

const DAY_LABELS: Record<string, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};

export default function MentorApplicationsPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  const highlightId = searchParams.get('highlight');

  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<MentorApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [statusCounts, setStatusCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

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
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 전체 데이터 가져오기 (카운트 계산용)
      const allData = await mentorService.getAllApplications();

      // 상태별 카운트 계산
      const counts = {
        total: allData.length,
        pending: allData.filter((app: MentorApplication) => app.status === 'PENDING').length,
        approved: allData.filter((app: MentorApplication) => app.status === 'APPROVED').length,
        rejected: allData.filter((app: MentorApplication) => app.status === 'REJECTED').length,
      };
      setStatusCounts(counts);

      // 필터링된 데이터 설정
      let data;
      if (statusFilter) {
        data = await mentorService.getApplicationsByStatus(statusFilter);
      } else {
        data = allData;
      }
      setApplications(data);

      // 하이라이트 ID가 있으면 해당 신청을 자동으로 열기
      if (highlightId) {
        const highlighted = data.find((app: MentorApplication) => app.mentorId === parseInt(highlightId));
        if (highlighted) {
          setSelectedApp(highlighted);
          setShowDetailModal(true);
        }
      }
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      const apiError = err as { response?: { data?: string } };
      setError(apiError.response?.data || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedApp || !reviewAction || !userId) return;

    if (reviewAction === 'reject' && reviewReason.trim().length < 10) {
      showToast('거절 사유는 최소 10자 이상 작성해주세요.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);

      await mentorService.reviewApplication(
        selectedApp.mentorId,
        reviewAction === 'approve',
        reviewReason || '승인됨',
        userId
      );

      showToast(reviewAction === 'approve' ? '승인되었습니다.' : '거절되었습니다.', 'success');
      setShowReviewModal(false);
      setShowDetailModal(false);
      setReviewReason('');
      setReviewAction(null);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      console.error('처리 실패:', err);
      const apiError = err as { response?: { data?: string } };
      showToast(apiError.response?.data || '처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setReviewReason('');
    setShowReviewModal(true);
  };

  const toggleCard = (mentorId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(mentorId)) {
      newExpanded.delete(mentorId);
    } else {
      newExpanded.add(mentorId);
    }
    setExpandedCards(newExpanded);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { text: '승인 대기', bg: 'bg-yellow-100', text_color: 'text-yellow-800', border: 'border-yellow-300' },
      APPROVED: { text: '승인됨', bg: 'bg-green-100', text_color: 'text-green-800', border: 'border-green-300' },
      REJECTED: { text: '거절됨', bg: 'bg-red-100', text_color: 'text-red-800', border: 'border-red-300' },
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <ToastContainer />
      <Header />

      <div className="pt-24 pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Back Button & Title */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/mypage')}
              className="mb-4 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
            >
              <i className="ri-arrow-left-line text-xl mr-1"></i>
              <span className="text-sm font-medium">관리자 마이페이지로</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                <i className="ri-file-list-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">멘토 신청 목록</h1>
                <p className="text-gray-600">
                  {statusFilter ? STATUS_LABELS[statusFilter] : '전체'} ({applications.length}건)
                </p>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-6">
            {/* Filter Tabs with Counts */}
            <div className="bg-pink-50/50 rounded-xl p-2 mb-6 flex gap-2">
              <button
                onClick={() => navigate('/admin/mentor-applications')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  !statusFilter
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>전체</span>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${!statusFilter ? 'bg-pink-600' : 'bg-gray-200'}`}>
                    {statusCounts.total}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=PENDING')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-yellow-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>대기</span>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${statusFilter === 'PENDING' ? 'bg-yellow-600' : 'bg-gray-200'}`}>
                    {statusCounts.pending}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=APPROVED')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  statusFilter === 'APPROVED'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>승인</span>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${statusFilter === 'APPROVED' ? 'bg-green-600' : 'bg-gray-200'}`}>
                    {statusCounts.approved}
                  </span>
                </div>
              </button>
              <button
                onClick={() => navigate('/admin/mentor-applications?status=REJECTED')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                  statusFilter === 'REJECTED'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>거절</span>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${statusFilter === 'REJECTED' ? 'bg-red-600' : 'bg-gray-200'}`}>
                    {statusCounts.rejected}
                  </span>
                </div>
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
                <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Applications List */}
            {applications.length === 0 ? (
              <div className="bg-pink-50/50 rounded-xl p-12 text-center">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 text-base">
                  {statusFilter ? `${STATUS_LABELS[statusFilter]} 신청이 없습니다.` : '신청이 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const badge = getStatusBadge(app.status);
                  const isExpanded = expandedCards.has(app.mentorId);

                  return (
                  <div
                    key={app.mentorId}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                      highlightId && app.mentorId === parseInt(highlightId)
                        ? 'border-pink-400'
                        : 'border-gray-200 hover:border-pink-200 hover:shadow-md'
                    }`}
                  >
                    {/* 상태 배지 헤더 */}
                    <div className={`${badge.bg} ${badge.text_color} px-6 py-3 border-b ${badge.border} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <i className={`${
                          app.status === 'PENDING' ? 'ri-time-line' :
                          app.status === 'APPROVED' ? 'ri-checkbox-circle-line' :
                          'ri-close-circle-line'
                        }`}></i>
                        <span className="font-semibold">{badge.text}</span>
                      </div>
                      <div className="text-sm">
                        신청일: {new Date(app.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>

                    {/* 메인 콘텐츠 */}
                    <div className="p-6">
                      {/* 사용자 정보 */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center">
                          <i className="ri-user-line text-white text-2xl"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">사용자 ID: {app.userId}</h3>
                          <p className="text-sm text-gray-500">멘토 ID: {app.mentorId}</p>
                        </div>
                      </div>

                      {/* 자기소개 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="ri-chat-quote-line text-pink-500 text-lg"></i>
                          <h4 className="font-bold text-gray-700">자기소개</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className={`text-gray-700 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {app.bio}
                          </p>
                          {app.bio.length > 100 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCard(app.mentorId);
                              }}
                              className="text-pink-500 text-sm mt-2 hover:text-pink-600 font-medium"
                            >
                              {isExpanded ? '접기' : '더보기'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 경력 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="ri-briefcase-line text-pink-500 text-lg"></i>
                          <h4 className="font-bold text-gray-700">경력 사항</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className={`text-gray-700 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {app.career}
                          </p>
                          {app.career.length > 100 && !app.bio.includes('더보기') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCard(app.mentorId);
                              }}
                              className="text-pink-500 text-sm mt-2 hover:text-pink-600 font-medium"
                            >
                              {isExpanded ? '접기' : '더보기'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 가능 시간 */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="ri-calendar-check-line text-pink-500 text-lg"></i>
                          <h4 className="font-bold text-gray-700">가능 시간</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(app.availableTime).map(([day, times]) => (
                            <span key={day} className="bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-full text-sm font-medium">
                              {DAY_LABELS[day]} {times.length}회
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 버튼 영역 */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                            setShowDetailModal(true);
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-all"
                        >
                          <i className="ri-eye-line mr-2"></i>
                          상세보기
                        </button>
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                                openReviewModal('reject');
                              }}
                              className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium hover:bg-red-600 transition-all"
                            >
                              <i className="ri-close-circle-line mr-2"></i>
                              거절하기
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                                openReviewModal('approve');
                              }}
                              className="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-medium hover:bg-green-600 transition-all"
                            >
                              <i className="ri-checkbox-circle-line mr-2"></i>
                              승인하기
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">멘토 신청 상세</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <i className="ri-user-line mr-2 text-pink-500"></i>
                  신청자 정보
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800">사용자 ID: {selectedApp.userId}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    신청일: {new Date(selectedApp.createdAt).toLocaleString('ko-KR')}
                  </p>
                  <p className="text-sm text-gray-600">
                    수정일: {new Date(selectedApp.updatedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <i className="ri-quill-pen-line mr-2 text-pink-500"></i>
                  자기소개
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedApp.bio}</p>
                </div>
              </div>

              {/* Career */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <i className="ri-briefcase-line mr-2 text-pink-500"></i>
                  경력 사항
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedApp.career}</p>
                </div>
              </div>

              {/* Available Time */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <i className="ri-calendar-check-line mr-2 text-pink-500"></i>
                  가능 시간
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {Object.entries(selectedApp.availableTime).map(([day, times]) => (
                    <div key={day}>
                      <p className="font-semibold text-gray-700 mb-2">
                        {DAY_LABELS[day] || day}요일
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {times.map((time) => (
                          <span
                            key={time}
                            className="bg-pink-50 text-pink-700 px-3 py-1 rounded-lg text-sm"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <i className="ri-information-line mr-2 text-pink-500"></i>
                  현재 상태
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedApp.status === 'PENDING' && (
                    <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-bold">
                      <i className="ri-time-line mr-1"></i>
                      승인 대기 중
                    </span>
                  )}
                  {selectedApp.status === 'APPROVED' && (
                    <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold">
                      <i className="ri-checkbox-circle-line mr-1"></i>
                      승인됨
                    </span>
                  )}
                  {selectedApp.status === 'REJECTED' && (
                    <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-bold">
                      <i className="ri-close-circle-line mr-1"></i>
                      거절됨
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedApp.status === 'PENDING' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openReviewModal('approve')}
                    className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-all"
                  >
                    <i className="ri-checkbox-circle-line mr-2"></i>
                    승인
                  </button>
                  <button
                    onClick={() => openReviewModal('reject')}
                    className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-all"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    거절
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {reviewAction === 'approve' ? '멘토 신청 승인' : '멘토 신청 거절'}
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                사용자 ID {selectedApp.userId}의 멘토 신청을{' '}
                {reviewAction === 'approve' ? '승인' : '거절'}하시겠습니까?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reviewAction === 'approve' ? '승인 메시지 (선택)' : '거절 사유 (필수, 최소 10자)'}
                </label>
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className="w-full h-32 p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors"
                  placeholder={
                    reviewAction === 'approve'
                      ? '승인 메시지를 입력하세요 (선택사항)'
                      : '거절 사유를 최소 10자 이상 입력해주세요'
                  }
                  required={reviewAction === 'reject'}
                />
                {reviewAction === 'reject' && (
                  <p className={`text-xs mt-1 ${reviewReason.length >= 10 ? 'text-green-600' : 'text-gray-500'}`}>
                    {reviewReason.length} / 10자 이상
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewReason('');
                    setReviewAction(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  onClick={handleReview}
                  disabled={isSubmitting || (reviewAction === 'reject' && reviewReason.trim().length < 10)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    reviewAction === 'approve'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      처리 중...
                    </span>
                  ) : (
                    <span>{reviewAction === 'approve' ? '승인' : '거절'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
