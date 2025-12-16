import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '@/lib/api';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

// 토스페이먼츠 설정 (테스트 키)
const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
const TOSS_CUSTOMER_KEY = 'dreampath_customer';

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
  const [searchParams] = useSearchParams();
  const [selectedPackage, setSelectedPackage] = useState<string | null>('FIVE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
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
    input: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400",
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

    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      localStorage.setItem('payment_return_url', returnUrl);
    }

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

  useEffect(() => {
    if (!paymentWidgetRef.current || !selectedPackage || !isWidgetReady) {
      return;
    }

    const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);
    if (!selectedPkg) return;

    const paymentMethodElement = document.querySelector('#payment-method');
    const agreementElement = document.querySelector('#agreement');

    if (!paymentMethodElement || !agreementElement) {
      return;
    }

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

      const prepareData = await paymentService.preparePayment(userId, selectedPackage);

      await paymentWidgetRef.current.requestPayment({
        orderId: prepareData.orderId,
        orderName: prepareData.orderName,
        customerName: '드림패스 사용자',
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        amount: prepareData.amount,
      });

    } catch (err: any) {
      console.error('결제 요청 실패:', err);
      setError(err.message || '결제 요청 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  if (!userId) return null;

  const selectedPkg = PACKAGES.find(p => p.id === selectedPackage);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate(-1)}
            className={`mb-6 flex items-center gap-2 ${theme.textMuted} hover:${theme.text} transition-colors`}
          >
            <i className="ri-arrow-left-line text-xl"></i>
            <span className="text-sm">뒤로가기</span>
          </button>

          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.text} mb-3`}>
              더 빠르게 성장하는 AI 학습 경험
            </h1>
            <p className={`${theme.textMuted} text-base sm:text-lg`}>
              내 진로에 맞춘 실습·체험·멘토링을 하나의 이용권으로 누려보세요
            </p>
          </div>

          {error && (
            <div className={`mb-6 rounded-xl p-4 flex items-start ${darkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-0.5"></i>
              <p className={darkMode ? 'text-red-400' : 'text-red-800'}>{error}</p>
            </div>
          )}

          {/* 2단 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
            {/* 왼쪽: 이용권 선택 + 결제 수단 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 이용권 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all border ${
                      selectedPackage === pkg.id
                        ? darkMode
                          ? 'border-[#5A7BFF] bg-[#5A7BFF]/10 shadow-lg shadow-[#5A7BFF]/20'
                          : 'border-[#5A7BFF] bg-[#5A7BFF]/5 shadow-lg'
                        : `${theme.card} ${theme.cardHover}`
                    } ${pkg.popular ? 'sm:scale-105 z-10' : ''}`}
                  >
                    {/* Badge */}
                    {pkg.badge && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                          {pkg.badge}
                        </span>
                      </div>
                    )}

                    {/* Discount Badge */}
                    {pkg.discount > 0 && (
                      <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg">
                          <div className="text-center">
                            <div className="text-[10px] sm:text-xs font-bold">{pkg.discount}%</div>
                            <div className="text-[8px]">할인</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Package Info */}
                    <div className="mb-3 sm:mb-4 mt-2">
                      <h3 className={`text-base sm:text-lg font-bold ${theme.text} mb-1`}>{pkg.name}</h3>
                      <p className="text-xs text-[#5A7BFF] font-semibold mb-1">{pkg.tagline}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{pkg.description}</p>
                    </div>

                    {/* Features */}
                    <div className="mb-3 sm:mb-4 space-y-1.5">
                      {pkg.features.map((feature, index) => (
                        <div key={index} className="flex items-start text-xs">
                          <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-1.5 mt-0.5 flex-shrink-0"></i>
                          <span className={theme.textMuted}>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Price */}
                    <div className={`pt-3 sm:pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                      <div className="text-center">
                        <div className={`text-xl sm:text-2xl font-bold ${theme.text} mb-1`}>
                          {pkg.price.toLocaleString()}원
                        </div>
                        {pkg.discount > 0 && (
                          <div className={`text-xs ${theme.textSubtle} line-through mb-1`}>
                            {(pkg.sessions * 30000).toLocaleString()}원
                          </div>
                        )}
                        <div className={`text-xs ${theme.textMuted}`}>
                          회당 {Math.floor(pkg.price / pkg.sessions).toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 결제 수단 선택 영역 */}
              {selectedPkg && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${theme.card}`}>
                  <h3 className={`text-base sm:text-lg font-bold ${theme.text} mb-4 flex items-center`}>
                    <i className="ri-bank-card-line text-[#5A7BFF] mr-2"></i>
                    결제 수단 선택
                  </h3>
                  <div
                    id="payment-method"
                    style={darkMode ? { filter: 'invert(0.9) hue-rotate(180deg)' } : {}}
                  ></div>
                  <div
                    id="agreement"
                    className="mt-4"
                    style={darkMode ? { filter: 'invert(0.9) hue-rotate(180deg)' } : {}}
                  ></div>
                </div>
              )}
            </div>

            {/* 오른쪽: 결제 요약 */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {selectedPkg ? (
                  <>
                    {/* 구매 내역 */}
                    <div className={`rounded-2xl border p-4 sm:p-5 ${theme.card}`}>
                      <h2 className={`text-base sm:text-lg font-bold ${theme.text} mb-4 flex items-center`}>
                        <i className="ri-file-list-line text-[#5A7BFF] mr-2"></i>
                        구매 내역
                      </h2>

                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className={theme.textMuted}>선택한 이용권</span>
                          <span className={`font-bold ${theme.text}`}>{selectedPkg.name}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={theme.textMuted}>멘토링 횟수</span>
                          <span className="font-bold text-[#5A7BFF]">{selectedPkg.sessions}회</span>
                        </div>

                        {selectedPkg.discount > 0 && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className={theme.textMuted}>정가</span>
                              <span className={`${theme.textSubtle} line-through`}>
                                {(selectedPkg.sessions * 30000).toLocaleString()}원
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className={darkMode ? 'text-red-400' : 'text-red-600'}>할인 ({selectedPkg.discount}%)</span>
                              <span className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                -{((selectedPkg.sessions * 30000) - selectedPkg.price).toLocaleString()}원
                              </span>
                            </div>
                          </>
                        )}

                        <div className={`flex justify-between items-center pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                          <span className={`font-bold ${theme.text}`}>최종 금액</span>
                          <span className="text-xl sm:text-2xl font-bold text-[#5A7BFF]">
                            {selectedPkg.price.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 안내 메시지 */}
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                        <i className="ri-information-line mr-1"></i>
                        토스페이먼츠 테스트 모드입니다.
                      </p>
                    </div>

                    {/* 결제 버튼 */}
                    <button
                      onClick={handlePurchase}
                      disabled={isProcessing || !isWidgetReady}
                      className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all ${
                        isProcessing || !isWidgetReady
                          ? darkMode
                            ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:shadow-lg hover:shadow-purple-500/30'
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
                  <div className={`rounded-2xl border-2 border-dashed p-6 text-center ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-300 bg-slate-50'}`}>
                    <i className={`ri-arrow-left-line text-3xl ${theme.textSubtle} mb-2`}></i>
                    <p className={`text-sm ${theme.textMuted}`}>이용권을 선택해주세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Section - 결제 수단 선택과 같은 너비 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className={`lg:col-span-2 rounded-2xl border p-5 sm:p-6 ${theme.card}`}>
              <h3 className={`text-base sm:text-lg font-bold ${theme.text} mb-4`}>💡 이용 안내</h3>
              <ul className={`space-y-3 text-sm ${theme.textMuted}`}>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-2 mt-0.5"></i>
                  <span>구매한 이용권은 즉시 충전되며, 멘토링 예약 시 자동으로 차감됩니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-2 mt-0.5"></i>
                  <span>이용권은 유효기간이 없으며, 언제든지 사용 가능합니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-2 mt-0.5"></i>
                  <span>예약이 거절되거나 취소되면 이용권이 자동으로 복구됩니다.</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-[#5A7BFF] mr-2 mt-0.5"></i>
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