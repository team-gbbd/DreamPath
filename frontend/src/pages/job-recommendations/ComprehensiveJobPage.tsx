import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jobRecommendationService, jobSiteService, BACKEND_BASE_URL, authFetch } from "@/lib/api";
import ApplicationWriterModal from "../../components/application/ApplicationWriterModal";

// localStorage에서 userId 가져오기
const getStoredUserId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('dreampath:user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: number };
    return typeof parsed?.userId === 'number' ? parsed.userId : null;
  } catch {
    return null;
  }
};

// 타입 정의
interface IdealTalent {
  summary: string;
  coreValues: string[];
  keyTraits: string[];
  fitWithUser: string;
}

interface HiringStep {
  step: number;
  name: string;
  description: string;
  tips: string;
}

interface HiringProcess {
  processType: string;
  expectedSteps: HiringStep[];
  estimatedDuration: string;
  userPreparationAdvice: string;
}

interface VerificationCriteria {
  academicCriteria: {
    preferredMajors: string[];
    minimumGPA: string;
    userGPAAssessment: string;
  };
  skillCriteria: {
    essential: string[];
    preferred: string[];
    userSkillMatch: string;
  };
  experienceCriteria: {
    minimumYears: string;
    preferredBackground: string;
    userExperienceAssessment: string;
  };
}

interface HiringStatus {
  estimatedPhase: string;
  competitionLevel: string;
  competitionRatio: string;
  estimatedApplicants: number;
  estimatedHires: number;
  bestApplyTiming: string;
  marketDemand: string;
}

interface StrengthItem {
  area: string;
  detail: string;
  score: number;
}

interface WeaknessItem {
  area: string;
  detail: string;
  priority: string;
}

interface UserVerificationResult {
  overallScore: number;
  strengths: StrengthItem[];
  weaknesses: WeaknessItem[];
  valueAlignment: string;
  cultureAlignment: string;
  growthPotential: string;
}

interface ComprehensiveAnalysis {
  idealTalent: IdealTalent;
  hiringProcess: HiringProcess;
  verificationCriteria: VerificationCriteria;
  hiringStatus: HiringStatus;
  userVerificationResult: UserVerificationResult;
}

interface JobRecommendation {
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string | null;
  siteName: string;
  matchScore: number;
  reasons: string[];
  strengths: string[];
  concerns: string[];
  comprehensiveAnalysis: ComprehensiveAnalysis;
}

interface Summary {
  message: string;
  topRecommendation: {
    company: string;
    reason: string;
  } | null;
  insights: string[];
  actionPriorities: string[];
}

