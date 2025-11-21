import { useNavigate, useSearchParams } from 'react-router-dom';

export default function CareerSimulationResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const score = parseInt(searchParams.get('score') || '0');

  // 점수에 따른 결과 판정
  const getResult = () => {
    if (score >= 40) {
      return {
        type: '문제 해결형 개발자',
        description:
          '버그를 빠르게 찾아내고 해결하는 능력이 뛰어납니다. 디버깅과 트러블슈팅에 강점이 있어요.',
        recommendation: '백엔드 개발, DevOps, SRE 분야가 잘 맞을 것 같습니다.',
        emoji: '🔍',
        color: 'from-green-400 to-emerald-600',
      };
    } else if (score >= 20) {
      return {
        type: '성장형 개발자',
        description:
          '기본 개념을 이해하고 있지만, 경험이 조금 더 필요합니다. 꾸준히 학습하면 충분히 성장할 수 있어요!',
        recommendation: '기초부터 탄탄히 다지는 4주 학습을 추천합니다.',
        emoji: '🌱',
        color: 'from-blue-400 to-indigo-600',
      };
    } else {
      return {
        type: '입문 단계',
        description:
          '개발자의 세계에 첫 발을 내딛으셨네요! 아직 낯설 수 있지만, 누구나 처음은 있습니다.',
        recommendation: '차근차근 기초부터 학습하면 반드시 성장할 수 있습니다.',
        emoji: '🐣',
        color: 'from-purple-400 to-pink-600',
      };
    }
  };

  const result = getResult();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
              체험 완료!
            </span>
          </h1>
          <p className="text-gray-600">백엔드 개발자 직업 체험 결과</p>
        </div>

        {/* 점수 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{result.emoji}</div>
            <h2 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${result.color} bg-clip-text text-transparent`}>
              {result.type}
            </h2>
            <div className="inline-block bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 py-2 rounded-full text-xl font-bold">
              {score}점
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-2">💡 분석 결과</h3>
              <p className="text-gray-700 leading-relaxed">{result.description}</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="font-bold text-gray-800 mb-2">🎯 추천 방향</h3>
              <p className="text-gray-700 leading-relaxed">{result.recommendation}</p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-bold text-gray-800 mb-2">📊 상세 분석</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>체험 완료</span>
                  <span className="font-semibold">✅ 3개 미션</span>
                </div>
                <div className="flex justify-between">
                  <span>획득 경험치</span>
                  <span className="font-semibold">+{score} EXP</span>
                </div>
                <div className="flex justify-between">
                  <span>소요 시간</span>
                  <span className="font-semibold">약 5분</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/learning')}
            className="p-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold"
          >
            🚀 4주 학습 시작하기
          </button>
          <button
            onClick={() => navigate('/career-simulation/developer')}
            className="p-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all duration-200 font-semibold"
          >
            🔄 다시 체험하기
          </button>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
