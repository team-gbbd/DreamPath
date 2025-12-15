import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  input: string;
  inputFocus: string;
}

/**
 * AI 에이전트 대시보드
 */
export default function AIAgentDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<'recommendations' | 'applications' | 'growth' | 'resume' | 'company'>('recommendations');

  // Theme sync
  useEffect(() => {
    const handleThemeChange = () => {
      setDarkMode(localStorage.getItem("dreampath:theme") === "dark");
    };
    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  const theme: ThemeColors = darkMode ? {
    bg: "bg-[#0B0D14]",
    card: "bg-white/[0.02] border-white/[0.08]",
    cardAlt: "bg-white/[0.03]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    input: "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40",
    inputFocus: "focus:ring-blue-500/50 focus:border-blue-500/50",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    card: "bg-white border-slate-200",
    cardAlt: "bg-slate-50",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-100",
    input: "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400",
    inputFocus: "focus:ring-blue-500 focus:border-blue-500",
  };

  // Background Effects Component
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 right-1/4 rounded-full ${
            darkMode ? "bg-blue-500/10" : "bg-blue-400/20"
          }`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute bottom-1/4 left-0 rounded-full ${
            darkMode ? "bg-indigo-500/8" : "bg-indigo-400/15"
          }`}
          style={{ width: 'min(40vw, 400px)', height: 'min(40vw, 400px)', filter: 'blur(100px)' }}
        />
        <div
          className={`absolute top-1/2 right-0 rounded-full ${
            darkMode ? "bg-purple-500/6" : "bg-purple-400/10"
          }`}
          style={{ width: 'min(30vw, 300px)', height: 'min(30vw, 300px)', filter: 'blur(80px)' }}
        />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );

  const tabs = [
    { id: 'recommendations', label: '채용 공고 추천', icon: '📋' },
    { id: 'applications', label: '지원 현황', icon: '📊' },
    { id: 'growth', label: '커리어 성장', icon: '📈' },
    { id: 'resume', label: '이력서 최적화', icon: '📝' },
    { id: 'company', label: '목표 기업 분석', icon: '🏢' },
  ];

  return (
    <div className={`min-h-[calc(100vh-64px)] ${theme.bg} relative overflow-x-hidden w-full`} style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <BackgroundEffects />

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>AI 커리어 에이전트</h1>
          <p className={`mt-2 ${theme.textMuted}`}>
            AI가 당신의 커리어 성장을 24시간 지원합니다
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div
          className={`border-b ${theme.divider} mb-6 overflow-x-auto`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? darkMode
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-600 text-blue-600'
                    : darkMode
                      ? 'border-transparent text-white/50 hover:text-white/70 hover:border-white/20'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className={`rounded-2xl border backdrop-blur-sm p-4 sm:p-6 ${theme.card}`}>
          {activeTab === 'recommendations' && <JobRecommendationsTab darkMode={darkMode} theme={theme} />}
          {activeTab === 'applications' && <ApplicationsTab darkMode={darkMode} theme={theme} />}
          {activeTab === 'growth' && <CareerGrowthTab darkMode={darkMode} theme={theme} />}
          {activeTab === 'resume' && <ResumeOptimizerTab darkMode={darkMode} theme={theme} />}
          {activeTab === 'company' && <CompanyTalentTab darkMode={darkMode} theme={theme} />}
        </div>
      </main>
    </div>
  );
}

// ============== 1. 채용 공고 추천 탭 ==============

