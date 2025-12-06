import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '@/lib/api';
import Header from '@/components/feature/Header';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

// 토스페이먼츠 설정 (테스트 키)
const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
const TOSS_CUSTOMER_KEY = 'dreampath_customer'; // 고객 식별 키

// 이용권 패키지 정보
const PACKAGES = [
  {
    id: 'SINGLE',
    sessions: 1,
    price: 30000,
    name: '베이직',
    tagline: '시작하는 단계',
    description: '멘토링이 처음이라면',
    features: [
      'AI 진로 분석 1회 제공',
      '직업 체험 미션 1개',
      '멘토링 1회 이용',
      '기본 AI 평가 제공',
    ],
    discount: 0,
    popular: false,
    badge: null,
  },
  {
    id: 'FIVE',
    sessions: 5,
    price: 120000,
    name: '스탠다드',
    tagline: '가장 인기있는 선택',
    description: '꾸준히 배우고 싶다면',
    features: [
      'AI 진로 분석 무제한',
      '직업 체험 미션 5개',
      '멘토링 5회 이용',
      '심화 AI 평가 및 피드백',
      '우선 멘토 매칭',
    ],
    discount: 20,
    popular: true,
    badge: '✨ AI 추천',
  },
  {
    id: 'TEN',
    sessions: 10,
    price: 200000,
    name: '프리미엄',
    tagline: '완벽한 학습 경험',
    description: '진지하게 준비한다면',
    features: [
      'AI 진로 분석 무제한',
      '직업 체험 미션 전체',
      '멘토링 10회 이용',
      '전문가급 AI 평가',
      '우선 멘토 매칭',
      '1:1 맞춤 학습 로드맵',
    ],
    discount: 33,
    popular: false,
    badge: '🎯 최고 효율',
  },
];

