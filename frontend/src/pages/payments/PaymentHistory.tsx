import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '@/lib/api';

interface PaymentHistory {
  paymentId: number;
  amount: number;
  sessionPackage: string;
  sessionsPurchased: number;
  paymentMethod: string;
  status: string;
  paidAt: string;
  createdAt: string;
}

interface UsageHistory {
  logId: number;
  bookingId: number | null;
  sessionsBefore: number;
  sessionsAfter: number;
  changeType: string;
  description: string;
  createdAt: string;
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'payments' | 'usage'>('payments');
  const [isLoading, setIsLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      : "bg-white border-slate-200 shadow-sm",
    cardHover: darkMode
      ? "hover:bg-white/[0.06] hover:border-white/[0.15]"
      : "hover:shadow-md hover:border-slate-300",
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

  const userId = getLoggedInUserId();

  useEffect(() => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [payments, usage] = await Promise.all([
        paymentService.getPaymentHistory(userId),
        paymentService.getUsageHistory(userId),
      ]);

      setPaymentHistory(payments);
      setUsageHistory(usage);
    } catch (err: any) {
      console.error('데이터 로딩 실패:', err);
      setError(err.response?.data || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: '구매',
      USE: '사용',
      REFUND: '환불',
      CANCEL: '취소',
    };
    return labels[type] || type;
  };

  const getChangeTypeColor = (type: string, isDark: boolean) => {
    const colors: Record<string, string> = {
      PURCHASE: isDark ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100',
      USE: isDark ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100',
      REFUND: isDark ? 'text-yellow-400 bg-yellow-500/20' : 'text-yellow-600 bg-yellow-100',
      CANCEL: isDark ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100',
    };
    return colors[type] || (isDark ? 'text-gray-400 bg-gray-500/20' : 'text-gray-600 bg-gray-100');
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
        </div>

        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-xl font-medium ${theme.text}`}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
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

      <div className="relative z-10 pt-8 sm:pt-12 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/profile/dashboard?tab=mentoring')}
                className={`${theme.textMuted} hover:${theme.text} transition-colors`}
              >
                <i className="ri-arrow-left-line text-xl"></i>
              </button>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center">
                <i className="ri-history-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>결제 및 사용 내역</h1>
                <p className={`text-sm ${theme.textMuted}`}>이용권 구매 및 사용 내역을 확인하세요</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/payments/purchase')}
              className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all font-medium text-sm flex items-center justify-center gap-2"
            >
              <i className="ri-shopping-cart-line"></i>
              <span>이용권 구매</span>
            </button>
          </div>

          {error && (
            <div className={`mb-6 rounded-xl p-4 flex items-start ${darkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
              <p className={darkMode ? 'text-red-400' : 'text-red-800'}>{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className={`rounded-2xl border p-1.5 sm:p-2 mb-6 flex gap-1.5 sm:gap-2 ${theme.card}`}>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-md'
                  : `${theme.textMuted} ${darkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50'}`
              }`}
            >
              <i className="ri-money-dollar-circle-line mr-1.5 sm:mr-2"></i>
              결제 내역 ({paymentHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
                activeTab === 'usage'
                  ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-md'
                  : `${theme.textMuted} ${darkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-slate-50'}`
              }`}
            >
              <i className="ri-list-check-2 mr-1.5 sm:mr-2"></i>
              사용 내역 ({usageHistory.length})
            </button>
          </div>

          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 ${theme.card}`}>
              <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${theme.text} mb-4 sm:mb-6 flex items-center`}>
                <i className="ri-shopping-bag-line text-[#5A7BFF] mr-2 sm:mr-3"></i>
                결제 내역
              </h2>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <i className={`ri-inbox-line text-5xl sm:text-6xl ${theme.textSubtle} mb-4`}></i>
                  <p className={`${theme.textMuted} mb-4`}>결제 내역이 없습니다.</p>
                  <button
                    onClick={() => navigate('/payments/purchase')}
                    className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all font-medium text-sm sm:text-base"
                  >
                    <i className="ri-shopping-cart-line mr-2"></i>
                    이용권 구매하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.paymentId}
                      className={`rounded-xl p-4 sm:p-6 border transition-all ${theme.card} ${theme.cardHover}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                        <div>
                          <h3 className={`text-base sm:text-lg font-bold ${theme.text} mb-1`}>
                            {payment.sessionPackage.replace('_', ' ')} ({payment.sessionsPurchased}회)
                          </h3>
                          <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{formatDate(payment.paidAt)}</p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                          <p className="text-xl sm:text-2xl font-bold text-[#5A7BFF]">
                            {payment.amount.toLocaleString()}원
                          </p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                          }`}>
                            결제 완료
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                        <div>
                          <span className={theme.textMuted}>결제 방법</span>
                          <p className={`font-medium ${theme.text} mt-1`}>{payment.paymentMethod || '카드'}</p>
                        </div>
                        <div>
                          <span className={theme.textMuted}>충전된 횟수</span>
                          <p className={`font-medium ${theme.text} mt-1`}>+{payment.sessionsPurchased}회</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage History Tab */}
          {activeTab === 'usage' && (
            <div className={`rounded-2xl border p-4 sm:p-6 lg:p-8 ${theme.card}`}>
              <h2 className={`text-lg sm:text-xl lg:text-2xl font-bold ${theme.text} mb-4 sm:mb-6 flex items-center`}>
                <i className="ri-file-list-3-line text-[#5A7BFF] mr-2 sm:mr-3"></i>
                사용 내역
              </h2>

              {usageHistory.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <i className={`ri-inbox-line text-5xl sm:text-6xl ${theme.textSubtle} mb-4`}></i>
                  <p className={theme.textMuted}>사용 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {usageHistory.map((log) => (
                    <div
                      key={log.logId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border gap-3 transition-all ${theme.card} ${theme.cardHover}`}
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                        <div className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap ${getChangeTypeColor(log.changeType, darkMode)}`}>
                          {getChangeTypeLabel(log.changeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${theme.text} text-sm sm:text-base truncate`}>{log.description}</p>
                          <p className={`text-xs ${theme.textMuted} mt-0.5`}>{formatDate(log.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={theme.textMuted}>{log.sessionsBefore}회</span>
                          <i className={`ri-arrow-right-line ${theme.textSubtle}`}></i>
                          <span className={`font-bold ${
                            log.sessionsAfter > log.sessionsBefore
                              ? darkMode ? 'text-green-400' : 'text-green-600'
                              : log.sessionsAfter < log.sessionsBefore
                                ? darkMode ? 'text-red-400' : 'text-red-600'
                                : theme.textMuted
                          }`}>
                            {log.sessionsAfter}회
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.sessionsAfter > log.sessionsBefore
                              ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                              : log.sessionsAfter < log.sessionsBefore
                                ? darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                                : darkMode ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {log.sessionsAfter > log.sessionsBefore ? '+' : ''}
                            {log.sessionsAfter - log.sessionsBefore}회
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}