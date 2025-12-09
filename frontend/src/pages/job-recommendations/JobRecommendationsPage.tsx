import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobRecommendationService, BACKEND_BASE_URL } from "@/lib/api";

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
}

interface AnalysisData {
  mbti?: string | null;
  personality?: string | Record<string, number> | null;
  values?: string | Record<string, number> | null;
  emotions?: string | Record<string, number | string> | null;
  confidenceScore?: number | null;
  createdAt?: string | null;
  summary?: string | null;
}

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

export default function JobRecommendationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

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

      // 2. 진로상담 직업추천 기반 채용공고 추천 조회 (우선)
      try {
        const careerResult = await jobRecommendationService.getRecommendationsByCareerAnalysis(userId, 20);

        if (careerResult.success && careerResult.recommendations && careerResult.recommendations.length > 0) {
          const mappedRecommendations = careerResult.recommendations.map((rec: any) => ({
            jobId: rec.id?.toString() || '',
            title: rec.title || '',
            company: rec.company || '',
            location: rec.location || null,
            url: rec.url || '',
            description: rec.description || null,
            siteName: rec.siteName || '',
            matchScore: rec.matchScore || 0,
            reasons: rec.matchReason ? [rec.matchReason] : [],
            strengths: rec.matchedCareers || [],
            concerns: [],
          }));

          setRecommendations(mappedRecommendations);
          setTotalCount(careerResult.totalCount || mappedRecommendations.length);
          setIsCached(false);
          setCalculatedAt(null);
          setLoading(false);
          return;
        }
      } catch (careerError) {
        console.log("진로상담 기반 추천 조회 실패:", careerError);
      }

      // 3. 진로상담 결과가 없으면 캐시된 추천 조회 시도 (fallback)
      try {
        const cachedResult = await jobRecommendationService.getCachedRecommendations(userId, 20);

        if (cachedResult.success && cachedResult.recommendations && cachedResult.recommendations.length > 0) {
          const mappedRecommendations = cachedResult.recommendations.map((rec: any) => ({
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
          }));

          setRecommendations(mappedRecommendations);
          setTotalCount(cachedResult.totalCount || mappedRecommendations.length);
          setIsCached(true);
          setCalculatedAt(cachedResult.calculatedAt || null);
          setLoading(false);
          return;
        }
      } catch (cacheError) {
        console.log("캐시된 추천 조회 실패:", cacheError);
      }

      // 4. 둘 다 없으면 진로상담 필요 안내
      setNoAnalysis(true);
    } catch (error: any) {
      console.error("추천 실패:", error);
      if (error.response?.status === 404) {
        setNoAnalysis(true);
      } else {
        alert(error.response?.data?.detail || error.message || "채용 공고 추천 실패");
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

  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              채용 추천을 받으려면 먼저 로그인해주세요.
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

  if (noAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold mb-4">진로상담이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              먼저 진로상담 챗봇과 대화하고 종합분석을 완료해야 맞춤 채용 추천을 받을 수 있습니다.
            </p>
            <button
              onClick={() => navigate("/career-chat")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              진로상담 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || calculating) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {calculating
                ? "AI가 당신에게 맞는 채용 공고를 분석 중입니다..."
                : "추천 정보를 불러오는 중..."}
            </p>
            {calculating && (
              <p className="text-sm text-gray-400 mt-2">
                처음 분석 시 1-2분 정도 소요될 수 있습니다
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            ← 뒤로 가기
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI 채용 공고 추천</h1>
              <p className="text-gray-600">
                당신의 진로 분석 결과를 바탕으로 {totalCount}개의 공고를 찾았습니다
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
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            {!isCached ? (
              <>
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">추천 준비 중</h3>
                <p className="text-gray-600 mb-4">
                  AI가 당신에게 맞는 채용 공고를 분석하고 있습니다.
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
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">😔</div>
                <p className="text-gray-600">추천할 채용 공고가 없습니다</p>
                <p className="text-sm text-gray-500 mt-2">
                  채용 공고 데이터를 수집하거나, 다른 키워드로 시도해보세요
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((job, index) => (
              <JobCard key={index} job={job} rank={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== 채용 공고 카드 ===== */
function JobCard({ job, rank }: { job: JobRecommendation; rank: number }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* 순위 + 매칭 점수 */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-blue-600">#{rank}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">매칭 점수</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      job.matchScore >= 80
                        ? "bg-green-500"
                        : job.matchScore >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${job.matchScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{job.matchScore}%</span>
              </div>
            </div>
          </div>

          {/* 제목 + 회사 */}
          <h3 className="text-xl font-bold text-gray-800 mb-1">{job.title}</h3>
          <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
            <span className="flex items-center">
              <i className="ri-building-line mr-1"></i>
              {job.company}
            </span>
            {job.location && (
              <span className="flex items-center">
                <i className="ri-map-pin-line mr-1"></i>
                {job.location}
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              {job.siteName}
            </span>
          </div>

          {/* 설명 */}
          {job.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {job.description}
            </p>
          )}

          {/* 추천 이유 */}
          {job.reasons && job.reasons.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                💡 추천 이유
              </h4>
              <ul className="space-y-1">
                {job.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 강점 */}
          {job.strengths && job.strengths.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-green-700 mb-2">
                ✨ 당신의 강점
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.strengths.map((strength, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 우려사항 */}
          {job.concerns && job.concerns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-orange-700 mb-2">
                ⚠️ 고려사항
              </h4>
              <ul className="space-y-1">
                {job.concerns.map((concern, idx) => (
                  <li key={idx} className="text-sm text-orange-600 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 mt-4 pt-4 border-t">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="ri-external-link-line mr-1"></i>
          공고 보기
        </a>
        <button
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <i className="ri-bookmark-line"></i>
        </button>
      </div>
    </div>
  );
}
