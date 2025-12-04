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

export default function JobRecommendationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [noAnalysis, setNoAnalysis] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      // localStorage에서 진로 분석 결과 가져오기
      let analysisData = localStorage.getItem("careerAnalysis");
      const profileData = localStorage.getItem("userProfile");

      // 개발용 샘플 데이터
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

      // AI 추천 요청
      const result = await jobRecommendationService.getRecommendations(
        1, // userId (개발용)
        careerAnalysis,
        userProfile,
        20
      );

      setRecommendations(result.recommendations || []);
      setTotalCount(result.totalCount || 0);
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
          <h1 className="text-3xl font-bold mb-2">AI 채용 공고 추천</h1>
          <p className="text-gray-600">
            당신의 진로 분석 결과를 바탕으로 {totalCount}개의 공고를 찾았습니다
          </p>
        </div>

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
