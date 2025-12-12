import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobRecommendationService, jobSiteService, BACKEND_BASE_URL } from "@/lib/api";
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

export default function ComprehensiveJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    "talent" | "process" | "criteria" | "status" | "result"
  >("talent");
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filteredRecommendations, setFilteredRecommendations] = useState<JobRecommendation[]>([]);

  // 전체 검색 관련 state
  const [viewMode, setViewMode] = useState<"recommendations" | "allJobs">("recommendations");
  const [allJobListings, setAllJobListings] = useState<JobRecommendation[]>([]);
  const [allJobsLoading, setAllJobsLoading] = useState(false);
  const [allJobsTotalCount, setAllJobsTotalCount] = useState(0);
  const [selectedAllJob, setSelectedAllJob] = useState<JobRecommendation | null>(null);
  const [allJobsSearchKeyword, setAllJobsSearchKeyword] = useState("");

  useEffect(() => {
    loadRecommendations();
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

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      // 1. 로그인한 사용자 ID 가져오기
      const userId = getStoredUserId();
      if (!userId) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      // 2. 백엔드에서 프로파일 분석 데이터 가져오기 (분석 여부 확인)
      const analysisResponse = await fetch(`${BACKEND_BASE_URL}/api/profiles/${userId}/analysis`);
      if (!analysisResponse.ok) {
        if (analysisResponse.status === 404) {
          setNoAnalysis(true);
          setLoading(false);
          return;
        }
        throw new Error('분석 데이터를 불러오지 못했습니다.');
      }

      // 3. 캐시된 추천 조회 시도 (빠른 응답)
      try {
        const cachedResult = await jobRecommendationService.getRecommendationsByCareerAnalysis(userId, 20);

        if (cachedResult.success && cachedResult.recommendations && cachedResult.recommendations.length > 0) {
          // 캐시된 데이터가 있으면 바로 표시
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
          if (mappedRecommendations.length > 0) {
            setSelectedJob(mappedRecommendations[0]);
          }
          setIsCached(true);
          setCalculatedAt(cachedResult.calculatedAt || null);
          setLoading(false);
          return;
        }
      } catch (cacheError) {
        console.log("캐시된 추천 조회 실패:", cacheError);
      }

      // 4. 캐시가 없으면 "준비 중" 표시 (프로파일링 시점에 이미 계산 트리거됨)
      setResult(null);
      setIsCached(false);
    } catch (error: any) {
      console.error("추천 실패:", error);
      if (error.response?.status === 404) {
        setNoAnalysis(true);
      }
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  // 추천 재계산 트리거
  const handleRecalculate = async () => {
    const userId = getStoredUserId();
    if (!userId) return;

    setCalculating(true);
    try {
      // 백그라운드에서 계산 시작
      await jobRecommendationService.triggerCalculation(userId, false);
      // 재로드
      await loadRecommendations();
    } catch (error) {
      console.error("재계산 실패:", error);
      alert("추천 재계산에 실패했습니다.");
    } finally {
      setCalculating(false);
    }
  };

  // 전체 채용 정보 검색
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

  // 전체 채용 모드로 전환 시 데이터 로드
  useEffect(() => {
    if (viewMode === "allJobs" && allJobListings.length === 0) {
      searchAllJobs();
    }
  }, [viewMode]);

  // 로그인 필요
  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              종합 채용 분석을 받으려면 먼저 로그인해주세요.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-4">프로파일 분석이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              먼저 프로파일 분석을 완료해야 종합 채용 분석을 받을 수 있습니다.
            </p>
            <button
              onClick={() => navigate("/profile/input")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">
              {calculating
                ? "AI가 6가지 종합 채용 분석을 수행하고 있습니다..."
                : "추천 정보를 불러오는 중..."}
            </p>
            {calculating && (
              <p className="text-sm text-gray-500 mt-2">
                인재상, 채용 프로세스, 검증 기준, 합격 예측 등을 분석합니다
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 캐시 없음 - 준비 중
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">종합 분석 준비 중</h3>
            <p className="text-gray-600 mb-4">
              AI가 당신에게 맞는 채용 공고를 종합 분석하고 있습니다.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              백그라운드에서 분석 중이며, 1-2분 후 새로고침하면 결과를 확인할 수 있습니다.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI 종합 채용 분석</h1>
              <p className="mt-2 text-gray-600">
                채용 공고별 6가지 맞춤 분석으로 합격 가능성을 높이세요
              </p>
              {isCached && calculatedAt && (
                <p className="text-sm text-gray-400 mt-1">
                  마지막 분석: {new Date(calculatedAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            <button
              onClick={handleRecalculate}
              disabled={calculating}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {calculating ? '분석 중...' : '다시 분석'}
            </button>
          </div>

          {/* 보기 모드 탭 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode("recommendations")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "recommendations"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              맞춤 추천 ({result?.totalCount || 0})
            </button>
            <button
              onClick={() => setViewMode("allJobs")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "allJobs"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체 채용공고 ({allJobsTotalCount})
            </button>
          </div>
        </div>

        {/* 전체 요약 - 추천 모드에서만 */}
        {viewMode === "recommendations" && result.summary && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-6 mb-6 text-white">
            <p className="text-lg mb-3">{result.summary.message}</p>
            {result.summary.topRecommendation && (
              <div className="bg-white/20 rounded-lg p-4 mb-3">
                <p className="font-semibold">
                  Top 추천: {result.summary.topRecommendation.company}
                </p>
                <p className="text-sm opacity-90">
                  {result.summary.topRecommendation.reason}
                </p>
              </div>
            )}
            {result.summary.insights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.summary.insights.map((insight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm"
                  >
                    {insight}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 채용 공고 목록 (좌측) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              {viewMode === "recommendations" ? (
                <>
                  <h2 className="font-semibold text-gray-900 mb-3">
                    추천 공고 ({filteredRecommendations.length}개)
                  </h2>

                  {/* 추천 목록 내 필터 검색 */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="추천 목록에서 검색..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[550px] overflow-y-auto">
                    {filteredRecommendations.length === 0 && searchKeyword ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>'{searchKeyword}'에 대한 검색 결과가 없습니다.</p>
                      </div>
                    ) : filteredRecommendations.map((job) => (
                      <div
                        key={job.jobId}
                        onClick={() => setSelectedJob(job)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedJob?.jobId === job.jobId
                            ? "bg-blue-50 border-2 border-blue-500"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {job.title}
                            </h3>
                            <p className="text-sm text-gray-600">{job.company}</p>
                            {job.location && (
                              <p className="text-xs text-gray-500">{job.location}</p>
                            )}
                          </div>
                          <div className="ml-2 text-right">
                            <div
                              className={`text-lg font-bold ${
                                job.matchScore >= 80
                                  ? "text-green-600"
                                  : job.matchScore >= 60
                                  ? "text-blue-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {job.matchScore}점
                            </div>
                            <p className="text-xs text-gray-500">매칭</p>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* 전체 채용공고 모드 */
                <>
                  <h2 className="font-semibold text-gray-900 mb-3">
                    전체 채용공고 ({allJobsTotalCount}개)
                  </h2>

                  {/* DB 검색 입력 */}
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
                      className="w-full px-4 py-2 pl-10 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      검색
                    </button>
                  </form>

                  {allJobsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[550px] overflow-y-auto">
                      {allJobListings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>채용 정보가 없습니다.</p>
                        </div>
                      ) : allJobListings.map((job) => (
                        <div
                          key={job.jobId}
                          onClick={() => setSelectedAllJob(job)}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedAllJob?.jobId === job.jobId
                              ? "bg-blue-50 border-2 border-blue-500"
                              : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {job.title}
                              </h3>
                              <p className="text-sm text-gray-600">{job.company}</p>
                              {job.location && (
                                <p className="text-xs text-gray-500">{job.location}</p>
                              )}
                            </div>
                            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
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
                <div className="bg-white rounded-lg shadow">
                {/* 선택된 공고 헤더 */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedJob.title}
                      </h2>
                      <p className="text-gray-600">{selectedJob.company}</p>
                      {selectedJob.location && (
                        <p className="text-sm text-gray-500">{selectedJob.location}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsApplicationModalOpen(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <span>✍️</span>
                        지원서 작성
                      </button>
                      <a
                        href={selectedJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        지원하기
                      </a>
                    </div>
                  </div>
                </div>

                {/* 5가지 분석 탭 */}
                <div className="border-b border-gray-200">
                  <nav className="flex overflow-x-auto">
                    {[
                      { id: "talent", label: "인재상", icon: "👤" },
                      { id: "process", label: "채용 프로세스", icon: "📋" },
                      { id: "criteria", label: "검증 기준", icon: "✅" },
                      { id: "status", label: "채용 현황", icon: "📊" },
                      { id: "result", label: "검증 결과", icon: "📝" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveAnalysisTab(tab.id as any)}
                        className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeAnalysisTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* 탭 컨텐츠 */}
                <div className="p-6">
                  {selectedJob.comprehensiveAnalysis && (
                    <>
                      {activeAnalysisTab === "talent" && (
                        <TalentTab analysis={selectedJob.comprehensiveAnalysis.idealTalent} />
                      )}
                      {activeAnalysisTab === "process" && (
                        <ProcessTab analysis={selectedJob.comprehensiveAnalysis.hiringProcess} />
                      )}
                      {activeAnalysisTab === "criteria" && (
                        <CriteriaTab analysis={selectedJob.comprehensiveAnalysis.verificationCriteria} />
                      )}
                      {activeAnalysisTab === "status" && (
                        <StatusTab analysis={selectedJob.comprehensiveAnalysis.hiringStatus} />
                      )}
                      {activeAnalysisTab === "result" && (
                        <ResultTab analysis={selectedJob.comprehensiveAnalysis.userVerificationResult} />
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                좌측에서 채용 공고를 선택하세요
              </div>
            )
          ) : (
              /* 전체 채용공고 모드 상세 보기 */
              selectedAllJob ? (
                <div className="bg-white rounded-lg shadow">
                  {/* 선택된 공고 헤더 */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedAllJob.title}
                        </h2>
                        <p className="text-gray-600">{selectedAllJob.company}</p>
                        {selectedAllJob.location && (
                          <p className="text-sm text-gray-500">{selectedAllJob.location}</p>
                        )}
                        {selectedAllJob.siteName && (
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {selectedAllJob.siteName}
                          </span>
                        )}
                      </div>
                      <a
                        href={selectedAllJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        지원하기
                      </a>
                    </div>
                  </div>

                  {/* 상세 정보 */}
                  <div className="p-6">
                    {selectedAllJob.description ? (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">채용 상세</h3>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {selectedAllJob.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>상세 정보가 없습니다.</p>
                        <a
                          href={selectedAllJob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-4 text-blue-600 hover:underline"
                        >
                          원본 공고에서 확인하기 →
                        </a>
                      </div>
                    )}

                    {/* 안내 메시지 */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 이 채용공고에 대한 AI 분석을 받으려면 "맞춤 추천" 탭에서 프로파일 기반 추천을 확인하세요.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
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
function TalentTab({ analysis }: { analysis: IdealTalent }) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">이 기업이 원하는 인재</h3>
        <p className="text-blue-800">{analysis.summary}</p>
      </div>

      {analysis.coreValues?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">핵심 가치</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.coreValues.map((value, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.keyTraits?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">원하는 특성</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {analysis.keyTraits.map((trait, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-green-500">✓</span>
                <span>{trait}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">당신과의 적합도</h3>
        <p className="text-green-800">{analysis.fitWithUser}</p>
      </div>
    </div>
  );
}

// ============== 2. 채용 프로세스 탭 ==============
function ProcessTab({ analysis }: { analysis: HiringProcess }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
        <div>
          <span className="text-sm text-gray-600">채용 유형</span>
          <p className="font-semibold text-blue-900">{analysis.processType}</p>
        </div>
        <div className="border-l border-blue-200 pl-4">
          <span className="text-sm text-gray-600">예상 기간</span>
          <p className="font-semibold text-blue-900">{analysis.estimatedDuration}</p>
        </div>
      </div>

      {analysis.expectedSteps?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">예상 채용 절차</h3>
          <div className="space-y-4">
            {analysis.expectedSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  {step.tips && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                      Tip: {step.tips}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">맞춤 준비 조언</h3>
        <p className="text-green-800">{analysis.userPreparationAdvice}</p>
      </div>
    </div>
  );
}

// ============== 3. 검증 기준 탭 ==============
function CriteriaTab({ analysis }: { analysis: VerificationCriteria }) {
  return (
    <div className="space-y-6">
      {/* 학력 기준 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">학력 기준</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">선호 전공</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.academicCriteria.preferredMajors.map((major, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  {major}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">최소 학점</span>
            <p className="font-medium">{analysis.academicCriteria.minimumGPA}</p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded">
          <span className="text-sm text-blue-800">당신의 평가: {analysis.academicCriteria.userGPAAssessment}</span>
        </div>
      </div>

      {/* 역량 기준 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">역량 기준</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <span className="text-red-500">*</span> 필수 역량
            </span>
            <ul className="mt-1 space-y-1">
              {analysis.skillCriteria.essential.map((skill, idx) => (
                <li key={idx} className="text-sm">{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-sm text-gray-600">우대 역량</span>
            <ul className="mt-1 space-y-1">
              {analysis.skillCriteria.preferred.map((skill, idx) => (
                <li key={idx} className="text-sm text-gray-700">{skill}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-50 rounded">
          <span className="text-sm text-green-800">{analysis.skillCriteria.userSkillMatch}</span>
        </div>
      </div>

      {/* 경력 기준 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">경력 기준</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">최소 경력</span>
            <p className="font-medium">{analysis.experienceCriteria.minimumYears}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">선호 배경</span>
            <p className="font-medium">{analysis.experienceCriteria.preferredBackground}</p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-purple-50 rounded">
          <span className="text-sm text-purple-800">{analysis.experienceCriteria.userExperienceAssessment}</span>
        </div>
      </div>
    </div>
  );
}

// ============== 4. 채용 현황 탭 ==============
function StatusTab({ analysis }: { analysis: HiringStatus }) {
  return (
    <div className="space-y-6">
      {/* 경쟁률 하이라이트 */}
      <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white">
        <div className="text-center">
          <span className="text-sm opacity-90">
            {analysis.estimatedApplicants ? '현재 지원자 기준 경쟁률' : '예상 경쟁률'}
          </span>
          <p className="text-4xl font-bold mt-1">{analysis.competitionRatio || analysis.competitionLevel}</p>
          {!analysis.estimatedApplicants && (
            <p className="text-xs opacity-70 mt-1">* 유사 공고 기반 추정치</p>
          )}
          <div className="flex justify-center gap-8 mt-4">
            <div>
              <span className="text-2xl font-semibold">
                {analysis.estimatedApplicants ? `${analysis.estimatedApplicants}명` : '-'}
              </span>
              <p className="text-xs opacity-80">
                {analysis.estimatedApplicants ? '현재 지원자' : '지원자 정보 없음'}
              </p>
            </div>
            <div className="border-l border-white/30 pl-8">
              <span className="text-2xl font-semibold">
                {analysis.estimatedHires ? `${analysis.estimatedHires}명` : '-'}
              </span>
              <p className="text-xs opacity-80">채용 인원</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">현재 단계</span>
          <p className="text-xl font-bold text-blue-900 mt-1">{analysis.estimatedPhase}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">경쟁 수준</span>
          <p className="text-xl font-bold text-orange-900 mt-1">{analysis.competitionLevel}</p>
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">최적 지원 시기</h3>
        <p className="text-green-800">{analysis.bestApplyTiming}</p>
      </div>

      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">시장 수요 분석</h3>
        <p className="text-purple-800">{analysis.marketDemand}</p>
      </div>
    </div>
  );
}

// ============== 5. 검증 결과 탭 ==============
function ResultTab({ analysis }: { analysis: UserVerificationResult }) {
  return (
    <div className="space-y-6">
      {/* 종합 점수 */}
      <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="text-5xl font-bold text-blue-600 mb-2">
          {analysis.overallScore}점
        </div>
        <p className="text-gray-600">종합 검증 점수</p>
      </div>

      {/* 강점 */}
      {analysis.strengths?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-green-500">✓</span> 나의 강점
          </h3>
          <div className="space-y-3">
            {analysis.strengths.map((strength, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-green-900">{strength.area}</h4>
                  <p className="text-sm text-green-700">{strength.detail}</p>
                </div>
                <div className="text-2xl font-bold text-green-600">{strength.score}점</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 약점 */}
      {analysis.weaknesses?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-yellow-500">!</span> 보완 필요 영역
          </h3>
          <div className="space-y-3">
            {analysis.weaknesses.map((weakness, idx) => (
              <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-yellow-900">{weakness.area}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      weakness.priority === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : weakness.priority === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {weakness.priority === "HIGH" ? "높음" : weakness.priority === "MEDIUM" ? "중간" : "낮음"}
                  </span>
                </div>
                <p className="text-sm text-yellow-800">{weakness.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 적합도 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">가치관 적합도</h4>
          <p className="text-sm text-gray-700">{analysis.valueAlignment}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">문화 적합도</h4>
          <p className="text-sm text-gray-700">{analysis.cultureAlignment}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">성장 가능성</h4>
          <p className="text-sm text-gray-700">{analysis.growthPotential}</p>
        </div>
      </div>
    </div>
  );
}

