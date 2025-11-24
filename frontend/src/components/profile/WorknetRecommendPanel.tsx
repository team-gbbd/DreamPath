import { useMemo, useState } from "react";
import api from "@/lib/api";

interface RecommendItem {
  id?: string;
  title?: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface Props {
  embedded?: boolean;
}

const WorknetRecommendPanel = ({ embedded = false }: Props) => {
  const [vectorId, setVectorId] = useState("");
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!vectorId.trim()) {
      setError("벡터 ID를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/recommend/worknet", { vectorId: vectorId.trim() });
      setItems(res.data?.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "채용 추천 호출 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const hasItems = useMemo(() => items.length > 0, [items.length]);
  const containerClass = embedded ? "space-y-6" : "space-y-8";

  return (
    <div className={containerClass}>
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <label className="text-sm font-semibold text-gray-700">사용자 벡터 ID</label>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={vectorId}
            onChange={(e) => setVectorId(e.target.value)}
            placeholder="예) user_1234_abcdef"
            className="flex-1 min-w-[200px] rounded-xl border px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleFetch}
            className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "추천 생성 중..." : "추천 받기"}
          </button>
          <button
            type="button"
            onClick={() => {
              setVectorId("");
              setItems([]);
              setError(null);
            }}
            className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            disabled={loading}
          >
            초기화
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">추천 결과</h3>
          {hasItems && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
              {items.length}건
            </span>
          )}
        </div>

        {!hasItems && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
            추천 결과가 여기에 표시됩니다.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, idx) => (
            <div key={`${item.id ?? idx}`} className="rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-600">추천 #{idx + 1}</p>
                {item.score !== undefined && (
                  <span className="text-xs font-medium text-gray-500">score: {item.score?.toFixed?.(3) ?? item.score}</span>
                )}
              </div>
              <h4 className="mt-2 text-lg font-bold text-gray-900">
                {item.title || item.metadata?.jobName || "제목 미확인"}
              </h4>
              <p className="mt-3 text-sm text-gray-600">
                {item.metadata?.jobDesc || item.metadata?.description || "상세 설명이 준비 중입니다."}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WorknetRecommendPanel;
