import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentoringSessionService, bookingService, paymentService, userService } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle, ShoppingCart, User } from 'lucide-react';

interface MentoringSession {
  sessionId: number;
  mentorId: number;
  mentorName: string;
  mentorUsername: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  price: number;
  currentParticipants: number;
  availableSlots: number;
  isActive: boolean;
  isFull: boolean;
}

interface UserInfo {
  userId: number;
  name: string;
  email: string;
  phone?: string;
}

export default function BookMentoringPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast, ToastContainer } = useToast();

  const [darkMode, setDarkMode] = useState(true);
  const [session, setSession] = useState<MentoringSession | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Theme 객체
  const theme = {
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
    cardHighlight: darkMode
      ? "bg-gradient-to-br from-[#5A7BFF]/10 to-[#8F5CFF]/10 border-[#5A7BFF]/20"
      : "bg-gradient-to-br from-[#5A7BFF]/5 to-[#8F5CFF]/5 border-[#5A7BFF]/20",
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30 focus:border-[#5A7BFF]/50"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5A7BFF]/50",
    inputReadonly: darkMode
      ? "bg-white/[0.03] border-white/[0.08] text-white/70"
      : "bg-slate-50 border-slate-200 text-slate-700",
    button: darkMode
      ? "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white/70 hover:text-white"
      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900",
    success: darkMode
      ? "bg-emerald-500/10 border-emerald-500/20"
      : "bg-emerald-50 border-emerald-200",
    warning: darkMode
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-amber-50 border-amber-200",
    danger: darkMode
      ? "bg-red-500/10 border-red-500/20"
      : "bg-red-50 border-red-200",
  };

  const getCurrentUserId = (): number => {
    const user = localStorage.getItem('dreampath:user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.userId;
    }
    return 1;
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

    const fetchData = async () => {
      try {
        const userId = getCurrentUserId();

        const userData = await userService.getUserProfile(userId);
        setCurrentUser({
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        });

        const sessionData = await mentoringSessionService.getSession(Number(sessionId));
        setSession(sessionData);

        if (sessionData.isFull) {
          showToast('이미 마감된 세션입니다.', 'warning');
          navigate('/mentoring');
          return;
        }

        const sessions = await paymentService.getRemainingSessions(userId);
        setRemainingSessions(sessions);

        setIsLoading(false);
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        navigate('/mentoring');
      }
    };

    fetchData();

    return () => {
      window.removeEventListener('dreampath-theme-change', handleThemeChange);
    };
  }, [sessionId, navigate]);

  const handleSubmit = async () => {
    if (!session) return;

    if (remainingSessions < 1) {
      showToast('잔여 멘토링 횟수가 부족합니다. 이용권을 구매해주세요.', 'warning');
      navigate(`/payments/purchase?returnUrl=${encodeURIComponent(`/mentoring/book/${sessionId}`)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = getCurrentUserId();

      await bookingService.createBooking({
        sessionId: session.sessionId,
        menteeId: userId,
        message: message || undefined,
      });

      showToast('멘토링 예약이 완료되었습니다! 멘토가 확정하면 알림을 받으실 수 있습니다.', 'success');
      navigate('/mentoring');
    } catch (error) {
      console.error('예약 생성 실패:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      showToast(apiError.response?.data?.message || '예약 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateKorean = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[date.getDay()];

    return `${year}. ${month}. ${day}. ${weekday}`;
  };

  const formatTimeKorean = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5A7BFF]"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="relative min-h-screen">
      <ToastContainer />

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${
            darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"
          }`}
        />
        <div
          className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${
            darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"
          }`}
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate('/mentoring')}
          className={`mb-6 flex items-center gap-2 transition-colors ${theme.textMuted} hover:${theme.text}`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">목록으로</span>
        </button>

        {/* 페이지 타이틀 */}
        <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text} mb-6 md:mb-8`}>
          멘토링 신청
        </h1>

        {/* 세션 정보 카드 */}
        <div className={`rounded-2xl border p-5 sm:p-6 mb-6 md:mb-8 ${theme.cardHighlight}`}>
          <h2 className={`text-lg sm:text-xl font-bold ${theme.text} mb-2`}>
            {session.title}
          </h2>
          {session.description && (
            <p className={`text-sm mb-4 ${theme.textMuted}`}>{session.description}</p>
          )}

          {/* 멘토 정보 */}
          <div className={`flex items-center mb-4 p-3 rounded-xl ${
            darkMode ? "bg-white/[0.05]" : "bg-white"
          }`}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
              {session.mentorName.charAt(0)}
            </div>
            <div>
              <p className={`font-bold ${theme.text}`}>{session.mentorName}</p>
              <p className={`text-sm ${theme.textSubtle}`}>@{session.mentorUsername}</p>
            </div>
          </div>

          {/* 날짜/시간 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className={`rounded-xl p-4 ${darkMode ? "bg-white/[0.05]" : "bg-white"}`}>
              <div className={`flex items-center mb-2 ${theme.textMuted}`}>
                <Calendar className="w-4 h-4 mr-2 text-[#8F5CFF]" />
                <span className="text-sm font-semibold">날짜</span>
              </div>
              <p className={`font-medium ${theme.text}`}>{formatDateKorean(session.sessionDate)}</p>
            </div>
            <div className={`rounded-xl p-4 ${darkMode ? "bg-white/[0.05]" : "bg-white"}`}>
              <div className={`flex items-center mb-2 ${theme.textMuted}`}>
                <Clock className="w-4 h-4 mr-2 text-[#8F5CFF]" />
                <span className="text-sm font-semibold">시간</span>
              </div>
              <p className={`font-medium ${theme.text}`}>{formatTimeKorean(session.sessionDate)} ({session.durationMinutes}분)</p>
            </div>
          </div>
        </div>

        {/* 1. 메시지 입력 - 전체 너비 */}
        <div className={`rounded-2xl border p-5 sm:p-6 mb-6 ${theme.card}`}>
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl flex items-center justify-center font-bold mr-3">
              1
            </div>
            <h2 className={`text-lg font-bold ${theme.text}`}>
              멘토에게 보낼 메시지
            </h2>
          </div>
          <p className={`text-sm mb-4 ${theme.textMuted}`}>
            어떤 부분을 멘토링 받고 싶은지 자세하게 작성하면 멘토링 진행에 도움이 됩니다.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="안녕하세요! 저는 프로그래밍에 관심이 많은 고등학생입니다.&#10;앞으로 개발자가 되고 싶은데 어떤 공부를 해야 할지, 어떤 진로를 선택하면 좋을지 궁금해서 멘토링을 신청하게 되었어요.&#10;잘 부탁드립니다!"
            rows={7}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#5A7BFF]/30 focus:outline-none resize-none text-m transition-all ${theme.input}`}
          />
        </div>

        {/* 2, 3 하단 2컬럼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. 신청자 정보 */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${theme.card}`}>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl flex items-center justify-center font-bold mr-3">
                2
              </div>
              <h3 className={`text-lg font-bold ${theme.text}`}>신청자 정보</h3>
            </div>

            {currentUser && (
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs mb-1 ${theme.textMuted}`}>
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentUser.name}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${theme.inputReadonly}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${theme.textMuted}`}>
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${theme.inputReadonly}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs mb-1 ${theme.textMuted}`}>
                    휴대폰 번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={currentUser.phone || '01012345678'}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${theme.inputReadonly}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. 이용권 + 신청 버튼 */}
          <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col ${theme.card}`}>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl flex items-center justify-center font-bold mr-3">
                3
              </div>
              <h3 className={`text-lg font-bold ${theme.text}`}>멘토링 이용권</h3>
            </div>

            <div className="grid grid-cols-5 gap-3 flex-grow">
              {/* 이용권 상태 - 3 비율 */}
              <div className="col-span-3">
                {remainingSessions > 0 ? (
                  <div className={`rounded-xl p-4 h-full flex flex-col justify-center ${darkMode ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mr-2" />
                        <span className={`text-sm font-bold ${theme.text}`}>{remainingSessions}회 남음</span>
                      </div>
                      <span className="text-emerald-500 font-bold text-xs">사용 가능</span>
                    </div>
                    <p className={`text-xs ml-7 ${theme.textMuted}`}>멘토링 1회 차감됩니다</p>
                  </div>
                ) : (
                  <div className={`rounded-xl p-4 h-full flex flex-col justify-center ${darkMode ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-300"}`}>
                    <div className="flex items-center mb-2">
                      <XCircle className={`w-5 h-5 mr-2 ${darkMode ? "text-red-400" : "text-red-600"}`} />
                      <span className={`text-sm font-bold ${darkMode ? "text-red-400" : "text-red-800"}`}>이용권 없음</span>
                    </div>
                    <p className={`text-xs mb-3 ${darkMode ? "text-red-400/70" : "text-red-700"}`}>이용권을 구매해주세요</p>
                    <button
                      onClick={() => navigate(`/payments/purchase?returnUrl=${encodeURIComponent(`/mentoring/book/${sessionId}`)}`)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        darkMode
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      구매하기
                    </button>
                  </div>
                )}
              </div>

              {/* 취소 정책 - 2 비율 */}
              <div className={`col-span-2 rounded-xl p-4 h-full flex flex-col justify-center ${darkMode ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                <p className={`text-xs font-bold mb-2 ${darkMode ? "text-amber-300" : "text-amber-700"}`}>취소 정책</p>
                <div className={`text-xs space-y-1 ${darkMode ? "text-amber-200/80" : "text-amber-600"}`}>
                  <p>• 120시간 전: 100%</p>
                  <p>• 120~24시간: 30%</p>
                  <p>• 24시간 내: 불가</p>
                </div>
              </div>
            </div>

            {/* 신청하기 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || session.isFull}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${
                isSubmitting || session.isFull
                  ? darkMode
                    ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:shadow-lg hover:shadow-purple-500/30'
              }`}
            >
              {isSubmitting ? '예약 중...' : session.isFull ? '마감된 세션' : remainingSessions < 1 ? '이용권 필요' : '신청하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}