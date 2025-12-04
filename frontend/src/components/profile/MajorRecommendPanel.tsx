import { useEffect, useMemo, useState } from "react";
import { backendApi, pythonApi } from "@/lib/api";

interface RecommendItem {
  id?: string;
  title?: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface Props {
  embedded?: boolean;
  profileId?: number;
}

const MajorRecommendPanel = ({ embedded = false, profileId }: Props) => {
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRecommendations = async (vid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonApi.post("/recommend/majors", { vectorId: vid });
      const data = res.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems(data?.items || []);
      }
      setStatusMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "학과 추천 호출 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const checkVector = async () => {
    if (!profileId) return;

    try {
      console.log("Checking vector status for profileId:", profileId);
      const res = await backendApi.get(`/vector/status/${profileId}`);
      console.log("Vector status response:", res.data);

      if (res.data?.ready && res.data?.vectorId) {
        console.log("Vector ready, fetching recommendations with ID:", res.data.vectorId);
        fetchRecommendations(res.data.vectorId);
      } else {
        console.log("Vector not ready");
        setStatusMessage("벡터 생성 중입니다... 잠시만 기다려주세요.");
      }
    } catch (e) {
      console.error("벡터 상태 조회 실패", e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await pythonApi.post("/recommend/majors/search", { query: searchQuery });
      const data = res.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems(data?.items || []);
      }
      setStatusMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("MajorRecommendPanel mounted, profileId:", profileId);
    if (!profileId) {
      console.log("No profileId, skipping vector check");
      return;
    }

    checkVector();
  }, [profileId]);

  const hasItems = useMemo(() => items.length > 0, [items.length]);
  const containerClass = embedded ? "space-y-6" : "space-y-8";

  return (
    <div className={containerClass}>
      {/* 상태 메시지 표시 영역 */}
      {(statusMessage || error) && (
        <div className="rounded-xl bg-gray-50 p-4 mb-4">
          {statusMessage && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium">{statusMessage}</p>
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
            placeholder="학과 검색 (예: 컴퓨터, 경영, 디자인...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleSearch();
              }
            }}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-24 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            검색
          </button>
        </div>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              if (profileId) {
                checkVector();
              }
            }}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            ✕ 검색 초기화 (개인화 추천 보기)
          </button>
        )}
      </div>

      {!hasItems && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
          추천 결과가 여기에 표시됩니다.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, idx) => (
          <div key={`${item.id ?? idx}`} className="rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-indigo-600">추천 #{idx + 1}</p>
              {item.score !== undefined && (
                <span className="text-xs font-medium text-gray-500">score: {item.score?.toFixed?.(3) ?? item.score}</span>
              )}
            </div>
            <h4 className="mt-2 text-lg font-bold text-gray-900">
              {item.title || item.metadata?.deptName || "학과명 미확인"}
            </h4>

            {/* Metadata Fields */}
            <div className="mt-4 space-y-3">
              {item.metadata?.lClass && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[60px]">📚 계열</span>
                  <span className="text-sm text-gray-700">{item.metadata.lClass}</span>
                </div>
              )}

              {item.metadata?.employment && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[60px]">📈 취업률</span>
                  <span className="text-sm font-bold text-blue-600">
                    {item.metadata.employment.replace(/<[^>]*>/g, '')}
                  </span>
                </div>
              )}

              {item.metadata?.relatedJobs && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[60px] mt-0.5">💼 관련직업</span>
                  <span className="text-sm text-gray-700 line-clamp-2">{item.metadata.relatedJobs}</span>
                </div>
              )}

              {item.metadata?.enter_field && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 min-w-[60px] mt-0.5">🎓 진출분야</span>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {item.metadata.enter_field.split('\n').map((line: string, i: number) => (
                      <p key={i} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 text-sm text-gray-600 border-t pt-3">
              {item.metadata?.deptDesc || item.metadata?.description || item.metadata?.summary || "상세 설명이 준비 중입니다."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MajorRecommendPanel;
