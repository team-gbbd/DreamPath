import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteProfileModal from '@/components/profile/DeleteProfileModal';
import ValuesSummaryCard from '@/components/profile/ValuesSummaryCard';
import ValueDetailCard from '@/components/profile/ValueDetailCard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta?.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8080/api';

const PROFILE_CACHE_KEY = 'dreampath:profile-cache';
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getStoredUserId = () => {
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

const getCachedProfile = (userId) => {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache?.[userId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > PROFILE_CACHE_TTL) {
      delete cache[userId];
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.profile;
  } catch {
    return null;
  }
};

const setCachedProfile = (userId, profile) => {
  if (typeof window === 'undefined' || !userId || !profile) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[userId] = {
      timestamp: Date.now(),
      profile,
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

const removeCachedProfile = (userId) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return;
    const cache = JSON.parse(raw);
    if (!cache?.[userId]) return;
    delete cache[userId];
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

const TAB_LIST = [
  { key: 'overview', label: '전체 개요' },
  { key: 'personality', label: '성향 분석' },
  { key: 'values', label: '가치관' },
];

const TAB_DESCRIPTIONS = {
  overview: '핵심 지표와 요약 정보를 통해 현재 분석 상태를 빠르게 확인하세요.',
  personality: '성격 및 감정 지표를 시각화하여 나의 성향을 파악해보세요.',
  values: '중요하게 생각하는 가치가 어떤 양상을 보이는지 비교해보세요.',
};

const traitLabels = {
  openness: '개방성',
  conscientiousness: '성실성',
  stability: '정서 안정성',
  agreeableness: '우호성',
  extraversion: '외향성',
};

const valueLabels = {
  creativity: '창의성',
  growth: '성장 지향',
  security: '안정성',
};

const MBTI_DETAILS = {
  ESTJ: { title: '체계적인 리더', description: '명확한 목표와 조직적인 실행을 중시하는 유형입니다.' },
  ENTJ: { title: '전략가 리더', description: '비전을 세우고 팀을 이끄는 데 강한 능력을 보입니다.' },
  ENFJ: { title: '공감형 리더', description: '타인의 감정을 이해하고 협업을 이끄는 힘이 있습니다.' },
  ENFP: { title: '아이디어 메이커', description: '새로운 가능성을 발견하고 사람들에게 영감을 줍니다.' },
  ESTP: { title: '실행형 모험가', description: '빠르게 상황을 파악하고 과감히 행동합니다.' },
  ESFP: { title: '에너지 메이커', description: '주변에 활력을 전하며 실용적인 해결책을 찾습니다.' },
  ESFJ: { title: '협력형 서포터', description: '타인을 돕고 팀워크를 중시합니다.' },
  ENTP: { title: '창의적 토론가', description: '새로운 관점을 제시하고 논리로 설득합니다.' },
  ISTJ: { title: '신중한 관리자', description: '책임감 있게 일을 완수하고 안정성을 제공합니다.' },
  ISFJ: { title: '세심한 보조자', description: '섬세한 관찰력과 헌신으로 신뢰를 줍니다.' },
  INFJ: { title: '통찰형 조언자', description: '깊은 통찰력으로 의미 있는 방향을 제시합니다.' },
  INTJ: { title: '전략적 설계자', description: '장기 계획을 세우고 독창적인 방식으로 실행합니다.' },
  ISTP: { title: '문제 해결사', description: '실용적인 분석과 손재주로 난제를 해결합니다.' },
  INTP: { title: '이론가', description: '논리적 사고와 분석을 통해 새로운 개념을 탐구합니다.' },
  INFP: { title: '이상주의자', description: '가치를 중시하며 사람들에게 긍정적인 변화를 촉진합니다.' },
  ISFP: { title: '감성형 크리에이터', description: '자유롭고 따뜻한 태도로 조화를 추구합니다.' },
};

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const ProgressBar = ({ label, value, color = 'bg-indigo-500' }) => {
  const percent = Math.min(Math.max(Number(value) || 0, 0), 1) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{label}</span>
        <span>{percent.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(TAB_LIST[0].key);
  const [userId, setUserId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProfileData = useCallback(
    async (targetUserId, options = {}) => {
      const { signal } = options;
      const response = await fetch(`${API_BASE_URL}/profiles/${targetUserId}`, { signal });
      if (!response.ok) throw new Error('프로필 정보를 불러오지 못했습니다.');
      return response.json();
    },
    [],
  );

  const fetchAnalysisData = useCallback(
    async (targetUserId, options = {}) => {
      const { signal } = options;
      const response = await fetch(`${API_BASE_URL}/profiles/${targetUserId}/analysis`, { signal });
      if (!response.ok) throw new Error('분석 데이터를 불러오지 못했습니다.');
      return response.json();
    },
    [],
  );

  const fetchInitialData = useCallback(
    async (targetUserId, options = {}) => {
      const [profile, analysis] = await Promise.all([
        fetchProfileData(targetUserId, options),
        fetchAnalysisData(targetUserId, options),
      ]);
      setProfileData(profile);
      setCachedProfile(targetUserId, profile);
      setAnalysisData(analysis);
    },
    [fetchProfileData, fetchAnalysisData],
  );

  useEffect(() => {
    const storedId = getStoredUserId();
    setUserId(storedId);
    if (!storedId) {
      setError('유저 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const cachedProfile = getCachedProfile(storedId);
    if (cachedProfile) {
      setProfileData(cachedProfile);
    }

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchInitialData(storedId, { signal: controller.signal });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err?.message || '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [fetchInitialData]);

  const refreshDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const [profileRes, analysisRes] = await Promise.all([
        fetch(`${API_BASE_URL}/profiles/${userId}`),
        fetch(`${API_BASE_URL}/profiles/${userId}/analysis`),
      ]);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setProfileData(profile);
      }
      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        setAnalysisData(analysis);
      }
    } catch (err) {
      console.error('대시보드 데이터 갱신 실패', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchInitialData]);

  const currentTabLabel = useMemo(() => TAB_LIST.find((tab) => tab.key === activeTab)?.label, [activeTab]);

  const personalityChartData = useMemo(() => {
    const personality = safeParseJson(analysisData?.personality);
    if (!personality) return null;
    return Object.entries(personality).map(([key, value]) => ({
      key,
      trait: traitLabels[key] || key,
      score: Number(value) || 0,
    }));
  }, [analysisData]);

  const valuesChartData = useMemo(() => {
    const values = safeParseJson(analysisData?.values ?? profileData?.values);
    if (!values) return null;
    return Object.entries(values).map(([key, value]) => ({
      key,
      name: valueLabels[key] || key,
      score: Number(value) || 0,
      color:
        key === 'growth'
          ? '#4caf50'
          : key === 'security'
          ? '#3f51b5'
          : key === 'creativity'
          ? '#9c27b0'
          : '#f97316',
    }));
  }, [analysisData]);

  const emotionJson = useMemo(
    () => safeParseJson(analysisData?.emotions ?? profileData?.emotions),
    [analysisData, profileData],
  );

  const emotionProgressData = useMemo(() => {
    if (!emotionJson) return null;
    return Object.entries(emotionJson)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => ({
        name: key,
        score: Number(value),
      }));
  }, [emotionJson]);

  const valuesDetailData = useMemo(() => {
    if (!valuesChartData) return null;
    const priority = ['growth', 'security', 'creativity'];
    return valuesChartData
      .filter((value) => priority.includes(value.key))
      .sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key));
  }, [valuesChartData]);
  const mbtiTraits = useMemo(() => {
    const personality = safeParseJson(analysisData?.personality);
    if (!personality) return null;
    const extraversion = Number(personality.extraversion ?? 0.5);
    const openness = Number(personality.openness ?? 0.5);
    const agreeableness = Number(personality.agreeableness ?? 0.5);
    const conscientiousness = Number(personality.conscientiousness ?? 0.5);
    return [
      {
        pair: 'E / I',
        explanation: extraversion >= 0.5 ? '외향성 점수가 높아 E로 분류되었습니다.' : '외향성 점수가 낮아 I로 분류되었습니다.',
        score: extraversion,
      },
      {
        pair: 'N / S',
        explanation: openness >= 0.5 ? '개방성이 높아 N 성향입니다.' : '개방성이 낮아 S 성향입니다.',
        score: openness,
      },
      {
        pair: 'F / T',
        explanation: agreeableness >= 0.5 ? '우호성이 높아 F 성향입니다.' : '우호성이 낮아 T 성향입니다.',
        score: agreeableness,
      },
      {
        pair: 'J / P',
        explanation: conscientiousness >= 0.5 ? '성실성이 높아 J 성향입니다.' : '성실성이 낮아 P 성향입니다.',
        score: conscientiousness,
      },
    ];
  }, [analysisData]);

  const renderOverviewSection = () => (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-700">
        <p className="text-sm font-medium">MBTI</p>
        <span className="mt-1 inline-flex items-center rounded-full bg-white px-3 py-1 text-lg font-semibold text-indigo-700 shadow">
          {analysisData?.mbti || '미정'}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">신뢰도</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-600">
            {analysisData?.confidenceScore ? `${Math.round(analysisData.confidenceScore * 100)}%` : '-'}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">최종 업데이트</p>
          <p className="mt-1 text-lg font-medium text-gray-900">
            {analysisData?.createdAt ? new Date(analysisData.createdAt).toLocaleString() : '-'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-800">요약</h3>
        <p className="mt-2 text-gray-600">{emotionJson?.summary || '요약 정보가 아직 준비되지 않았습니다.'}</p>
      </div>
    </div>
  );

  const renderPersonalitySection = () => (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-800">성격 특성 분포</h3>
        {personalityChartData ? (
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={personalityChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="trait" />
                <Radar name="Personality" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">성격 데이터가 없습니다.</p>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-800">감정 반응 지표</h3>
        {emotionProgressData ? (
          <div className="mt-4 space-y-4">
            {emotionProgressData.map((item, index) => (
              <ProgressBar
                key={item.name}
                label={item.name}
                value={item.score}
                color={index % 2 === 0 ? 'bg-emerald-500' : 'bg-blue-500'}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">감정 데이터가 없습니다.</p>
        )}
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <h3 className="text-lg font-semibold text-indigo-700">MBTI Insights</h3>
        <p className="mt-1 text-sm text-indigo-500">
          {analysisData?.mbti ? `${analysisData.mbti} 유형` : 'MBTI 정보 없음'}
        </p>
        <p className="mt-3 text-gray-700">
          {analysisData?.mbti && MBTI_DETAILS[analysisData.mbti]
            ? MBTI_DETAILS[analysisData.mbti].description
            : 'MBTI 데이터가 준비되면 이 영역에서 해석을 확인할 수 있습니다.'}
        </p>
      </div>
      {mbtiTraits && (
        <div className="rounded-xl border p-4">
          <h3 className="text-lg font-semibold text-gray-800">MBTI 결정 근거</h3>
          <div className="mt-4 space-y-3">
            {mbtiTraits.map((trait) => (
              <div key={trait.pair} className="rounded-lg border bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{trait.pair}</span>
                  <span className="text-sm text-gray-500">{(trait.score * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{trait.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderValuesSection = () => (
    <div className="mt-6 space-y-6">
      <ValuesSummaryCard valuesJSON={analysisData?.values ?? profileData?.values} />
      <div className="rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-gray-800">가치관 집중도 (차트)</h3>
        {valuesChartData ? (
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valuesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score">
                  {valuesChartData.map((entry) => (
                    <Cell key={`cell-${entry.key}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">가치관 데이터가 없습니다.</p>
        )}
      </div>
      {valuesDetailData && (
        <div className="grid gap-4 md:grid-cols-3">
          {valuesDetailData.map((value) => (
            <ValueDetailCard key={value.key} type={value.key} score={value.score} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-wide text-white/80">MBTI Profile</p>
          <p className="mt-2 text-5xl font-black">{analysisData?.mbti ?? '----'}</p>
          <p className="mt-2 text-white/80">
            Big Five 기반으로 산출된 MBTI 유형입니다. 계속 데이터를 수집할수록 더 정교해집니다.
          </p>
        </div>
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">DreamPath Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">맞춤 분석 대시보드</h1>
          <p className="mt-2 text-gray-600">
            프로필 기반으로 생성된 분석 데이터를 확인하고, 관심 있는 영역을 더 깊이 살펴보세요.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-3">
          <nav className="flex flex-wrap gap-3">
            {TAB_LIST.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile/input')}
              className="rounded-full border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              프로필 수정
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              프로필 삭제
            </button>
          </div>
        </div>

        <section className="rounded-xl border p-6">
          {isLoading && <p className="text-gray-500">분석 데이터를 불러오는 중입니다...</p>}
          {!isLoading && error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{currentTabLabel}</h2>
              <p className="mt-2 text-gray-600">{TAB_DESCRIPTIONS[activeTab] || '탭을 선택해 상세 정보를 확인하세요.'}</p>

              {activeTab === 'overview' && renderOverviewSection()}
              {activeTab === 'personality' && renderPersonalitySection()}
              {activeTab === 'values' && renderValuesSection()}
            </div>
          )}
        </section>
      </div>
      <DeleteProfileModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        profileId={profileData?.profileId}
        onDeleted={() => {
          if (userId) {
            removeCachedProfile(userId);
          }
          setProfileData(null);
          setAnalysisData(null);
          setIsDeleteModalOpen(false);
          navigate('/profile-input', { replace: true });
        }}
      />
    </div>
  );
};

export default Dashboard;
