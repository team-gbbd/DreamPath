import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, MessageSquare, Bell, User, Settings, LogOut,
  Sun, Moon, Search, BookOpen, GraduationCap, Briefcase, Map, FileText,
  PieChart, Heart, Target, ChevronRight, Menu, X, Send, Check, AlertCircle, Bot
} from 'lucide-react';
import Button from '../../components/base/Button';
import { useToast } from '../../components/common/Toast';
import styles from './dashboard.module.css';

// Dashboard Logic Imports
import ValuesSummaryCard from '@/components/profile/ValuesSummaryCard';
import ValueDetailCard from '@/components/profile/ValueDetailCard';
import HybridJobRecommendPanel from '@/components/profile/HybridJobRecommendPanel';
import AssistantChatbot from "@/components/chatbot/AssistantChatbot";
import MajorRecommendPanel from '@/components/profile/MajorRecommendPanel';
import CounselRecommendPanel from '@/components/profile/CounselRecommendPanel';
import { BACKEND_BASE_URL, backendApi, bookingService, paymentService, mentorService, authFetch } from '@/lib/api';
import { fetchHybridJobs, fetchMajors } from '@/pages/profile/recommendApi';
import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';

// --- Types & Constants from Dashboard.tsx ---
const PROFILE_CACHE_KEY = 'dreampath:profile-cache';
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type TabKey =
  | 'dashboard' // mapped from 'overview'
  | 'profile'   // new
  | 'personality'
  | 'values'
  | 'jobs'      // mapped from 'jobRecommend'
  | 'majors'    // mapped from 'departmentRecommend'
  | 'roadmap'   // new
  | 'counsel'   // mapped from 'counselCase'
  | 'learning'
  | 'mentoring'
  | 'settings';

interface ProfileData {
  profileId?: number;
  values?: string | Record<string, number> | null;
  emotions?: string | Record<string, number | string> | null;
}

interface AnalysisData {
  mbti?: string | null;
  personality?: string | Record<string, number> | null;
  values?: string | Record<string, number> | null;
  emotions?: string | Record<string, number | string> | null;
  confidenceScore?: number | null;
  createdAt?: string | null;
  summary?: string | null;
  strengths?: string[] | null;
  risks?: string[] | null;
  goals?: string[] | null;
  valuesList?: string[] | null; // 가치 텍스트 목록 (values는 점수용)
}

type ProfileCache = Record<string, { timestamp: number; profile: ProfileData }>;

interface FetchOptions {
  signal?: AbortSignal;
}

const traitLabels: Record<string, string> = {
  openness: '개방성',
  conscientiousness: '성실성',
  stability: '정서 안정성',
  agreeableness: '우호성',
  extraversion: '외향성',
};

const valueLabels: Record<string, string> = {
  creativity: '창의성',
  growth: '성장 지향',
  security: '안정성',
};

const MBTI_DETAILS: Record<string, { title: string; description: string; }> = {
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

// --- Helper Functions ---
const getStoredUserId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('dreampath:user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: number };
    return typeof parsed?.userId === 'number' ? parsed.userId : null;
  } catch {
    return null;
  }
};

const getCachedProfile = (userId: number | null): ProfileData | null => {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ProfileCache;
    const key = String(userId);
    const entry = cache?.[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > PROFILE_CACHE_TTL) {
      delete cache[key];
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.profile;
  } catch {
    return null;
  }
};

const setCachedProfile = (userId: number | null, profile: ProfileData | null): void => {
  if (typeof window === 'undefined' || !userId || !profile) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as ProfileCache) : {};
    const key = String(userId);
    cache[key] = {
      timestamp: Date.now(),
      profile,
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

const removeCachedProfile = (userId: number | null): void => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return;
    const cache = JSON.parse(raw) as ProfileCache;
    const key = String(userId);
    if (!cache?.[key]) return;
    delete cache[key];
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache errors
  }
};

const getMbtiDetails = (mbti?: string | null) => {
  if (!mbti) return null;
  return MBTI_DETAILS[mbti as keyof typeof MBTI_DETAILS] ?? null;
};

