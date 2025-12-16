import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentFailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    errorBg: darkMode
      ? "bg-red-500/10 border border-red-500/30"
      : "bg-red-50 border border-red-200",
    helpBg: darkMode
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

  // URL 쿼리 파라미터에서 에러 정보 추출
  const errorCode = searchParams.get('code') || 'UNKNOWN_ERROR';
  const errorMessage = searchParams.get('message') || '결제 중 오류가 발생했습니다.';

  const getErrorDescription = (code: string) => {
    const descriptions: Record<string, string> = {
      'PAY_PROCESS_CANCELED': '사용자가 결제를 취소했습니다.',
      'PAY_PROCESS_ABORTED': '결제 진행 중 중단되었습니다.',
      'REJECT_CARD_COMPANY': '카드사에서 승인을 거절했습니다.',
      'UNKNOWN_PAYMENT_ERROR': '알 수 없는 결제 오류가 발생했습니다.',
      'NOT_FOUND_PAYMENT': '결제 정보를 찾을 수 없습니다.',
      'COMMON_ERROR': '결제 중 오류가 발생했습니다.',
    };

    return descriptions[code] || descriptions['COMMON_ERROR'];
  };

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
            {/* Error Icon */}
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
              darkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <i className={`ri-close-line text-3xl sm:text-4xl ${darkMode ? 'text-red-400' : 'text-red-500'}`}></i>
            </div>

            <h1 className={`text-xl sm:text-2xl font-bold ${theme.text} mb-1`}>결제 실패</h1>
            <p className={`${theme.textMuted} mb-3 sm:mb-4 text-xs sm:text-sm`}>{getErrorDescription(errorCode)}</p>

            {/* Error Details */}
            <div className={`rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 text-left ${theme.errorBg}`}>
              <div className="space-y-2">
                <div>
                  <span className={`text-xs font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>오류 코드</span>
                  <p className={`font-mono text-xs mt-0.5 ${theme.text}`}>{errorCode}</p>
                </div>
                <div>
                  <span className={`text-xs font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>상세 메시지</span>
                  <p className={`text-xs mt-0.5 ${theme.textMuted}`}>{errorMessage}</p>
                </div>
              </div>
            </div>

            {/* Help Info */}
            <div className={`rounded-xl p-3 mb-3 sm:mb-4 text-left ${theme.helpBg}`}>
              <h3 className={`text-xs font-bold ${theme.text} mb-1.5 flex items-center`}>
                <i className="ri-information-line text-[#5A7BFF] mr-1.5"></i>
                결제 실패 시 확인 사항
              </h3>
              <ul className="space-y-1 text-xs">
                <li className={`flex items-start ${theme.textMuted}`}>
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-1.5 mt-0.5 flex-shrink-0 text-[10px]"></i>
                  <span>카드 한도 및 잔액을 확인해주세요.</span>
                </li>
                <li className={`flex items-start ${theme.textMuted}`}>
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-1.5 mt-0.5 flex-shrink-0 text-[10px]"></i>
                  <span>카드 정보가 정확한지 확인해주세요.</span>
                </li>
                <li className={`flex items-start ${theme.textMuted}`}>
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-1.5 mt-0.5 flex-shrink-0 text-[10px]"></i>
                  <span>네트워크 연결 상태를 확인해주세요.</span>
                </li>
                <li className={`flex items-start ${theme.textMuted}`}>
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-1.5 mt-0.5 flex-shrink-0 text-[10px]"></i>
                  <span>문제가 지속되면 고객센터로 문의해주세요.</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => navigate('/payments/purchase')}
                className="w-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm"
              >
                <i className="ri-refresh-line mr-2"></i>
                다시 시도하기
              </button>

              <button
                onClick={() => navigate('/profile/dashboard')}
                className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${
                  darkMode
                    ? 'border-white/20 text-white/80 hover:bg-white/[0.05]'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <i className="ri-home-line mr-2"></i>
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}