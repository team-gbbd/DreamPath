import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jobRecommendationService } from "@/lib/api";

// 타입 정의
interface RequiredTechnology {
  name: string;
  category: string;
  importance: string;
  description?: string;
}

interface ExamSchedule {
  year?: string;
  round?: string;
  docRegStart?: string;
  docRegEnd?: string;
  docExamStart?: string;
  docPassDt?: string;
  pracRegStart?: string;
  pracExamStart?: string;
  pracPassDt?: string;
}

interface RequiredCertification {
  name: string;
  code?: string;
  issuer: string;
  importance: string;
  difficulty: string;
  estimatedPrepTime?: string;
  description?: string;
  // Q-net API 추가 정보
  seriesName?: string;  // 계열 (정보통신, 기계 등)
  obligFldName?: string;  // 직무분야
  qualTypeName?: string;  // 등급 (기사, 산업기사 등)
  summary?: string;
  career?: string;  // 관련 진로
  trend?: string;  // 동향
  nextExam?: ExamSchedule;  // 다음 시험 일정
  isFromQnet?: boolean;
}

interface LearningResource {
  name: string;
  type: string;
  url?: string;
  description?: string;
}

interface JobWithRequirements {
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
  requiredTechnologies: RequiredTechnology[];
  requiredCertifications: RequiredCertification[];
  learningResources: LearningResource[];
  skillGap: string[];
}

interface RecommendationResult {
  recommendations: JobWithRequirements[];
  totalCount: number;
  commonRequiredTechnologies: RequiredTechnology[];
  commonRequiredCertifications: RequiredCertification[];
  overallLearningPath: string[];
}

