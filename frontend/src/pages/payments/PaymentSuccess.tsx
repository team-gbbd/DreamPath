import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '@/lib/api';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const hasProcessed = useRef(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  // Theme 객체
  const theme = {
    bg: darkMode ? "bg-[#0B0D14]" : "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-lg",
    detailBg: darkMode
      ? "bg-white/[0.05]"
      : "bg-slate-50",
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

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processPayment = async () => {
      const userId = getLoggedInUserId();
      if (!userId) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.');
        setIsProcessing(false);
        return;
      }

      try {
        const response = await paymentService.completePayment(
          userId,
          paymentKey,
          orderId,
          parseInt(amount)
        );

        setPaymentInfo(response);
        setIsProcessing(false);
      } catch (err: any) {
        console.error('결제 완료 처리 실패:', err);

        let errorMessage = '결제 완료 처리 중 오류가 발생했습니다.';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data) {
          errorMessage = typeof err.response.data === 'string'
            ? err.response.data
            : JSON.stringify(err.response.data);
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processPayment();
  }, []);

  // 로딩 화면
  if (isProcessing) {
    return (
      <div className={`min-h-full flex flex-col ${theme.bg} relative`}>
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

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className={`text-base sm:text-lg font-medium ${theme.text}`}>결제 완료 처리 중...</p>
            <p className={`text-xs sm:text-sm ${theme.textMuted} mt-1`}>잠시만 기다려주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className={`min-h-full flex flex-col ${theme.bg} relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-red-500/10" : "bg-red-500/20"}`} />
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

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 relative z-10">
          <div className={`max-w-md w-full rounded-2xl border-2 border-dashed p-4 sm:p-5 ${
            darkMode ? 'bg-white/[0.03] border-red-500/30' : 'bg-white border-red-300 shadow-lg'
          }`}>
            <div className="text-center">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                darkMode ? 'bg-red-500/20' : 'bg-red-100'
              }`}>
                <i className={`ri-close-line text-3xl sm:text-4xl ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
              </div>

              <h1 className={`text-xl sm:text-2xl font-bold ${theme.text} mb-1`}>결제 처리 실패</h1>
              <p className={`${theme.textMuted} mb-4 text-xs sm:text-sm`}>{error}</p>

              <button
                onClick={() => navigate('/payments/purchase')}
                className="w-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
              >
                <i className="ri-refresh-line mr-2"></i>
                다시 시도하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 성공 화면
  return (
    <div className={`min-h-full flex flex-col ${theme.bg} relative`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-green-500/10" : "bg-green-500/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
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

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 relative z-10">
        <div className={`max-w-md w-full rounded-2xl border p-4 sm:p-5 ${theme.card}`}>
          <div className="text-center">
            {/* Success Icon */}
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
              darkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <i className={`ri-check-line text-4xl sm:text-5xl ${darkMode ? 'text-green-400' : 'text-green-500'}`}></i>
            </div>

            <h1 className={`text-xl sm:text-2xl font-bold ${theme.text} mb-1`}>결제 완료!</h1>
            <p className={`${theme.textMuted} mb-3 sm:mb-4 text-xs sm:text-sm`}>이용권이 성공적으로 충전되었습니다.</p>

            {/* Payment Details */}
            {paymentInfo && (
              <div className={`rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 text-left ${theme.detailBg}`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${theme.textMuted}`}>구매 이용권</span>
                    <span className={`font-bold text-sm ${theme.text}`}>
                      {paymentInfo.sessionsPurchased}회 이용권
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${theme.textMuted}`}>결제 금액</span>
                    <span className="font-bold text-sm text-[#5A7BFF]">
                      {paymentInfo.amount.toLocaleString()}원
                    </span>
                  </div>

                  <div className={`flex justify-between items-center pt-2 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <span className={`text-xs ${theme.textMuted}`}>결제 방법</span>
                    <span className={`text-sm ${theme.text}`}>{paymentInfo.paymentMethod}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${theme.textMuted}`}>결제 일시</span>
                    <span className={`${theme.text} text-xs`}>
                      {new Date(paymentInfo.paidAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {(() => {
                const returnUrl = localStorage.getItem('payment_return_url');
                if (returnUrl) {
                  return (
                    <button
                      onClick={() => {
                        localStorage.removeItem('payment_return_url');
                        navigate(returnUrl);
                      }}
                      className="w-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
                    >
                      <i className="ri-arrow-go-back-line mr-2"></i>
                      이전 페이지로 돌아가기
                    </button>
                  );
                }
                return (
                  <>
                    <button
                      onClick={() => navigate('/profile/dashboard')}
                      className="w-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
                    >
                      <i className="ri-user-line mr-2"></i>
                      프로파일링 대시보드로 이동
                    </button>

                    <button
                      onClick={() => navigate('/mentoring')}
                      className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${
                        darkMode
                          ? 'border-[#5A7BFF] text-[#5A7BFF] hover:bg-[#5A7BFF]/10'
                          : 'border-[#5A7BFF] text-[#5A7BFF] hover:bg-[#5A7BFF]/5'
                      }`}
                    >
                      <i className="ri-calendar-check-line mr-2"></i>
                      멘토링 예약하러 가기
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}