import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '@/lib/api';
import Header from '@/components/feature/Header';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const hasProcessed = useRef(false); // 중복 실행 방지

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
    // 이미 처리 중이면 중복 실행 방지
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processPayment = async () => {
      const userId = getLoggedInUserId();
      if (!userId) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      // URL 쿼리 파라미터에서 결제 정보 추출
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.');
        setIsProcessing(false);
        return;
      }

      try {
        // 백엔드에 결제 완료 요청
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

        // 에러 메시지 추출
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

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">결제 완료 처리 중...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="pt-16 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border-2 border-dashed border-red-300 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-close-line text-4xl text-red-500"></i>
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">결제 처리 실패</h1>
              <p className="text-gray-600 mb-6">{error}</p>

              <button
                onClick={() => navigate('/payments/purchase')}
                className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold hover:bg-pink-600 transition-colors"
              >
                다시 시도하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border-2 border-dashed border-pink-300 p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-check-line text-5xl text-green-500"></i>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">결제 완료!</h1>
            <p className="text-gray-600 mb-8">이용권이 성공적으로 충전되었습니다.</p>

            {/* Payment Details */}
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">구매 이용권</span>
                    <span className="font-bold text-gray-800">
                      {paymentInfo.sessionsPurchased}회 이용권
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">결제 금액</span>
                    <span className="font-bold text-pink-600">
                      {paymentInfo.amount.toLocaleString()}원
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-gray-600">결제 방법</span>
                    <span className="text-gray-800">{paymentInfo.paymentMethod}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">결제 일시</span>
                    <span className="text-gray-800 text-sm">
                      {new Date(paymentInfo.paidAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/mypage')}
                className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold hover:bg-pink-600 transition-colors"
              >
                <i className="ri-user-line mr-2"></i>
                마이페이지로 이동
              </button>

              <button
                onClick={() => navigate('/mentoring')}
                className="w-full bg-white border-2 border-pink-500 text-pink-500 py-3 rounded-lg font-bold hover:bg-pink-50 transition-colors"
              >
                <i className="ri-calendar-check-line mr-2"></i>
                멘토링 예약하러 가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
