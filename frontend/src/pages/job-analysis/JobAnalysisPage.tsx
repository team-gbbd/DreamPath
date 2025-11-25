import { useState } from "react";
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

export default function JobAnalysisPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"trends" | "skills" | "salary">("trends");
  const [careerField, setCareerField] = useState("");
  const [loading, setLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [skillsData, setSkillsData] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any>(null);

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">채용 공고 분석 AI</h1>

          {/* 개발용 바로가기 */}
          <button
            onClick={() => navigate('/job-analysis/personalized')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            🚀 맞춤형 인사이트 (개발용)
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="직무 분야 입력 (예: 개발자, 백엔드, 디자이너)"
              className="flex-1 px-4 py-2 border rounded-lg"
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "분석 중..." : "분석하기"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            * 비워두면 전체 시장을 분석합니다
          </p>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 font-medium ${
                activeTab === "trends"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("trends")}
            >
              시장 트렌드
            </button>
            <button
              className={`flex-1 py-4 font-medium ${
                activeTab === "skills"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("skills")}
            >
              스킬 요구사항
            </button>
            <button
              className={`flex-1 py-4 font-medium ${
                activeTab === "salary"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("salary")}
            >
              연봉 트렌드
            </button>
          </div>

          {/* 탭 내용 */}
          <div className="p-6">
            {activeTab === "trends" && (
              <TrendsTab data={trendsData} loading={loading} />
            )}
            {activeTab === "skills" && (
              <SkillsTab data={skillsData} loading={loading} />
            )}
            {activeTab === "salary" && (
              <SalaryTab data={salaryData} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== 시장 트렌드 탭 ===== */
function TrendsTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="text-center py-12">분석 중...</div>;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* 기본 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="분석 기간" value={data.period} />
        <StatCard label="분야" value={data.careerField} />
        <StatCard label="총 채용 공고" value={`${data.totalJobs}개`} />
      </div>

      {/* 요약 */}
      {data.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">요약</h3>
          <p className="text-blue-800">{data.summary}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* 상위 채용 기업 */}
        <div>
          <h3 className="font-semibold mb-3">상위 채용 기업</h3>
          <div className="space-y-2">
            {data.topCompanies?.slice(0, 5).map((item: TopItem, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{item.name}</span>
                <span className="text-sm text-gray-600">{item.count}개 공고</span>
              </div>
            ))}
          </div>
        </div>

        {/* 인기 지역 */}
        <div>
          <h3 className="font-semibold mb-3">인기 지역</h3>
          <div className="space-y-2">
            {data.topLocations?.slice(0, 5).map((item: TopItem, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{item.name}</span>
                <span className="text-sm text-gray-600">{item.count}개 공고</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 트렌딩 스킬 */}
      {data.trendingSkills?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">트렌딩 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.trendingSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
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
          <h3 className="font-semibold mb-3">성장하는 분야</h3>
          <div className="flex flex-wrap gap-2">
            {data.growingFields.map((field: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
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
          <h3 className="font-semibold mb-3">주요 인사이트</h3>
          <ul className="space-y-2">
            {data.insights.map((insight: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
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
function SkillsTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="text-center py-12">분석 중...</div>;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="분야" value={data.careerField} />
        <StatCard label="분석한 공고" value={`${data.analyzedJobs}개`} />
      </div>

      {/* 필수 스킬 */}
      {data.requiredSkills?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">필수 스킬</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">스킬</th>
                  <th className="px-4 py-2 text-left">빈도</th>
                  <th className="px-4 py-2 text-left">중요도</th>
                </tr>
              </thead>
              <tbody>
                {data.requiredSkills.slice(0, 10).map((skill: SkillDetail, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{skill.skill}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        skill.frequency === "높음" ? "bg-red-100 text-red-800" :
                        skill.frequency === "중간" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {skill.frequency}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        skill.importance === "필수" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
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
          <h3 className="font-semibold mb-3">우대 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.preferredSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
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
          <h3 className="font-semibold mb-3">떠오르는 스킬</h3>
          <div className="flex flex-wrap gap-2">
            {data.emergingSkills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
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
          <h3 className="font-semibold mb-3">경력 요구사항</h3>
          <div className="grid grid-cols-3 gap-4">
            {data.experienceLevel.entry && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">신입</div>
                <div className="font-semibold">{data.experienceLevel.entry}</div>
              </div>
            )}
            {data.experienceLevel.mid && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">중급</div>
                <div className="font-semibold">{data.experienceLevel.mid}</div>
              </div>
            )}
            {data.experienceLevel.senior && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">시니어</div>
                <div className="font-semibold">{data.experienceLevel.senior}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 학습 추천 */}
      {data.recommendations?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">학습 추천</h3>
          <ul className="space-y-1">
            {data.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-yellow-800">
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
function SalaryTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <div className="text-center py-12">분석 중...</div>;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="분야" value={data.careerField} />
        <StatCard label="분석한 공고" value={`${data.analyzedJobs}개`} />
      </div>

      {/* 연봉 범위 */}
      {data.salaryRange && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">연봉 범위</h3>
          <div className="grid grid-cols-3 gap-4">
            {data.salaryRange.min && (
              <div>
                <div className="text-sm text-gray-600 mb-1">최소</div>
                <div className="text-xl font-bold text-green-600">
                  {data.salaryRange.min}
                </div>
              </div>
            )}
            {data.salaryRange.average && (
              <div>
                <div className="text-sm text-gray-600 mb-1">평균</div>
                <div className="text-xl font-bold text-blue-600">
                  {data.salaryRange.average}
                </div>
              </div>
            )}
            {data.salaryRange.max && (
              <div>
                <div className="text-sm text-gray-600 mb-1">최대</div>
                <div className="text-xl font-bold text-purple-600">
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
          <h3 className="font-semibold mb-3">주요 복리후생</h3>
          <div className="flex flex-wrap gap-2">
            {data.benefits.map((benefit: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
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
          <h3 className="font-semibold mb-3">인사이트</h3>
          <ul className="space-y-2">
            {data.insights.map((insight: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
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
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-4">📊</div>
      <p>직무 분야를 입력하고 '분석하기' 버튼을 클릭하세요</p>
      <p className="text-sm mt-2">최근 30일간의 채용 공고를 AI로 분석합니다</p>
    </div>
  );
}
