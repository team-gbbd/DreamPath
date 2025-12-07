import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/feature/Header';

export default function PaymentFailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border-2 border-dashed border-red-300 p-8">
          <div className="text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-close-line text-5xl text-red-500"></i>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">결제 실패</h1>
            <p className="text-gray-600 mb-8">{getErrorDescription(errorCode)}</p>

            {/* Error Details */}
            <div className="bg-red-50 rounded-lg p-6 mb-8 text-left">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-red-600 font-bold">오류 코드</span>
                  <p className="text-gray-800 font-mono text-sm mt-1">{errorCode}</p>
                </div>

                <div>
                  <span className="text-sm text-red-600 font-bold">상세 메시지</span>
                  <p className="text-gray-600 text-sm mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>

            {/* Help Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                <i className="ri-information-line text-pink-500 mr-2"></i>
                결제 실패 시 확인 사항
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5 flex-shrink-0"></i>
                  <span>카드 한도 및 잔액을 확인해주세요.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5 flex-shrink-0"></i>
                  <span>카드 정보가 정확한지 확인해주세요.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5 flex-shrink-0"></i>
                  <span>네트워크 연결 상태를 확인해주세요.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5 flex-shrink-0"></i>
                  <span>문제가 지속되면 고객센터로 문의해주세요.</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/payments/purchase')}
                className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold hover:bg-pink-600 transition-colors"
              >
                <i className="ri-refresh-line mr-2"></i>
                다시 시도하기
              </button>

              <button
                onClick={() => navigate('/profile/dashboard')}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                <i className="ri-home-line mr-2"></i>
                프로파일링 대시보드로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