export default function PaymentPurchasePage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string | null>('FIVE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);

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

    // 토스페이먼츠 위젯 초기화만 수행 (렌더링은 나중에)
    const initPaymentWidget = async () => {
      try {
        const paymentWidget = await loadPaymentWidget(TOSS_CLIENT_KEY, TOSS_CUSTOMER_KEY);
        paymentWidgetRef.current = paymentWidget;
        setIsWidgetReady(true);
      } catch (err) {
        console.error('토스페이먼츠 위젯 초기화 실패:', err);
        setError('결제 시스템 초기화에 실패했습니다.');
      }
    };

    initPaymentWidget();
  }, []);

  // 선택한 패키지가 변경되면 결제 수단 UI 렌더링
  useEffect(() => {
    if (!paymentWidgetRef.current || !selectedPackage || !isWidgetReady) {
      return;
    }

    const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);
    if (!selectedPkg) return;

    // DOM 요소가 존재하는지 확인
    const paymentMethodElement = document.querySelector('#payment-method');
    const agreementElement = document.querySelector('#agreement');

    if (!paymentMethodElement || !agreementElement) {
      console.log('결제 UI 요소를 찾을 수 없습니다. 잠시 후 다시 시도합니다.');
      return;
    }

    // 결제 수단 UI 렌더링
    const renderPaymentUI = async () => {
      try {
        await paymentWidgetRef.current!.renderPaymentMethods(
          '#payment-method',
          { value: selectedPkg.price },
          { variantKey: 'DEFAULT' }
        );

        await paymentWidgetRef.current!.renderAgreement(
          '#agreement',
          { variantKey: 'AGREEMENT' }
        );
      } catch (err) {
        console.error('결제 UI 렌더링 실패:', err);
      }
    };

    renderPaymentUI();
  }, [selectedPackage, isWidgetReady]);

  const handlePurchase = async () => {
    if (!selectedPackage || !userId || !paymentWidgetRef.current) {
      setError('결제 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // 1. 결제 준비 (주문 ID 및 정보 생성)
      const prepareData = await paymentService.preparePayment(userId, selectedPackage);

      // 2. 토스페이먼츠 결제 요청
      await paymentWidgetRef.current.requestPayment({
        orderId: prepareData.orderId,
        orderName: prepareData.orderName,
        customerName: '드림패스 사용자',
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        amount: prepareData.amount,
      });

    } catch (err) {
      console.error('결제 요청 실패:', err);
      setError(err.message || '결제 요청 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  if (!userId) return null;

  const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/profile/dashboard')}
            className="mb-6 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <i className="ri-arrow-left-line text-xl mr-1"></i>
            <span className="text-sm">프로파일링으로</span>
          </button>

          {/* Main Container */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-pink-300 p-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">
                더 빠르게 성장하는 AI 학습 경험
              </h1>
              <p className="text-gray-600 text-lg">
                내 진로에 맞춘 실습·체험·멘토링을 하나의 이용권으로 누려보세요
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
                <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* 2단 레이아웃: 왼쪽(이용권 선택 + 결제 수단) / 오른쪽(결제 요약) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* 왼쪽: 이용권 선택 + 결제 수단 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 이용권 카드 3개 (가로 배치) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PACKAGES.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`relative cursor-pointer rounded-xl p-5 transition-all border-2 ${
                        selectedPackage === pkg.id
                          ? 'border-pink-500 shadow-lg bg-pink-50'
                          : 'border-gray-200 shadow-sm hover:shadow-md bg-white'
                      } ${pkg.popular ? 'md:scale-105' : ''}`}
                    >
                      {/* Badge */}
                      {pkg.badge && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      {/* Discount Badge */}
                      {pkg.discount > 0 && (
                        <div className="absolute -top-3 -right-3">
                          <div className="bg-yellow-400 text-yellow-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
                            <div className="text-center">
                              <div className="text-xs font-bold">{pkg.discount}%</div>
                              <div className="text-[8px]">할인</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Package Info */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{pkg.name}</h3>
                        <p className="text-xs text-pink-600 font-semibold mb-1">{pkg.tagline}</p>
                        <p className="text-xs text-gray-600">{pkg.description}</p>
                      </div>

                      {/* Features */}
                      <div className="mb-4 space-y-1.5">
                        {pkg.features.map((feature, index) => (
                          <div key={index} className="flex items-start text-xs">
                            <i className="ri-checkbox-circle-fill text-pink-500 mr-1.5 mt-0.5 flex-shrink-0"></i>
                            <span className="text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800 mb-1">
                            {pkg.price.toLocaleString()}원
                          </div>
                          {pkg.discount > 0 && (
                            <div className="text-xs text-gray-400 line-through mb-1">
                              {(pkg.sessions * 30000).toLocaleString()}원
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            회당 {Math.floor(pkg.price / pkg.sessions).toLocaleString()}원
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* 결제 수단 선택 영역 (왼쪽 하단) */}
                {selectedPkg && (
                  <div className="bg-white rounded-xl border-2 border-pink-200 p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <i className="ri-bank-card-line text-pink-500 mr-2"></i>
                      결제 수단 선택
                    </h3>
                    <div id="payment-method"></div>
                    <div id="agreement" className="mt-4"></div>
                  </div>
                )}
              </div>

              {/* 오른쪽: 결제 요약 (sticky) */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 space-y-4">
                  {selectedPkg ? (
                    <>
                      {/* 구매 내역 */}
                      <div className="bg-white rounded-xl border-2 border-pink-300 border-dashed p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                          <i className="ri-file-list-line text-pink-500 mr-2"></i>
                          구매 내역
                        </h2>

                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">선택한 이용권</span>
                            <span className="font-bold text-gray-800">{selectedPkg.name}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">멘토링 횟수</span>
                            <span className="font-bold text-pink-600">{selectedPkg.sessions}회</span>
                          </div>

                          {selectedPkg.discount > 0 && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">정가</span>
                                <span className="text-gray-400 line-through">
                                  {(selectedPkg.sessions * 30000).toLocaleString()}원
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-red-600 font-medium">할인 ({selectedPkg.discount}%)</span>
                                <span className="text-red-600 font-bold">
                                  -{((selectedPkg.sessions * 30000) - selectedPkg.price).toLocaleString()}원
                                </span>
                              </div>
                            </>
                          )}

                          <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                            <span className="font-bold text-gray-800">최종 금액</span>
                            <span className="text-2xl font-bold text-pink-600">
                              {selectedPkg.price.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 안내 메시지 */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <i className="ri-information-line mr-1"></i>
                          토스페이먼츠 테스트 모드입니다.
                        </p>
                      </div>

                      {/* 결제 버튼 */}
                      <button
                        onClick={handlePurchase}
                        disabled={isProcessing || !isWidgetReady}
                        className={`w-full py-4 rounded-lg font-bold text-base transition-colors ${
                          isProcessing || !isWidgetReady
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg'
                        }`}
                      >
                        {!isWidgetReady ? (
                          <span className="flex items-center justify-center">
                            <i className="ri-loader-4-line animate-spin mr-2"></i>
                            준비 중...
                          </span>
                        ) : isProcessing ? (
                          <span className="flex items-center justify-center">
                            <i className="ri-loader-4-line animate-spin mr-2"></i>
                            결제 요청 중...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <i className="ri-shopping-cart-line mr-2"></i>
                            {selectedPkg.price.toLocaleString()}원 결제하기
                          </span>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-xl border-2 border-gray-300 border-dashed p-6 text-center">
                      <i className="ri-arrow-left-line text-3xl text-gray-400 mb-2"></i>
                      <p className="text-gray-600 text-sm">이용권을 선택해주세요</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">💡 이용 안내</h3>
              <ul className="space-y-3 text-gray-700 text-sm">
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5"></i>
                  <span>구매한 이용권은 즉시 충전되며, 멘토링 예약 시 자동으로 차감됩니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5"></i>
                  <span>이용권은 유효기간이 없으며, 언제든지 사용 가능합니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5"></i>
                  <span>예약이 거절되거나 취소되면 이용권이 자동으로 복구됩니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-pink-500 mr-2 mt-0.5"></i>
                  <span>결제 및 사용 내역은 프로파일링 대시보드에서 확인할 수 있습니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
