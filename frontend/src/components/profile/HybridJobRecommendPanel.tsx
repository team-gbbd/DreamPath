import { useMemo, useState } from "react";
import { profileService } from "@/lib/api";

interface HybridResultItem {
  job_id?: string;
  title?: string;
  reason?: string;
  metadata?: Record<string, any>;
  [key: string]: unknown;
}

interface HybridJobRecommendPanelProps {
  embedded?: boolean;
}

const HybridJobRecommendPanel = ({ embedded = false }: HybridJobRecommendPanelProps) => {
  const [vectorId, setVectorId] = useState("");
  const [topK, setTopK] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [results, setResults] = useState<HybridResultItem[]>([]);

  const handleRecommend = async () => {
    if (!vectorId.trim()) {
      setError("벡터 ID를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setRawResponse(null);

    try {
      const response = await profileService.fetchHybridJobs(vectorId.trim(), topK);
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
      const message =
        err instanceof Error ? err.message : "추천을 생성하는 중 오류가 발생했습니다.";
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
  const formCardClass = embedded
    ? "rounded-2xl border border-gray-100 bg-white p-6"
    : "rounded-2xl border border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 shadow-sm";

  return (
    <div className={wrapperClass}>
      <section className={formCardClass}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-700">사용자 벡터 ID</label>
            <input
              value={vectorId}
              onChange={(e) => setVectorId(e.target.value)}
              placeholder="예) user_1234_abcdef"
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Top-K 후보</label>
            <input
              type="number"
              min={5}
              max={30}
              value={topK}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) {
                  setTopK(20);
                  return;
                }
                setTopK(Math.min(30, Math.max(5, next)));
              }}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRecommend}
            className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "추천 생성 중..." : "추천 받기"}
          </button>
          <button
            type="button"
            onClick={() => {
              setVectorId("");
              setTopK(20);
              setResults([]);
              setRawResponse(null);
              setError(null);
            }}
            className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            disabled={loading}
          >
            초기화
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </section>

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
            추천 결과가 여기에 표시됩니다. 벡터 ID를 입력하고 추천을 요청해 보세요.
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
                  {item.reason || item.metadata?.reason || "추천 이유가 준비 중입니다."}
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
