import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, mentoringSessionService } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/components/common/Toast';
import { SPECIALIZATIONS } from '@/constants/mentoring';
import { getTodayString } from '@/utils/dateUtils';
import { validateSessionForm, type SessionFormData, type ValidationErrors } from '@/utils/validation';
import { Search, Calendar, Clock, User as UserIcon, X, Plus } from 'lucide-react';

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

interface MentoringSession {
  sessionId: number;
  mentorId: number;
  mentorName: string;
  mentorUsername?: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  status: string;
  isFull?: boolean;
  availableSlots?: number;
}

export default function MentoringPage() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [darkMode, setDarkMode] = useState(true);
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
  });

  // Theme 객체
  const theme = {
    bg: darkMode
      ? "bg-[#0a0a0f]"
      : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-[#5A7BFF]/30"
      : "bg-white/80 border-slate-200 hover:bg-white hover:shadow-lg",
    cardSolid: darkMode
      ? "bg-white/[0.05] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30 focus:border-[#5A7BFF]/50"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5A7BFF]/50 shadow-sm",
    button: darkMode
      ? "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white/70 hover:text-white"
      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm",
    buttonActive: "bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-lg",
    modal: darkMode
      ? "bg-[#12121a] border-white/[0.1]"
      : "bg-white border-slate-200",
    modalHeader: darkMode
      ? "border-white/[0.08]"
      : "border-slate-200",
    hero: darkMode
      ? "bg-gradient-to-b from-[#5A7BFF]/10 via-[#8F5CFF]/5 to-transparent"
      : "bg-gradient-to-b from-[#5A7BFF]/10 via-[#8F5CFF]/5 to-transparent",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const theme = localStorage.getItem('dreampath:theme');
      setDarkMode(theme === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);

    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);
    checkMentorStatus(user.userId);

    return () => {
      window.removeEventListener('dreampath-theme-change', handleThemeChange);
    };
  }, [navigate]);

  useEffect(() => {
    let filtered = sessions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query) ||
          session.mentorName.toLowerCase().includes(query)
      );
    }

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

      try {
        const myMentor = await mentorService.getMyApplication(userId);
        if (myMentor && myMentor.status === 'APPROVED') {
          setIsMentor(true);
          setMyMentorInfo(myMentor);
        }
      } catch (err) {
        setIsMentor(false);
      }

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
      const sessionDateTime = `${sessionForm.sessionDate}T${sessionForm.sessionTime}:00`;

      await mentoringSessionService.createSession({
        mentorId: myMentorInfo.mentorId,
        title: sessionForm.title,
        description: sessionForm.description,
        sessionDate: sessionDateTime,
        durationMinutes: sessionForm.durationMinutes,
      });

      showToast('멘토링 세션이 성공적으로 등록되었습니다!', 'success');
      setShowScheduleModal(false);
      setSessionForm({
        title: '',
        description: '',
        sessionDate: '',
        sessionTime: '',
        durationMinutes: 60,
      });
      setValidationErrors({});

      if (currentUser) {
        checkMentorStatus(currentUser.userId);
      }
    } catch (error) {
      console.error('세션 등록 실패:', error);
      const apiError = error as { response?: { data?: string } };
      showToast(apiError.response?.data || '세션 등록 중 오류가 발생했습니다.', 'error');
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner message="멘토링 정보를 불러오는 중..." />
      </div>
    );
  }

  return (
    <div className="relative">
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 left-1/4 rounded-full ${
            darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"
          }`}
          style={{ width: 'min(60vw, 600px)', height: 'min(60vw, 600px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 rounded-full ${
            darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"
          }`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
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

      {/* 멘토 전용 버튼 */}
      {isMentor && (
        <div className="fixed top-20 right-6 z-40">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] hover:shadow-lg hover:shadow-purple-500/30 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">멘토링 일정 등록</span>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className={`relative ${theme.hero} pt-12 pb-12 md:pt-20 md:pb-16`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${theme.text} mb-3 md:mb-4 leading-relaxed`}>
            나에게 맞는 멘토와 함께
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            성장해요
          </h1>
          <p className={`text-sm sm:text-base ${theme.textMuted} mb-6 md:mb-8`}>
            어려운 공부도, 진로 고민도
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            멘토가 옆에서 도와줄게요
          </p>

          {/* 검색창 */}
          <div className="max-w-xl mx-auto mb-6">
            <div className={`relative flex items-center border rounded-2xl transition-all ${theme.input}`}>
              <Search className={`absolute left-4 w-5 h-5 ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="어떤 분야의 멘토를 찾으시나요?"
                className={`w-full pl-12 pr-4 py-3.5 bg-transparent focus:outline-none text-sm sm:text-base ${
                  darkMode ? "text-white placeholder-white/40" : "text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>
          </div>

          {/* 분야별 필터 */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {SPECIALIZATIONS.map((spec) => (
              <button
                key={spec}
                onClick={() => handleSpecializationToggle(spec)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                  selectedSpecializations.includes(spec)
                    ? theme.buttonActive
                    : theme.button
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 md:mb-8">
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold ${theme.text} mb-1`}>
              멘토링 세션
            </h2>
            <p className={theme.textMuted}>
              총 <span className="font-bold text-[#8F5CFF]">{filteredSessions.length}개</span>의 세션
            </p>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className={`rounded-2xl border p-8 md:p-12 text-center ${theme.cardSolid}`}>
            <Calendar className={`w-12 h-12 mx-auto mb-4 ${theme.textMuted}`} />
            <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
              등록된 멘토링 세션이 없어요
            </h3>
            <p className={theme.textMuted}>
              {searchQuery || selectedSpecializations.length > 0
                ? "다른 검색어나 분야를 선택해보세요"
                : "곧 새로운 멘토링 세션이 등록될 예정이에요"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredSessions.map((session) => (
              <div
                key={session.sessionId}
                className={`rounded-2xl border p-5 md:p-6 transition-all duration-300 flex flex-col h-full ${theme.card}`}
              >
                {/* 제목 - 고정 높이 */}
                <h3 className={`font-bold text-base sm:text-lg mb-2 line-clamp-2 h-[48px] sm:h-[56px] ${theme.text}`}>
                  {session.title}
                </h3>

                {/* 설명 - 고정 높이 */}
                <div className="h-[40px] mb-4">
                  {session.description && (
                    <p className={`text-sm line-clamp-2 ${theme.textMuted}`}>
                      {session.description}
                    </p>
                  )}
                </div>

                {/* 멘토 정보 - 고정 높이 */}
                <div className={`flex items-center mb-4 p-3 rounded-xl h-[64px] ${
                  darkMode ? "bg-white/[0.03]" : "bg-slate-50"
                }`}>
                  <div className="w-10 h-10 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0">
                    {session.mentorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme.text}`}>{session.mentorName}</p>
                    {session.mentorUsername && (
                      <p className={`text-xs truncate ${theme.textSubtle}`}>@{session.mentorUsername}</p>
                    )}
                  </div>
                </div>

                {/* 날짜/시간 - 고정 높이 */}
                <div className="space-y-2 mb-4 h-[52px]">
                  <div className={`flex items-center text-sm ${theme.textMuted}`}>
                    <Calendar className="w-4 h-4 mr-2 text-[#8F5CFF]" />
                    <span>{formatSessionDate(session.sessionDate)}</span>
                  </div>
                  <div className={`flex items-center text-sm ${theme.textMuted}`}>
                    <Clock className="w-4 h-4 mr-2 text-[#8F5CFF]" />
                    <span>{formatSessionTime(session.sessionDate)} ({session.durationMinutes}분)</span>
                  </div>
                </div>

                {/* 하단 영역 - mt-auto로 항상 하단에 배치 */}
                <div className="mt-auto">
                  {/* 예약 상태 */}
                  <div className={`pt-4 border-t mb-4 ${darkMode ? "border-white/[0.08]" : "border-slate-100"}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${theme.textSubtle}`}>예약 상태</p>
                      <p className={`text-sm font-bold ${
                        session.isFull ? "text-red-500" : "text-emerald-500"
                      }`}>
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
                        ? darkMode
                          ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] hover:shadow-lg hover:shadow-purple-500/30 text-white'
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

      {/* 세션 등록 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${theme.modal}`}>
            <div className={`sticky top-0 ${theme.modal} border-b ${theme.modalHeader} p-4 sm:p-6 flex items-center justify-between`}>
              <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>멘토링 세션 등록</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className={`p-2 rounded-lg transition-colors ${theme.button}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-5">
                {/* 제목 */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    placeholder="예: 백엔드 면접 준비 멘토링"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none transition-all ${
                      validationErrors.title
                        ? 'border-red-500'
                        : theme.input
                    }`}
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
                  )}
                </div>

                {/* 설명 */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                    설명 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={sessionForm.description}
                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    placeholder="멘토링 세션에 대한 설명을 입력해주세요 (최소 10자)"
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none resize-none transition-all ${
                      validationErrors.description
                        ? 'border-red-500'
                        : theme.input
                    }`}
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>

                {/* 날짜 & 시간 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                      날짜 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={sessionForm.sessionDate}
                      min={getTodayString()}
                      onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none transition-all ${
                        validationErrors.sessionDate
                          ? 'border-red-500'
                          : theme.input
                      }`}
                    />
                    {validationErrors.sessionDate && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.sessionDate}</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                      시간 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={sessionForm.sessionTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, sessionTime: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none transition-all ${theme.input}`}
                    />
                  </div>
                </div>

                {/* 소요 시간 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                      소요 시간 (분)
                    </label>
                    <input
                      type="number"
                      value={sessionForm.durationMinutes}
                      onChange={(e) => setSessionForm({ ...sessionForm, durationMinutes: parseInt(e.target.value) || 60 })}
                      min="30"
                      step="30"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none transition-all ${theme.input}`}
                    />
                  </div>
                </div>

                {/* 1:1 멘토링 안내 */}
                <div className={`rounded-xl p-4 ${
                  darkMode ? "bg-[#5A7BFF]/10 border border-[#5A7BFF]/20" : "bg-[#5A7BFF]/5 border border-[#5A7BFF]/20"
                }`}>
                  <div className="flex items-center">
                    <UserIcon className={`w-5 h-5 mr-2 ${darkMode ? "text-[#5A7BFF]" : "text-[#4A6BEF]"}`} />
                    <p className={`text-sm ${darkMode ? "text-[#5A7BFF]" : "text-[#4A6BEF]"}`}>
                      1:1 멘토링으로 진행됩니다
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all border ${theme.button}`}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}