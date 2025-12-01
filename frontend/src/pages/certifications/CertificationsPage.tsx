import { useState, useEffect } from "react";
import { qnetService } from "@/lib/api";

interface QualificationInfo {
  code?: string;
  name?: string;
  engName?: string;
  seriesCode?: string;
  seriesName?: string;
  obligFldCode?: string;
  obligFldName?: string;
  qualType?: string;
  qualTypeName?: string;
  summary?: string;
  career?: string;
  trend?: string;
}

interface ExamScheduleInfo {
  description?: string;  // 설명 (예: 기사(2025년도 제1회))
  examCategory?: string;  // 시험 카테고리 (기사/산업기사, 기능사, 서비스)
  docRegStartDt?: string;
  docRegEndDt?: string;
  docExamDt?: string;  // 필기 시험일
  docPassDt?: string;
  docSubmitStartDt?: string;
  docSubmitEndDt?: string;
  pracRegStartDt?: string;
  pracRegEndDt?: string;
  pracExamStartDt?: string;
  pracExamEndDt?: string;
  pracPassDt?: string;
}

interface SeriesCode {
  code: string;
  name: string;
}

type TabType = "search" | "schedule" | "recommend";

export default function CertificationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [seriesCodes, setSeriesCodes] = useState<SeriesCode[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [qualifications, setQualifications] = useState<QualificationInfo[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamScheduleInfo[]>([]);
  const [selectedCert, setSelectedCert] = useState<QualificationInfo | null>(null);
  const [jobKeywords, setJobKeywords] = useState("");
  const [recommendedCerts, setRecommendedCerts] = useState<QualificationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 계열 코드 로드
  useEffect(() => {
    const loadSeriesCodes = async () => {
      try {
        const response = await qnetService.getSeriesCodes();
        if (response.success) {
          setSeriesCodes(response.seriesCodes || []);
        }
      } catch (err) {
        console.error("계열 코드 로드 실패:", err);
      }
    };
    loadSeriesCodes();
  }, []);

  // 자격증 검색
  const handleSearch = async () => {
    if (!searchKeyword.trim() && !selectedSeries) {
      setError("검색어 또는 계열을 선택해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await qnetService.getQualifications({
        seriesCode: selectedSeries || undefined,
        qualificationName: searchKeyword || undefined,
        numOfRows: 50,
      });
      if (response.success) {
        setQualifications(response.items || []);
        if (response.items?.length === 0) {
          setError("검색 결과가 없습니다.");
        }
      } else {
        setError(response.message || "검색 실패");
      }
    } catch (err: any) {
      setError(err.message || "검색 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // 자격증 상세 + 시험 일정 조회
  const handleCertDetail = async (cert: QualificationInfo) => {
    setSelectedCert(cert);
    setLoading(true);
    setError(null);
    try {
      const response = await qnetService.getCertificationDetail(cert.name || "");
      if (response.success) {
        setExamSchedules(response.examSchedules || []);
      } else {
        setExamSchedules([]);
      }
    } catch (err) {
      console.error("시험 일정 조회 실패:", err);
      setExamSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // 직업 기반 자격증 추천
  const handleRecommend = async () => {
    if (!jobKeywords.trim()) {
      setError("직업 키워드를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const keywords = jobKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const response = await qnetService.getCertificationsForJob(keywords);
      if (response.success) {
        setRecommendedCerts(response.certifications || []);
        if (response.certifications?.length === 0) {
          setError("추천 자격증이 없습니다.");
        }
      } else {
        setError(response.message || "추천 실패");
      }
    } catch (err: any) {
      setError(err.message || "추천 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // 시험 일정 검색
  const handleScheduleSearch = async () => {
    if (!searchKeyword.trim()) {
      setError("자격증 이름을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await qnetService.getExamSchedule({
        qualificationName: searchKeyword,
        year: "2025",
        numOfRows: 50,
      });
      if (response.success) {
        setExamSchedules(response.items || []);
        if (response.items?.length === 0) {
          setError("시험 일정이 없습니다.");
        }
      } else {
        setError(response.message || "조회 실패");
      }
    } catch (err: any) {
      setError(err.message || "조회 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            국가기술자격증 정보
          </h1>
          <p className="text-gray-600">
            Q-net 공공데이터를 활용한 자격증 검색 및 시험 일정 조회
          </p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => {
              setActiveTab("search");
              setError(null);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "search"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            자격증 검색
          </button>
          <button
            onClick={() => {
              setActiveTab("schedule");
              setError(null);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "schedule"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            시험 일정
          </button>
          <button
            onClick={() => {
              setActiveTab("recommend");
              setError(null);
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "recommend"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            추천 자격증
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 자격증 검색 탭 */}
        {activeTab === "search" && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계열 선택
                  </label>
                  <select
                    value={selectedSeries}
                    onChange={(e) => setSelectedSeries(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    {seriesCodes.map((sc) => (
                      <option key={sc.code} value={sc.code}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    자격증 이름
                  </label>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="예: 정보처리, 전기, 기계"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "검색 중..." : "검색"}
                </button>
              </div>
            </div>

            {/* 검색 결과 */}
            {qualifications.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">
                    검색 결과 ({qualifications.length}건)
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {qualifications.map((cert, idx) => (
                    <div
                      key={idx}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleCertDetail(cert)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">
                            {cert.name}
                            {cert.qualTypeName && (
                              <span className="ml-2 text-sm text-blue-600">
                                ({cert.qualTypeName})
                              </span>
                            )}
                          </h4>
                          {cert.engName && (
                            <p className="text-sm text-gray-500">{cert.engName}</p>
                          )}
                          {cert.seriesName && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {cert.seriesName}
                            </span>
                          )}
                          {cert.obligFldName && (
                            <span className="inline-block mt-1 ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                              {cert.obligFldName}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">상세보기 →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 자격증 상세 모달 */}
            {selectedCert && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedCert.name}
                    </h3>
                    <button
                      onClick={() => setSelectedCert(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {selectedCert.qualTypeName && (
                        <div>
                          <span className="text-sm text-gray-500">등급</span>
                          <p className="font-medium">{selectedCert.qualTypeName}</p>
                        </div>
                      )}
                      {selectedCert.seriesName && (
                        <div>
                          <span className="text-sm text-gray-500">계열</span>
                          <p className="font-medium">{selectedCert.seriesName}</p>
                        </div>
                      )}
                      {selectedCert.obligFldName && (
                        <div>
                          <span className="text-sm text-gray-500">직무분야</span>
                          <p className="font-medium">{selectedCert.obligFldName}</p>
                        </div>
                      )}
                    </div>

                    {/* 시험 일정 */}
                    <h4 className="font-medium text-gray-800 mb-3">
                      2025년 시험 일정
                    </h4>
                    {loading ? (
                      <p className="text-gray-500">로딩 중...</p>
                    ) : examSchedules.length > 0 ? (
                      <div className="space-y-4">
                        {examSchedules.map((schedule, idx) => (
                          <div
                            key={idx}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="font-medium text-gray-800 mb-2">
                              {schedule.description}
                              {schedule.examCategory && (
                                <span className="ml-2 text-sm text-blue-600">
                                  [{schedule.examCategory}]
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-blue-600 font-medium mb-1">
                                  필기
                                </p>
                                <p>
                                  접수: {formatDate(schedule.docRegStartDt)} ~{" "}
                                  {formatDate(schedule.docRegEndDt)}
                                </p>
                                <p>
                                  시험: {formatDate(schedule.docExamDt)}
                                </p>
                                <p>합격발표: {formatDate(schedule.docPassDt)}</p>
                              </div>
                              <div>
                                <p className="text-green-600 font-medium mb-1">
                                  실기
                                </p>
                                <p>
                                  접수: {formatDate(schedule.pracRegStartDt)} ~{" "}
                                  {formatDate(schedule.pracRegEndDt)}
                                </p>
                                <p>
                                  시험: {formatDate(schedule.pracExamStartDt)} ~{" "}
                                  {formatDate(schedule.pracExamEndDt)}
                                </p>
                                <p>합격발표: {formatDate(schedule.pracPassDt)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">시험 일정 정보가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 시험 일정 탭 */}
        {activeTab === "schedule" && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    자격증 이름으로 검색
                  </label>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScheduleSearch()}
                    placeholder="예: 정보처리기사"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleScheduleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "조회 중..." : "일정 조회"}
                </button>
              </div>
            </div>

            {/* 시험 일정 결과 */}
            {examSchedules.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">
                    2025년 시험 일정 ({examSchedules.length}건)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          시험 정보
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          카테고리
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          필기 접수
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          필기 시험
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          실기 접수
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">
                          실기 시험
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {examSchedules.map((schedule, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {schedule.description}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {schedule.examCategory}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(schedule.docRegStartDt)}
                            <br />~ {formatDate(schedule.docRegEndDt)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(schedule.docExamDt)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(schedule.pracRegStartDt)}
                            <br />~ {formatDate(schedule.pracRegEndDt)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {formatDate(schedule.pracExamStartDt)}
                            <br />~ {formatDate(schedule.pracExamEndDt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 추천 자격증 탭 */}
        {activeTab === "recommend" && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    관심 직업/직무 키워드 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={jobKeywords}
                    onChange={(e) => setJobKeywords(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRecommend()}
                    placeholder="예: 백엔드, 개발자 또는 데이터, 분석"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleRecommend}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "추천 중..." : "자격증 추천"}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                예시: "백엔드, 개발자" → 정보처리기사, 정보보안기사 등
              </p>
            </div>

            {/* 추천 결과 */}
            {recommendedCerts.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">
                    추천 자격증 ({recommendedCerts.length}건)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {recommendedCerts.map((cert, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCertDetail(cert)}
                    >
                      <h4 className="font-medium text-gray-800 mb-1">
                        {cert.name}
                      </h4>
                      {cert.qualTypeName && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded mb-2">
                          {cert.qualTypeName}
                        </span>
                      )}
                      {cert.seriesName && (
                        <p className="text-sm text-gray-500">{cert.seriesName}</p>
                      )}
                      {cert.obligFldName && (
                        <p className="text-sm text-gray-500">
                          직무분야: {cert.obligFldName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
