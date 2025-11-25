import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, bookingService, mentoringSessionService } from '@/lib/api';
import Header from '@/components/feature/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/components/common/Toast';
import { DAYS_OF_WEEK, TIME_SLOTS, SPECIALIZATIONS, BOOKING_STATUS_LABELS } from '@/constants/mentoring';
import { formatKoreanDate, formatKoreanDateTime, getTodayString } from '@/utils/dateUtils';
import { validateSessionForm, type SessionFormData, type ValidationErrors } from '@/utils/validation';

interface Mentor {
  mentorId: number;
  userId: number;
  username: string;
  name: string;
  bio: string;
  career: string;
  specialization?: string;
  availableTime: Record<string, string[]>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  userId: number;
  username: string;
  name: string;
  role: string;
}

interface Booking {
  bookingId: number;
  mentorId: number;
  menteeId: number;
  menteeName: string;
  menteeUsername: string;
  bookingDate: string;
  timeSlot: string;
  message?: string;
  status: string;
  meetingUrl?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface MentoringSession {
  sessionId: number;
  mentorId: number;
  mentorName: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  price: number;
  status: string;
}

export default function MentoringPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [myMentorInfo, setMyMentorInfo] = useState<Mentor | null>(null);
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<MentoringSession[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // 세션 등록 폼 state
  const [sessionForm, setSessionForm] = useState<SessionFormData>({
    title: '',
    description: '',
    sessionDate: '',
    sessionTime: '',
    durationMinutes: 60,
    price: 0,
  });

  useEffect(() => {
    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);
    checkMentorStatus(user.userId);
  }, [navigate]);

