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

export default function PersonalizedInsightsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<CareerInsight[]>([]);
  const [overallRecommendation, setOverallRecommendation] = useState("");
  const [noAnalysis, setNoAnalysis] = useState(false);

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-4">진로 분석이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              먼저 AI 진로 상담을 통해 당신의 커리어 분석을 받아보세요.
            </p>
            <button
              onClick={() => navigate("/career-chat")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">AI가 당신의 커리어를 분석하고 있습니다...</p>
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
            onClick={() => navigate("/job-analysis")}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            ← 채용 공고 분석으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold mb-2">맞춤형 커리어 인사이트</h1>
          <p className="text-gray-600">
            당신의 진로 분석 결과를 바탕으로 현재 채용 시장을 분석했습니다
          </p>
        </div>

        {/* 종합 추천 */}
        {overallRecommendation && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              💡 종합 추천
            </h3>
            <p className="text-blue-800">{overallRecommendation}</p>
          </div>
        )}

        {/* 직업별 인사이트 */}
        <div className="space-y-6">
          {insights.map((insight, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              {/* 직업 헤더 */}
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {insight.careerName}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      최근 채용 공고 {insight.jobCount}개 분석
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">경쟁력</div>
                    <div
                      className={`text-xl font-bold ${
                        insight.competitiveness === "상"
                          ? "text-green-600"
                          : insight.competitiveness === "중"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {insight.competitiveness}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* 부족한 스킬 */}
                <div>
                  <h3 className="font-semibold text-red-700 mb-3 flex items-center">
                    <span className="mr-2">⚠️</span>
                    보완이 필요한 스킬
                  </h3>
                  {insight.gapAnalysis.length > 0 ? (
                    <ul className="space-y-2">
                      {insight.gapAnalysis.map((gap, idx) => (
                        <li
                          key={idx}
                          className="flex items-start bg-red-50 p-3 rounded-lg"
                        >
                          <span className="text-red-600 mr-2">•</span>
                          <span className="text-red-800">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">
                      현재 요구사항을 충분히 만족합니다
                    </p>
                  )}
                </div>

                {/* 학습 경로 */}
                <div>
                  <h3 className="font-semibold text-blue-700 mb-3 flex items-center">
                    <span className="mr-2">📚</span>
                    추천 학습 경로
                  </h3>
                  <ol className="space-y-2">
                    {insight.learningPath.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start bg-blue-50 p-3 rounded-lg"
                      >
                        <span className="text-blue-600 font-semibold mr-3">
                          {idx + 1}.
                        </span>
                        <span className="text-blue-800">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* 추천사항 */}
              {insight.recommendations.length > 0 && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <span className="mr-2">💬</span>
                    전문가 조언
                  </h3>
                  <ul className="space-y-1">
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-yellow-800">
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
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate("/learning")}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            학습 경로 만들기
          </button>
          <button
            onClick={() => navigate("/job-listings")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            채용 공고 보기
          </button>
        </div>
      </div>
    </div>
  );
}
