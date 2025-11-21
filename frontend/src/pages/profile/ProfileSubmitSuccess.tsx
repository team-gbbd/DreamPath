import { useNavigate } from 'react-router-dom';

export default function ProfileSubmitSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/80 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-56 h-56 bg-gradient-to-br from-[#5A7BFF]/10 to-[#8F5CFF]/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <i className="ri-check-double-line text-4xl" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-semibold mb-2">
              Profile Saved
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              프로필 제출이 완료되었습니다!
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              정리해 주신 정체성 정보가 상담 기록과 연결되어 더 정밀한 분석과 추천에 활용됩니다.
              이제 AI 상담을 이어가거나 분석 리포트를 요청할 수 있어요.
            </p>
          </div>

          <div className="w-full grid md:grid-cols-2 gap-4">
            <button
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              onClick={() => navigate('/career-chat')}
            >
              <i className="ri-chat-3-line text-xl" />
              AI 상담 계속하기
            </button>
            <button
              className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              onClick={() => navigate('/profile/input')}
            >
              <i className="ri-edit-line text-xl" />
              프로필 다시 확인하기
            </button>
          </div>

          <div className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <i className="ri-information-line text-[#5A7BFF]" />
              다음 단계 안내
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>필요 시 프로필 수정은 언제든지 가능합니다.</li>
              <li>AI 상담 중 새롭게 발견된 인사이트가 있으면 자동으로 반영됩니다.</li>
              <li>추가 자료 업로드를 원하면 고객센터로 문의해주세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
