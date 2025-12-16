import { useEffect, useState } from 'react';
import type { UserProfile } from '@/types';
import { API_BASE_URL, authFetch } from '@/lib/api';

type UseProfileResult = {
  data: UserProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProfile: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
};

const NO_ANALYSIS_MESSAGE =
  '성향 분석 결과가 없습니다. AI 분석을 먼저 실행해주세요.';

export default function useProfile(userId?: number | null): UseProfileResult {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setError('유효한 사용자 ID가 필요합니다.');
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch(
          `${API_BASE_URL}/profiles/${userId}/analysis`
        );

        if (response.status === 404) {
          if (!cancelled) {
            setError(NO_ANALYSIS_MESSAGE);
            setData(null);
          }
          return;
        }

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || '성향 분석 결과를 불러오지 못했습니다.');
        }

        const json = (await response.json()) as UserProfile;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('성향 분석 로드 실패', err);
        const message =
          err instanceof Error
            ? err.message
            : '성향 분석을 불러오는 중 오류가 발생했습니다.';
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        `${API_BASE_URL}/profiles/${userId}/analysis`
      );

      if (response.status === 404) {
        setError(NO_ANALYSIS_MESSAGE);
        setData(null);
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '성향 분석 결과를 불러오지 못했습니다.');
      }

      const json = (await response.json()) as UserProfile;
      setData(json);
    } catch (err) {
      console.error('성향 분석 새로고침 실패', err);
      const message =
        err instanceof Error
          ? err.message
          : '성향 분석을 새로고침하는 중 문제가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const setProfile = (
    updater: (prev: UserProfile | null) => UserProfile | null
  ) => {
    setData((prev) => updater(prev));
  };

  return { data, loading, error, refresh, setProfile };
}