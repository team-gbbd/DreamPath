import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ============================
   🔹 API / LocalStorage 설정
=============================== */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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

interface ProfileRequestDto {
  userId: number;
  personalityTraits: string;
  values: string;
  interests: string;
  emotions: string;
  confidenceScore?: number;
}

const STORAGE_KEYS = {
  traits: 'profileTraits',
  values: 'profileValues',
  interests: 'profileInterests',
  emotions: 'profileEmotions',
} as const;

const getStorageKey = (key: string, userId: number | null) => {
  if (!userId) return key;
  return `${key}_${userId}`;
};

const getInitialValue = (key: string, userId: number | null): string => {
  if (typeof window === 'undefined') return '';
  const storageKey = getStorageKey(key, userId);
  return localStorage.getItem(storageKey) ?? '';
};

const setProfileCache = (userId: number, profile: unknown) => {
  if (!userId || !profile) return;
  try {
    const existing = localStorage.getItem(PROFILE_CACHE_KEY);
    const cache = existing ? JSON.parse(existing) : {};
    cache[userId] = { profile, timestamp: Date.now() };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

/* ============================
   🔹 컴포넌트 본문
=============================== */
export default function ProfileInputPage() {
  const navigate = useNavigate();
  const [userId] = useState<number | null>(() => getStoredUserId());
  const [profileId, setProfileId] = useState<number | null>(null);

  // 초기값 로드 시 userId가 있으면 해당 유저의 데이터를, 없으면 빈 문자열
  const [traits, setTraits] = useState('');
  const [values, setValues] = useState('');
  const [interests, setInterests] = useState('');
  const [emotions, setEmotions] = useState('');

  // 마운트 시 초기값 설정
  useEffect(() => {
    if (userId) {
      setTraits(getInitialValue(STORAGE_KEYS.traits, userId));
      setValues(getInitialValue(STORAGE_KEYS.values, userId));
      setInterests(getInitialValue(STORAGE_KEYS.interests, userId));
      setEmotions(getInitialValue(STORAGE_KEYS.emotions, userId));
    }
  }, [userId]);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* =============================
     🔹 기존 프로필 로딩
  ============================== */
  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
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

  /* =============================
     🔹 입력값 캐싱
  ============================== */
  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(getStorageKey(STORAGE_KEYS.traits, userId), traits);
    localStorage.setItem(getStorageKey(STORAGE_KEYS.values, userId), values);
    localStorage.setItem(getStorageKey(STORAGE_KEYS.interests, userId), interests);
    localStorage.setItem(getStorageKey(STORAGE_KEYS.emotions, userId), emotions);
    setLastSaved(new Date());
  }, [traits, values, interests, emotions, userId]);

  /* =============================
     🔹 입력 항목 채움 정도
  ============================== */
  const completion = useMemo(() => {
    const filled = [traits, values, interests, emotions].filter(
      (v) => v.trim().length > 0
    ).length;
    return Math.round((filled / 4) * 100);
  }, [traits, values, interests, emotions]);

  const sections = [
    {
      key: 'traits',
      title: '성격 특성',
      description: '당신을 가장 잘 설명하는 행동 패턴이나 강점을 자유롭게 적어주세요.',
      value: traits,
      setValue: setTraits,
      placeholder:
        '예) 새로운 환경을 빠르게 흡수하는 편이며, 팀 내 분위기를 이끄는 것을 좋아합니다.',
    },
    {
      key: 'values',
      title: '가치관',
      description: '일이나 삶에서 중요하게 생각하는 기준, 지키고 싶은 원칙을 적어보세요.',
      value: values,
      setValue: setValues,
      placeholder: '예) 정직함과 신뢰를 가장 우선시합니다.',
    },
    {
      key: 'interests',
      title: '관심 분야',
      description: '최근 몰입하고 있는 주제나 향후 탐구하고 싶은 영역을 작성하세요.',
      value: interests,
      setValue: setInterests,
      placeholder: '예) 데이터 기반 문제 해결, 청소년 멘토링…',
    },
    {
      key: 'emotions',
      title: '감정 패턴',
      description: '어떤 상황에서 동기부여를 받거나 어려움을 느끼는지 적어주세요.',
      value: emotions,
      setValue: setEmotions,
      placeholder: '예) 명확한 목표가 있을 때 몰입도가 높아요.',
    },
  ];

  /* =============================
     🔹 프로필 저장
  ============================== */
  const submitProfile = async () => {
    const currentUserId = userId ?? getStoredUserId();
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    const trimmedTraits = traits.trim();
    const trimmedValues = values.trim();
    const trimmedInterests = interests.trim();
    const trimmedEmotions = emotions.trim();

    if (!trimmedTraits || !trimmedValues || !trimmedInterests || !trimmedEmotions) {
      alert('모든 항목을 입력해야 저장할 수 있습니다.');
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
      const url = isEditMode
        ? `${API_BASE_URL}/profiles/${profileId}`
        : `${API_BASE_URL}/profiles`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || '프로필 저장 실패');
      }

      const saved = await res.json();
      setProfileId(saved?.profileId ?? profileId);
      setProfileCache(currentUserId, saved);

      // 수정 모드이면 대시보드로, 신규 생성이면 성공 페이지로
      navigate(isEditMode ? '/profile/dashboard' : '/profile/success', {
        replace: true,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : '프로필 저장 중 오류 발생'
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  /* =============================
     🔹 렌더링(UI)
  ============================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 상단 영역 */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/career-chat')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <i className="ri-arrow-left-line text-2xl" />
              </button>
              <div>
                <p className="uppercase text-xs font-semibold text-indigo-500 tracking-[0.2em]">
                  Profile Design
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  나만의 정체성 카드 만들기
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  입력된 정체성 정보는 향후 AI 분석의 정밀도를 높여줍니다.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTraits('');
                setValues('');
                setInterests('');
                setEmotions('');
              }}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white/80 transition-colors"
            >
              <i className="ri-refresh-line" />
              초기화
            </button>
          </div>

          {/* 진행도 바 */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-white/70 p-5 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">완성도</p>
              <div className="flex items-center gap-3">
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5A7BFF] via-[#8F5CFF] to-[#F472B6] transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <span className="text-lg font-semibold text-gray-800">
                  {completion}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <i className="ri-time-line text-lg text-indigo-500" />
              {lastSaved
                ? `최근 저장 ${lastSaved.toLocaleTimeString('ko-KR')}`
                : '아직 입력된 내용이 없습니다'}
            </div>

            <button
              onClick={() =>
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
              }
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white text-sm font-medium shadow-lg shadow-indigo-200"
            >
              프로필 저장 상태 확인
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 입력 박스 */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div
                key={section.key}
                className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-[0_20px_60px_-30px_rgba(91,123,255,0.4)] p-5 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {section.description}
                    </p>
                  </div>
                  <span className="text-xs text-indigo-500 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                    STEP {['traits', 'values', 'interests', 'emotions'].indexOf(section.key) + 1}
                  </span>
                </div>

                <textarea
                  value={section.value}
                  onChange={(e) => section.setValue(e.target.value)}
                  placeholder={section.placeholder}
                  className="flex-1 w-full rounded-xl border border-gray-100 bg-gray-50/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-gray-700 p-4 resize-none min-h-[180px]"
                />
              </div>
            ))}
          </div>

          {/* 오른쪽 패널 */}
          <div className="space-y-6">
            {/* 인사이트 카드 */}
            <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
                Insight
              </p>
              <h2 className="text-2xl font-semibold mb-4">
                AI가 이해한 나의 모습
              </h2>
              <p className="text-sm text-gray-200 leading-relaxed">
                대화에서 수집된 정체성과 이 페이지에서 작성한 내용을 기반으로 더 정밀한 분석이 수행됩니다.
              </p>
              <div className="mt-5 flex items-center gap-3 text-sm text-gray-300">
                <i className="ri-shield-check-line text-2xl text-emerald-400" />
                저장된 내용은 개인화 추천 외에 사용되지 않습니다.
              </div>
            </div>

            {/* 제출 박스 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">
                  Next
                </p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  종합 분석 준비 완료
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  입력한 내용은 AI 상담 기록과 통합되어 상세 리포트를 생성합니다.
                </p>
              </div>

              {/* 저장 버튼 (HEAD 기준 완전 복원) */}
              <button
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={submitProfile}
                disabled={isSubmittingProfile}
              >
                <i className="ri-save-3-line text-xl" />
                {isSubmittingProfile ? '저장 중...' : '프로필 저장'}
              </button>

              {/* 성공 후 이동 */}
              <button
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                onClick={() => navigate('/career-chat')}
              >
                <i className="ri-check-double-line text-xl" />
                작성 완료하고 돌아가기
              </button>

              {/* 초기화 */}
              <button
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setTraits('');
                  setValues('');
                  setInterests('');
                  setEmotions('');
                }}
              >
                전체 초기화
              </button>

              {errorMessage && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
