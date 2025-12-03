import { useEffect, useMemo, useState } from "react";
import { fetchHybridJobs } from "@/pages/profile/recommendApi";
import api from "@/lib/api";

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
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [results, setResults] = useState<HybridResultItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const checkVector = async () => {
      try {
        const res = await api.get(`/vector/status/${profileId}`);
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
    setRawResponse(null);

    try {
      const response = await fetchHybridJobs(vid, 20); // Default Top-K = 20
      setStatusMessage(null);

      if (
        response &&
        typeof response === "object" &&
        "recommended" in response &&
        Array.isArray((response as any).recommended)
      ) {
        setResults((response as any).recommended);
        return;
      }

      if (Array.isArray(response)) {
        setResults(response);
        return;
      }

      if (typeof response === "string") {
        try {
          const parsed = JSON.parse(response);
          if (Array.isArray(parsed)) {
            setResults(parsed);
          } else {
            setRawResponse(response);
          }
        } catch {
          setRawResponse(response);
        }
        return;
      }

      if (response && typeof response === "object") {
        setResults([response as HybridResultItem]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "추천을 생성하는 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = useMemo(
    () => results.length > 0 || !!rawResponse,
    [results.length, rawResponse]
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

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">추천 결과</h3>
          {hasResults && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              {results.length}건
            </span>
          )}
        </div>

        {!hasResults && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
            추천 결과가 여기에 표시됩니다.
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((item, index) => (
              <div key={`${item.job_id ?? index}`} className="rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-indigo-600">추천 #{index + 1}</p>
                  {item.job_id && (
                    <span className="text-xs font-medium text-gray-400">ID: {item.job_id}</span>
                  )}
                </div>
                <h4 className="mt-2 text-xl font-bold text-gray-900">
                  {item.title || item.metadata?.jobName || "제목 미확인"}
                </h4>
                <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
                  {item.reason ||
                    item.metadata?.reason ||
                    item.metadata?.summary ||
                    "추천 이유가 준비 중입니다."}
                </p>
              </div>
            ))}
          </div>
        )}

        {rawResponse && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-semibold">LLM 원본 응답</p>
            <pre className="mt-2 whitespace-pre-wrap break-words">{rawResponse}</pre>
          </div>
        )}
      </section>
    </div>
  );
};

export default HybridJobRecommendPanel;
