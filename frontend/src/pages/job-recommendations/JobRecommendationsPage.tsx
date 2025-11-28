import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobRecommendationService } from "@/lib/api";

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

interface CachedData {
  recommendations: JobRecommendation[];
  totalCount: number;
  timestamp: number;
}

const CACHE_KEY = "jobRecommendationsCache";
const CACHE_TTL = 60 * 60 * 1000; // 1시간 (밀리초)

export default function JobRecommendationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [noAnalysis, setNoAnalysis] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    loadFromCacheOrFetch();
  }, []);

  // 캐시에서 로드하거나 API 호출
  const loadFromCacheOrFetch = () => {
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached);
        const now = Date.now();
        const age = now - data.timestamp;

        // 캐시가 유효하면 사용
        if (age < CACHE_TTL && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
          setTotalCount(data.totalCount);
          setLastAnalyzedAt(new Date(data.timestamp));
          setIsFromCache(true);
          console.log("캐시에서 로드됨 (", Math.round(age / 60000), "분 전)");
          return;
        }
      } catch (e) {
        console.error("캐시 파싱 실패:", e);
      }
    }

    // 캐시가 없거나 만료된 경우 API 호출
    loadRecommendations();
  };

  // API 호출하여 새로 분석
  const loadRecommendations = async () => {
    setLoading(true);
    setIsFromCache(false);
    try {
      let analysisData = localStorage.getItem("careerAnalysis");
      const profileData = localStorage.getItem("userProfile");

      if (!analysisData) {
        console.log("샘플 데이터 사용 (개발용)");
        analysisData = JSON.stringify({
          recommendedCareers: [
            {
              careerName: "백엔드 개발자",
              description: "서버 개발 및 API 설계",
              matchScore: 85,
              reasons: ["Python 경험", "문제 해결 능력"]
            }
          ],
          strengths: ["빠른 학습 능력", "문제 해결 능력"],
          values: ["성장", "협업"],
          interests: ["웹 개발", "데이터베이스"]
        });
      }

      const careerAnalysis = JSON.parse(analysisData);
      const userProfile = profileData ? JSON.parse(profileData) : {
        skills: ["Python", "JavaScript", "React"],
        experience: "2년차"
      };

      const result = await jobRecommendationService.getRecommendations(
        1,
        careerAnalysis,
        userProfile,
        20
      );

      const newRecommendations = result.recommendations || [];
      const newTotalCount = result.totalCount || 0;
      const now = Date.now();

      setRecommendations(newRecommendations);
      setTotalCount(newTotalCount);
      setLastAnalyzedAt(new Date(now));

      const cacheData: CachedData = {
        recommendations: newRecommendations,
        totalCount: newTotalCount,
        timestamp: now
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    } catch (error: any) {
      console.error("추천 실패:", error);
      if (error.response?.status === 404) {
        setNoAnalysis(true);
      } else {
        alert(error.response?.data?.detail || "채용 공고 추천 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  if (noAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-4">채용 공고 데이터가 부족합니다</h2>
            <p className="text-gray-600 mb-6">
              먼저 채용 공고를 수집해야 AI가 분석할 수 있습니다.
            </p>
            <button
              onClick={() => navigate("/admin/crawler")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              크롤러 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">AI가 당신에게 맞는 채용 공고를 찾고 있습니다...</p>
            <p className="text-sm text-gray-400 mt-2">실시간 분석 중 (약 10~30초 소요)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
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
            </div>

            <div className="text-right">
              <button
                onClick={loadRecommendations}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <i className="ri-refresh-line"></i>
                최신 공고 확인
              </button>
              {lastAnalyzedAt && (
                <p className="text-sm text-gray-500 mt-2">
                  {isFromCache && <span className="text-green-600">[캐시] </span>}
                  마지막 분석: {formatTimeAgo(lastAnalyzedAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {isFromCache && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-time-line text-blue-600"></i>
              <span className="text-blue-800">
                저장된 추천 결과입니다. 새로운 채용공고를 확인하려면 "최신 공고 확인"을 클릭하세요.
              </span>
            </div>
            <button
              onClick={loadRecommendations}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              지금 업데이트
            </button>
          </div>
        )}

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">😔</div>
            <p className="text-gray-600">추천할 채용 공고가 없습니다</p>
            <p className="text-sm text-gray-500 mt-2">
              채용 공고 데이터를 수집하거나, 다른 키워드로 시도해보세요
            </p>
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

function JobCard({ job, rank }: { job: JobRecommendation; rank: number }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
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

          {job.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {job.description}
            </p>
          )}

          {job.reasons && job.reasons.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">추천 이유</h4>
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

          {job.strengths && job.strengths.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-green-700 mb-2">당신의 강점</h4>
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

          {job.concerns && job.concerns.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-orange-700 mb-2">고려사항</h4>
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