export default function JobWithRequirementsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "summary">("jobs");

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      // localStorage에서 진로 분석 결과 가져오기
      let analysisData = localStorage.getItem("careerAnalysis");
      const profileData = localStorage.getItem("userProfile");
      const skillsData = localStorage.getItem("userSkills");

      // 개발용 샘플 데이터
      if (!analysisData) {
        analysisData = JSON.stringify({
          recommendedCareers: [
            {
              careerName: "백엔드 개발자",
              description: "서버 개발 및 API 설계",
              matchScore: 85,
              reasons: ["Python 경험", "문제 해결 능력"],
            },
          ],
          strengths: ["빠른 학습 능력", "문제 해결 능력"],
          values: ["성장", "협업"],
          interests: ["웹 개발", "데이터베이스"],
        });
      }

      const careerAnalysis = JSON.parse(analysisData);
      const userProfile = profileData
        ? JSON.parse(profileData)
        : { skills: ["Python", "JavaScript"], experience: "신입" };
      const userSkills = skillsData
        ? JSON.parse(skillsData)
        : ["Python", "JavaScript", "React"];

      // AI 추천 요청 (기술/자격증 포함)
      const data = await jobRecommendationService.getRecommendationsWithRequirements(
        1,
        careerAnalysis,
        userProfile,
        userSkills,
        15
      );

      setResult(data);
    } catch (error: any) {
      console.error("추천 실패:", error);
      alert(error.response?.data?.detail || "채용 공고 추천 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              AI가 채용 공고와 필요 기술/자격증을 분석하고 있습니다...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              약간의 시간이 소요될 수 있습니다
            </p>
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
          <h1 className="text-3xl font-bold mb-2">
            AI 채용 공고 + 필요 기술/자격증 추천
          </h1>
          <p className="text-gray-600">
            당신에게 맞는 채용 공고와 함께 필요한 기술 스택, 자격증을 분석합니다
          </p>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "jobs"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            채용 공고 ({result?.totalCount || 0})
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            종합 분석
          </button>
        </div>

        {activeTab === "summary" && result && (
          <SummarySection result={result} />
        )}

        {activeTab === "jobs" && result && (
          <div className="space-y-6">
            {result.recommendations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">추천할 채용 공고가 없습니다</p>
              </div>
            ) : (
              result.recommendations.map((job, index) => (
                <JobCardWithRequirements
                  key={job.jobId}
                  job={job}
                  rank={index + 1}
                  isExpanded={expandedJob === job.jobId}
                  onToggle={() =>
                    setExpandedJob(expandedJob === job.jobId ? null : job.jobId)
                  }
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== 종합 분석 섹션 ===== */
function SummarySection({ result }: { result: RecommendationResult }) {
  return (
    <div className="space-y-6">
      {/* 학습 경로 */}
      {result.overallLearningPath.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">📚</span> 추천 학습 경로
          </h2>
          <div className="space-y-3">
            {result.overallLearningPath.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <p className="text-gray-700 flex-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공통 필요 기술 */}
      {result.commonRequiredTechnologies.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">💻</span> 채용 시장에서 가장 많이 요구하는 기술
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.commonRequiredTechnologies.map((tech, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-purple-800">{tech.name}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      tech.importance === "필수"
                        ? "bg-red-100 text-red-700"
                        : tech.importance === "우대"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {tech.importance}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{tech.category}</p>
                {tech.description && (
                  <p className="text-xs text-gray-500 mt-1">{tech.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공통 필요 자격증 (Q-net API 연동) */}
      {result.commonRequiredCertifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">📜</span> 추천 자격증
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Q-net 연동
            </span>
          </h2>
          <div className="space-y-4">
            {result.commonRequiredCertifications.map((cert, index) => (
              <CertificationCard key={index} cert={cert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 자격증 카드 (Q-net API 연동) ===== */
function CertificationCard({ cert }: { cert: RequiredCertification }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-800">{cert.name}</span>
          {cert.isFromQnet && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">
              Q-net
            </span>
          )}
          {cert.qualTypeName && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {cert.qualTypeName}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              cert.difficulty === "고급"
                ? "bg-red-100 text-red-700"
                : cert.difficulty === "중급"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {cert.difficulty}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              cert.importance === "필수"
                ? "bg-red-100 text-red-700"
                : cert.importance === "추천"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {cert.importance}
          </span>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
        <span>발급: {cert.issuer}</span>
        {cert.seriesName && <span>| 계열: {cert.seriesName}</span>}
        {cert.obligFldName && <span>| 분야: {cert.obligFldName}</span>}
      </div>

      {/* 요약 */}
      {cert.summary && (
        <p className="text-sm text-gray-600 mb-2">{cert.summary}</p>
      )}

      {/* 시험 일정 (Q-net 데이터) */}
      {cert.nextExam && cert.nextExam.docRegStart && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
          <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
            <span className="mr-1">📅</span>
            {cert.nextExam.year}년 {cert.nextExam.round}회 시험 일정
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">필기 접수:</span>
              <p className="font-medium">
                {cert.nextExam.docRegStart} ~ {cert.nextExam.docRegEnd}
              </p>
            </div>
            <div>
              <span className="text-gray-500">필기 시험:</span>
              <p className="font-medium">{cert.nextExam.docExamStart}</p>
            </div>
            {cert.nextExam.pracRegStart && (
              <>
                <div>
                  <span className="text-gray-500">실기 접수:</span>
                  <p className="font-medium">{cert.nextExam.pracRegStart}</p>
                </div>
                <div>
                  <span className="text-gray-500">실기 시험:</span>
                  <p className="font-medium">{cert.nextExam.pracExamStart}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 상세 정보 토글 */}
      {(cert.career || cert.trend) && (
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="mt-2 text-sm text-green-600 hover:text-green-700"
        >
          {showDetail ? "접기 ▲" : "상세 정보 ▼"}
        </button>
      )}

      {/* 상세 정보 */}
      {showDetail && (
        <div className="mt-3 pt-3 border-t border-green-200 space-y-2 text-sm">
          {cert.career && (
            <div>
              <span className="font-medium text-gray-700">관련 진로: </span>
              <span className="text-gray-600">{cert.career}</span>
            </div>
          )}
          {cert.trend && (
            <div>
              <span className="font-medium text-gray-700">동향: </span>
              <span className="text-gray-600">{cert.trend}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== 채용 공고 카드 (기술/자격증 포함) ===== */
function JobCardWithRequirements({
  job,
  rank,
  isExpanded,
  onToggle,
}: {
  job: JobWithRequirements;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 기본 정보 */}
      <div className="p-6">
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
              <span>{job.company}</span>
              {job.location && <span>| {job.location}</span>}
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {job.siteName}
              </span>
            </div>

            {/* 추천 이유 */}
            {job.reasons.length > 0 && (
              <div className="mb-3">
                <ul className="flex flex-wrap gap-2">
                  {job.reasons.slice(0, 3).map((reason, idx) => (
                    <li
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 부족한 스킬 (skillGap) */}
            {job.skillGap.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-orange-600 font-medium">
                  학습 필요:
                </span>
                {job.skillGap.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 더보기 버튼 */}
        <button
          onClick={onToggle}
          className="w-full text-center py-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? "접기 ▲" : "필요 기술/자격증 보기 ▼"}
        </button>
      </div>

      {/* 확장 영역: 필요 기술/자격증 */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 필요 기술 */}
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">💻</span> 필요 기술
              </h4>
              {job.requiredTechnologies.length > 0 ? (
                <div className="space-y-2">
                  {job.requiredTechnologies.map((tech, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div>
                        <span className="font-medium text-gray-800">
                          {tech.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({tech.category})
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tech.importance === "필수"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {tech.importance}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">분석된 기술이 없습니다</p>
              )}
            </div>

            {/* 필요 자격증 */}
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">📜</span> 필요 자격증
              </h4>
              {job.requiredCertifications.length > 0 ? (
                <div className="space-y-2">
                  {job.requiredCertifications.map((cert, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {cert.name}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            cert.importance === "필수"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {cert.importance}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {cert.issuer} | 난이도: {cert.difficulty}
                        {cert.estimatedPrepTime &&
                          ` | 준비 기간: ${cert.estimatedPrepTime}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  분석된 자격증이 없습니다
                </p>
              )}
            </div>
          </div>

          {/* 학습 자료 */}
          {job.learningResources.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">📚</span> 추천 학습 자료
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.learningResources.map((resource, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 bg-white rounded border text-sm"
                  >
                    <span className="font-medium">{resource.name}</span>
                    <span className="text-gray-500 ml-2">({resource.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 공고 보기 버튼 */}
          <div className="mt-6 pt-4 border-t">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              채용 공고 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
