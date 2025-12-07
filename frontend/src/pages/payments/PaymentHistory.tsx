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
    } catch (err) {
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

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PURCHASE: 'text-green-600 bg-green-100',
      USE: 'text-blue-600 bg-blue-100',
      REFUND: 'text-yellow-600 bg-yellow-100',
      CANCEL: 'text-red-600 bg-red-100',
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5A7BFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/profile/dashboard')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <i className="ri-arrow-left-line text-xl mr-2"></i>
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-history-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">결제 및 사용 내역</h1>
                <p className="text-sm text-gray-600">이용권 구매 및 사용 내역을 확인하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
            <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="ri-money-dollar-circle-line mr-2"></i>
            결제 내역 ({paymentHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'usage'
                ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="ri-list-check-2 mr-2"></i>
            사용 내역 ({usageHistory.length})
          </button>
        </div>

        {/* Payment History Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="ri-shopping-bag-line text-[#5A7BFF] mr-3"></i>
              결제 내역
            </h2>

            {paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 mb-4">결제 내역이 없습니다.</p>
                <button
                  onClick={() => navigate('/payments/purchase')}
                  className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity font-medium"
                >
                  <i className="ri-shopping-cart-line mr-2"></i>
                  이용권 구매하기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.paymentId}
                    className="border-2 border-gray-100 rounded-xl p-6 hover:border-[#5A7BFF]/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                          {payment.sessionPackage.replace('_', ' ')} ({payment.sessionsPurchased}회)
                        </h3>
                        <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#5A7BFF]">
                          {payment.amount.toLocaleString()}원
                        </p>
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold mt-2">
                          결제 완료
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">결제 방법</span>
                        <p className="font-medium text-gray-800 mt-1">{payment.paymentMethod || '카드'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">충전된 횟수</span>
                        <p className="font-medium text-gray-800 mt-1">+{payment.sessionsPurchased}회</p>
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
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <i className="ri-file-list-3-line text-[#5A7BFF] mr-3"></i>
              사용 내역
            </h2>

            {usageHistory.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">사용 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usageHistory.map((log) => (
                  <div
                    key={log.logId}
                    className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-[#5A7BFF]/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`px-3 py-1 rounded-lg text-sm font-bold ${getChangeTypeColor(log.changeType)}`}>
                        {getChangeTypeLabel(log.changeType)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{log.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">{log.sessionsBefore}회</span>
                        <i className="ri-arrow-right-line text-gray-400"></i>
                        <span className={`font-bold ${
                          log.sessionsAfter > log.sessionsBefore ? 'text-green-600' :
                          log.sessionsAfter < log.sessionsBefore ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {log.sessionsAfter}회
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.sessionsAfter > log.sessionsBefore ? '+' : ''}
                        {log.sessionsAfter - log.sessionsBefore}회
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
