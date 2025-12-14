import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyTalentService } from '../../lib/api';

/**
 * 목표 기업 인재상 분석 페이지
 * 구직자가 목표 기업의 인재상을 파악하고 자신과의 매칭도를 분석
 */

// 타입 정의
interface IdealCandidate {
  summary: string;
  coreValues: string[];
  keyTraits: string[];
}

interface RequirementCategory {
  category: string;
  items: string[];
}

interface Requirements {
  essential: RequirementCategory[];
  preferred: RequirementCategory[];
}

interface CompanyCulture {
  workStyle: string;
  environment: string;
  growthOpportunity: string;
  keywords: string[];
}

interface HiringTrends {
  mainPositions: string[];
  techFocus: string[];
  industryPosition: string;
}

interface TalentAnalysis {
  idealCandidate: IdealCandidate;
  requirements: Requirements;
  companyCulture: CompanyCulture;
  hiringTrends: HiringTrends;
  interviewTips: string[];
}

interface StrengthMatch {
  area: string;
  match: string;
  score: number;
}

interface GapItem {
  area: string;
  gap: string;
  priority: string;
}

interface ActionItem {
  action: string;
  reason: string;
  timeline: string;
}

interface FitAssessment {
  cultureFit: string;
  skillFit: string;
  growthPotential: string;
}

interface UserMatching {
  overallMatchScore: number;
  matchSummary: string;
  strengthMatches: StrengthMatch[];
  gapAnalysis: GapItem[];
  actionItems: ActionItem[];
  fitAssessment: FitAssessment;
}

interface CompanyInfo {
  companyName?: string;
  industry?: string;
  employeeCount?: string;
  companyType?: string;
  address?: string;
  homepageUrl?: string;
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  url?: string;
}

interface AnalysisResult {
  companyName: string;
  companyInfo: CompanyInfo;
  talentAnalysis: TalentAnalysis;
  userMatching: UserMatching | null;
  jobPostings: JobPosting[];
  analyzedAt: string;
}

interface ThemeColors {
  bg: string;
  card: string;
  cardHover: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
}

