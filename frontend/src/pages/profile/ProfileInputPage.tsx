import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  (import.meta?.env?.VITE_API_URL as string | undefined) ||
  'http://localhost:8080/api';

const PROFILE_CACHE_KEY = 'dreampath:profile-cache';

const getStoredUserId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('dreampath:user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.userId === 'number' ? parsed.userId : null;
  } catch {
    return null;
  }
};

type ProfileRequestDto = {
  userId: number;
  personalityTraits: string;
  values: string;
  interests: string;
  emotions: string;
  confidenceScore?: number;
};

const STORAGE_KEYS = {
  traits: 'profileTraits',
  values: 'profileValues',
  interests: 'profileInterests',
  emotions: 'profileEmotions',
} as const;

const getInitialValue = (key: string) => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) ?? '';
};

const setProfileCache = (userId: number, profile: unknown) => {
  if (typeof window === 'undefined' || !userId || !profile) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[userId] = { profile, timestamp: Date.now() };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

export default function ProfileInputPage() {
  const navigate = useNavigate();
  const [userId] = useState<number | null>(() => getStoredUserId());
  const [profileId, setProfileId] = useState<number | null>(null);
  const [traits, setTraits] = useState(() => getInitialValue(STORAGE_KEYS.traits));
  const [values, setValues] = useState(() => getInitialValue(STORAGE_KEYS.values));
  const [interests, setInterests] = useState(() => getInitialValue(STORAGE_KEYS.interests));
  const [emotions, setEmotions] = useState(() => getInitialValue(STORAGE_KEYS.emotions));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setProfileId(data.profileId ?? null);
          setTraits(data.personalityTraits ?? '');
          setValues(data.values ?? '');
          setInterests(data.interests ?? '');
          setEmotions(data.emotions ?? '');
          setProfileCache(userId, data);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('프로필 로딩 실패', err);
      }
    };
    loadProfile();
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.traits, traits);
    localStorage.setItem(STORAGE_KEYS.values, values);
    localStorage.setItem(STORAGE_KEYS.interests, interests);
    localStorage.setItem(STORAGE_KEYS.emotions, emotions);
    setLastSaved(new Date());
  }, [traits, values, interests, emotions]);

  const completion = useMemo(() => {
    const filled = [traits, values, interests, emotions].filter((value) => value.trim().length > 0).length;
    return Math.round((filled / 4) * 100);
  }, [traits, values, interests, emotions]);

  const sections = [
    {
      key: 'traits',
      title: '성격 특성',
      description: '당신을 가장 잘 설명하는 행동 패턴이나 강점을 자유롭게 적어주세요.',
      value: traits,
      setValue: setTraits,
      placeholder: '예) 새로운 환경을 빠르게 흡수하는 편이며, 팀 내 분위기를 이끄는 것을 좋아합니다.',
    },
    {
      key: 'values',
      title: '가치관',
      description: '일이나 삶에서 중요하게 생각하는 기준, 지키고 싶은 원칙을 적어보세요.',
      value: values,
      setValue: setValues,
      placeholder: '예) 사람들의 성장을 돕는 일이 보람 있고, 정직함과 신뢰를 가장 우선시합니다.',
    },
    {
      key: 'interests',
      title: '관심 분야',
      description: '최근 몰입하고 있는 주제나 앞으로 깊이 탐구해 보고 싶은 영역이 있나요?',
      value: interests,
      setValue: setInterests,
      placeholder: '예) 데이터 기반 문제 해결, 지속 가능한 비즈니스, 청소년 멘토링',
    },
    {
      key: 'emotions',
      title: '감정 패턴',
      description: '어떤 상황에서 동기부여를 받거나 어려움을 느끼는지 솔직하게 적어주세요.',
      value: emotions,
      setValue: setEmotions,
      placeholder: '예) 명확한 목표가 있을 때 몰입도가 높고, 혼자 오래 일하면 에너지가 떨어집니다.',
    },
  ];

  const handleReset = () => {
    setTraits('');
    setValues('');
    setInterests('');
    setEmotions('');
  };

  const submitProfile = async () => {
    const currentUserId = userId ?? getStoredUserId();
    if (!currentUserId) {
      alert('프로필을 저장하려면 먼저 로그인해주세요.');
      navigate('/login');
      return;
    }

    const trimmedTraits = traits.trim();
    const trimmedValues = values.trim();
    const trimmedInterests = interests.trim();
    const trimmedEmotions = emotions.trim();

    if (!trimmedTraits || !trimmedValues || !trimmedInterests || !trimmedEmotions) {
      alert('모든 항목을 입력한 후 저장할 수 있습니다.');
      return;
    }

    const payload: ProfileRequestDto = {
      userId: currentUserId,
      personalityTraits: trimmedTraits,
      values: trimmedValues,
      interests: trimmedInterests,
      emotions: trimmedEmotions,
      confidenceScore: completion,
    };

    try {
      setIsSubmittingProfile(true);
      setErrorMessage(null);
      const isEditMode = Boolean(profileId);
      const url = isEditMode ? `${API_BASE_URL}/profiles/${profileId}` : `${API_BASE_URL}/profiles`;
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '프로필 저장에 실패했습니다.');
      }

      const saved = await response.json();
      setProfileId(saved?.profileId ?? profileId);
      if (saved) {
        setProfileCache(currentUserId, saved);
      }

      if (isEditMode) {
        navigate('/profile/dashboard', { replace: true });
      } else {
        navigate('/profile/success');
      }
      return;
    } catch (error) {
      console.error('프로필 저장 실패', error);
      const message = error instanceof Error ? error.message : '프로필 저장 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ... 전체 UI는 그대로 유지 ... */}

        <button
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={submitProfile}
          disabled={isSubmittingProfile}
        >
          <i className="ri-save-3-line text-xl" />
          {isSubmittingProfile ? '저장 중...' : '프로필 저장'}
        </button>

        {errorMessage && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
