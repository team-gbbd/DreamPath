import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mentoringSessionService, bookingService, paymentService, userService } from '@/lib/api';
import Header from '@/components/feature/Header';

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

interface User {
  userId: number;
  name: string;
  email: string;
  phone?: string;
}

export default function BookMentoringPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<MentoringSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentUserId = (): number => {
    const user = localStorage.getItem('dreampath:user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.userId;
    }
    return 1; // 임시
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = getCurrentUserId();

        // DB에서 실제 사용자 정보 조회
        const userData = await userService.getUserProfile(userId);
        setCurrentUser({
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        });

        // 세션 정보 조회
        const sessionData = await mentoringSessionService.getSession(Number(sessionId));
        setSession(sessionData);

        // 세션이 마감되었는지 확인
        if (sessionData.isFull) {
          alert('이미 마감된 세션입니다.');
          navigate('/mentoring');
          return;
        }

        // 잔여 횟수 조회 (가격이 0원이 아닌 경우만)
        if (sessionData.price > 0) {
          const sessions = await paymentService.getRemainingSessions(userId);
          setRemainingSessions(sessions);
        }

        setIsLoading(false);
      } catch (error: any) {
        console.error('데이터 로딩 실패:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
        navigate('/mentoring');
      }
    };

    fetchData();
  }, [sessionId, navigate]);

  const handleSubmit = async () => {
    if (!session) return;

    // 가격이 0원이 아닌데 잔여 횟수가 부족한 경우
    if (session.price > 0 && remainingSessions < 1) {
      if (confirm('잔여 멘토링 횟수가 부족합니다. 이용권을 구매하시겠습니까?')) {
        navigate('/payments/purchase');
      }
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

      alert('멘토링 예약이 완료되었습니다! 멘토가 확정하면 알림을 받으실 수 있습니다.');
      navigate('/my-bookings');
    } catch (error: any) {
      console.error('예약 생성 실패:', error);
      alert(error.response?.data?.message || '예약 생성 중 오류가 발생했습니다.');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/mentoring')}
            className="mb-6 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line text-xl mr-1"></i>
            <span className="text-sm">목록으로</span>
          </button>

          {/* Main Container */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-pink-300 p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">멘토링 신청</h1>

            {/* 세션 정보 */}
            <div className="mb-8 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">
                {session.title}
              </h2>
              {session.description && (
                <p className="text-gray-600 mb-4">{session.description}</p>
              )}

              {/* 멘토 정보 */}
              <div className="flex items-center mb-4 p-3 bg-white rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  {session.mentorName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{session.mentorName}</p>
                  <p className="text-sm text-gray-600">@{session.mentorUsername}</p>
                </div>
              </div>

              {/* 세션 상세 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center text-gray-700 mb-2">
                    <i className="ri-calendar-line mr-2 text-pink-500"></i>
                    <span className="text-sm font-semibold">날짜</span>
                  </div>
                  <p className="text-gray-900 font-medium">{formatDateKorean(session.sessionDate)}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center text-gray-700 mb-2">
                    <i className="ri-time-line mr-2 text-pink-500"></i>
                    <span className="text-sm font-semibold">시간</span>
                  </div>
                  <p className="text-gray-900 font-medium">{formatTimeKorean(session.sessionDate)} ({session.durationMinutes}분)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Message */}
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-pink-500 text-white rounded-lg flex items-center justify-center font-bold mr-3">
                      1
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">
                      멘토에게 보낼 메시지
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    어떤 부분을 멘토링 받고 싶은지 자세하게 작성하면 멘토링 진행에 도움이 됩니다.
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="안녕하세요! 저는 프로그래밍에 관심이 많은 고등학생입니다.&#10;앞으로 개발자가 되고 싶은데 어떤 공부를 해야 할지, 어떤 진로를 선택하면 좋을지 궁금해서 멘토링을 신청하게 되었어요.&#10;잘 부탁드립니다!"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none resize-none text-sm"
                  />
                </div>
              </div>

              {/* Right: Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  {/* 신청자 정보 */}
                  <div className="bg-white rounded-lg p-5 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-pink-500 text-white rounded-lg flex items-center justify-center font-bold mr-3">
                          2
                        </div>
                        <h3 className="font-bold text-gray-800">신청자 정보</h3>
                      </div>
                    </div>

                    {currentUser && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            이름 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={currentUser.name}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            이메일 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={currentUser.email}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            휴대폰 번호 <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-1.5">
                            <select className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-xs w-24">
                              <option>🇰🇷 +82</option>
                            </select>
                            <input
                              type="tel"
                              value={currentUser.phone || '01012345678'}
                              readOnly
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm min-w-0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: 결제 정보 */}
                  {session.price > 0 ? (
                    <>
                      <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-pink-500 text-white rounded-lg flex items-center justify-center font-bold mr-3">
                            3
                          </div>
                          <h3 className="font-bold text-gray-800">멘토링 이용권</h3>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-green-300">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <input type="radio" name="voucher" defaultChecked className="mr-2" />
                              <span className="text-sm font-semibold text-gray-700">{remainingSessions}회 남음</span>
                            </div>
                            <span className="text-green-600 font-bold text-sm">~25. 12. 31. 23:59</span>
                          </div>
                          <p className="text-xs text-gray-500 ml-6">성장하고 싶은 개발자를 위한 실전 강의</p>
                        </div>
                        <label className="flex items-center mt-3 text-sm text-gray-600 cursor-pointer">
                          <input type="radio" name="voucher" className="mr-2" />
                          사용 안 함
                        </label>
                      </div>

                      {/* 멘토링 금액 */}
                      <div className="bg-gray-50 rounded-lg p-5 mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">멘토링 금액</span>
                          <span className="font-semibold">₩{session.price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-600">할인 금액</span>
                          <span className="text-red-600 font-semibold">-₩{session.price.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                          <span className="font-bold text-gray-800">총 결제 금액</span>
                          <span className="text-2xl font-bold">₩0</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-pink-500 text-white rounded-lg flex items-center justify-center font-bold mr-3">
                          3
                        </div>
                        <h3 className="font-bold text-gray-800">결제 정보</h3>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <i className="ri-gift-line text-5xl text-green-500 mb-2"></i>
                          <p className="text-lg font-bold text-gray-800">무료 멘토링</p>
                          <p className="text-sm text-gray-600 mt-1">이용권 없이 신청 가능합니다</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 결제하기 버튼 */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || session.isFull}
                    className={`
                      w-full py-4 rounded-lg font-bold text-lg transition-all
                      ${isSubmitting || session.isFull
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg'
                      }
                    `}
                  >
                    {isSubmitting ? '예약 중...' : session.isFull ? '마감된 세션' : session.price > 0 ? '결제하기' : '신청하기'}
                  </button>

                  {/* 취소 정책 안내 */}
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <i className="ri-information-line text-yellow-600 mr-2 mt-0.5"></i>
                      <div>
                        <p className="text-xs font-bold text-gray-800 mb-2">멘토링 환불은 멘토링 확정 후 진행됩니다.</p>
                        <p className="text-xs text-gray-600 mb-1">신청 후 24시간 내로 멘토링 진행 여부를 확인할 수 있습니다. 진행이 확정되면, 멘토와 세부 일정 조율 후 진행됩니다.</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                          <li>120시간 전 취소 시: 100% 환불</li>
                          <li>120시간 ~ 24시간 전 취소 시: 30% 환불</li>
                          <li>24시간 내 취소 시: 환불 불가</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {session.price > 0 && remainingSessions < 1 && (
                    <button
                      onClick={() => navigate('/payments/purchase')}
                      className="w-full mt-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                      <i className="ri-shopping-cart-line mr-2"></i>
                      이용권 구매하러 가기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
