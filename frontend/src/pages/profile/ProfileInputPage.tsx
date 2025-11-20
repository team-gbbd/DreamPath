import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  (import.meta?.env?.NEXT_PUBLIC_API_URL as string | undefined) ||
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
                <p className="uppercase text-xs font-semibold text-indigo-500 tracking-[0.2em]">Profile Design</p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">나만의 정체성 카드 만들기</h1>
                <p className="text-sm text-gray-600 mt-1">
                  대화에서 드러난 정보를 정리해 두면 향후 AI 분석 및 추천의 정확도가 높아집니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white/80 transition-colors"
            >
              <i className="ri-refresh-line" />
              초기화
            </button>
          </div>

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
                <span className="text-lg font-semibold text-gray-800">{completion}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <i className="ri-time-line text-lg text-indigo-500" />
              {lastSaved ? `최근 저장 ${lastSaved.toLocaleTimeString('ko-KR')}` : '아직 입력된 내용이 없습니다'}
            </div>
            <button
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white text-sm font-medium shadow-lg shadow-indigo-200"
            >
              프로필 저장 상태 확인
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div
                key={section.key}
                className="bg-white/90 backdrop-blur rounded-2xl border border-white shadow-[0_20px_60px_-30px_rgba(91,123,255,0.4)] p-5 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{section.description}</p>
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

          <div className="space-y-6">
            <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Insight</p>
              <h2 className="text-2xl font-semibold mb-4">AI가 이해한 나의 모습</h2>
              <p className="text-sm text-gray-200 leading-relaxed">
                대화에서 수집된 정체성과 이 페이지에서 정리한 내용을 기반으로 더 정밀한 경력 인사이트를 제공해 드립니다.
                다음 분석 단계에서 곧바로 활용되니 구체적으로 작성해 주세요.
              </p>
              <div className="mt-5 flex items-center gap-3 text-sm text-gray-300">
                <i className="ri-shield-check-line text-2xl text-emerald-400" />
                저장된 내용은 개인화 추천 외 다른 용도로 사용되지 않습니다.
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Next</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">종합 분석 준비 완료</h3>
                <p className="text-sm text-gray-600 mt-2">
                  입력한 내용은 AI 상담 결과와 함께 통합해 상세 리포트를 생성합니다. 마음에 들지 않으면 언제든 수정할 수 있어요.
                </p>
              </div>
              <button
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={submitProfile}
                disabled={isSubmittingProfile}
              >
                <i className="ri-save-3-line text-xl" />
                {isSubmittingProfile ? '저장 중...' : '프로필 저장'}
              </button>
              <button
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                onClick={() => navigate('/career-chat')}
              >
                <i className="ri-check-double-line text-xl" />
                작성 완료하고 돌아가기
              </button>
              <button
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                onClick={handleReset}
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