  useEffect(() => {
    let filtered = sessions;

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query) ||
          session.mentorName.toLowerCase().includes(query)
      );
    }

    // 분야 필터
    if (selectedSpecializations.length > 0) {
      filtered = filtered.filter((session) =>
        selectedSpecializations.some((spec) =>
          session.title.includes(spec) || session.description?.includes(spec)
        )
      );
    }

    setFilteredSessions(filtered);
  }, [searchQuery, selectedSpecializations, sessions]);

  const checkMentorStatus = async (userId: number) => {
    try {
      setIsLoading(true);

      // 내가 멘토인지 확인
      try {
        const myMentor = await mentorService.getMyApplication(userId);
        if (myMentor && myMentor.status === 'APPROVED') {
          setIsMentor(true);
          setMyMentorInfo(myMentor);
        }
      } catch (err) {
        // 멘토가 아닌 경우
        setIsMentor(false);
      }

      // 활성화된 세션 목록 가져오기
      const availableSessions = await mentoringSessionService.getAvailableSessions();
      setSessions(availableSessions);
      setFilteredSessions(availableSessions);

    } catch (error) {
      console.error('세션 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSession = (sessionId: number) => {
    navigate(`/mentoring/book/${sessionId}`);
  };

  const handleSaveSession = async () => {
    // 유효성 검사
    const errors = validateSessionForm(sessionForm);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      showToast('입력 내용을 확인해주세요.', 'error');
      return;
    }

    if (!myMentorInfo) {
      showToast('멘토 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // 날짜와 시간 합치기
      const sessionDateTime = `${sessionForm.sessionDate}T${sessionForm.sessionTime}:00`;

      await mentoringSessionService.createSession({
        mentorId: myMentorInfo.mentorId,
        title: sessionForm.title,
        description: sessionForm.description,
        sessionDate: sessionDateTime,
        durationMinutes: sessionForm.durationMinutes,
        price: sessionForm.price,
      });

      showToast('멘토링 세션이 성공적으로 등록되었습니다!', 'success');
      setShowScheduleModal(false);

      // 폼 초기화
      setSessionForm({
        title: '',
        description: '',
        sessionDate: '',
        sessionTime: '',
        durationMinutes: 60,
        price: 0,
      });
      setValidationErrors({});

      // 세션 목록 다시 불러오기
      if (currentUser) {
        checkMentorStatus(currentUser.userId);
      }
    } catch (error: any) {
      console.error('세션 등록 실패:', error);
      showToast(error.response?.data || '세션 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpecializationToggle = (spec: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatSessionTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <LoadingSpinner fullScreen message="멘토링 정보를 불러오는 중..." />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <Header />
      <div className="pt-16"> {/* Header 높이만큼 패딩 */}
      {/* 멘토 전용 버튼 - 우측 상단 고정 */}
      {isMentor && (
        <div className="fixed top-20 right-6 z-40">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center"
          >
            <i className="ri-add-circle-line mr-2 text-xl"></i>
            멘토링 일정 등록하기
          </button>
        </div>
      )}

      {false ? (
        // 멘토 뷰 (기존 그대로 유지)
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">멘토 대시보드</h1>
            <p className="text-gray-600">멘토링 일정과 예약을 관리하세요</p>
          </div>

          {/* 일정 등록 버튼 */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="mb-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
          >
            <i className="ri-calendar-check-line mr-2"></i>
            멘토링 일정 {myMentorInfo?.availableTime && Object.keys(myMentorInfo.availableTime).length > 0 ? '수정하기' : '등록하기'}
          </button>

          {/* 예약 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">예약 현황</h2>
            {myBookings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">예약된 멘토링이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking) => {
                  const statusInfo = getStatusInfo(booking.status);
                  return (
                    <div key={booking.bookingId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">
                          {booking.menteeName} (@{booking.menteeUsername})
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {booking.bookingDate} {booking.timeSlot}
                      </p>
                      {booking.message && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-2">{booking.message}</p>
                      )}
                      {booking.status === 'PENDING' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleConfirmBooking(booking.bookingId)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.bookingId)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium"
                          >
                            거절
                          </button>
                        </div>
                      )}
                      {booking.status === 'CONFIRMED' && booking.meetingUrl && (
                        <button
                          onClick={() => navigate(`/mentoring/meeting/${booking.bookingId}`)}
                          className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium"
                        >
                          미팅 입장하기
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // 일반 유저 뷰 - 부드럽고 친근한 느낌
        <div className="bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen">
          {/* 히어로 섹션 */}
          <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 py-16">
            <div className="max-w-6xl mx-auto px-6 text-center">
              <h1 className="text-3xl md:text-4xl font-medium text-gray-700 mb-4 leading-relaxed font-rounded">
                나에게 맞는 멘토와 함께<br />
                편하게 배우고 성장해요
              </h1>
              <p className="text-base text-gray-600 leading-normal mb-8">
                어려운 공부도, 진로 고민도<br />
                멘토가 옆에서 차근차근 도와줄게요
              </p>

              {/* 검색창 */}
              <div className="max-w-2xl mx-auto mb-6">
                <div className="relative">
                  <i className="ri-search-line absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="어떤 분야의 멘토를 찾으시나요?"
                    className="w-full pl-14 pr-6 py-4 rounded-3xl text-gray-700 text-base focus:outline-none focus:ring-4 focus:ring-purple-200 shadow-lg bg-white border-2 border-white"
                  />
                </div>
              </div>

              {/* 분야별 필터 */}
              <div className="flex flex-wrap justify-center gap-3">
                {SPECIALIZATIONS.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => handleSpecializationToggle(spec)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      selectedSpecializations.includes(spec)
                        ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 카드 섹션 */}
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  멘토링 세션
                </h2>
                <p className="text-gray-600">
                  총 <span className="font-bold text-purple-600">{filteredSessions.length}개</span>의 멘토링 세션이 있어요
                </p>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <EmptyState
                icon="ri-calendar-line"
                title="등록된 멘토링 세션이 없어요"
                description={
                  searchQuery || selectedSpecializations.length > 0
                    ? "다른 검색어나 분야를 선택해보세요"
                    : "곧 새로운 멘토링 세션이 등록될 예정이에요"
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200"
                  >
                    <div className="p-6">
                      {/* 제목 */}
                      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 min-h-[56px]">
                        {session.title}
                      </h3>

                      {/* 설명 */}
                      {session.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {session.description}
                        </p>
                      )}

                      {/* 멘토 정보 */}
                      <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                          {session.mentorName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{session.mentorName}</p>
                          <p className="text-xs text-gray-500 truncate">@{session.mentorUsername}</p>
                        </div>
                      </div>

                      {/* 날짜/시간 */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-700">
                          <i className="ri-calendar-line mr-2 text-pink-500"></i>
                          <span className="font-medium">{formatSessionDate(session.sessionDate)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                          <i className="ri-time-line mr-2 text-pink-500"></i>
                          <span className="font-medium">{formatSessionTime(session.sessionDate)} ({session.durationMinutes}분)</span>
                        </div>
                      </div>

                      {/* 가격 & 잔여석 */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">가격</p>
                          <p className="text-lg font-bold text-gray-900">
                            {session.price === 0 ? '무료' : `${session.price.toLocaleString()}원`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">예약 상태</p>
                          <p className={`text-lg font-bold ${session.availableSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {session.isFull ? '마감' : '예약 가능'}
                          </p>
                        </div>
                      </div>

                      {/* 예약 버튼 */}
                      <button
                        onClick={() => handleBookSession(session.sessionId)}
                        disabled={session.isFull}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                          session.isFull
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {session.isFull ? '예약 마감' : '예약하기'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 세션 등록 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">멘토링 세션 등록</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-5">
                {/* 제목 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    placeholder="예: 백엔드 면접 준비 멘토링"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                      validationErrors.title
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-pink-400 focus:ring-pink-200'
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
                  )}
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    설명 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={sessionForm.description}
                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    placeholder="멘토링 세션에 대한 설명을 입력해주세요 (최소 10자)"
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none resize-none ${
                      validationErrors.description
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-pink-400 focus:ring-pink-200'
                    }`}
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>

                {/* 날짜 & 시간 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      날짜 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={sessionForm.sessionDate}
                      min={getTodayString()}
                      onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${
                        validationErrors.sessionDate
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-pink-400 focus:ring-pink-200'
                      }`}
                    />
                    {validationErrors.sessionDate && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.sessionDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      시간 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={sessionForm.sessionTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, sessionTime: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 소요 시간 & 가격 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      소요 시간 (분)
                    </label>
                    <input
                      type="number"
                      value={sessionForm.durationMinutes}
                      onChange={(e) => setSessionForm({ ...sessionForm, durationMinutes: parseInt(e.target.value) || 60 })}
                      min="30"
                      step="30"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      가격 (원)
                    </label>
                    <input
                      type="number"
                      value={sessionForm.price}
                      onChange={(e) => setSessionForm({ ...sessionForm, price: parseInt(e.target.value) || 0 })}
                      min="0"
                      step="1000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 1:1 멘토링 안내 */}
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-user-line text-pink-500 mr-2"></i>
                    <p className="text-sm text-pink-700">1:1 멘토링으로 진행됩니다</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div> {/* pt-16 닫기 */}
    </div>
  );
}