export default function CompanyTalentPage() {
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'talent' | 'requirements' | 'culture' | 'matching'>('talent');
  const [darkMode, setDarkMode] = useState(false);

  // localStorage에서 커리어 분석 결과 가져오기
  const [careerAnalysis, setCareerAnalysis] = useState<any>(null);

  // 테마 설정
  const theme: ThemeColors = darkMode ? {
    bg: "bg-[#0B0D14]",
    card: "bg-white/[0.02] border-white/[0.08]",
    cardHover: "hover:bg-white/[0.05]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.08]",
    input: "bg-white/[0.05] text-white placeholder-white/40",
    inputBorder: "border-white/[0.1]",
    inputFocus: "focus:border-blue-400 focus:ring-blue-400/20",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    card: "bg-white border-slate-200",
    cardHover: "hover:bg-slate-50",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-200",
    input: "bg-white text-slate-900 placeholder-slate-400",
    inputBorder: "border-slate-300",
    inputFocus: "focus:border-blue-500 focus:ring-blue-500/20",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const theme = localStorage.getItem('dreampath:theme');
      setDarkMode(theme === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('dreampath-theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const savedAnalysis = localStorage.getItem('careerAnalysis');
    if (savedAnalysis) {
      try {
        setCareerAnalysis(JSON.parse(savedAnalysis));
      } catch (e) {
        console.error('커리어 분석 결과 파싱 실패:', e);
      }
    }
  }, []);

  // 기업 인재상 분석 실행
  const handleAnalyze = async () => {
    if (!companyName.trim()) {
      setError('기업명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await companyTalentService.analyzeCompanyTalent(
        companyName,
        null, // userProfile
        careerAnalysis // 커리어 분석 결과가 있으면 매칭 분석도 수행
      );

      if (response.success) {
        setAnalysisResult(response.data);
      } else {
        setError(response.error || '분석에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-blue-500/10" : "bg-blue-400/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-400/20"}`} />
        <div className={`absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full blur-[100px] ${darkMode ? "bg-purple-500/10" : "bg-purple-400/15"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <i className="ri-building-2-line text-white text-xl sm:text-2xl"></i>
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text}`}>목표 기업 인재상 분석</h1>
              <p className={`text-sm sm:text-base ${theme.textMuted}`}>
                가고 싶은 기업의 인재상을 분석하고 나와의 매칭도를 확인하세요
              </p>
            </div>
          </div>
        </div>

        {/* 검색 섹션 */}
        <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                분석할 기업명
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="예: 카카오, 네이버, 삼성전자..."
                className={`w-full px-4 py-3 ${theme.input} border ${theme.inputBorder} rounded-xl ${theme.inputFocus} focus:ring-2 focus:outline-none text-base sm:text-lg transition-all`}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    분석 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-search-line"></i>
                    분석하기
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 커리어 분석 상태 알림 */}
          {careerAnalysis ? (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${darkMode ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <i className="ri-checkbox-circle-line text-lg"></i>
              커리어 분석 결과가 있어 매칭 분석이 함께 제공됩니다.
            </div>
          ) : (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${darkMode ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
              <i className="ri-information-line text-lg"></i>
              <span>
                <Link to="/career-chat" className="underline hover:no-underline font-medium">커리어 분석</Link>을 먼저 완료하면 나와의 매칭도도 분석해드립니다.
              </span>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className={`rounded-xl p-4 mb-4 sm:mb-6 flex items-center gap-3 ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <i className="ri-error-warning-line text-xl"></i>
            {error}
          </div>
        )}

        {/* 분석 결과 */}
        {analysisResult && (
          <div className="space-y-4 sm:space-y-6">
            {/* 기업 기본 정보 */}
            <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 backdrop-blur-sm`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>
                    {analysisResult.companyName}
                  </h2>
                  {analysisResult.companyInfo && (
                    <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
                      {analysisResult.companyInfo.industry && (
                        <span className={`flex items-center gap-1.5 text-xs sm:text-sm ${theme.textMuted}`}>
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          {analysisResult.companyInfo.industry}
                        </span>
                      )}
                      {analysisResult.companyInfo.companyType && (
                        <span className={`flex items-center gap-1.5 text-xs sm:text-sm ${theme.textMuted}`}>
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          {analysisResult.companyInfo.companyType}
                        </span>
                      )}
                      {analysisResult.companyInfo.employeeCount && (
                        <span className={`flex items-center gap-1.5 text-xs sm:text-sm ${theme.textMuted}`}>
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                          직원 {analysisResult.companyInfo.employeeCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 매칭 점수 */}
                {analysisResult.userMatching && (
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                      {analysisResult.userMatching.overallMatchScore}점
                    </div>
                    <p className={`text-xs sm:text-sm ${theme.textMuted}`}>매칭도</p>
                  </div>
                )}
              </div>

              {/* 인재상 요약 */}
              {analysisResult.talentAnalysis?.idealCandidate?.summary && (
                <div className={`mt-4 sm:mt-6 p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <h3 className={`font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                    <i className="ri-user-star-line"></i>
                    이 기업이 원하는 인재
                  </h3>
                  <p className={`text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    {analysisResult.talentAnalysis.idealCandidate.summary}
                  </p>
                </div>
              )}
            </div>

            {/* 탭 네비게이션 */}
            <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm`}>
              <div className={`border-b ${theme.divider}`}>
                <nav className="flex overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('talent')}
                    className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === 'talent'
                        ? darkMode
                          ? 'border-b-2 border-blue-400 text-blue-400 bg-blue-500/10'
                          : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                        : `${theme.textMuted} ${theme.cardHover}`
                    }`}
                  >
                    인재상
                  </button>
                  <button
                    onClick={() => setActiveTab('requirements')}
                    className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === 'requirements'
                        ? darkMode
                          ? 'border-b-2 border-blue-400 text-blue-400 bg-blue-500/10'
                          : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                        : `${theme.textMuted} ${theme.cardHover}`
                    }`}
                  >
                    채용 요건
                  </button>
                  <button
                    onClick={() => setActiveTab('culture')}
                    className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === 'culture'
                        ? darkMode
                          ? 'border-b-2 border-blue-400 text-blue-400 bg-blue-500/10'
                          : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                        : `${theme.textMuted} ${theme.cardHover}`
                    }`}
                  >
                    기업문화
                  </button>
                  {analysisResult.userMatching && (
                    <button
                      onClick={() => setActiveTab('matching')}
                      className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === 'matching'
                          ? darkMode
                            ? 'border-b-2 border-blue-400 text-blue-400 bg-blue-500/10'
                            : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                          : `${theme.textMuted} ${theme.cardHover}`
                      }`}
                    >
                      나와의 매칭
                    </button>
                  )}
                </nav>
              </div>

              {/* 탭 컨텐츠 */}
              <div className="p-4 sm:p-6">
                {activeTab === 'talent' && (
                  <TalentTab analysis={analysisResult.talentAnalysis} darkMode={darkMode} theme={theme} />
                )}
                {activeTab === 'requirements' && (
                  <RequirementsTab analysis={analysisResult.talentAnalysis} darkMode={darkMode} theme={theme} />
                )}
                {activeTab === 'culture' && (
                  <CultureTab
                    analysis={analysisResult.talentAnalysis}
                    jobPostings={analysisResult.jobPostings}
                    darkMode={darkMode}
                    theme={theme}
                  />
                )}
                {activeTab === 'matching' && analysisResult.userMatching && (
                  <MatchingTab matching={analysisResult.userMatching} darkMode={darkMode} theme={theme} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 분석 전 안내 */}
        {!analysisResult && !isLoading && (
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
              <i className="ri-building-2-line text-3xl sm:text-4xl text-blue-500"></i>
            </div>
            <h3 className={`text-lg sm:text-xl font-semibold ${theme.text} mb-2`}>
              목표 기업을 검색해보세요
            </h3>
            <p className={`${theme.textMuted} mb-6 text-sm sm:text-base`}>
              관심 있는 기업명을 입력하면 해당 기업의 인재상, 채용 기준, 문화를 분석해드립니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['카카오', '네이버', '삼성전자', '현대자동차', 'SK', 'LG'].map((name) => (
                <button
                  key={name}
                  onClick={() => setCompanyName(name)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    darkMode
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============== 인재상 탭 ==============
function TalentTab({ analysis, darkMode, theme }: { analysis: TalentAnalysis; darkMode: boolean; theme: ThemeColors }) {
  const { idealCandidate, hiringTrends, interviewTips } = analysis;

  return (
    <div className="space-y-6">
      {/* 핵심 가치 */}
      {idealCandidate?.coreValues?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>핵심 가치</h3>
          <div className="flex flex-wrap gap-2">
            {idealCandidate.coreValues.map((value, idx) => (
              <span
                key={idx}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
                  darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 원하는 인재 특성 */}
      {idealCandidate?.keyTraits?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>원하는 인재 특성</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {idealCandidate.keyTraits.map((trait, idx) => (
              <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <span className="text-green-500">
                  <i className="ri-checkbox-circle-fill"></i>
                </span>
                <span className={`text-sm ${theme.textMuted}`}>{trait}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 채용 트렌드 */}
      {hiringTrends && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>채용 트렌드</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {hiringTrends.mainPositions?.length > 0 && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                <p className={`text-xs sm:text-sm ${theme.textSubtle} mb-2`}>주요 채용 포지션</p>
                <ul className="space-y-1">
                  {hiringTrends.mainPositions.map((pos, idx) => (
                    <li key={idx} className={`text-xs sm:text-sm ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>• {pos}</li>
                  ))}
                </ul>
              </div>
            )}
            {hiringTrends.techFocus?.length > 0 && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-xs sm:text-sm ${theme.textSubtle} mb-2`}>주력 기술</p>
                <ul className="space-y-1">
                  {hiringTrends.techFocus.map((tech, idx) => (
                    <li key={idx} className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>• {tech}</li>
                  ))}
                </ul>
              </div>
            )}
            {hiringTrends.industryPosition && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`text-xs sm:text-sm ${theme.textSubtle} mb-2`}>업계 포지션</p>
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>{hiringTrends.industryPosition}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 면접 팁 */}
      {interviewTips?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>면접 준비 팁</h3>
          <div className={`rounded-xl p-4 ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
            <ul className="space-y-2">
              {interviewTips.map((tip, idx) => (
                <li key={idx} className={`flex items-start gap-2 text-xs sm:text-sm ${darkMode ? 'text-amber-300' : 'text-yellow-900'}`}>
                  <span className="text-amber-500 mt-0.5">
                    <i className="ri-lightbulb-line"></i>
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 채용 요건 탭 ==============
function RequirementsTab({ analysis, darkMode, theme }: { analysis: TalentAnalysis; darkMode: boolean; theme: ThemeColors }) {
  const { requirements } = analysis;

  return (
    <div className="space-y-6">
      {/* 필수 요건 */}
      {requirements?.essential?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
            <span className="text-red-500">*</span> 필수 요건
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {requirements.essential.map((req, idx) => (
              <div key={idx} className={`rounded-xl p-4 ${darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`font-medium mb-2 text-sm sm:text-base ${darkMode ? 'text-red-400' : 'text-red-900'}`}>{req.category}</h4>
                <ul className="space-y-1">
                  {req.items.map((item, itemIdx) => (
                    <li key={itemIdx} className={`text-xs sm:text-sm flex items-start gap-2 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                      <span className={`mt-1 ${darkMode ? 'text-red-500' : 'text-red-400'}`}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 우대 사항 */}
      {requirements?.preferred?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>우대 사항</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {requirements.preferred.map((req, idx) => (
              <div key={idx} className={`rounded-xl p-4 ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <h4 className={`font-medium mb-2 text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{req.category}</h4>
                <ul className="space-y-1">
                  {req.items.map((item, itemIdx) => (
                    <li key={itemIdx} className={`text-xs sm:text-sm flex items-start gap-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      <span className={`mt-1 ${darkMode ? 'text-blue-500' : 'text-blue-400'}`}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 기업문화 탭 ==============
function CultureTab({
  analysis,
  jobPostings,
  darkMode,
  theme
}: {
  analysis: TalentAnalysis;
  jobPostings: JobPosting[];
  darkMode: boolean;
  theme: ThemeColors;
}) {
  const { companyCulture } = analysis;

  return (
    <div className="space-y-6">
      {/* 문화 키워드 */}
      {companyCulture?.keywords?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>문화 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {companyCulture.keywords.map((keyword, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${
                  darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'
                }`}
              >
                #{keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 상세 문화 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {companyCulture?.workStyle && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <h4 className={`font-medium mb-2 flex items-center gap-2 text-sm sm:text-base ${theme.text}`}>
              <i className="ri-briefcase-line text-blue-500"></i>
              업무 스타일
            </h4>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{companyCulture.workStyle}</p>
          </div>
        )}
        {companyCulture?.environment && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <h4 className={`font-medium mb-2 flex items-center gap-2 text-sm sm:text-base ${theme.text}`}>
              <i className="ri-building-line text-green-500"></i>
              근무 환경
            </h4>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{companyCulture.environment}</p>
          </div>
        )}
        {companyCulture?.growthOpportunity && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <h4 className={`font-medium mb-2 flex items-center gap-2 text-sm sm:text-base ${theme.text}`}>
              <i className="ri-line-chart-line text-purple-500"></i>
              성장 기회
            </h4>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{companyCulture.growthOpportunity}</p>
          </div>
        )}
      </div>

      {/* 최근 채용공고 */}
      {jobPostings?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>최근 채용공고</h3>
          <div className="space-y-2 sm:space-y-3">
            {jobPostings.map((job) => (
              <div
                key={job.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${
                  darkMode
                    ? 'border-white/[0.08] hover:bg-white/[0.03]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="mb-2 sm:mb-0">
                  <h4 className={`font-medium text-sm sm:text-base ${theme.text}`}>{job.title}</h4>
                  <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
                    {job.company} {job.location && `| ${job.location}`}
                  </p>
                </div>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
                  >
                    상세보기 <i className="ri-arrow-right-line"></i>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== 매칭 분석 탭 ==============
function MatchingTab({ matching, darkMode, theme }: { matching: UserMatching; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-6">
      {/* 매칭 요약 */}
      <div className={`text-center p-6 rounded-xl ${darkMode ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10' : 'bg-gradient-to-r from-blue-50 to-indigo-50'}`}>
        <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-2">
          {matching.overallMatchScore}점
        </div>
        <p className={`text-sm sm:text-base ${theme.textMuted}`}>{matching.matchSummary}</p>
      </div>

      {/* 강점 매칭 */}
      {matching.strengthMatches?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
            <span className="text-green-500"><i className="ri-checkbox-circle-fill"></i></span> 나의 강점
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {matching.strengthMatches.map((strength, idx) => (
              <div key={idx} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                <div>
                  <h4 className={`font-medium text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-900'}`}>{strength.area}</h4>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{strength.match}</p>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{strength.score}점</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 갭 분석 */}
      {matching.gapAnalysis?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
            <span className="text-amber-500"><i className="ri-alert-line"></i></span> 보완이 필요한 영역
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {matching.gapAnalysis.map((gap, idx) => (
              <div key={idx} className={`p-4 rounded-xl ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className={`font-medium text-sm sm:text-base ${darkMode ? 'text-amber-400' : 'text-yellow-900'}`}>{gap.area}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    gap.priority === 'HIGH'
                      ? darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                      : gap.priority === 'MEDIUM'
                        ? darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                        : darkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {gap.priority === 'HIGH' ? '우선순위 높음' :
                     gap.priority === 'MEDIUM' ? '우선순위 중간' : '우선순위 낮음'}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-amber-300' : 'text-yellow-800'}`}>{gap.gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 아이템 */}
      {matching.actionItems?.length > 0 && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
            <span className="text-blue-500"><i className="ri-list-check"></i></span> 준비해야 할 것
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {matching.actionItems.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h4 className={`font-medium text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{item.action}</h4>
                    <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{item.reason}</p>
                  </div>
                  {item.timeline && (
                    <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                      {item.timeline}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 적합도 평가 */}
      {matching.fitAssessment && (
        <div>
          <h3 className={`text-base sm:text-lg font-semibold ${theme.text} mb-3`}>적합도 평가</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>문화 적합도</h4>
              <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{matching.fitAssessment.cultureFit}</p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>역량 적합도</h4>
              <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{matching.fitAssessment.skillFit}</p>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>성장 가능성</h4>
              <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{matching.fitAssessment.growthPotential}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}