import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jobRecommendationService, companyTalentService } from "@/lib/api";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "summary">("jobs");

  // 메인 탭: 채용공고 / 종합분석
  const mainTab = searchParams.get("tab") || "jobs";
  const setMainTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (mainTab === "jobs") {
      loadRecommendations();
    }
  }, [mainTab]);

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

  if (loading && mainTab === "jobs") {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-8">
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
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI 채용 추천</h1>
          <p className="mt-2 text-gray-600">
            맞춤 채용 공고와 종합 분석을 확인하세요
          </p>
        </div>

        {/* 메인 탭: 채용공고 / 종합분석 */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setMainTab("jobs")}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              mainTab === "jobs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            채용공고
          </button>
          <button
            onClick={() => setMainTab("comprehensive")}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              mainTab === "comprehensive"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            종합분석
          </button>
        </div>

        {/* 채용공고 탭 */}
        {mainTab === "jobs" && (
          <>
            {/* 서브 탭 메뉴 */}
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
                기술/자격증 요약
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
          </>
        )}

        {/* 종합분석 탭 */}
        {mainTab === "comprehensive" && (
          <ComprehensiveAnalysisTab />
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

/* ===== 종합분석 탭 컴포넌트 ===== */
function ComprehensiveAnalysisTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    "talent" | "process" | "criteria" | "status" | "result"
  >("talent");

  useEffect(() => {
    loadComprehensiveAnalysis();
  }, []);

  const loadComprehensiveAnalysis = async () => {
    setLoading(true);
    try {
      let analysisData = localStorage.getItem("careerAnalysis");
      const profileData = localStorage.getItem("userProfile");
      const skillsData = localStorage.getItem("userSkills");

      if (!analysisData) {
        analysisData = JSON.stringify({
          recommendedCareers: [{ careerName: "백엔드 개발자", matchScore: 85 }],
          strengths: ["문제 해결 능력", "논리적 사고"],
          values: ["성장", "안정성"],
          interests: ["웹 개발", "데이터베이스"],
        });
      }

      const careerAnalysis = JSON.parse(analysisData);
      const userProfile = profileData
        ? JSON.parse(profileData)
        : { education: "컴퓨터공학과", gpa: "3.5/4.5", experience: "인턴 3개월" };
      const userSkills = skillsData
        ? JSON.parse(skillsData)
        : ["Python", "Java", "Spring", "React"];

      const response = await companyTalentService.getComprehensiveRecommendations(
        1,
        careerAnalysis,
        userProfile,
        userSkills,
        10
      );

      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.recommendations?.length > 0) {
          setSelectedJob(response.data.recommendations[0]);
        }
      }
    } catch (error: any) {
      console.error("종합분석 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">
          AI가 6가지 종합 채용 분석을 수행하고 있습니다...
        </p>
        <p className="text-sm text-gray-500 mt-2">
          인재상, 채용 프로세스, 검증 기준, 합격 예측 등을 분석합니다
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center text-gray-500 py-12">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* 전체 요약 */}
      {result.summary && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow p-6 mb-6 text-white">
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
              {result.summary.insights.map((insight: string, idx: number) => (
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
            <h2 className="font-semibold text-gray-900 mb-4">
              추천 공고 ({result.totalCount}개)
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {result.recommendations?.map((job: any) => (
                <div
                  key={job.jobId}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedJob?.jobId === job.jobId
                      ? "bg-purple-50 border-2 border-purple-500"
                      : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {job.title}
                      </h3>
                      <p className="text-sm text-gray-600">{job.company}</p>
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
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상세 분석 (우측) */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedJob.title}
                    </h2>
                    <p className="text-gray-600">{selectedJob.company}</p>
                  </div>
                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    지원하기
                  </a>
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
                          ? "border-purple-500 text-purple-600"
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
                      <TalentAnalysis analysis={selectedJob.comprehensiveAnalysis.idealTalent} />
                    )}
                    {activeAnalysisTab === "process" && (
                      <ProcessAnalysis analysis={selectedJob.comprehensiveAnalysis.hiringProcess} />
                    )}
                    {activeAnalysisTab === "criteria" && (
                      <CriteriaAnalysis analysis={selectedJob.comprehensiveAnalysis.verificationCriteria} />
                    )}
                    {activeAnalysisTab === "status" && (
                      <StatusAnalysis analysis={selectedJob.comprehensiveAnalysis.hiringStatus} />
                    )}
                    {activeAnalysisTab === "result" && (
                      <ResultAnalysis analysis={selectedJob.comprehensiveAnalysis.userVerificationResult} />
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              좌측에서 채용 공고를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== 인재상 분석 ===== */
function TalentAnalysis({ analysis }: { analysis: any }) {
  if (!analysis) return <div className="text-gray-500">분석 데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">이 기업이 원하는 인재</h3>
        <p className="text-purple-800">{analysis.summary}</p>
      </div>

      {analysis.coreValues?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">핵심 가치</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.coreValues.map((value: string, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full">
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
            {analysis.keyTraits.map((trait: string, idx: number) => (
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

/* ===== 채용 프로세스 분석 ===== */
function ProcessAnalysis({ analysis }: { analysis: any }) {
  if (!analysis) return <div className="text-gray-500">분석 데이터가 없습니다.</div>;

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
            {analysis.expectedSteps.map((step: any, idx: number) => (
              <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  {step.tips && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                      💡 Tip: {step.tips}
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

/* ===== 검증 기준 분석 ===== */
function CriteriaAnalysis({ analysis }: { analysis: any }) {
  if (!analysis) return <div className="text-gray-500">분석 데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      {/* 학력 기준 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">학력 기준</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">선호 전공</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.academicCriteria?.preferredMajors?.map((major: string, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  {major}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">최소 학점</span>
            <p className="font-medium">{analysis.academicCriteria?.minimumGPA}</p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded">
          <span className="text-sm text-blue-800">당신의 평가: {analysis.academicCriteria?.userGPAAssessment}</span>
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
              {analysis.skillCriteria?.essential?.map((skill: string, idx: number) => (
                <li key={idx} className="text-sm">{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-sm text-gray-600">우대 역량</span>
            <ul className="mt-1 space-y-1">
              {analysis.skillCriteria?.preferred?.map((skill: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-700">{skill}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-50 rounded">
          <span className="text-sm text-green-800">{analysis.skillCriteria?.userSkillMatch}</span>
        </div>
      </div>

      {/* 경력 기준 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">경력 기준</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">최소 경력</span>
            <p className="font-medium">{analysis.experienceCriteria?.minimumYears}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">선호 배경</span>
            <p className="font-medium">{analysis.experienceCriteria?.preferredBackground}</p>
          </div>
        </div>
        <div className="mt-3 p-2 bg-purple-50 rounded">
          <span className="text-sm text-purple-800">{analysis.experienceCriteria?.userExperienceAssessment}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== 채용 현황 분석 ===== */
function StatusAnalysis({ analysis }: { analysis: any }) {
  if (!analysis) return <div className="text-gray-500">분석 데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">현재 단계</span>
          <p className="text-xl font-bold text-blue-900 mt-1">{analysis.estimatedPhase}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center">
          <span className="text-sm text-gray-600">예상 경쟁률</span>
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

/* ===== 검증 결과 분석 ===== */
function ResultAnalysis({ analysis }: { analysis: any }) {
  if (!analysis) return <div className="text-gray-500">분석 데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <div className="text-5xl font-bold text-purple-600 mb-2">
          {analysis.overallScore}점
        </div>
        <p className="text-gray-600">종합 검증 점수</p>
      </div>

      {analysis.strengths?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-green-500">✓</span> 나의 강점
          </h3>
          <div className="space-y-3">
            {analysis.strengths.map((strength: any, idx: number) => (
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

      {analysis.weaknesses?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-yellow-500">!</span> 보완 필요 영역
          </h3>
          <div className="space-y-3">
            {analysis.weaknesses.map((weakness: any, idx: number) => (
              <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-yellow-900">{weakness.area}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      weakness.priority === "HIGH"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {weakness.priority === "HIGH" ? "높음" : "중간"}
                  </span>
                </div>
                <p className="text-sm text-yellow-800">{weakness.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

