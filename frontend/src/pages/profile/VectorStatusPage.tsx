import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

type VectorStatus = {
  vectorDbId?: string;
  originalText?: string;
  updatedAt?: string;
};

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("dreampath:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function VectorStatusPage() {
  const [profileId, setProfileId] = useState<number | null>(null);
  const [status, setStatus] = useState<VectorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser?.userId) {
      setError("로그인이 필요합니다.");
      setInitializing(false);
      return;
    }

    const fetchProfileId = async () => {
      try {
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/profiles/${currentUser.userId}`);
        if (!response.data?.profileId) {
          setError("프로필이 없습니다. 먼저 프로필을 작성해주세요.");
          setProfileId(null);
          setStatus(null);
        } else {
          setProfileId(response.data.profileId);
        }
      } catch (err) {
        console.error("프로필 로딩 실패", err);
        setError("프로필 정보를 불러오지 못했습니다.");
      } finally {
        setInitializing(false);
      }
    };

    fetchProfileId();
  }, []);

  const loadStatus = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/vector/status/${profileId}`);
      setStatus(res.data);
    } catch (err) {
      console.error("벡터 상태 조회 실패", err);
      setStatus(null);
      setError("벡터 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (profileId) {
      loadStatus();
    }
  }, [profileId, loadStatus]);

  const regenerate = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/vector/regenerate/${profileId}`);
      await loadStatus();
    } catch (err) {
      console.error("벡터 재생성 실패", err);
      setError("벡터를 재생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const renderBody = () => {
    if (initializing) {
      return <div>로딩 중...</div>;
    }

    if (error) {
      return <p className="text-red-500">{error}</p>;
    }

    if (!profileId) {
      return <p>프로필을 먼저 작성하면 벡터 상태를 확인할 수 있습니다.</p>;
    }

    return status ? (
      <div className="space-y-2 rounded-xl border border-gray-200 p-4">
        <div>
          <span className="font-semibold text-gray-700">Vector ID: </span>
          <span className="text-gray-900">{status.vectorDbId ?? '-'}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Original Text: </span>
          <span className="text-gray-900">
            {status.originalText ? `${status.originalText.slice(0, 80)}...` : '-'}
          </span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Updated At: </span>
          <span className="text-gray-900">{status.updatedAt ?? '-'}</span>
        </div>
      </div>
    ) : (
      <p>벡터 데이터가 없습니다. 재생성 버튼을 눌러 생성해보세요.</p>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🔥 벡터 상태</h1>
      {renderBody()}
      {profileId && (
        <button
          onClick={regenerate}
          disabled={loading}
          className="rounded bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "처리 중..." : "벡터 재생성"}
        </button>
      )}
    </div>
  );
}
