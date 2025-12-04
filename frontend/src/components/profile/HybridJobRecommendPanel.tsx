import { useEffect, useMemo, useState } from "react";
import { fetchHybridJobs } from "@/pages/profile/recommendApi";
import { backendApi } from "@/lib/api";

interface HybridResultItem {
  job_id?: string;
  title?: string;
  reason?: string;
  metadata?: Record<string, any>;
  [key: string]: unknown;
}

interface HybridJobRecommendPanelProps {
  embedded?: boolean;
  profileId?: number;
}

const HybridJobRecommendPanel = ({ embedded = false, profileId }: HybridJobRecommendPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HybridResultItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!profileId) return;

    const checkVector = async () => {
      try {
        const res = await backendApi.get(`/vector/status/${profileId}`);
        if (res.data?.ready && res.data?.vectorId) {
          fetchRecommendations(res.data.vectorId);
        } else {
          setStatusMessage("벡터 생성 중입니다... 잠시만 기다려주세요.");
        }
      } catch (e) {
        console.error("벡터 상태 조회 실패", e);
      }
    };

    checkVector();
  }, [profileId]);

  const fetchRecommendations = async (vid: string) => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetchHybridJobs(vid); // Default Top-K = 10
      setStatusMessage(null);

      // fetchHybridJobs already returns the recommended array
      if (Array.isArray(response)) {
        setResults(response);
      } else {
        console.warn("Unexpected response format:", response);
        setError("추천 결과 형식이 올바르지 않습니다.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "추천을 생성하는 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = useMemo(
    () => results.length > 0,
    [results.length]
  );

  const wrapperClass = embedded ? "space-y-6" : "space-y-8";

  return (
    <div className={wrapperClass}>
      {(statusMessage || error || loading) && (
        <div className="rounded-xl bg-gray-50 p-4 mb-4">
          {(statusMessage || loading) && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium">
                {statusMessage || "추천 결과를 불러오는 중입니다..."}
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="직업 검색 (예: 프로그래머, 디자이너, 의사...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-24 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            disabled={!searchQuery.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            검색
          </button>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            ✕ 검색 초기화
          </button>
        )}
      </div>

      {!hasResults && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {results.map((item, index) => {
            console.log("HybridJob Item:", item); // Debug log
            return (
              <div
                key={item.job_id || index}
                className="rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-indigo-600">추천 #{index + 1}</p>
                  {item.job_id && (
                    <span className="text-xs font-medium text-gray-400">ID: {item.job_id}</span>
                  )}
                </div>
                <h4 className="mt-2 text-xl font-bold text-gray-900">
                  {item.title || item.metadata?.jobName || "제목 미확인"}
                </h4>

                {/* Metadata Fields */}
                <div className="mt-4 space-y-2">
                  {item.metadata?.wage && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">💰 연봉:</span>
                      <span className="text-sm text-gray-700">{item.metadata.wage}</span>
                    </div>
                  )}
                  {item.metadata?.wlb && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">⚖️ 일-생활균형:</span>
                      <span className="text-sm text-gray-700">{item.metadata.wlb}</span>
                    </div>
                  )}
                  {item.metadata?.aptitude && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">🎯 적성:</span>
                      <span className="text-sm text-gray-700">{item.metadata.aptitude}</span>
                    </div>
                  )}
                  {item.metadata?.ability && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">💪 핵심능력:</span>
                      <span className="text-sm text-gray-700">{item.metadata.ability}</span>
                    </div>
                  )}
                  {item.metadata?.relatedJob && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 mt-0.5">🔗 관련직업:</span>
                      <span className="text-sm text-gray-700">{item.metadata.relatedJob}</span>
                    </div>
                  )}
                </div>

                {/* Recommendation Reason */}
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.reason || item.metadata?.summary || "추천 이유가 준비 중입니다."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div >
  );
};

export default HybridJobRecommendPanel;