const safeParseJson = <T,>(value: string | T | null | undefined): T | null => {
  if (value == null) return null;
  if (typeof value !== 'string') {
    return value as T;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

interface ProgressBarProps {
  label: string;
  value: number | string | null | undefined;
  color?: string;
}

const ProgressBar = ({ label, value, color = 'bg-indigo-500' }: ProgressBarProps) => {
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

// 날짜 포맷 함수
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export default function NewDashboard() {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [showAssistantChat, setShowAssistantChat] = useState(false);

  // Mentor application form state
  const [company, setCompany] = useState('');
  const [job, setJob] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [mentorBio, setMentorBio] = useState('');
  const [mentorCareer, setMentorCareer] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    userId?: number;
    username?: string;
    name?: string;
    email?: string;
    phone?: string;
    birth?: string;
    createdAt?: string;
    role?: string;
  } | null>(null);

  // --- Dashboard Logic State ---
  const [userId, setUserId] = useState<number | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top Recommendations State for Overview
  const [topJobs, setTopJobs] = useState<any[]>([]);
  const [topMajors, setTopMajors] = useState<any[]>([]);

  // Mentoring State
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [mentorBookings, setMentorBookings] = useState<any[]>([]);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [mentorInfo, setMentorInfo] = useState<{ mentorId: number; status: string } | null>(null);

  // Learning Path State
  const [learningPaths, setLearningPaths] = useState<any[]>([]);

  // --- Data Fetching Logic ---
  const fetchProfileData = useCallback(
    async (targetUserId: number, options: FetchOptions = {}) => {
      const { signal } = options;
      const response = await backendApi.get(`/profiles/${targetUserId}`, { signal });
      return response.data as ProfileData;
    },
    [],
  );

  const fetchAnalysisData = useCallback(
    async (targetUserId: number, options: FetchOptions = {}) => {
      const { signal } = options;
      const response = await backendApi.get(`/profiles/${targetUserId}/analysis`, { signal });
      return response.data as AnalysisData;
    },
    [],
  );

  const fetchTopRecommendations = useCallback(async (profileId: number) => {
    try {
      // 1. Get Vector ID
      const statusRes = await backendApi.get(`/vector/status/${profileId}`);
      if (statusRes.data?.ready && statusRes.data?.vectorId) {
        const vectorId = statusRes.data.vectorId;

        // 2. Fetch Jobs
        const jobs = await fetchHybridJobs(vectorId, 3);
        if (Array.isArray(jobs)) {
          setTopJobs(jobs.slice(0, 3).map((job: any, index: number) => ({
            rank: index + 1,
            title: job.title || job.metadata?.jobName || '직업',
            match: Math.round((job.score || 0) * 100),
            tag: job.metadata?.job_category || '직업',
            color: index === 0 ? 'from-indigo-500 to-indigo-600' : index === 1 ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'
          })));
        }

        // 3. Fetch Majors
        const majors = await fetchMajors(vectorId);
        const majorsList = Array.isArray(majors) ? majors : (majors?.items || []);

        if (Array.isArray(majorsList)) {
          setTopMajors(majorsList.slice(0, 3).map((major: any, index: number) => ({
            rank: index + 1,
            title: major.title
              || major.metadata?.deptName
              || major.metadata?.mClass
              || major.metadata?.majorName
              || major.metadata?.department
              || '학과',
            match: Math.round((major.score || 0) * 100),
            tag: major.metadata?.lClass || major.metadata?.field || major.metadata?.category || '학과',
            color: index === 0 ? 'from-green-500 to-green-600' : index === 1 ? 'from-emerald-500 to-emerald-600' : 'from-teal-500 to-teal-600'
          })));
        }
      }
    } catch (e) {
      console.error("Failed to fetch top recommendations", e);
    }
  }, []);

  const fetchInitialData = useCallback(
    async (targetUserId: number, options: FetchOptions = {}) => {
      const [profile, analysis] = await Promise.all([
        fetchProfileData(targetUserId, options),
        fetchAnalysisData(targetUserId, options),
      ]);
      setProfileData(profile);
      setCachedProfile(targetUserId, profile);
      setAnalysisData(analysis);

      if (profile.profileId) {
        fetchTopRecommendations(profile.profileId);
      }
    },
    [fetchProfileData, fetchAnalysisData, fetchTopRecommendations],
  );

  useEffect(() => {
    const storedId = getStoredUserId();
    setUserId(storedId);

    // Sync user for header
    const syncUser = () => {
      const stored = localStorage.getItem("dreampath:user");
      setCurrentUser(stored ? JSON.parse(stored) : null);
    };
    syncUser();

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

        // Fetch mentoring bookings and remaining sessions
        try {
          const bookings = await bookingService.getMyBookings(storedId);
          setMyBookings(bookings || []);
        } catch (e) {
          console.error('예약 목록 조회 실패:', e);
        }

        try {
          const sessions = await paymentService.getRemainingSessions(storedId);
          setRemainingSessions(sessions || 0);
        } catch (e) {
          console.error('잔여 횟수 조회 실패:', e);
        }

        // Check if user is a mentor and fetch mentor bookings
        try {
          const mentor = await mentorService.getMyApplication(storedId);
          if (mentor && mentor.status === 'APPROVED') {
            setMentorInfo({ mentorId: mentor.mentorId, status: mentor.status });
            const mBookings = await bookingService.getMentorBookings(mentor.mentorId);
            setMentorBookings(mBookings || []);
          }
        } catch (e) {
          // Not a mentor or error - ignore
        }

        // Fetch learning paths
        try {
          const pathsResponse = await authFetch(`${BACKEND_BASE_URL}/api/learning-paths/user/${storedId}`);
          if (pathsResponse.ok) {
            const paths = await pathsResponse.json();
            setLearningPaths(paths || []);
          }
        } catch (e) {
          console.error('학습 경로 조회 실패:', e);
        }
      } catch (err: any) {
        // AbortController 취소 에러 무시 (DOMException 또는 axios CanceledError)
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') return;
        const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    const authHandler = () => syncUser();
    const storageHandler = () => syncUser();
    window.addEventListener("dreampath-auth-change", authHandler as EventListener);
    window.addEventListener("storage", storageHandler as EventListener);

    return () => {
      controller.abort();
      window.removeEventListener("dreampath-auth-change", authHandler as EventListener);
      window.removeEventListener("storage", storageHandler as EventListener);
    };
  }, [fetchInitialData]);

  const handleLogout = () => {
    localStorage.removeItem("dreampath:user");

    // 챗봇 세션 및 대화 내용 초기화
    sessionStorage.removeItem("assistant_chatbot_session_id");
    sessionStorage.removeItem("assistant_chatbot_messages");
    sessionStorage.removeItem("chatbot_session_id");
    sessionStorage.removeItem("chatbot_messages");
    sessionStorage.removeItem("faq_chatbot_session_id");
    sessionStorage.removeItem("faq_chatbot_messages");

    // 마지막 사용자 ID 초기화 (다음 로그인 시 변경 감지용)
    localStorage.setItem("assistant_chatbot_last_user_id", "null");
    localStorage.setItem("chatbot_last_user_id", "null");
    localStorage.setItem("faq_chatbot_last_user_id", "null");

    window.dispatchEvent(new Event("dreampath-auth-change"));
    showToast("로그아웃되었습니다.", "success");
    navigate("/", { replace: true });
  };

  // --- Memos for Charts ---
  const personalityJson = useMemo(
    () => safeParseJson<Record<string, unknown>>(analysisData?.personality),
    [analysisData],
  );

  const personalityChartData = useMemo(() => {
    if (!personalityJson) return null;
    const traitSource =
      (personalityJson as Record<string, unknown>).traits &&
        typeof (personalityJson as Record<string, unknown>).traits === 'object'
        ? ((personalityJson as Record<string, unknown>).traits as Record<string, unknown>)
        : personalityJson;

    const entries = Object.entries(traitSource).filter(([, value]) => typeof value === 'number');
    if (!entries.length) return null;

    return entries.map(([key, value]) => ({
      key,
      trait: traitLabels[key] || key,
      score: Number(value) || 0,
    }));
  }, [personalityJson]);

  const personalityNarrative = useMemo(() => {
    if (!personalityJson || typeof personalityJson !== 'object') {
      return null;
    }
    const data = personalityJson as Record<string, unknown>;
    const toStringArray = (input: unknown): string[] =>
      Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];

    return {
      type: typeof data.type === 'string' ? data.type : null,
      description: typeof data.description === 'string' ? data.description : null,
      strengths: toStringArray(data.strengths),
      growthAreas: toStringArray(data.growthAreas),
    };
  }, [personalityJson]);

  const valuesJson = useMemo(
    () => safeParseJson<Record<string, unknown>>(analysisData?.values ?? profileData?.values),
    [analysisData, profileData],
  );

  const valuesChartData = useMemo(() => {
    if (!valuesJson) return null;
    const valueSource =
      (valuesJson as Record<string, unknown>).scores && typeof (valuesJson as Record<string, unknown>).scores === 'object'
        ? ((valuesJson as Record<string, unknown>).scores as Record<string, unknown>)
        : valuesJson;

    const entries = Object.entries(valueSource).filter(([, value]) => typeof value === 'number');
    if (!entries.length) return null;

    return entries.map(([key, value]) => ({
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
  }, [valuesJson]);

  const emotionJson = useMemo(
    () => safeParseJson<Record<string, number | string>>(analysisData?.emotions ?? profileData?.emotions),
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
    const personality = safeParseJson<Record<string, number>>(analysisData?.personality);
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

  // --- Render Sections ---
  const renderOverviewSection = () => (
    <div className="space-y-6">
      {/* Career Summary Card */}
      <div className={styles['glass-card']}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center">
            <Target size={24} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">나의 진로 요약</h2>
        </div>

        <div className="mb-5">
          <p className="text-lg font-bold text-indigo-600 mb-3">
            {analysisData?.mbti ? `"${analysisData.mbti} 유형의 잠재력을 가진 인재"` : '"분석 중..."'}
          </p>
          <p className="text-slate-700 leading-relaxed text-sm">
            {analysisData?.summary || '요약 정보가 아직 준비되지 않았습니다.'}
          </p>
        </div>

        {/* Goals Section */}
        {analysisData?.goals && analysisData.goals.length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <Target size={16} />
              나의 목표
            </h4>
            <ul className="space-y-2">
              {analysisData.goals.map((goal, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Values Section */}
        {analysisData?.valuesList && analysisData.valuesList.length > 0 && (
          <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <Heart size={16} />
              핵심 가치
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysisData.valuesList.map((value, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-white text-purple-700 rounded-full text-xs font-medium border border-purple-200 shadow-sm">
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={() => setActiveTab('personality')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg">
            상세 리포트 보기
          </button>
          <button onClick={() => setActiveTab('roadmap')} className="px-5 py-2.5 bg-white/80 text-slate-700 rounded-xl text-sm font-bold hover:bg-white transition-colors border border-slate-200 shadow-sm">
            로드맵 생성하기
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Jobs */}
        <div className={styles['glass-card']}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center">
                <Briefcase size={20} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">추천 직업 TOP 3</h3>
            </div>
            <button onClick={() => setActiveTab('jobs')} className="text-slate-400 hover:text-indigo-600">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {topJobs.length > 0 ? topJobs.map((job) => (
              <div key={job.rank} className="flex items-center justify-between p-3 rounded-2xl bg-white/20 hover:bg-white/40 transition-all cursor-pointer group border border-white/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${job.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {job.rank}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-indigo-700 text-sm">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.tag}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-indigo-600">{job.match}%</span>
                  <p className="text-[10px] text-slate-500">일치</p>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500 text-center py-4">추천 데이터를 불러오는 중...</p>}
          </div>
        </div>

        {/* Top 3 Majors */}
        <div className={styles['glass-card']}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
                <GraduationCap size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">추천 학과 TOP 3</h3>
            </div>
            <button onClick={() => setActiveTab('majors')} className="text-slate-400 hover:text-green-600">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {topMajors.length > 0 ? topMajors.map((major) => (
              <div key={major.rank} className="flex items-center justify-between p-3 rounded-2xl bg-white/20 hover:bg-white/40 transition-all cursor-pointer group border border-white/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${major.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {major.rank}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-green-700 text-sm">{major.title}</p>
                    <p className="text-xs text-slate-500">{major.tag}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-green-600">{major.match}%</span>
                  <p className="text-[10px] text-slate-500">일치</p>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500 text-center py-4">추천 데이터를 불러오는 중...</p>}
          </div>
        </div>
      </div>

      {/* Roadmap CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">나만의 진로 로드맵을 만들어보세요</h3>
              <p className="text-indigo-100 mb-4 max-w-2xl text-sm">
                AI가 현재 상태를 분석하여 목표 달성을 위한 단계별 가이드를 제공합니다. 지금 바로 시작해보세요.
              </p>
              <button onClick={() => setActiveTab('roadmap')} className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg">
                로드맵 생성 시작하기
              </button>
            </div>
            <div className="hidden lg:block">
              <Map size={100} className="opacity-30" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalitySection = () => {
    const selectedMbtiDetail = getMbtiDetails(analysisData?.mbti);
    return (
      <div className="space-y-6">
        <div className={styles['glass-card']}>
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

        {personalityNarrative && (
          <div className={styles['glass-card']}>
            <h3 className="text-lg font-semibold text-gray-800">AI 성향 리포트</h3>
            {personalityNarrative.type && (
              <p className="mt-1 text-sm text-indigo-600 font-semibold">{personalityNarrative.type}</p>
            )}
            {personalityNarrative.description && (
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{personalityNarrative.description}</p>
            )}
            {(personalityNarrative.strengths.length > 0 || personalityNarrative.growthAreas.length > 0) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {personalityNarrative.strengths.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">강점</p>
                    <div className="flex flex-wrap gap-2">
                      {personalityNarrative.strengths.map((item, idx) => (
                        <span key={`${item}-${idx}`} className="rounded-full bg-white px-3 py-1 text-xs text-emerald-700 shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {personalityNarrative.growthAreas.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">성장 포인트</p>
                    <div className="flex flex-wrap gap-2">
                      {personalityNarrative.growthAreas.map((item, idx) => (
                        <span key={`${item}-${idx}`} className="rounded-full bg-white px-3 py-1 text-xs text-amber-700 shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles['glass-card']}>
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

        <div className={`${styles['glass-card']} bg-indigo-50/50`}>
          <h3 className="text-lg font-semibold text-indigo-700">MBTI Insights</h3>
          <p className="mt-1 text-sm text-indigo-500">
            {analysisData?.mbti ? `${analysisData.mbti} 유형` : 'MBTI 정보 없음'}
          </p>
          <p className="mt-3 text-gray-700">
            {selectedMbtiDetail
              ? selectedMbtiDetail.description
              : 'MBTI 데이터가 준비되면 이 영역에서 해석을 확인할 수 있습니다.'}
          </p>
        </div>

        {/* Strengths & Risks Cards */}
        {(analysisData?.strengths && analysisData.strengths.length > 0) || (analysisData?.risks && analysisData.risks.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths Card */}
            {analysisData?.strengths && analysisData.strengths.length > 0 && (
              <div className={styles['glass-card']}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">나의 강점</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisData.strengths.map((strength, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200 shadow-sm hover:bg-green-100 transition-colors">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risks Card */}
            {analysisData?.risks && analysisData.risks.length > 0 && (
              <div className={styles['glass-card']}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                    <AlertCircle size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">주의할 점</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisData.risks.map((risk, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200 shadow-sm hover:bg-amber-100 transition-colors">
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {mbtiTraits && (
          <div className={styles['glass-card']}>
            <h3 className="text-lg font-semibold text-gray-800">MBTI 결정 근거</h3>
            <div className="mt-4 space-y-3">
              {mbtiTraits.map((trait) => (
                <div key={trait.pair} className="rounded-lg border bg-gray-50/50 px-4 py-3">
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
  };

  const renderValuesSection = () => (
    <div className="space-y-6">
      <ValuesSummaryCard valuesJSON={analysisData?.values ?? profileData?.values} />
      <div className={styles['glass-card']}>
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

      {/* Values Text List Card */}
      {analysisData?.valuesList && analysisData.valuesList.length > 0 && (
        <div className={styles['glass-card']}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-200 rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">나의 핵심 가치</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Personality Agent가 분석한 당신의 핵심 가치관입니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {analysisData.valuesList.map((value, idx) => (
              <span key={idx} className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200 shadow-sm hover:shadow-md hover:scale-105 transition-all">
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {valuesDetailData && (
        <div className="grid gap-4 md:grid-cols-3">
          {valuesDetailData.map((value) => (
            <ValueDetailCard key={value.key} type={value.key} score={value.score} />
          ))}
        </div>
      )}
    </div>
  );

  const renderLearningSection = () => {
    // weeklySessions에서 평균 점수 계산하는 헬퍼 (완료된 주차 기준)
    const getAvgScore = (path: any) => {
      if (!path.weeklySessions) return 0;
      const completedSessions = path.weeklySessions.filter((s: any) => s.status === 'COMPLETED');
      if (completedSessions.length === 0) return 0;
      const totalEarned = completedSessions.reduce((sum: number, s: any) => sum + (s.earnedScore || 0), 0);
      return Math.round(totalEarned / completedSessions.length);
    };

    // 학습 통계 계산
    const totalProgress = learningPaths.length > 0
      ? Math.round(learningPaths.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / learningPaths.length)
      : 0;
    const avgScoreAll = learningPaths.length > 0
      ? Math.round(learningPaths.reduce((sum, p) => sum + getAvgScore(p), 0) / learningPaths.length)
      : 0;
    const activeCount = learningPaths.filter(p => p.status === 'ACTIVE').length;

    // 가장 잘하는 학습 (평균 점수 가장 높은 경로)
    const bestPath = learningPaths.length > 0
      ? learningPaths.reduce((best, current) => {
          return getAvgScore(current) > getAvgScore(best) ? current : best;
        }, learningPaths[0])
      : null;
    const bestPathAvgScore = bestPath ? getAvgScore(bestPath) : 0;

    // AI 코치 메시지 생성 (가장 잘하는 학습 + 그 안의 약점 보완 조언)
    const getCoachMessage = () => {
      if (learningPaths.length === 0) {
        return {
          message: "아직 시작한 학습이 없네요! 프로필 분석 결과를 바탕으로 당신에게 딱 맞는 진로를 찾아볼까요?",
          tip: "💡 관심 직업을 선택하면 해당 분야의 체계적인 학습 경로를 제공해드려요.",
          action: "/learning",
          actionLabel: "학습 시작하기"
        };
      }

      // 가장 잘하는 학습의 약점 태그
      const bestWeakTags = bestPath?.weaknessTags || [];
      const hasWeakness = bestWeakTags.length > 0;
      const topWeakness = bestWeakTags.slice(0, 2).join(', ');

      // 가장 잘하는 학습 기반 + 약점 보완 조언
      if (bestPath && bestPathAvgScore >= 80) {
        return {
          message: `'${bestPath.domain}' 분야에서 평균 ${bestPathAvgScore}점! 이 분야에 확실한 적성이 보여요 ⭐`,
          tip: hasWeakness
            ? `💡 더 완벽해지려면: '${topWeakness}' 부분을 보완하면 전문가 수준이 될 수 있어요!`
            : `💡 ${bestPath.domain} 관련 자격증이나 포트폴리오를 준비해보세요.`,
          action: `/learning/${bestPath.pathId}`,
          actionLabel: "강점 분야 이어가기"
        };
      }

      if (bestPath && bestPathAvgScore >= 60) {
        return {
          message: `'${bestPath.domain}' 분야에서 좋은 성과를 보이고 있어요! 이 방향이 잘 맞는 것 같아요.`,
          tip: hasWeakness
            ? `💡 점수 UP 포인트: '${topWeakness}' 개념을 다시 정리하면 80점대도 가능해요!`
            : `💡 꾸준히 학습하면 곧 고득점에 도달할 수 있어요!`,
          action: `/learning/${bestPath.pathId}`,
          actionLabel: "학습 계속하기"
        };
      }

      if (bestPath && bestPathAvgScore > 0) {
        return {
          message: `'${bestPath.domain}' 학습을 시작했네요! 기초를 탄탄히 다지고 있어요.`,
          tip: hasWeakness
            ? `💡 집중 포인트: '${topWeakness}' 부분을 먼저 이해하면 전체 학습이 수월해져요!`
            : `💡 처음엔 누구나 어려워요. 지금 쌓는 기초가 나중에 큰 자산이 됩니다!`,
          action: `/learning/${bestPath.pathId}`,
          actionLabel: "이어서 학습하기"
        };
      }

      // 학습은 있지만 아직 점수가 없는 경우
      return {
        message: `${activeCount}개의 학습이 진행 중이에요! 문제를 풀어보면서 나에게 맞는 분야를 찾아봐요.`,
        tip: "💡 다양한 분야를 경험해보는 것도 진로 탐색의 좋은 방법이에요!",
        action: "/learning",
        actionLabel: "학습하러 가기"
      };
    };

    const coachData = getCoachMessage();

    return (
      <div className="space-y-6">
        {/* AI 학습 코치 카드 */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-slate-800">AI 학습 코치</p>
                <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">맞춤 조언</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                {coachData.message}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg">
                  {coachData.tip}
                </p>
                <Link
                  to={coachData.action}
                  className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full transition-colors flex items-center gap-1"
                >
                  {coachData.actionLabel}
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <PieChart size={20} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">평균 진행률</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 mb-1">{totalProgress}%</p>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${totalProgress}%` }} />
            </div>
          </div>

          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">평균 점수</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 mb-1">{avgScoreAll}점</p>
          </div>

          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">진행 중인 학습</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 mb-1">{activeCount}개</p>
          </div>
        </div>

        {/* 가장 잘하는 학습 */}
        <div className={styles['glass-card']}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <GraduationCap size={20} className="text-pink-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">가장 잘하는 학습</h3>
            </div>
            <Link
              to="/learning"
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              대시보드
              <ChevronRight size={16} />
            </Link>
          </div>

          {bestPath && bestPathAvgScore > 0 ? (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{bestPath.domain}</h4>
                  <p className="text-sm text-slate-500">평균 {bestPathAvgScore}점</p>
                </div>
                <Link
                  to={`/learning?career=${encodeURIComponent(bestPath.domain)}`}
                  className="px-3 py-1.5 bg-pink-500 text-white text-xs font-medium rounded-lg hover:bg-pink-600 transition-colors"
                >
                  학습하기
                </Link>
              </div>
            </div>
          ) : learningPaths.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm mb-4">아직 시작한 학습이 없습니다</p>
              <button
                onClick={() => setActiveTab('roadmap')}
                className="px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors"
              >
                학습 시작하기
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm">학습을 진행하면 결과가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getBookingStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: '확정' };
      case 'PENDING':
        return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: '대기중' };
      case 'COMPLETED':
        return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: '완료' };
      case 'CANCELLED':
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: '취소됨' };
      case 'REJECTED':
        return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: '거절됨' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
    }
  };

  const renderMentoringSection = () => {
    const isMentor = mentorInfo && mentorInfo.status === 'APPROVED';

    return (
    <div className="space-y-6">
      {/* Mentoring Stats Grid - 멘티용 */}
      {!isMentor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 잔여 횟수 */}
          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} className="text-yellow-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">잔여 횟수</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600 mb-1">{remainingSessions}회</p>
          </div>

          {/* 멘토 찾기 */}
          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                <Search size={20} className="text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">멘토 찾기</h3>
            </div>
            <button onClick={() => navigate('/mentoring')} className="text-sm text-purple-600 font-semibold hover:underline">
              세션 둘러보기
            </button>
          </div>

          {/* 내 예약 */}
          <div className={styles['glass-card']}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                <Heart size={20} className="text-pink-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">내 예약</h3>
            </div>
            <p className="text-3xl font-bold text-pink-600 mb-1">{myBookings.length}건</p>
          </div>
        </div>
      )}

      {/* My Reservations - 멘티용 */}
      {!isMentor && (
        <div className={styles['glass-card']}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl flex items-center justify-center">
              <Heart size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">나의 예약</h3>
              <p className="text-sm text-slate-500">예약한 멘토링 세션</p>
            </div>
          </div>

          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Heart size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm mb-6">예약한 세션이 없습니다</p>
              <button onClick={() => navigate('/mentoring')} className="px-6 py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg">
                세션 찾아보기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((booking) => {
                const status = getBookingStatusStyle(booking.status);
                return (
                  <div key={booking.bookingId} className={`border ${status.border} rounded-xl p-4 ${status.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full flex items-center justify-center">
                          <User size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{booking.mentorName}</h4>
                          <p className="text-xs text-slate-500">멘토</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg ${status.bg} ${status.text} border ${status.border}`}>
                        {status.label}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 mb-2">{booking.sessionTitle}</p>

                    {booking.rejectionReason && (
                      <div className="bg-white/50 rounded-lg p-2 mb-2">
                        <p className="text-xs text-rose-600">거절 사유: {booking.rejectionReason}</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mb-3">
                      예약일: {booking.bookingDate} {booking.timeSlot}
                    </p>

                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => navigate(`/mentoring/meeting/${booking.bookingId}`)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        세션 입장하기
                      </button>
                    )}
                    {booking.status === 'PENDING' && (
                      <button
                        onClick={async () => {
                          if (confirm('예약을 취소하시겠습니까?')) {
                            try {
                              await bookingService.cancelBooking(booking.bookingId);
                              showToast('예약이 취소되었습니다.', 'success');
                              const bookings = await bookingService.getMyBookings(userId!);
                              setMyBookings(bookings || []);
                            } catch (e) {
                              showToast('취소 실패', 'error');
                            }
                          }
                        }}
                        className="w-full py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        예약 취소
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mentor's Sessions (only for approved mentors) */}
      {mentorInfo && mentorInfo.status === 'APPROVED' && (
        <div className={styles['glass-card']}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">멘토링 세션</h3>
              <p className="text-sm text-slate-500">내가 진행하는 멘토링</p>
            </div>
          </div>

          {mentorBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <User size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm mb-6">예약된 멘토링이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentorBookings
                .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
                .map((booking) => {
                  const status = getBookingStatusStyle(booking.status);
                  return (
                    <div key={booking.bookingId} className={`border ${status.border} rounded-xl p-4 ${status.bg}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-500 rounded-full flex items-center justify-center">
                            <User size={20} className="text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{booking.menteeName}</h4>
                            <p className="text-xs text-slate-500">멘티</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-lg ${status.bg} ${status.text} border ${status.border}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-slate-800 mb-2">{booking.sessionTitle}</p>

                      <p className="text-xs text-slate-500 mb-3">
                        예약일: {booking.bookingDate} {booking.timeSlot}
                      </p>

                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => navigate(`/mentoring/meeting/${booking.bookingId}`)}
                          className="w-full py-2 bg-gradient-to-r from-violet-400 to-violet-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          세션 입장하기
                        </button>
                      )}
                      {booking.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await bookingService.confirmBooking(booking.bookingId);
                                showToast('예약이 승인되었습니다.', 'success');
                                // Refresh bookings
                                const mBookings = await bookingService.getMentorBookings(mentorInfo.mentorId);
                                setMentorBookings(mBookings || []);
                              } catch (e) {
                                showToast('승인 실패', 'error');
                              }
                            }}
                            className="flex-1 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                          >
                            승인
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('거절 사유를 입력하세요:');
                              if (reason) {
                                try {
                                  await bookingService.rejectBooking(booking.bookingId, reason);
                                  showToast('예약이 거절되었습니다.', 'success');
                                  const mBookings = await bookingService.getMentorBookings(mentorInfo.mentorId);
                                  setMentorBookings(mBookings || []);
                                } catch (e) {
                                  showToast('거절 실패', 'error');
                                }
                              }
                            }}
                            className="flex-1 py-2 bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Become a Mentor CTA - 멘토가 아닐 때만 표시 */}
      {!isMentor && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <User size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">멘토가 되어보세요!</h3>
            <p className="text-purple-100 mb-6 max-w-md">
              후배들의 성장을 도와주실 멘토를 모집합니다.
            </p>
            <button onClick={() => setShowMentorModal(true)} className="px-6 py-3 bg-white text-purple-600 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors shadow-lg">
              멘토 신청하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderSettingsSection = () => (
    <div className="space-y-6">
      <div className={styles['glass-card']}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl flex items-center justify-center">
              <Settings size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">계정 정보</h2>
              <p className="text-sm text-slate-500">개인정보 확인 및 관리</p>
            </div>
          </div>
          <button disabled className="px-4 py-2 text-sm text-pink-600 hover:text-pink-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1">
            <FileText size={16} />
            수정하기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 이름 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">이름</p>
            <p className="text-sm font-medium text-gray-900">{currentUser?.name || '-'}</p>
          </div>

          {/* 아이디 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">아이디</p>
            <p className="text-sm font-medium text-gray-900">{currentUser?.username || '-'}</p>
          </div>

          {/* 이메일 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">이메일</p>
            <p className="text-sm font-medium text-gray-900">{currentUser?.email || '-'}</p>
          </div>

          {/* 전화번호 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">전화번호</p>
            <p className="text-sm font-medium text-gray-900">{currentUser?.phone || '-'}</p>
          </div>

          {/* 생년월일 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">생년월일</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(currentUser?.birth)}</p>
          </div>

          {/* 가입일 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">가입일</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(currentUser?.createdAt)}</p>
          </div>

          {/* 계정 상태 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">계정 상태</p>
            <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-600">
              활성
            </span>
          </div>

          {/* 역할 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">역할</p>
            <span className="text-xs px-2 py-1 rounded bg-pink-50 text-pink-600">
              {mentorInfo?.status === 'APPROVED' ? '멘토' : currentUser?.role === 'ADMIN' ? '관리자' : '학생'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ToastContainer />

      {/* Main Page Header */}
      

      {/* Main Dashboard Container */}
      <div className={styles['glass-container']}>
        {/* Transparent Container Box wrapping BOTH sidebar and main content */}
        <div className={styles['glass-box']}>

          {/* Left Sidebar */}
          <div className={`${styles['glass-sidebar']} ${sidebarOpen ? 'w-64' : 'w-20'}`}>
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  D
                </div>
                {sidebarOpen && <span className="font-bold text-lg text-slate-800">DreamPath</span>}
              </div>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-700">
                <Menu size={20} />
              </button>
            </div>

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
              {/* Career & AI Analysis */}
              <div>
                {sidebarOpen && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
                    Career & AI Analysis
                  </h3>
                )}
                <nav className="space-y-1">
                  <SidebarItem icon={<User size={20} />} label="프로필" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<LayoutGrid size={20} />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<PieChart size={20} />} label="성향 분석" active={activeTab === 'personality'} onClick={() => setActiveTab('personality')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<Heart size={20} />} label="가치관 분석" active={activeTab === 'values'} onClick={() => setActiveTab('values')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<Briefcase size={20} />} label="직업 추천" active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<GraduationCap size={20} />} label="학과 추천" active={activeTab === 'majors'} onClick={() => setActiveTab('majors')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<Map size={20} />} label="진로 로드맵" active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} badge="AI" collapsed={!sidebarOpen} />
                  <SidebarItem icon={<FileText size={20} />} label="상담 사례" active={activeTab === 'counsel'} onClick={() => setActiveTab('counsel')} collapsed={!sidebarOpen} />
                </nav>
              </div>

              {/* Learning & Account */}
              <div>
                {sidebarOpen && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
                    Learning & Account
                  </h3>
                )}
                <nav className="space-y-1">
                  <SidebarItem icon={<BookOpen size={20} />} label="학습 현황" active={activeTab === 'learning'} onClick={() => setActiveTab('learning')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<MessageSquare size={20} />} label="멘토링" active={activeTab === 'mentoring'} onClick={() => setActiveTab('mentoring')} collapsed={!sidebarOpen} />
                  <SidebarItem icon={<Settings size={20} />} label="계정 설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!sidebarOpen} />
                </nav>
              </div>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-200">
              <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-bold shadow">
                  {currentUser?.name?.[0] || 'U'}
                </div>
                {sidebarOpen && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{currentUser?.name || 'Guest'}</p>
                      <p className="text-xs text-slate-500 truncate">Student</p>
                    </div>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                      <LogOut size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Header - Completely Transparent */}
            <header className="h-20 flex items-center justify-between px-8 border-b border-white/10">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'personality' && '성향 분석'}
                  {activeTab === 'values' && '가치관 분석'}
                  {activeTab === 'jobs' && '직업 추천'}
                  {activeTab === 'majors' && '학과 추천'}
                  {activeTab === 'counsel' && '상담 사례'}
                  {activeTab === 'roadmap' && '진로 로드맵'}
                  {activeTab === 'profile' && '프로필'}
                </h1>
                <p className="text-sm text-slate-600">Welcome back! Here is your AI career analysis.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search"
                    className={styles['glass-input']}
                  />
                </div>

                <button className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md">
                  <Search size={18} />
                </button>

                <button className={styles['glass-button']}>
                  <Bell size={18} className="text-slate-600" />
                </button>

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={styles['glass-button']}
                >
                  {darkMode ? <Sun size={18} className="text-slate-600" /> : <Moon size={18} className="text-slate-600" />}
                </button>

              </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-7xl mx-auto">
                {isLoading && <p className="text-gray-500">데이터를 불러오는 중입니다...</p>}
                {!isLoading && error && <p className="text-red-500">{error}</p>}
                {!isLoading && !error && (
                  <>
                    {activeTab === 'dashboard' && renderOverviewSection()}
                    {activeTab === 'personality' && renderPersonalitySection()}
                    {activeTab === 'values' && renderValuesSection()}
                    {activeTab === 'jobs' && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">AI 직업 추천</h2>
                        <HybridJobRecommendPanel embedded profileId={profileData?.profileId} />
                      </div>
                    )}
                    {activeTab === 'majors' && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">AI 학과 추천</h2>
                        <MajorRecommendPanel embedded profileId={profileData?.profileId} />
                      </div>
                    )}
                    {activeTab === 'counsel' && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">진로 상담 사례</h2>
                        <CounselRecommendPanel embedded profileId={profileData?.profileId} />
                      </div>
                    )}
                    {activeTab === 'profile' && (
                      <div className={styles['glass-card']}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">프로필 정보</h2>
                        <p className="text-gray-600">프로필 수정 기능은 준비 중입니다.</p>
                        {/* <Button className="mt-4" onClick={() => navigate('/profile/input')}>
                                                    프로필 다시 입력하기
                                                </Button> */}
                      </div>
                    )}
                    {activeTab === 'roadmap' && (
                      <div className={styles['glass-card']}>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">진로 로드맵</h2>
                        <p className="text-gray-600">로드맵 생성 기능은 준비 중입니다.</p>
                      </div>
                    )}
                    {activeTab === 'learning' && renderLearningSection()}
                    {activeTab === 'mentoring' && renderMentoringSection()}
                    {activeTab === 'settings' && renderSettingsSection()}
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* AI Assistant Chatbot - Floating Button */}
      <button
        onClick={() => setShowAssistantChat(!showAssistantChat)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500
             text-white rounded-full shadow-lg flex items-center justify-center
             hover:scale-110 transition-all z-50 animate-bounce-slow"
        title="AI 비서"
      >
        <Bot size={32} strokeWidth={2} />
      </button>

      {/* Chat Overlay (배경 클릭 시 닫기) */}
      {showAssistantChat && (
        <div
          className="fixed inset-0 z-60"
          onClick={() => setShowAssistantChat(false)}
        ></div>
      )}

      {/* Chat Panel */}
      {showAssistantChat && (
        <div
          className={`fixed bottom-32 right-9 w-[420px] h-[600px] bg-white rounded-3xl shadow-xl z-50 p-0 overflow-hidden border border-gray-200 transform transition-all duration-300 ${
            showAssistantChat
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0 pointer-events-none"
          }`}
        >
          <AssistantChatbot onClose={() => setShowAssistantChat(false)} />
        </div>
      )}

      {/* Mentor Application Modal */}
      {showMentorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowMentorModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">멘토 신청하기</h2>
                  <p className="text-sm text-slate-500 mt-1">후배들의 성장을 도와주세요</p>
                </div>
                <button onClick={() => setShowMentorModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Company Info Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Briefcase size={24} className="text-pink-500 mr-2" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">회사 정보</h3>
                    <p className="text-sm text-gray-600">현재 재직 중인 회사와 직업을 입력해주세요</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 회사명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                      placeholder="예) 카카오"
                    />
                  </div>

                  {/* 직업 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직업 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                      placeholder="예) 백엔드 개발자"
                    />
                  </div>

                  {/* 경력 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      경력 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none transition-colors"
                        placeholder="예) 3"
                        min="1"
                        max="50"
                      />
                      <span className="text-gray-700 font-medium">년</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <FileText size={24} className="text-pink-500 mr-2" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">자기소개</h3>
                    <p className="text-sm text-gray-600">전문 분야와 멘토링 철학을 소개해주세요 (최소 50자)</p>
                  </div>
                </div>
                <textarea
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors"
                  placeholder="예시) 저는 10년 경력의 백엔드 개발자로, Spring Boot와 MSA 아키텍처에 전문성을 갖추고 있습니다. 실무 경험을 바탕으로 후배 개발자들이 올바른 방향으로 성장할 수 있도록 돕고 싶습니다."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-sm ${mentorBio.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                    {mentorBio.length} / 50자 이상
                  </p>
                  {mentorBio.length >= 50 && (
                    <Check size={20} className="text-green-500" />
                  )}
                </div>
              </div>

              {/* Career Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Briefcase size={24} className="text-pink-500 mr-2" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">경력 사항</h3>
                    <p className="text-sm text-gray-600">주요 경력과 프로젝트 경험을 작성해주세요 (최소 20자)</p>
                  </div>
                </div>
                <textarea
                  value={mentorCareer}
                  onChange={(e) => setMentorCareer(e.target.value)}
                  className="w-full h-40 p-4 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors"
                  placeholder="예시) • 삼성전자 SW 센터 (2015-2020): 대규모 분산 시스템 설계 및 개발&#10;• 네이버 검색 개발팀 (2020-현재): 검색 엔진 최적화 및 성능 개선&#10;• 주요 기술: Java, Spring Boot, Kubernetes, Redis, Kafka"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-sm ${mentorCareer.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                    {mentorCareer.length} / 20자 이상
                  </p>
                  {mentorCareer.length >= 20 && (
                    <Check size={20} className="text-green-500" />
                  )}
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 rounded-lg p-5 border-2 border-blue-200">
                <div className="flex items-start">
                  <AlertCircle size={24} className="text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-800 mb-1">멘토링 일정 등록 안내</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      멘토 신청이 승인되면, <span className="font-bold text-pink-600">/mentoring 페이지</span>에서
                      멘토링 가능 시간을 등록하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-pink-300 px-8 py-6 rounded-b-3xl">
              <div className="flex gap-4">
                <button onClick={() => setShowMentorModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-bold hover:bg-gray-300 transition-colors">
                  취소
                </button>
                <button
                  disabled={!company || !job || !yearsOfExperience || mentorBio.length < 50 || mentorCareer.length < 20}
                  onClick={async () => {
                    // 유효성 검사
                    if (!company || !job || !yearsOfExperience || mentorBio.length < 50 || mentorCareer.length < 20) {
                      showToast('모든 필드를 올바르게 입력해주세요.', 'warning');
                      return;
                    }
                    if (!userId) {
                      showToast('로그인이 필요합니다.', 'error');
                      return;
                    }
                    try {
                      await mentorService.applyForMentor({
                        userId,
                        company,
                        job,
                        experience: `${yearsOfExperience}년`,
                        bio: mentorBio,
                        career: mentorCareer,
                      });
                      showToast('멘토 신청이 완료되었습니다! 관리자 승인 후 멘토 활동이 가능합니다.', 'success');
                      setShowMentorModal(false);
                      // 폼 초기화
                      setCompany('');
                      setJob('');
                      setYearsOfExperience('');
                      setMentorBio('');
                      setMentorCareer('');
                    } catch (error) {
                      console.error('멘토 신청 실패:', error);
                      const apiError = error as { response?: { data?: { message?: string } } };
                      showToast(apiError.response?.data?.message || '멘토 신청 중 오류가 발생했습니다.', 'error');
                    }
                  }}
                  className="flex-1 bg-pink-500 text-white py-4 rounded-lg font-bold hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={20} />
                  멘토 신청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// Sidebar Item Component
function SidebarItem({ icon, label, active = false, onClick, badge, collapsed = false }: {
  icon: React.ReactNode,
  label: string,
  active?: boolean,
  onClick?: () => void,
  badge?: string,
  collapsed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl transition-all duration-200 group ${active
        ? 'bg-blue-500 text-white shadow-lg'
        : 'text-slate-600 hover:bg-slate-100'
        }`}
      title={collapsed ? label : undefined}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`}>
          {icon}
        </span>
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
      </div>
      {!collapsed && badge && (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${active ? 'bg-blue-400 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
