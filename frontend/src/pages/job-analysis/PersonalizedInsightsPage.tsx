import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobAnalysisService } from "@/lib/api";

interface CareerInsight {
  careerName: string;
  jobCount: number;
  gapAnalysis: string[];
  learningPath: string[];
  competitiveness: string;
  recommendations: string[];
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
}

export default function PersonalizedInsightsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<CareerInsight[]>([]);
  const [overallRecommendation, setOverallRecommendation] = useState("");
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    card: "bg-white border-slate-200",
    cardHover: "hover:bg-slate-50",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-200",
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
    loadPersonalizedInsights();
  }, []);

  const loadPersonalizedInsights = async () => {
    setLoading(true);
    try {
      // localStorage에서 진로 분석 결과 가져오기
      let analysisData = localStorage.getItem("careerAnalysis");
      const profileData = localStorage.getItem("userProfile");

      // 개발용: 데이터가 없으면 샘플 데이터 사용
      if (!analysisData) {
        console.log("샘플 데이터 사용 (개발용)");
        analysisData = JSON.stringify({
          recommendedCareers: [
            {
              careerName: "백엔드 개발자",
              description: "서버 개발 및 API 설계",
              matchScore: 85,
              reasons: ["Python 경험", "문제 해결 능력"]
            },
            {
              careerName: "풀스택 개발자",
              description: "프론트엔드와 백엔드 모두 개발",
              matchScore: 78,
              reasons: ["다양한 기술 스택", "빠른 학습 능력"]
            }
          ],
          strengths: ["빠른 학습 능력", "문제 해결 능력", "논리적 사고"],
          values: ["성장", "협업", "혁신"],
          interests: ["웹 개발", "데이터베이스", "클라우드"]
        });
      }

      const careerAnalysis = JSON.parse(analysisData);
      const userProfile = profileData ? JSON.parse(profileData) : {
        skills: ["Python", "JavaScript", "React", "FastAPI"],
        experience: "2년차 주니어 개발자"
      };

      // AI 분석 요청
      const result = await jobAnalysisService.getPersonalizedInsights(
        userProfile,
        careerAnalysis
      );

      setInsights(result.insights || []);
      setOverallRecommendation(result.overallRecommendation || "");
    } catch (error: any) {
      console.error("분석 실패:", error);
      alert(error.response?.data?.detail || "맞춤형 인사이트 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  if (noAnalysis) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-blue-500/10" : "bg-blue-400/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-400/20"}`} />
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
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/[0.05]' : 'bg-blue-50'}`}>
              <i className={`ri-search-line text-3xl sm:text-4xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>진로 분석이 필요합니다</h2>
            <p className={`mb-6 text-sm sm:text-base ${theme.textMuted}`}>
              먼저 AI 진로 상담을 통해 당신의 커리어 분석을 받아보세요.
            </p>
            <button
              onClick={() => navigate("/career-chat")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg transition-all"
            >
              진로 상담 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-blue-500/10" : "bg-blue-400/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-purple-500/10" : "bg-purple-400/20"}`} />
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
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className={theme.textMuted}>AI가 당신의 커리어를 분석하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate("/job-analysis")}
            className={`mb-4 flex items-center gap-1 text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
          >
            <i className="ri-arrow-left-line"></i>
            채용 공고 분석으로 돌아가기
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <i className="ri-user-star-line text-white text-xl sm:text-2xl"></i>
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text}`}>맞춤형 커리어 인사이트</h1>
              <p className={`text-sm sm:text-base ${theme.textMuted}`}>
                당신의 진로 분석 결과를 바탕으로 현재 채용 시장을 분석했습니다
              </p>
            </div>
          </div>
        </div>

        {/* 종합 추천 */}
        {overallRecommendation && (
          <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 ${darkMode ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/[0.08]' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'}`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
              <i className="ri-lightbulb-line"></i>
              종합 추천
            </h3>
            <p className={`text-sm sm:text-base ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{overallRecommendation}</p>
          </div>
        )}

        {/* 직업별 인사이트 */}
        <div className="space-y-4 sm:space-y-6">
          {insights.map((insight, index) => (
            <div key={index} className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 backdrop-blur-sm`}>
              {/* 직업 헤더 */}
              <div className={`border-b ${theme.divider} pb-4 mb-4`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div>
                    <h2 className={`text-lg sm:text-2xl font-bold ${theme.text}`}>
                      {insight.careerName}
                    </h2>
                    <p className={`text-sm ${theme.textMuted} mt-1`}>
                      최근 채용 공고 {insight.jobCount}개 분석
                    </p>
                  </div>
                  <div className={`flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 ${darkMode ? 'bg-white/[0.03]' : 'bg-slate-50'} px-4 py-2 rounded-xl`}>
                    <div className={`text-xs sm:text-sm ${theme.textMuted}`}>경쟁력</div>
                    <div
                      className={`text-lg sm:text-xl font-bold ${
                        insight.competitiveness === "상"
                          ? darkMode ? "text-green-400" : "text-green-600"
                          : insight.competitiveness === "중"
                          ? darkMode ? "text-yellow-400" : "text-yellow-600"
                          : darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {insight.competitiveness}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {/* 부족한 스킬 */}
                <div>
                  <h3 className={`font-semibold mb-3 flex items-center text-sm sm:text-base ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    <i className="ri-alert-line mr-2"></i>
                    보완이 필요한 스킬
                  </h3>
                  {insight.gapAnalysis.length > 0 ? (
                    <ul className="space-y-2">
                      {insight.gapAnalysis.map((gap, idx) => (
                        <li
                          key={idx}
                          className={`flex items-start p-3 rounded-lg text-xs sm:text-sm ${darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}
                        >
                          <span className={`mr-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>•</span>
                          <span className={darkMode ? 'text-red-300' : 'text-red-800'}>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`italic text-sm ${theme.textSubtle}`}>
                      현재 요구사항을 충분히 만족합니다
                    </p>
                  )}
                </div>

                {/* 학습 경로 */}
                <div>
                  <h3 className={`font-semibold mb-3 flex items-center text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    <i className="ri-book-open-line mr-2"></i>
                    추천 학습 경로
                  </h3>
                  <ol className="space-y-2">
                    {insight.learningPath.map((step, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start p-3 rounded-lg text-xs sm:text-sm ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}
                      >
                        <span className={`font-semibold mr-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {idx + 1}.
                        </span>
                        <span className={darkMode ? 'text-blue-300' : 'text-blue-800'}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* 추천사항 */}
              {insight.recommendations.length > 0 && (
                <div className={`mt-4 sm:mt-6 rounded-xl p-4 ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <h3 className={`font-semibold mb-2 flex items-center text-sm sm:text-base ${darkMode ? 'text-amber-400' : 'text-yellow-900'}`}>
                    <i className="ri-chat-quote-line mr-2"></i>
                    전문가 조언
                  </h3>
                  <ul className="space-y-1">
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx} className={`text-xs sm:text-sm ${darkMode ? 'text-amber-300' : 'text-yellow-800'}`}>
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={() => navigate("/learning")}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-route-line"></i>
            학습 경로 만들기
          </button>
          <button
            onClick={() => navigate("/job-listings")}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="ri-briefcase-line"></i>
            채용 공고 보기
          </button>
        </div>
      </div>
    </div>
  );
}