function JobRecommendationsTab({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  return (
    <div>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>AI 채용 공고 추천</h2>
      <p className={`${theme.textMuted} mb-6`}>
        당신의 커리어 분석 결과를 기반으로 최적의 채용 공고를 추천합니다.
      </p>

      {/* 추천 공고 목록 */}
      <div className="space-y-4">
        <div className={`rounded-xl p-4 sm:p-5 ${
          darkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className={`text-lg font-semibold ${theme.text}`}>시니어 백엔드 개발자</h3>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  darkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-800"
                }`}>
                  매칭률 92%
                </span>
              </div>
              <p className={`text-sm ${theme.textMuted} mb-2`}>테크 스타트업 | 서울 강남</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {['Spring Boot', 'Kubernetes', 'MSA'].map((skill) => (
                  <span key={skill} className={`px-2 py-1 text-xs rounded-lg ${
                    darkMode ? "bg-white/[0.05] text-white/70" : "bg-slate-100 text-slate-700"
                  }`}>
                    {skill}
                  </span>
                ))}
              </div>
              <p className={`text-sm ${theme.textMuted}`}>
                <strong className={theme.text}>추천 이유:</strong> 귀하의 백엔드 개발 경험과 MSA 아키텍처 경험이 이 포지션에 완벽하게 부합합니다.
              </p>
            </div>
            <button className={`w-full sm:w-auto px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              darkMode
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            }`}>
              지원하기
            </button>
          </div>
        </div>

        {/* 추가 공고는 API 연동 후 동적으로 표시 */}
        <div className={`text-center py-8 ${theme.textSubtle}`}>
          <p>AI가 분석 중입니다...</p>
          <p className="text-sm mt-2">커리어 분석을 완료하면 맞춤 공고가 표시됩니다.</p>
          <Link to="/career-chat" className="inline-block mt-4 text-blue-500 hover:text-blue-400 transition-colors">
            커리어 분석 시작하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============== 2. 지원 현황 탭 ==============

function ApplicationsTab({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  const stats = [
    { label: '총 지원', value: '0건', color: 'blue' },
    { label: '서류 통과', value: '0건', color: 'green' },
    { label: '면접 진행', value: '0건', color: 'yellow' },
    { label: '최종 합격', value: '0건', color: 'purple' },
  ];

  const getStatStyle = (color: string) => {
    if (darkMode) {
      const styles: { [key: string]: string } = {
        blue: 'bg-blue-500/10 text-blue-400',
        green: 'bg-green-500/10 text-green-400',
        yellow: 'bg-yellow-500/10 text-yellow-400',
        purple: 'bg-purple-500/10 text-purple-400',
      };
      return styles[color] || styles.blue;
    } else {
      const styles: { [key: string]: string } = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        purple: 'bg-purple-50 text-purple-600',
      };
      return styles[color] || styles.blue;
    }
  };

  return (
    <div>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>지원 현황 추적</h2>
      <p className={`${theme.textMuted} mb-6`}>
        지원한 공고의 진행 상황을 확인하고 다음 액션을 제안받으세요.
      </p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl ${getStatStyle(stat.color)}`}>
            <p className={`text-sm ${theme.textMuted}`}>{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 다음 액션 */}
      <div className={`rounded-xl p-4 sm:p-5 mb-6 ${
        darkMode ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"
      }`}>
        <h3 className={`font-semibold mb-2 ${theme.text}`}>⚡ AI 추천 다음 액션</h3>
        <ul className={`space-y-2 text-sm ${theme.textMuted}`}>
          <li>• 아직 지원 내역이 없습니다. 추천 공고를 확인해보세요!</li>
        </ul>
      </div>

      {/* 지원 내역 */}
      <div className={`text-center py-8 ${theme.textSubtle}`}>
        <p>아직 지원한 공고가 없습니다</p>
        <Link to="#" className="inline-block mt-4 text-blue-500 hover:text-blue-400 transition-colors">
          추천 공고 보기 →
        </Link>
      </div>
    </div>
  );
}

// ============== 3. 커리어 성장 탭 ==============

function CareerGrowthTab({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  return (
    <div>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>커리어 성장 경로</h2>
      <p className={`${theme.textMuted} mb-6`}>
        현재 위치에서 목표 포지션까지의 성장 경로를 AI가 분석합니다.
      </p>

      {/* 목표 설정 */}
      <div className={`rounded-xl p-5 sm:p-6 mb-6 ${
        darkMode
          ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20"
          : "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
      }`}>
        <h3 className={`font-semibold mb-4 ${theme.text}`}>🎯 목표 포지션 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
              현재 포지션
            </label>
            <input
              type="text"
              placeholder="예: 주니어 백엔드 개발자"
              className={`w-full px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
              목표 포지션
            </label>
            <input
              type="text"
              placeholder="예: 시니어 풀스택 개발자"
              className={`w-full px-4 py-2.5 rounded-xl border ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
            />
          </div>
        </div>
        <button className={`mt-4 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
          darkMode
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        }`}>
          AI 성장 경로 분석
        </button>
      </div>

      {/* 갭 분석 결과 (예시) */}
      <div className={`rounded-xl border p-5 sm:p-6 ${theme.card}`}>
        <h3 className={`font-semibold mb-4 ${theme.text}`}>📊 갭 분석 결과</h3>
        <p className={`${theme.textMuted} mb-4`}>
          목표 포지션을 설정하면 부족한 스킬과 경험을 분석해드립니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: '부족한 스킬', value: '-' },
            { label: '예상 기간', value: '-' },
            { label: '난이도', value: '-' },
          ].map((item) => (
            <div key={item.label} className={`p-4 rounded-xl ${theme.cardAlt}`}>
              <p className={`text-sm ${theme.textSubtle} mb-2`}>{item.label}</p>
              <p className={`text-lg font-semibold ${theme.text}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== 4. 이력서 최적화 탭 ==============

function ResumeOptimizerTab({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  return (
    <div>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>이력서 최적화</h2>
      <p className={`${theme.textMuted} mb-6`}>
        AI가 이력서를 분석하고 ATS 통과율을 높이는 방법을 제안합니다.
      </p>

      {/* 이력서 업로드 */}
      <div className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center mb-6 transition-colors ${
        darkMode
          ? "border-white/[0.1] hover:border-white/[0.2]"
          : "border-slate-300 hover:border-slate-400"
      }`}>
        <div className="mb-4">
          <svg
            className={`mx-auto h-12 w-12 ${theme.textSubtle}`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className={`${theme.textMuted} mb-4`}>이력서를 업로드하거나 내용을 입력하세요</p>
        <button className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
          darkMode
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        }`}>
          파일 선택
        </button>
      </div>

      {/* ATS 점수 (예시) */}
      <div className={`rounded-xl p-5 sm:p-6 ${
        darkMode
          ? "bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20"
          : "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200"
      }`}>
        <h3 className={`font-semibold mb-4 ${theme.text}`}>🎯 ATS 통과 점수</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`text-5xl font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>-</div>
          <div className="flex-1 w-full">
            <p className={theme.textMuted}>이력서를 업로드하면 점수가 표시됩니다</p>
            <div className={`mt-2 h-2 rounded-full ${darkMode ? "bg-white/[0.1]" : "bg-gray-200"}`}>
              <div className={`h-2 rounded-full transition-all ${darkMode ? "bg-green-400" : "bg-green-500"}`} style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        {/* 개선 제안 */}
        <div className="mt-6">
          <h4 className={`font-semibold mb-2 ${theme.text}`}>💡 AI 개선 제안</h4>
          <ul className={`space-y-2 text-sm ${theme.textMuted}`}>
            <li>• 이력서를 분석하면 개선 제안이 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============== 5. 목표 기업 분석 탭 ==============

function CompanyTalentTab({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  const features = [
    { icon: '🔍', title: '인재상 분석', desc: '기업이 원하는 인재 특성, 핵심가치 파악', color: 'blue' },
    { icon: '📋', title: '채용 요건 분석', desc: '필수/우대 조건, 기술스택 정리', color: 'green' },
    { icon: '📊', title: '매칭도 분석', desc: '나와 기업의 적합도 점수 확인', color: 'purple' },
  ];

  const getFeatureStyle = (color: string) => {
    if (darkMode) {
      const styles: { [key: string]: { bg: string; title: string; desc: string } } = {
        blue: { bg: 'bg-blue-500/10', title: 'text-blue-300', desc: 'text-blue-300/70' },
        green: { bg: 'bg-green-500/10', title: 'text-green-300', desc: 'text-green-300/70' },
        purple: { bg: 'bg-purple-500/10', title: 'text-purple-300', desc: 'text-purple-300/70' },
      };
      return styles[color] || styles.blue;
    } else {
      const styles: { [key: string]: { bg: string; title: string; desc: string } } = {
        blue: { bg: 'bg-blue-50', title: 'text-blue-900', desc: 'text-blue-700' },
        green: { bg: 'bg-green-50', title: 'text-green-900', desc: 'text-green-700' },
        purple: { bg: 'bg-purple-50', title: 'text-purple-900', desc: 'text-purple-700' },
      };
      return styles[color] || styles.blue;
    }
  };

  return (
    <div>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>목표 기업 인재상 분석</h2>
      <p className={`${theme.textMuted} mb-6`}>
        가고 싶은 기업의 인재상을 분석하고 나와의 매칭도를 확인하세요.
      </p>

      {/* 기능 소개 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {features.map((feature) => {
          const style = getFeatureStyle(feature.color);
          return (
            <div key={feature.title} className={`p-4 rounded-xl ${style.bg}`}>
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className={`font-semibold mb-1 ${style.title}`}>{feature.title}</h3>
              <p className={`text-sm ${style.desc}`}>{feature.desc}</p>
            </div>
          );
        })}
      </div>

      {/* CTA 버튼 */}
      <div className="text-center py-6">
        <Link
          to="/company-talent"
          className={`inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
            darkMode
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/30"
          }`}
        >
          <span>목표 기업 분석 시작하기</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}