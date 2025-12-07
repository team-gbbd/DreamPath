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

const SchoolRecommendPanel = ({ embedded = false, profileId }: Props) => {
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
    try {
      const res = await pythonApi.post("/recommend/schools", { vectorId: vid });
      // Backend returns a List directly, or an object with items
      const data = res.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems(data?.items || []);
      }
      setStatusMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "학교 추천 호출 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };



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
                {item.title || item.metadata?.schoolName || "학교명 미확인"}
              </h4>
              <p className="mt-3 text-sm text-gray-600">
                {item.metadata?.desc || item.metadata?.description || item.metadata?.summary || "상세 설명이 준비 중입니다."}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SchoolRecommendPanel;