interface RecommendationResult {
  recommendations: JobRecommendation[];
  totalCount: number;
  summary: Summary;
  commonRequiredTechnologies: any[];
  overallLearningPath: string[];
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

export default function ComprehensiveJobPage() {
  const navigate = useNavigate();
  const isLoadingRef = useRef(false); // 중복 호출 방지
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    "talent" | "process" | "criteria" | "status" | "result"
  >("talent");
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filteredRecommendations, setFilteredRecommendations] = useState<JobRecommendation[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  // 전체 검색 관련 state
  const [viewMode, setViewMode] = useState<"recommendations" | "allJobs">("recommendations");
  const [allJobListings, setAllJobListings] = useState<JobRecommendation[]>([]);
  const [allJobsLoading, setAllJobsLoading] = useState(false);
  const [allJobsTotalCount, setAllJobsTotalCount] = useState(0);
  const [selectedAllJob, setSelectedAllJob] = useState<JobRecommendation | null>(null);
  const [allJobsSearchKeyword, setAllJobsSearchKeyword] = useState("");

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

    const handleThemeChange = () => {
      const theme = localStorage.getItem('dreampath:theme');
      setDarkMode(theme === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);
    return () => window.removeEventListener('dreampath-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      await loadRecommendations();
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 검색어에 따라 추천 목록 필터링
  useEffect(() => {
    if (!result?.recommendations) {
      setFilteredRecommendations([]);
      return;
    }

    if (!searchKeyword.trim()) {
      setFilteredRecommendations(result.recommendations);
      return;
    }

    const keyword = searchKeyword.toLowerCase();
    const filtered = result.recommendations.filter(job =>
      job.title.toLowerCase().includes(keyword) ||
      job.company.toLowerCase().includes(keyword) ||
      (job.location?.toLowerCase().includes(keyword)) ||
      job.reasons.some(r => r.toLowerCase().includes(keyword))
    );
    setFilteredRecommendations(filtered);
  }, [searchKeyword, result?.recommendations]);

  const loadRecommendations = async (forceRefresh = false) => {
    // 이미 로딩 중이면 중복 호출 방지
    if (isLoadingRef.current) {
      console.log('[ComprehensiveJobPage] 이미 로딩 중 - 중복 호출 방지');
      return;
    }

    const userId = getStoredUserId();
    if (!userId) {
      setNotLoggedIn(true);
      return;
    }

    // sessionStorage 캐시 확인 (forceRefresh가 아닐 때만)
    const cacheKey = `jobRecommendations_${userId}`;
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // 30분 이내 캐시만 사용
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            console.log('[ComprehensiveJobPage] sessionStorage 캐시 사용');
            setResult(data.result);
            setSelectedJob(data.selectedJob);
            setIsCached(true);
            setCalculatedAt(data.calculatedAt);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    isLoadingRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const analysisResponse = await authFetch(`${BACKEND_BASE_URL}/api/profiles/${userId}/analysis`);
      if (!analysisResponse.ok) {
        if (analysisResponse.status === 404) {
          setNoAnalysis(true);
          setLoading(false);
          return;
        }
        throw new Error('분석 데이터를 불러오지 못했습니다.');
      }

      try {
        const cachedResult = await jobRecommendationService.getRecommendationsByCareerAnalysis(userId, 20);

        if (cachedResult.success && cachedResult.recommendations && cachedResult.recommendations.length > 0) {
          const mappedRecommendations: JobRecommendation[] = cachedResult.recommendations.map((rec: any) => ({
            jobId: rec.id?.toString() || '',
            title: rec.title || '',
            company: rec.company || '',
            location: rec.location || null,
            url: rec.url || '',
            description: rec.description || null,
            siteName: rec.siteName || '',
            matchScore: rec.matchScore || 0,
            reasons: rec.matchReason ? [rec.matchReason] : [],
            strengths: rec.strengths || [],
            concerns: rec.concerns || [],
            comprehensiveAnalysis: rec.comprehensiveAnalysis || null,
          }));

          setResult({
            recommendations: mappedRecommendations,
            totalCount: cachedResult.totalCount || mappedRecommendations.length,
            summary: {
              message: `${mappedRecommendations.length}개의 맞춤 채용 공고를 분석했습니다.`,
              topRecommendation: mappedRecommendations[0] ? {
                company: mappedRecommendations[0].company,
                reason: mappedRecommendations[0].reasons[0] || '높은 매칭 점수'
              } : null,
              insights: [],
              actionPriorities: []
            },
            commonRequiredTechnologies: [],
            overallLearningPath: []
          });
          const selectedJobData = mappedRecommendations.length > 0 ? mappedRecommendations[0] : null;
          if (selectedJobData) {
            setSelectedJob(selectedJobData);
          }
          setIsCached(true);
          setCalculatedAt(cachedResult.calculatedAt || null);

          // sessionStorage에 캐시 저장
          const resultData = {
            recommendations: mappedRecommendations,
            totalCount: cachedResult.totalCount || mappedRecommendations.length,
            summary: {
              message: `${mappedRecommendations.length}개의 맞춤 채용 공고를 분석했습니다.`,
              topRecommendation: selectedJobData ? {
                company: selectedJobData.company,
                reason: selectedJobData.reasons[0] || '높은 매칭 점수'
              } : null,
              insights: [],
              actionPriorities: []
            },
            commonRequiredTechnologies: [],
            overallLearningPath: []
          };
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: {
              result: resultData,
              selectedJob: selectedJobData,
              calculatedAt: cachedResult.calculatedAt || null
            },
            timestamp: Date.now()
          }));

          setLoading(false);
          return;
        }
      } catch (cacheError: any) {
        console.log("캐시된 추천 조회 실패:", cacheError);
        // 캐시 조회 실패 시 에러 메시지 표시
        const errorMessage = cacheError.response?.data?.error
          || cacheError.message
          || "채용 추천을 불러오는 데 실패했습니다.";
        setLoadError(errorMessage);
        return;
      }

      setResult(null);
      setIsCached(false);
    } catch (error: any) {
      console.error("추천 실패:", error);
      if (error.response?.status === 404) {
        setNoAnalysis(true);
      } else {
        // 에러 메시지 설정
        const errorMessage = error.response?.data?.error
          || error.message
          || "채용 추천을 불러오는 데 실패했습니다.";
        setLoadError(errorMessage);
      }
    } finally {
      setLoading(false);
      setCalculating(false);
      isLoadingRef.current = false;
    }
  };

  const handleRecalculate = async () => {
    const userId = getStoredUserId();
    if (!userId) return;

    // 캐시 삭제
    sessionStorage.removeItem(`jobRecommendations_${userId}`);

    setCalculating(true);
    try {
      await jobRecommendationService.triggerCalculation(userId, false);
      isLoadingRef.current = false;
      await loadRecommendations(true); // forceRefresh=true
    } catch (error) {
      console.error("재계산 실패:", error);
      alert("추천 재계산에 실패했습니다.");
    } finally {
      setCalculating(false);
    }
  };

  const searchAllJobs = async (keyword?: string) => {
    setAllJobsLoading(true);
    try {
      const response = await jobSiteService.searchJobListings(
        undefined,
        keyword || undefined,
        100,
        0
      );

      if (response.success && response.jobListings) {
        const mappedJobs: JobRecommendation[] = response.jobListings.map((job: any) => ({
          jobId: job.id?.toString() || '',
          title: job.title || '',
          company: job.company || '',
          location: job.location || null,
          url: job.url || '',
          description: job.description || null,
          siteName: response.site || '',
          matchScore: 0,
          reasons: [],
          strengths: [],
          concerns: [],
          comprehensiveAnalysis: null as any,
        }));

        setAllJobListings(mappedJobs);
        setAllJobsTotalCount(response.totalResults || mappedJobs.length);

        if (mappedJobs.length > 0 && !selectedAllJob) {
          setSelectedAllJob(mappedJobs[0]);
        }
      }
    } catch (error) {
      console.error("전체 채용 정보 검색 실패:", error);
    } finally {
      setAllJobsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "allJobs" && allJobListings.length === 0) {
      searchAllJobs();
    }
  }, [viewMode]);

  // 배경 효과 컴포넌트
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-blue-500/10" : "bg-blue-400/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-indigo-500/10" : "bg-indigo-400/20"}`} />
        <div className={`absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full blur-[100px] ${darkMode ? "bg-purple-500/10" : "bg-purple-400/15"}`} />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );

  // 로그인 필요
  if (notLoggedIn) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/[0.05]' : 'bg-blue-50'}`}>
              <i className={`ri-lock-line text-3xl sm:text-4xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>로그인이 필요합니다</h2>
            <p className={`mb-6 text-sm sm:text-base ${theme.textMuted}`}>
              종합 채용 분석을 받으려면 먼저 로그인해주세요.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg transition-all"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 프로파일 분석 필요
  if (noAnalysis) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/[0.05]' : 'bg-blue-50'}`}>
              <i className={`ri-file-user-line text-3xl sm:text-4xl ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}></i>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${theme.text}`}>프로파일 분석이 필요합니다</h2>
            <p className={`mb-6 text-sm sm:text-base ${theme.textMuted}`}>
              먼저 프로파일 분석을 완료해야 종합 채용 분석을 받을 수 있습니다.
            </p>
            <button
              onClick={() => navigate("/profile/input")}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg transition-all"
            >
              프로파일 분석하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로딩/계산 중
  if (loading || calculating) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className={`text-base sm:text-lg ${theme.textMuted}`}>
              {calculating
                ? "AI가 6가지 종합 채용 분석을 수행하고 있습니다..."
                : "추천 정보를 불러오는 중..."}
            </p>
            {calculating && (
              <p className={`text-xs sm:text-sm mt-2 ${theme.textSubtle}`}>
                인재상, 채용 프로세스, 검증 기준, 합격 예측 등을 분석합니다
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (loadError) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className="text-5xl sm:text-6xl mb-4">⚠️</div>
            <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>추천 조회 실패</h2>
            <p className={`mb-4 text-sm sm:text-base ${theme.textMuted}`}>{loadError}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => {
                  setLoadError(null);
                  isLoadingRef.current = false;
                  loadRecommendations(true); // forceRefresh=true
                }}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#5A7BFF] text-white rounded-lg hover:bg-[#4A6BEF] transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => navigate("/profile/input")}
                className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors ${darkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                프로필 분석하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 캐시 없음 - 준비 중
  if (!result) {
    return (
      <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/[0.05]' : 'bg-amber-50'}`}>
              <i className={`ri-time-line text-3xl sm:text-4xl ${darkMode ? 'text-amber-400' : 'text-amber-500'}`}></i>
            </div>
            <h3 className={`text-lg sm:text-xl font-bold mb-2 ${theme.text}`}>종합 분석 준비 중</h3>
            <p className={`mb-4 text-sm sm:text-base ${theme.textMuted}`}>
              AI가 당신에게 맞는 채용 공고를 종합 분석하고 있습니다.
            </p>
            <p className={`text-xs sm:text-sm mb-6 ${theme.textSubtle}`}>
              백그라운드에서 분석 중이며, 1-2분 후 새로고침하면 결과를 확인할 수 있습니다.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium shadow-lg transition-all"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-hidden`}>
      <BackgroundEffects />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 헤더 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <i className="ri-briefcase-4-line text-white text-xl sm:text-2xl"></i>
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text}`}>AI 종합 채용 분석</h1>
                <p className={`text-sm sm:text-base ${theme.textMuted}`}>
                  채용 공고별 6가지 맞춤 분석으로 합격 가능성을 높이세요
                </p>
                {isCached && calculatedAt && (
                  <p className={`text-xs ${theme.textSubtle} mt-1`}>
                    마지막 분석: {new Date(calculatedAt).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={calculating}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <i className={`ri-refresh-line ${calculating ? 'animate-spin' : ''}`}></i>
              {calculating ? '분석 중...' : '다시 분석'}
            </button>
          </div>

          {/* 보기 모드 탭 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode("recommendations")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "recommendations"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                  : darkMode
                    ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              맞춤 추천 ({result?.totalCount || 0})
            </button>
            <button
              onClick={() => setViewMode("allJobs")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === "allJobs"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                  : darkMode
                    ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              전체 채용공고 ({allJobsTotalCount})
            </button>
          </div>
        </div>

        {/* 전체 요약 - 추천 모드에서만 */}
        {viewMode === "recommendations" && result.summary && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 text-white">
            <p className="text-sm sm:text-lg mb-3">{result.summary.message}</p>
            {result.summary.topRecommendation && (
              <div className="bg-white/20 rounded-xl p-3 sm:p-4 mb-3 backdrop-blur-sm">
                <p className="font-semibold text-sm sm:text-base">
                  Top 추천: {result.summary.topRecommendation.company}
                </p>
                <p className="text-xs sm:text-sm opacity-90">
                  {result.summary.topRecommendation.reason}
                </p>
              </div>
            )}
            {result.summary.insights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.summary.insights.map((insight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm"
                  >
                    {insight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 채용 공고 목록 (좌측) */}
          <div className="lg:col-span-1">
            <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-4 backdrop-blur-sm`}>
              {viewMode === "recommendations" ? (
                <>
                  <h2 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>
                    추천 공고 ({filteredRecommendations.length}개)
                  </h2>

                  {/* 추천 목록 내 필터 검색 */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="추천 목록에서 검색..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className={`w-full px-4 py-2.5 pl-10 ${theme.input} border ${theme.inputBorder} rounded-xl ${theme.inputFocus} focus:ring-2 focus:outline-none text-sm transition-all`}
                    />
                    <i className={`ri-search-line absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSubtle}`}></i>
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSubtle} hover:${theme.textMuted}`}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 sm:space-y-3 max-h-[450px] sm:max-h-[550px] overflow-y-auto">
                    {filteredRecommendations.length === 0 && searchKeyword ? (
                      <div className={`text-center py-8 ${theme.textMuted}`}>
                        <p className="text-sm">'{searchKeyword}'에 대한 검색 결과가 없습니다.</p>
                      </div>
                    ) : filteredRecommendations.map((job) => (
                      <div
                        key={job.jobId}
                        onClick={() => setSelectedJob(job)}
                        className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all ${
                          selectedJob?.jobId === job.jobId
                            ? darkMode
                              ? "bg-blue-500/20 border-2 border-blue-400"
                              : "bg-blue-50 border-2 border-blue-500"
                            : `${theme.statCard} border ${theme.border} ${theme.cardHover}`
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate text-sm sm:text-base ${theme.text}`}>
                              {job.title}
                            </h3>
                            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{job.company}</p>
                            {job.location && (
                              <p className={`text-xs ${theme.textSubtle}`}>{job.location}</p>
                            )}
                          </div>
                          <div className="ml-2 text-right">
                            <div
                              className={`text-base sm:text-lg font-bold ${
                                job.matchScore >= 80
                                  ? darkMode ? "text-green-400" : "text-green-600"
                                  : job.matchScore >= 60
                                  ? darkMode ? "text-blue-400" : "text-blue-600"
                                  : theme.textMuted
                              }`}
                            >
                              {job.matchScore}점
                            </div>
                            <p className={`text-xs ${theme.textSubtle}`}>매칭</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* 전체 채용공고 모드 */
                <>
                  <h2 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>
                    전체 채용공고 ({allJobsTotalCount}개)
                  </h2>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      searchAllJobs(allJobsSearchKeyword);
                    }}
                    className="relative mb-4"
                  >
                    <input
                      type="text"
                      placeholder="회사명, 직무로 검색..."
                      value={allJobsSearchKeyword}
                      onChange={(e) => setAllJobsSearchKeyword(e.target.value)}
                      className={`w-full px-4 py-2.5 pl-10 pr-16 ${theme.input} border ${theme.inputBorder} rounded-xl ${theme.inputFocus} focus:ring-2 focus:outline-none text-sm transition-all`}
                    />
                    <i className={`ri-search-line absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSubtle}`}></i>
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-lg hover:from-blue-600 hover:to-indigo-600"
                    >
                      검색
                    </button>
                  </form>

                  {allJobsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 max-h-[450px] sm:max-h-[550px] overflow-y-auto">
                      {allJobListings.length === 0 ? (
                        <div className={`text-center py-8 ${theme.textMuted}`}>
                          <p className="text-sm">채용 정보가 없습니다.</p>
                        </div>
                      ) : allJobListings.map((job) => (
                        <div
                          key={job.jobId}
                          onClick={() => setSelectedAllJob(job)}
                          className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all ${
                            selectedAllJob?.jobId === job.jobId
                              ? darkMode
                                ? "bg-blue-500/20 border-2 border-blue-400"
                                : "bg-blue-50 border-2 border-blue-500"
                              : `${theme.statCard} border ${theme.border} ${theme.cardHover}`
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium truncate text-sm sm:text-base ${theme.text}`}>
                                {job.title}
                              </h3>
                              <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{job.company}</p>
                              {job.location && (
                                <p className={`text-xs ${theme.textSubtle}`}>{job.location}</p>
                              )}
                            </div>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-lg ${darkMode ? 'bg-white/[0.05] text-white/50' : 'bg-slate-100 text-slate-600'}`}>
                              {job.siteName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 상세 분석 (우측) */}
          <div className="lg:col-span-2">
            {viewMode === "recommendations" ? (
              selectedJob ? (
                <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm`}>
                  {/* 선택된 공고 헤더 */}
                  <div className={`p-4 sm:p-6 border-b ${theme.divider}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <h2 className={`text-lg sm:text-xl font-bold ${theme.text}`}>
                          {selectedJob.title}
                        </h2>
                        <p className={theme.textMuted}>{selectedJob.company}</p>
                        {selectedJob.location && (
                          <p className={`text-sm ${theme.textSubtle}`}>{selectedJob.location}</p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsApplicationModalOpen(true)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                        >
                          <i className="ri-edit-line"></i>
                          지원서 작성
                        </button>
                        <a
                          href={selectedJob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                        >
                          <i className="ri-external-link-line"></i>
                          지원하기
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 5가지 분석 탭 */}
                  <div className={`border-b ${theme.divider} overflow-x-auto`}>
                    <nav className="flex">
                      {[
                        { id: "talent", label: "인재상", icon: "ri-user-star-line" },
                        { id: "process", label: "채용 프로세스", icon: "ri-flow-chart" },
                        { id: "criteria", label: "검증 기준", icon: "ri-checkbox-circle-line" },
                        { id: "status", label: "채용 현황", icon: "ri-bar-chart-2-line" },
                        { id: "result", label: "검증 결과", icon: "ri-file-chart-line" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveAnalysisTab(tab.id as any)}
                          className={`flex-shrink-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                            activeAnalysisTab === tab.id
                              ? darkMode
                                ? "border-blue-400 text-blue-400 bg-blue-500/10"
                                : "border-blue-500 text-blue-600 bg-blue-50"
                              : `border-transparent ${theme.textMuted} ${theme.cardHover}`
                          }`}
                        >
                          <i className={`${tab.icon} mr-1`}></i>
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* 탭 컨텐츠 */}
                  <div className="p-4 sm:p-6">
                    {selectedJob.comprehensiveAnalysis && (
                      <>
                        {activeAnalysisTab === "talent" && (
                          <TalentTab analysis={selectedJob.comprehensiveAnalysis.idealTalent} darkMode={darkMode} theme={theme} />
                        )}
                        {activeAnalysisTab === "process" && (
                          <ProcessTab analysis={selectedJob.comprehensiveAnalysis.hiringProcess} darkMode={darkMode} theme={theme} />
                        )}
                        {activeAnalysisTab === "criteria" && (
                          <CriteriaTab analysis={selectedJob.comprehensiveAnalysis.verificationCriteria} darkMode={darkMode} theme={theme} />
                        )}
                        {activeAnalysisTab === "status" && (
                          <StatusTab analysis={selectedJob.comprehensiveAnalysis.hiringStatus} darkMode={darkMode} theme={theme} />
                        )}
                        {activeAnalysisTab === "result" && (
                          <ResultTab analysis={selectedJob.comprehensiveAnalysis.userVerificationResult} darkMode={darkMode} theme={theme} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm ${theme.textMuted}`}>
                  좌측에서 채용 공고를 선택하세요
                </div>
              )
            ) : (
              /* 전체 채용공고 모드 상세 보기 */
              selectedAllJob ? (
                <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm`}>
                  <div className={`p-4 sm:p-6 border-b ${theme.divider}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <h2 className={`text-lg sm:text-xl font-bold ${theme.text}`}>
                          {selectedAllJob.title}
                        </h2>
                        <p className={theme.textMuted}>{selectedAllJob.company}</p>
                        {selectedAllJob.location && (
                          <p className={`text-sm ${theme.textSubtle}`}>{selectedAllJob.location}</p>
                        )}
                        {selectedAllJob.siteName && (
                          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-lg ${darkMode ? 'bg-white/[0.05] text-white/50' : 'bg-slate-100 text-slate-600'}`}>
                            {selectedAllJob.siteName}
                          </span>
                        )}
                      </div>
                      <a
                        href={selectedAllJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <i className="ri-external-link-line"></i>
                        지원하기
                      </a>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {selectedAllJob.description ? (
                      <div>
                        <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>채용 상세</h3>
                        <div className={`p-4 rounded-xl ${theme.statCard}`}>
                          <p className={`whitespace-pre-wrap text-sm ${theme.textMuted}`}>
                            {selectedAllJob.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${theme.textMuted}`}>
                        <p className="text-sm">상세 정보가 없습니다.</p>
                        <a
                          href={selectedAllJob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-4 text-blue-500 hover:underline text-sm"
                        >
                          원본 공고에서 확인하기 <i className="ri-arrow-right-line"></i>
                        </a>
                      </div>
                    )}

                    <div className={`mt-6 p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                      <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        <i className="ri-lightbulb-line mr-1"></i>
                        이 채용공고에 대한 AI 분석을 받으려면 "맞춤 추천" 탭에서 프로파일 기반 추천을 확인하세요.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${theme.card} border rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center backdrop-blur-sm ${theme.textMuted}`}>
                  좌측에서 채용 공고를 선택하세요
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* 지원서 작성 모달 */}
      {selectedJob && (
        <ApplicationWriterModal
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
          jobInfo={{
            jobId: selectedJob.jobId,
            title: selectedJob.title,
            company: selectedJob.company,
            description: selectedJob.description,
            location: selectedJob.location,
            url: selectedJob.url,
          }}
          userId={getStoredUserId() || 0}
        />
      )}
    </div>
  );
}

// ============== 1. 인재상 분석 탭 ==============
function TalentTab({ analysis, darkMode, theme }: { analysis: IdealTalent; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <h3 className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>이 기업이 원하는 인재</h3>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>{analysis.summary}</p>
      </div>

      {analysis.coreValues?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>핵심 가치</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.coreValues.map((value, idx) => (
              <span
                key={idx}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.keyTraits?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>원하는 특성</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {analysis.keyTraits.map((trait, idx) => (
              <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg text-xs sm:text-sm ${theme.statCard}`}>
                <span className="text-green-500"><i className="ri-checkbox-circle-fill"></i></span>
                <span className={theme.textMuted}>{trait}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
        <h3 className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-900'}`}>당신과의 적합도</h3>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{analysis.fitWithUser}</p>
      </div>
    </div>
  );
}

// ============== 2. 채용 프로세스 탭 ==============
function ProcessTab({ analysis, darkMode, theme }: { analysis: HiringProcess; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <div>
          <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>채용 유형</span>
          <p className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{analysis.processType}</p>
        </div>
        <div className={`sm:border-l ${darkMode ? 'sm:border-blue-500/20' : 'sm:border-blue-200'} sm:pl-4`}>
          <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>예상 기간</span>
          <p className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{analysis.estimatedDuration}</p>
        </div>
      </div>

      {analysis.expectedSteps?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-4 text-sm sm:text-base ${theme.text}`}>예상 채용 절차</h3>
          <div className="space-y-3 sm:space-y-4">
            {analysis.expectedSteps.map((step, idx) => (
              <div
                key={idx}
                className={`flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl ${theme.statCard}`}
              >
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-sm sm:text-base ${theme.text}`}>{step.name}</h4>
                  <p className={`text-xs sm:text-sm mt-1 ${theme.textMuted}`}>{step.description}</p>
                  {step.tips && (
                    <div className={`mt-2 p-2 rounded-lg text-xs sm:text-sm ${darkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-yellow-50 text-yellow-800'}`}>
                      <i className="ri-lightbulb-line mr-1"></i>
                      Tip: {step.tips}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
        <h3 className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-900'}`}>맞춤 준비 조언</h3>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{analysis.userPreparationAdvice}</p>
      </div>
    </div>
  );
}

// ============== 3. 검증 기준 탭 ==============
function CriteriaTab({ analysis, darkMode, theme }: { analysis: VerificationCriteria; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 학력 기준 */}
      <div className={`p-4 rounded-xl ${theme.statCard}`}>
        <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>학력 기준</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>선호 전공</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.academicCriteria.preferredMajors.map((major, idx) => (
                <span key={idx} className={`px-2 py-1 text-xs rounded-lg ${darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                  {major}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>최소 학점</span>
            <p className={`font-medium text-sm sm:text-base ${theme.text}`}>{analysis.academicCriteria.minimumGPA}</p>
          </div>
        </div>
        <div className={`mt-3 p-2 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <span className={`text-xs sm:text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>당신의 평가: {analysis.academicCriteria.userGPAAssessment}</span>
        </div>
      </div>

      {/* 역량 기준 */}
      <div className={`p-4 rounded-xl ${theme.statCard}`}>
        <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>역량 기준</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className={`text-xs sm:text-sm flex items-center gap-1 ${theme.textSubtle}`}>
              <span className="text-red-500">*</span> 필수 역량
            </span>
            <ul className="mt-1 space-y-1">
              {analysis.skillCriteria.essential.map((skill, idx) => (
                <li key={idx} className={`text-xs sm:text-sm ${theme.textMuted}`}>{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>우대 역량</span>
            <ul className="mt-1 space-y-1">
              {analysis.skillCriteria.preferred.map((skill, idx) => (
                <li key={idx} className={`text-xs sm:text-sm ${theme.textMuted}`}>{skill}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className={`mt-3 p-2 rounded-lg ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
          <span className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{analysis.skillCriteria.userSkillMatch}</span>
        </div>
      </div>

      {/* 경력 기준 */}
      <div className={`p-4 rounded-xl ${theme.statCard}`}>
        <h3 className={`font-semibold mb-3 text-sm sm:text-base ${theme.text}`}>경력 기준</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>최소 경력</span>
            <p className={`font-medium text-sm sm:text-base ${theme.text}`}>{analysis.experienceCriteria.minimumYears}</p>
          </div>
          <div>
            <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>선호 배경</span>
            <p className={`font-medium text-sm sm:text-base ${theme.text}`}>{analysis.experienceCriteria.preferredBackground}</p>
          </div>
        </div>
        <div className={`mt-3 p-2 rounded-lg ${darkMode ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
          <span className={`text-xs sm:text-sm ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>{analysis.experienceCriteria.userExperienceAssessment}</span>
        </div>
      </div>
    </div>
  );
}

// ============== 4. 채용 현황 탭 ==============
function StatusTab({ analysis, darkMode, theme }: { analysis: HiringStatus; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 경쟁률 하이라이트 */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
        <div className="text-center">
          <span className="text-xs sm:text-sm opacity-90">
            {analysis.estimatedApplicants ? '현재 지원자 기준 경쟁률' : '예상 경쟁률'}
          </span>
          <p className="text-3xl sm:text-4xl font-bold mt-1">{analysis.competitionRatio || analysis.competitionLevel}</p>
          {!analysis.estimatedApplicants && (
            <p className="text-xs opacity-70 mt-1">* 유사 공고 기반 추정치</p>
          )}
          <div className="flex justify-center gap-6 sm:gap-8 mt-4">
            <div>
              <span className="text-xl sm:text-2xl font-semibold">
                {analysis.estimatedApplicants ? `${analysis.estimatedApplicants}명` : '-'}
              </span>
              <p className="text-xs opacity-80">
                {analysis.estimatedApplicants ? '현재 지원자' : '지원자 정보 없음'}
              </p>
            </div>
            <div className="border-l border-white/30 pl-6 sm:pl-8">
              <span className="text-xl sm:text-2xl font-semibold">
                {analysis.estimatedHires ? `${analysis.estimatedHires}명` : '-'}
              </span>
              <p className="text-xs opacity-80">채용 인원</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50'}`}>
          <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>현재 단계</span>
          <p className={`text-lg sm:text-xl font-bold mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{analysis.estimatedPhase}</p>
        </div>
        <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50'}`}>
          <span className={`text-xs sm:text-sm ${theme.textSubtle}`}>경쟁 수준</span>
          <p className={`text-lg sm:text-xl font-bold mt-1 ${darkMode ? 'text-orange-400' : 'text-orange-900'}`}>{analysis.competitionLevel}</p>
        </div>
      </div>

      <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
        <h3 className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-900'}`}>최적 지원 시기</h3>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{analysis.bestApplyTiming}</p>
      </div>

      <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
        <h3 className={`font-semibold mb-2 text-sm sm:text-base ${darkMode ? 'text-purple-400' : 'text-purple-900'}`}>시장 수요 분석</h3>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>{analysis.marketDemand}</p>
      </div>
    </div>
  );
}

// ============== 5. 검증 결과 탭 ==============
function ResultTab({ analysis, darkMode, theme }: { analysis: UserVerificationResult; darkMode: boolean; theme: ThemeColors }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 종합 점수 */}
      <div className={`text-center p-6 rounded-xl ${darkMode ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10' : 'bg-gradient-to-r from-blue-50 to-purple-50'}`}>
        <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
          {analysis.overallScore}점
        </div>
        <p className={theme.textMuted}>종합 검증 점수</p>
      </div>

      {/* 강점 */}
      {analysis.strengths?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base ${theme.text}`}>
            <span className="text-green-500"><i className="ri-checkbox-circle-fill"></i></span> 나의 강점
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {analysis.strengths.map((strength, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl ${darkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50'}`}>
                <div>
                  <h4 className={`font-medium text-sm sm:text-base ${darkMode ? 'text-green-400' : 'text-green-900'}`}>{strength.area}</h4>
                  <p className={`text-xs sm:text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{strength.detail}</p>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{strength.score}점</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 약점 */}
      {analysis.weaknesses?.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base ${theme.text}`}>
            <span className="text-amber-500"><i className="ri-alert-line"></i></span> 보완 필요 영역
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {analysis.weaknesses.map((weakness, idx) => (
              <div key={idx} className={`p-3 sm:p-4 rounded-xl ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className={`font-medium text-sm sm:text-base ${darkMode ? 'text-amber-400' : 'text-yellow-900'}`}>{weakness.area}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      weakness.priority === "HIGH"
                        ? darkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-800"
                        : weakness.priority === "MEDIUM"
                        ? darkMode ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-800"
                        : darkMode ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {weakness.priority === "HIGH" ? "높음" : weakness.priority === "MEDIUM" ? "중간" : "낮음"}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-amber-300' : 'text-yellow-800'}`}>{weakness.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 적합도 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl ${theme.statCard}`}>
          <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>가치관 적합도</h4>
          <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{analysis.valueAlignment}</p>
        </div>
        <div className={`p-4 rounded-xl ${theme.statCard}`}>
          <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>문화 적합도</h4>
          <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{analysis.cultureAlignment}</p>
        </div>
        <div className={`p-4 rounded-xl ${theme.statCard}`}>
          <h4 className={`font-medium mb-2 text-sm sm:text-base ${theme.text}`}>성장 가능성</h4>
          <p className={`text-xs sm:text-sm ${theme.textMuted}`}>{analysis.growthPotential}</p>
        </div>
      </div>
    </div>
  );
}