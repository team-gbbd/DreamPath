import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobAnalysisService } from "@/lib/api";

interface TopItem {
  name: string;
  count: number;
}

interface SkillDetail {
  skill: string;
  frequency: string;
  importance: string;
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
  statCard: string;
}

export default function JobAnalysisPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"trends" | "skills" | "salary">("trends");
  const [careerField, setCareerField] = useState("");
  const [loading, setLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [skillsData, setSkillsData] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

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
    statCard: "bg-white/[0.03]",
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
    statCard: "bg-slate-50",
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

  const analyzeTrends = async () => {
    setLoading(true);
    try {
      const result = await jobAnalysisService.analyzeMarketTrends(
        careerField || undefined,
        30
      );
      setTrendsData(result);
    } catch (error: any) {
      alert(error.response?.data?.detail || "트렌드 분석 실패");
    } finally {
      setLoading(false);
    }
  };

  const analyzeSkills = async () => {
    if (!careerField) {
      alert("직무 분야를 입력하세요");
      return;
    }

    setLoading(true);
    try {
      const result = await jobAnalysisService.analyzeSkillRequirements(
        careerField,
        30
      );
      setSkillsData(result);
    } catch (error: any) {
      alert(error.response?.data?.detail || "스킬 분석 실패");
    } finally {
      setLoading(false);
    }
  };

  const analyzeSalary = async () => {
    setLoading(true);
    try {
      const result = await jobAnalysisService.analyzeSalaryTrends(
        careerField || undefined,
        30
      );
      setSalaryData(result);
    } catch (error: any) {
      alert(error.response?.data?.detail || "연봉 분석 실패");
    } finally {
      setLoading(false);
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <i className="ri-bar-chart-box-line text-white text-xl sm:text-2xl"></i>
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text}`}>채용 공고 분석 AI</h1>
              <p className={`text-sm ${theme.textMuted} hidden sm:block`}>AI가 채용 시장을 분석해드립니다</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/job-analysis/personalized')}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-user-star-line"></i>
            맞춤형 인사이트
          </button>
        </div>

        {/* 검색 입력 */}
        <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-sm`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="직무 분야 입력 (예: 개발자, 백엔드, 디자이너)"
              className={`flex-1 px-4 py-3 ${theme.input} border ${theme.inputBorder} rounded-xl ${theme.inputFocus} focus:ring-2 focus:outline-none transition-all`}
              value={careerField}
              onChange={(e) => setCareerField(e.target.value)}
            />
            <button
              onClick={() => {
                if (activeTab === "trends") analyzeTrends();
                else if (activeTab === "skills") analyzeSkills();
                else analyzeSalary();
              }}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  분석 중...
                </>
              ) : (
                <>
                  <i className="ri-search-line"></i>
                  분석하기
                </>
              )}
            </button>
          </div>
          <p className={`text-xs sm:text-sm ${theme.textSubtle} mt-2`}>
            * 비워두면 전체 시장을 분석합니다
          </p>
        </div>

        {/* 탭 메뉴 */}
        <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm`}>
          <div className={`flex border-b ${theme.divider}`}>
            <button
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all ${
                activeTab === "trends"
                  ? darkMode
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/10"
                    : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : `${theme.textMuted} ${theme.cardHover}`
              }`}
              onClick={() => setActiveTab("trends")}
            >
              <i className="ri-line-chart-line mr-1 sm:mr-2"></i>
              시장 트렌드
            </button>
            <button
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all ${
                activeTab === "skills"
                  ? darkMode
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/10"
                    : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : `${theme.textMuted} ${theme.cardHover}`
              }`}
              onClick={() => setActiveTab("skills")}
            >
              <i className="ri-tools-line mr-1 sm:mr-2"></i>
              스킬 요구사항
            </button>
            <button
              className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all ${
                activeTab === "salary"
                  ? darkMode
                    ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/10"
                    : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : `${theme.textMuted} ${theme.cardHover}`
              }`}
              onClick={() => setActiveTab("salary")}
            >
              <i className="ri-money-dollar-circle-line mr-1 sm:mr-2"></i>
              연봉 트렌드
            </button>
          </div>

          {/* 탭 내용 */}
          <div className="p-4 sm:p-6">
            {activeTab === "trends" && (
              <TrendsTab data={trendsData} loading={loading} darkMode={darkMode} theme={theme} />
            )}
            {activeTab === "skills" && (
              <SkillsTab data={skillsData} loading={loading} darkMode={darkMode} theme={theme} />
            )}
            {activeTab === "salary" && (
              <SalaryTab data={salaryData} loading={loading} darkMode={darkMode} theme={theme} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== 시장 트렌드 탭 ===== */
function TrendsTab({ data, loading, darkMode, theme }: { data: any; loading: boolean; darkMode: boolean; theme: ThemeColors }) {
  if (loading) return <LoadingState darkMode={darkMode} theme={theme} />;
  if (!data) return <EmptyState darkMode={darkMode} theme={theme} />;

  return (
    <div className="space-y-6">
      {/* 기본 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="분석 기간" value={data.period} darkMode={darkMode} theme={theme} />
        <StatCard label="분야" value={data.careerField} darkMode={darkMode} theme={theme} />
        <StatCard label="총 채용 공고" value={`${data.totalJobs}개`} darkMode={darkMode} theme={theme} />
      </div>

      {/* 요약 */}
      {data.summary && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
            <i className="ri-file-text-line"></i>
            요약
          </h3>
          <p className={`text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{data.summary}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* 상위 채용 기업 */}
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>상위 채용 기업</h3>
          <div className="space-y-2">
            {data.topCompanies?.slice(0, 5).map((item: TopItem, idx: number) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${theme.statCard}`}>
                <span className={`text-sm ${theme.text}`}>{item.name}</span>
                <span className={`text-xs sm:text-sm ${theme.textMuted}`}>{item.count}개 공고</span>
              </div>
            ))}
          </div>
        </div>

        {/* 인기 지역 */}
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>인기 지역</h3>
          <div className="space-y-2">
            {data.topLocations?.slice(0, 5).map((item: TopItem, idx: number) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${theme.statCard}`}>
                <span className={`text-sm ${theme.text}`}>{item.name}</span>
                <span className={`text-xs sm:text-sm ${theme.textMuted}`}>{item.count}개 공고</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 트렌딩 스킬 */}
      {data.trendingSkills?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>트렌딩 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.trendingSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800'}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 성장하는 분야 */}
      {data.growingFields?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>성장하는 분야</h3>
          <div className="flex flex-wrap gap-2">
            {data.growingFields.map((field: string, idx: number) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 인사이트 */}
      {data.insights?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>주요 인사이트</h3>
          <ul className="space-y-2">
            {data.insights.map((insight: string, idx: number) => (
              <li key={idx} className={`flex items-start text-sm ${theme.textMuted}`}>
                <span className="text-blue-500 mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ===== 스킬 요구사항 탭 ===== */
function SkillsTab({ data, loading, darkMode, theme }: { data: any; loading: boolean; darkMode: boolean; theme: ThemeColors }) {
  if (loading) return <LoadingState darkMode={darkMode} theme={theme} />;
  if (!data) return <EmptyState darkMode={darkMode} theme={theme} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="분야" value={data.careerField} darkMode={darkMode} theme={theme} />
        <StatCard label="분석한 공고" value={`${data.analyzedJobs}개`} darkMode={darkMode} theme={theme} />
      </div>

      {/* 필수 스킬 */}
      {data.requiredSkills?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>필수 스킬</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className={theme.statCard}>
                <tr>
                  <th className={`px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm ${theme.text}`}>스킬</th>
                  <th className={`px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm ${theme.text}`}>빈도</th>
                  <th className={`px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm ${theme.text}`}>중요도</th>
                </tr>
              </thead>
              <tbody>
                {data.requiredSkills.slice(0, 10).map((skill: SkillDetail, idx: number) => (
                  <tr key={idx} className={`border-t ${theme.divider}`}>
                    <td className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${theme.text}`}>{skill.skill}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        skill.frequency === "높음"
                          ? darkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-800"
                          : skill.frequency === "중간"
                            ? darkMode ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-800"
                            : darkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-800"
                      }`}>
                        {skill.frequency}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        skill.importance === "필수"
                          ? darkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-800"
                          : darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-800"
                      }`}>
                        {skill.importance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 우대 스킬 */}
      {data.preferredSkills?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>우대 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.preferredSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 떠오르는 스킬 */}
      {data.emergingSkills?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>떠오르는 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.emergingSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800'}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 경력 요구사항 */}
      {data.experienceLevel && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>경력 요구사항</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {data.experienceLevel.entry && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>신입</div>
                <div className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{data.experienceLevel.entry}</div>
              </div>
            )}
            {data.experienceLevel.mid && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>중급</div>
                <div className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{data.experienceLevel.mid}</div>
              </div>
            )}
            {data.experienceLevel.senior && (
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>시니어</div>
                <div className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>{data.experienceLevel.senior}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 학습 추천 */}
      {data.recommendations?.length > 0 && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
          <h3 className={`font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-yellow-900'}`}>
            <i className="ri-lightbulb-line"></i>
            학습 추천
          </h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className={`text-xs sm:text-sm ${darkMode ? 'text-amber-300' : 'text-yellow-800'}`}>
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ===== 연봉 트렌드 탭 ===== */
function SalaryTab({ data, loading, darkMode, theme }: { data: any; loading: boolean; darkMode: boolean; theme: ThemeColors }) {
  if (loading) return <LoadingState darkMode={darkMode} theme={theme} />;
  if (!data) return <EmptyState darkMode={darkMode} theme={theme} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="분야" value={data.careerField} darkMode={darkMode} theme={theme} />
        <StatCard label="분석한 공고" value={`${data.analyzedJobs}개`} darkMode={darkMode} theme={theme} />
      </div>

      {/* 연봉 범위 */}
      {data.salaryRange && (
        <div className={`rounded-xl p-4 sm:p-6 ${darkMode ? 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-white/[0.08]' : 'bg-gradient-to-r from-green-50 to-blue-50 border border-slate-200'}`}>
          <h3 className={`font-semibold mb-4 text-sm sm:text-base ${theme.text}`}>연봉 범위</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.salaryRange.min && (
              <div>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>최소</div>
                <div className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {data.salaryRange.min}
                </div>
              </div>
            )}
            {data.salaryRange.average && (
              <div>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>평균</div>
                <div className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {data.salaryRange.average}
                </div>
              </div>
            )}
            {data.salaryRange.max && (
              <div>
                <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>최대</div>
                <div className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {data.salaryRange.max}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 복리후생 */}
      {data.benefits?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>주요 복리후생</h3>
          <div className="flex flex-wrap gap-2">
            {data.benefits.map((benefit: string, idx: number) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 인사이트 */}
      {data.insights?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>인사이트</h3>
          <ul className="space-y-2">
            {data.insights.map((insight: string, idx: number) => (
              <li key={idx} className={`flex items-start text-sm ${theme.textMuted}`}>
                <span className="text-blue-500 mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ===== 공통 컴포넌트 ===== */
function StatCard({ label, value, darkMode, theme }: { label: string; value: string; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className={`rounded-xl p-4 ${theme.statCard}`}>
      <div className={`text-xs sm:text-sm mb-1 ${theme.textMuted}`}>{label}</div>
      <div className={`text-base sm:text-lg font-semibold ${theme.text}`}>{value}</div>
    </div>
  );
}

function LoadingState({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="text-center py-12">
      <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p className={theme.textMuted}>분석 중...</p>
    </div>
  );
}

function EmptyState({ darkMode, theme }: { darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="text-center py-12">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
        <i className={`ri-bar-chart-grouped-line text-3xl ${darkMode ? 'text-white/30' : 'text-slate-400'}`}></i>
      </div>
      <p className={theme.textMuted}>직무 분야를 입력하고 '분석하기' 버튼을 클릭하세요</p>
      <p className={`text-xs sm:text-sm mt-2 ${theme.textSubtle}`}>최근 30일간의 채용 공고를 AI로 분석합니다</p>
    </div>
  );
}