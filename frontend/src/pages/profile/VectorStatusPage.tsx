import { useEffect, useState } from "react";
import axios from "axios";

export default function VectorStatusPage() {

  const profileId = 1; // 로그인 후 받아오는 값으로 교체 필요
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await axios.get(`/api/vector/status/${profileId}`);
    setData(res.data);
  };

  const regenerate = async () => {
    setLoading(true);
    await axios.post(`/api/vector/regenerate/${profileId}`);
    await load();
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-bold">🔥 벡터 상태</h1>

      {data ? (
        <div className="space-y-2">
          <div>Vector ID: {data.vectorDbId}</div>
          <div>Original Text: {data.originalText?.slice(0, 50)}...</div>
          <div>Updated At: {data.updatedAt}</div>
        </div>
      ) : (
        <div>데이터 없음</div>
      )}

      <button
        onClick={regenerate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? "재생성 중..." : "벡터 재생성"}
      </button>
    </div>
  );
}
