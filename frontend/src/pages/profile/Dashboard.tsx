import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, MessageSquare, Bell, User, Settings, LogOut,
  BookOpen, GraduationCap, Briefcase, FileText,
  PieChart, Heart, Target, ChevronRight, Menu, X, Send, Check, AlertCircle, Bot, Search
} from 'lucide-react';
import Button from '../../components/base/Button';
import { useToast } from '../../components/common/Toast';
import styles from './dashboard.module.css';

// Dashboard Logic Imports

import ValueDetailCard from '@/components/profile/ValueDetailCard';
import HybridJobRecommendPanel from '@/components/profile/HybridJobRecommendPanel';
import AssistantChatbot from "@/components/chatbot/AssistantChatbot";
import MajorRecommendPanel from '@/components/profile/MajorRecommendPanel';
import CounselRecommendPanel from '@/components/profile/CounselRecommendPanel';
import { BACKEND_BASE_URL, backendApi, bookingService, paymentService, mentorService, authFetch } from '@/lib/api';
import { fetchHybridJobs, fetchMajors } from '@/pages/profile/recommendApi';
import { runRecommendation } from '@/api/recommendationApi';
import { normalizeRecommendationData } from '@/lib/recommendationUtils';
import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';

// --- Types & Constants from Dashboard.tsx ---
const PROFILE_CACHE_KEY = 'dreampath:profile-cache';
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type TabKey =
  | 'dashboard' // mapped from 'overview'
  | 'personality'
  | 'values'
  | 'jobs'      // mapped from 'jobRecommend'
  | 'majors'    // mapped from 'departmentRecommend'
  | 'learning'
  | 'mentoring'
  | 'settings';

interface ProfileData {
  profileId?: number;
  userId?: number;
  updatedAt?: string;
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

interface RecommendationResult {
  jobs?: Array<Record<string, any>>;
  jobExplanations?: string[];
  job_explanations?: string[];
  majors?: Array<Record<string, any>>;
  majorExplanations?: string[];
  major_explanations?: string[];
}

interface FetchOptions {
  signal?: AbortSignal;
}

const traitLabels: Record<string, string> = {
  openness: '개방성',
  conscientiousness: '성실성',
  stability: '정서 안정성',
  neuroticism: '정서 불안정',
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

const normalizePersonalityScores = (data: Record<string, any> | null | undefined): Record<string, number> => {
  if (!data) return {};
  const normalized: Record<string, number> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'number') {
      normalized[key] = value;
    } else if (value && typeof value === 'object') {
      const candidate = (value as Record<string, any>)?.score;
      if (typeof candidate === 'number') {
        normalized[key] = candidate;
      }
    }
  });
  return normalized;
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

const toMatchPercent = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return value > 0 && value <= 1 ? Math.round(value * 100) : Math.round(value);
  }
  const parsed = parseFloat(String(value));
  if (Number.isNaN(parsed)) return 0;
  return parsed > 0 && parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
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
  const [searchParams] = useSearchParams();
  const { showToast, ToastContainer } = useToast();

  // URL 쿼리 파라미터에서 초기 탭 설정 (예: ?tab=mentoring)
  const initialTab = (searchParams.get('tab') as TabKey) || 'dashboard';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync tab state with URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey;
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [showAssistantChat, setShowAssistantChat] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Theme sync with localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("dreampath:theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }

    const handleThemeChange = () => {
      const theme = localStorage.getItem("dreampath:theme");
      setDarkMode(theme === "dark");
    };

    window.addEventListener("dreampath-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    return () => {
      window.removeEventListener("dreampath-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  // Theme object
  const theme = {
    // Main backgrounds
    containerBg: darkMode
      ? "bg-[#0a0a0f]"
      : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100",
    boxBg: darkMode
      ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-white/60 border-white/80",
    sidebarBg: darkMode
      ? "bg-white/[0.02] border-white/[0.06]"
      : "bg-white/40 border-white/50",
    cardBg: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white/20 border-white/30",
    statBg: darkMode
      ? "bg-white/[0.05]"
      : "bg-slate-100",

    // Text colors
    text: darkMode ? "text-white" : "text-slate-800",
    textSecondary: darkMode ? "text-white/70" : "text-slate-700",
    textSubtle: darkMode ? "text-white/50" : "text-slate-500",
    textMuted: darkMode ? "text-white/40" : "text-slate-400",

    // Borders
    border: darkMode ? "border-white/[0.08]" : "border-slate-200",
    borderSubtle: darkMode ? "border-white/[0.06]" : "border-white/50",

    // Hover states
    hoverBg: darkMode ? "hover:bg-white/[0.06]" : "hover:bg-slate-100",
    itemHover: darkMode ? "hover:bg-white/[0.08]" : "hover:bg-white/40",

    // Active/Selected states
    activeBg: darkMode ? "bg-[#5A7BFF]" : "bg-[#5A7BFF]",

    // Brand colors (logo gradient)
    brandGradient: "from-[#5A7BFF] to-[#8F5CFF]",
    brandPrimary: "#5A7BFF",
    brandSecondary: "#8F5CFF",

    // Input styles
    inputBg: darkMode
      ? "bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/40"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",

    // Modal
    modalBg: darkMode ? "bg-[#0f0f14]" : "bg-white",
    modalOverlay: darkMode ? "bg-black/60" : "bg-black/40",
  };

  // Floating Particles Component (like main page)
  const FloatingParticles = () => {
    const particles = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    })), []);

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full ${darkMode ? "bg-blue-500" : "bg-blue-400"}`}
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: darkMode ? 0.3 : 0.5,
              animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  };

  // Neural Network Lines (like main page)
  const NeuralNetwork = () => {
    const nodes = useMemo(() => [
      { x: 10, y: 20 }, { x: 25, y: 60 }, { x: 15, y: 80 },
      { x: 85, y: 25 }, { x: 90, y: 70 }, { x: 75, y: 85 },
      { x: 50, y: 10 }, { x: 50, y: 90 },
    ], []);

    return (
      <svg className={`absolute inset-0 w-full h-full pointer-events-none ${darkMode ? 'opacity-15' : 'opacity-25'}`}>
        <defs>
          <linearGradient id="lineGradientProfile" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {nodes.map((node, i) =>
          nodes.slice(i + 1).map((target, j) => (
            <line
              key={`${i}-${j}`}
              x1={`${node.x}%`} y1={`${node.y}%`}
              x2={`${target.x}%`} y2={`${target.y}%`}
              stroke="url(#lineGradientProfile)"
              strokeWidth="1"
              className="animate-pulse"
            />
          ))
        )}
        {nodes.map((node, i) => (
          <circle
            key={i}
            cx={`${node.x}%`} cy={`${node.y}%`}
            r="4"
            fill="url(#lineGradientProfile)"
            className="animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>
    );
  };

  // Background Effects (main page style)
  const BackgroundEffects = () => (
    <>
      <NeuralNetwork />
      <FloatingParticles />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 rounded-full animate-blob ${darkMode ? "bg-blue-600/10" : "bg-blue-500/20"
            }`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 rounded-full animate-blob animation-delay-2000 ${darkMode ? "bg-purple-600/10" : "bg-purple-500/20"
            }`}
          style={{ width: 'min(40vw, 400px)', height: 'min(40vw, 400px)', filter: 'blur(100px)' }}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${darkMode ? "bg-indigo-500/[0.05]" : "bg-indigo-400/15"
            }`}
          style={{ width: 'min(70vw, 700px)', height: 'min(50vw, 500px)', filter: 'blur(150px)' }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );

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
  const [recommendationResult, setRecommendationResult] = useState<RecommendationResult | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  // Majors are still used in the 'majors' tab section below (check lines 1764)
  const recommendationMajors = useMemo(() => recommendationResult?.majors ?? [], [recommendationResult]);

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

  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const fetchAnalysisData = useCallback(
    async (targetUserId: number, options: FetchOptions = {}): Promise<AnalysisData | null> => {
      const { signal } = options;
      const response = await authFetch(
        `${BACKEND_BASE_URL}/api/profiles/${targetUserId}/analysis`,
        { signal }
      );

      if (response.status === 404) {
        showToastRef.current?.(
          '아직 성향 분석 결과가 없습니다. AI 분석을 먼저 실행해주세요.',
          'warning'
        );
        return null;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '분석 데이터를 불러오지 못했습니다.');
      }

      return (await response.json()) as AnalysisData;
    },
    []
  );

  const fetchLegacyTopRecommendations = useCallback(async (profileId: number) => {
    try {
      const statusRes = await backendApi.get(`/vector/status/${profileId}`);
      if (!(statusRes.data?.ready && statusRes.data?.vectorId)) {
        return;
      }
      const vectorId = statusRes.data.vectorId;

      const jobs = await fetchHybridJobs(vectorId, 3);
      if (Array.isArray(jobs)) {
        setTopJobs(jobs.slice(0, 3).map((job: any, index: number) => ({
          rank: index + 1,
          title: job.title || job.metadata?.jobName || '직업',
          match: Math.round((job.score || 0) * 100),
          color: index === 0 ? 'from-[#5A7BFF] to-[#8F5CFF]' : index === 1 ? 'from-[#8F5CFF] to-purple-600' : 'from-purple-500 to-[#5A7BFF]'
        })));
      }

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
          color: index === 0 ? 'from-[#5A7BFF] to-[#8F5CFF]' : index === 1 ? 'from-[#8F5CFF] to-purple-600' : 'from-purple-500 to-purple-600'
        })));
      }
    } catch (legacyError) {
      console.error("Legacy top recommendations failed", legacyError);
    }
  }, []);

  const fetchTopRecommendations = useCallback(async (profile: ProfileData, analysis?: AnalysisData | null) => {
    if (!analysis) return;
    try {
      setRecommendationLoading(true);
      setRecommendationError(null);
      const rawPersonality = safeParseJson<Record<string, any>>(analysis.personality);
      const personalityData = normalizePersonalityScores(rawPersonality);
      const payload = {
        userId: profile?.userId,
        profileUpdatedAt: profile?.updatedAt,
        summary: analysis.summary ?? '',
        goals: analysis.goals ?? [],
        values: analysis.valuesList ?? [],
        personality: personalityData,
        strengths: analysis.strengths ?? [],
        risks: analysis.risks ?? [],
      };

      const result = await runRecommendation(payload);
      console.log("[DEBUG] Recommendation API Response:", result);

      // Normalize Data (Standardize Title, Score, Explanation)
      const normalizedResult = normalizeRecommendationData(result);
      const { jobs, majors } = normalizedResult;

      // Set Full Result (for Panels)
      setRecommendationResult(normalizedResult);

      // Set Top 3 (for Dashboard UI)
      setTopJobs(jobs.slice(0, 3).map((job: any, index: number) => ({
        rank: index + 1,
        title: job.title,
        match: toMatchPercent(job.matchScore ?? job.match ?? job.score ?? job.metadata?.matchScore ?? job.metadata?.match ?? job.metadata?.score),
        color: index === 0 ? 'from-[#5A7BFF] to-[#8F5CFF]' : index === 1 ? 'from-[#8F5CFF] to-purple-600' : 'from-purple-500 to-[#5A7BFF]',
      })));

      setTopMajors(majors.slice(0, 3).map((major: any, index: number) => ({
        rank: index + 1,
        title: major.title,
        match: toMatchPercent(major.matchScore ?? major.match ?? major.score ?? major.metadata?.matchScore ?? major.metadata?.match ?? major.metadata?.score),
        tag: major.tag || major.category || major.metadata?.lClass || major.metadata?.field || major.metadata?.category || '학과',
        color: index === 0 ? 'from-[#5A7BFF] to-[#8F5CFF]' : index === 1 ? 'from-[#8F5CFF] to-purple-600' : 'from-purple-500 to-[#5A7BFF]',
      })));

    } catch (e) {
      console.error("Failed to fetch top recommendations", e);
      setRecommendationError("추천 데이터를 불러오지 못했습니다.");
    } finally {
      setRecommendationLoading(false);
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
        if (analysis) {
          fetchTopRecommendations(profile, analysis);
        } else {
          fetchLegacyTopRecommendations(profile.profileId);
        }
      }
    },
    [fetchProfileData, fetchAnalysisData, fetchTopRecommendations, fetchLegacyTopRecommendations],
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

    // Filter relevant Big5 keys
    const validKeys = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism', 'stability'];

    const p = personalityJson as Record<string, unknown>;

    console.log('[DEBUG] Personality JSON:', p);

    // Match logic exactly with mbtiTraits: prioritize big_five/bigFive, otherwise root.
    // Explicitly IGNORE 'traits' property as it might be an empty/misleading object.
    const source = (p.big_five || p.bigFive || p) as Record<string, any>;

    console.log('[DEBUG] Selected Trait Source:', source);

    const entries = Object.entries(source);
    // Filter relevant Big5 keys (case-insensitive)
    const filteredEntries = entries.filter(([key]) => validKeys.includes(key.toLowerCase()));

    console.log('[DEBUG] Filtered Entries:', filteredEntries);

    if (!filteredEntries.length) return null;

    return filteredEntries.map(([key, value]) => {
      let score = 0;
      if (typeof value === 'number') {
        score = value;
      } else if (typeof value === 'object' && value !== null && 'score' in value) {
        score = Number((value as { score: unknown }).score) || 0;
      }

      // 0-1 range vs 0-100 range normalization
      if (score > 1) score = score / 100;

      return {
        key,
        trait: traitLabels[key] || key,
        score: score * 100, // Display as 0-100 on chart
        fullMark: 100,
      };
    });
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
    // If no numeric scores extracted, hide the chart by returning null
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

  const valuesDetailData = useMemo(() => {
    if (!valuesChartData) return null;
    const priority = ['growth', 'security', 'creativity'];
    return valuesChartData
      .filter((value) => priority.includes(value.key))
      .sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key));
  }, [valuesChartData]);

  const mbtiTraits = useMemo(() => {
    const personality = safeParseJson<Record<string, unknown>>(analysisData?.personality);
    if (!personality) return null;

    // Handle nested structure from Agent
    const source = (personality.big_five || personality.bigFive || personality) as Record<string, any>;

    // Helper to extract numeric score (0-100)
    const getScore = (key: string): number => {
      const val = source[key];
      let s = 50;
      if (typeof val === 'number') s = val;
      else if (val && typeof val === 'object' && 'score' in val) s = Number(val.score);

      // Normalize to 0-1 range for this specific logic
      return s > 1 ? s / 100 : s;
    };

    const extraversion = getScore('extraversion');
    const openness = getScore('openness');
    const agreeableness = getScore('agreeableness');
    const conscientiousness = getScore('conscientiousness');

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

  const displayMbti = useMemo(() => {
    let mbti = analysisData?.mbti;
    const isValidMbti = mbti && Object.keys(MBTI_DETAILS).includes(mbti);

    if (!isValidMbti && mbtiTraits && mbtiTraits.length >= 4) {
      const getLetter = (index: number, left: string, right: string) =>
        mbtiTraits[index].score >= 0.5 ? left : right;

      const l1 = getLetter(0, 'E', 'I');
      const l2 = getLetter(1, 'N', 'S');
      const l3 = getLetter(2, 'F', 'T');
      const l4 = getLetter(3, 'J', 'P');
      mbti = `${l1}${l2}${l3}${l4}`;
    }
    return mbti;
  }, [analysisData?.mbti, mbtiTraits]);

  // --- Render Sections ---
  const renderOverviewSection = () => (
    <div className="space-y-6">
      {/* Career Summary Card */}
      <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/20' : 'bg-gradient-to-br from-indigo-100 to-indigo-200'}`}>
            <Target size={24} className="text-indigo-500" />
          </div>
          <h2 className={`text-xl font-bold ${theme.text}`}>나의 진로 요약</h2>
        </div>

        <div className="mb-5">
          <p className="text-lg font-bold text-indigo-500 mb-3">
            {displayMbti ? `"${displayMbti} 유형의 잠재력을 가진 인재"` : '"분석 중..."'}
          </p>
          <p className={`leading-relaxed text-sm ${theme.textSecondary}`}>
            {analysisData?.summary || '요약 정보가 아직 준비되지 않았습니다.'}
          </p>
        </div>

        {/* 4-Box Grid: Goals, Values, Strengths, Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* 1. Goals */}
          <div className={`p-4 rounded-xl border h-full ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100'}`}>
            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
              <Target size={16} />
              나의 목표
            </h4>
            {analysisData?.goals && analysisData.goals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysisData.goals.slice(0, 3).map((goal, idx) => (
                  <span key={idx} className={`px-3 py-1.5 rounded-xl text-xs font-medium border shadow-sm ${darkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white text-indigo-700 border-indigo-200'}`}>
                    {goal}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${theme.textSubtle}`}>목표 데이터가 없습니다.</p>
            )}
          </div>

          {/* 2. Values */}
          <div className={`p-4 rounded-xl border h-full ${darkMode ? 'bg-[#8F5CFF]/10 border-[#8F5CFF]/20' : 'bg-purple-50 border-purple-100'}`}>
            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
              <Heart size={16} />
              핵심 가치
            </h4>
            {analysisData?.valuesList && analysisData.valuesList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysisData.valuesList.slice(0, 5).map((value, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${darkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white text-purple-700 border border-purple-200'}`}>
                    {value}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${theme.textSubtle}`}>가치관 데이터가 없습니다.</p>
            )}
          </div>

          {/* 3. Strengths */}
          <div className={`p-4 rounded-xl border h-full ${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              <Check size={16} />
              나의 강점
            </h4>
            {analysisData?.strengths && analysisData.strengths.length > 0 ? (
              <div className="flex flex-col gap-2 items-start">
                {analysisData.strengths.slice(0, 5).map((strength, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${darkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white text-blue-700 border border-blue-200'}`}>
                    {strength}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${theme.textSubtle}`}>강점 데이터가 없습니다.</p>
            )}
          </div>

          {/* 4. Risks (Points to Watch) */}
          <div className={`p-4 rounded-xl border h-full ${darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
              <AlertCircle size={16} />
              주의할 점
            </h4>
            {analysisData?.risks && analysisData.risks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysisData.risks.slice(0, 5).map((risk, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${darkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white text-amber-700 border border-amber-200'}`}>
                    {risk}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${theme.textSubtle}`}>주의점 데이터가 없습니다.</p>
            )}
          </div>
        </div>
        {/* End of 4-Box Grid */}

        {/* Existing: View Detail Button - Keeping it below the grid or as requested */}
        <div className="flex gap-3 mt-5">
          <button onClick={() => setActiveTab('personality')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg">
            상세 리포트 보기
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Jobs */}
        <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-[#8F5CFF]/20' : 'bg-gradient-to-br from-purple-100 to-purple-200'}`}>
                <Briefcase size={20} className="text-[#8F5CFF]" />
              </div>
              <h3 className={`text-lg font-bold ${theme.text}`}>추천 직업 TOP 3</h3>
            </div>
            <button onClick={() => setActiveTab('jobs')} className={`${theme.textMuted} hover:text-[#8F5CFF]`}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {topJobs.length > 0 ? topJobs.map((job) => (
              <div key={job.rank} className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border ${darkMode ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.08]' : 'bg-white/20 border-white/30 hover:bg-white/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${job.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {job.rank}
                  </div>
                  <div>
                    <p className={`font-bold text-sm group-hover:text-[#8F5CFF] ${theme.text}`}>{job.title}</p>
                    <p className={`text-xs ${theme.textSubtle}`}>{job.tag}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-[#8F5CFF]">{job.match}%</span>
                  <p className={`text-[10px] ${theme.textSubtle}`}>일치</p>
                </div>
              </div>
            )) : <p className={`text-sm text-center py-4 ${theme.textSubtle}`}>추천 데이터를 불러오는 중...</p>}
          </div>
        </div>

        {/* Top 3 Majors */}
        <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-[#8F5CFF]/20' : 'bg-gradient-to-br from-purple-100 to-purple-200'}`}>
                <GraduationCap size={20} className="text-[#8F5CFF]" />
              </div>
              <h3 className={`text-lg font-bold ${theme.text}`}>추천 학과 TOP 3</h3>
            </div>
            <button onClick={() => setActiveTab('majors')} className={`${theme.textMuted} hover:text-[#8F5CFF]`}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {topMajors.length > 0 ? topMajors.map((major) => (
              <div key={major.rank} className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border ${darkMode ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.08]' : 'bg-white/20 border-white/30 hover:bg-white/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${major.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {major.rank}
                  </div>
                  <div>
                    <p className={`font-bold text-sm group-hover:text-[#8F5CFF] ${theme.text}`}>{major.title}</p>
                    <p className={`text-xs ${theme.textSubtle}`}>{major.tag}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-[#8F5CFF]">{major.match}%</span>
                  <p className={`text-[10px] ${theme.textSubtle}`}>일치</p>
                </div>
              </div>
            )) : <p className={`text-sm text-center py-4 ${theme.textSubtle}`}>추천 데이터를 불러오는 중...</p>}
          </div>
        </div>
      </div>

    </div>
  );

  const renderPersonalitySection = () => {
    const selectedMbtiDetail = getMbtiDetails(displayMbti);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Chart & AI Report */}
          <div className="space-y-6">
            {/* Personality Radar Chart */}
            <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
              <h3 className={`text-lg font-semibold ${theme.text}`}>성격 특성 분포</h3>
              {personalityChartData ? (
                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={personalityChartData}>
                      <PolarGrid stroke={darkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                      <PolarAngleAxis dataKey="trait" tick={{ fill: darkMode ? 'rgba(255,255,255,0.7)' : '#374151' }} />
                      <Radar name="Personality" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f1f2e' : '#fff', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', color: darkMode ? '#fff' : '#374151' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={`mt-4 text-sm ${theme.textSubtle}`}>성격 데이터가 없습니다.</p>
              )}
              {/* AI Personality Report Section (Merged) */}
              {personalityNarrative && (
                <div className="mt-8 pt-8 border-t border-dashed border-gray-200 dark:border-white/10">
                  <h3 className={`text-lg font-semibold ${theme.text}`}>AI 성향 리포트</h3>

                  {personalityNarrative.description ? (
                    <p className={`mt-3 text-sm whitespace-pre-line ${theme.textSecondary}`}>{personalityNarrative.description}</p>
                  ) : (
                    analysisData?.summary && <p className={`mt-3 text-sm whitespace-pre-line leading-relaxed ${theme.textSecondary}`}>{analysisData.summary}</p>
                  )}

                  {/* Strengths & Growth Points Section Removed as per request */}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: MBTI Card */}
          <div className={`backdrop-blur-lg rounded-3xl p-8 border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50/50 border-white/30'} flex flex-col justify-center h-full`}>
            {/* Badge */}
            <div className="mb-6">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border ${darkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-600 border-indigo-200'}`}>
                ● PERSONALITY TYPE
              </span>
            </div>

            {/* Large Type Text */}
            <h1 className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 tracking-tight">
              {displayMbti || 'MBTI'}
            </h1>

            {/* Description */}
            <p className={`text-base sm:text-lg leading-relaxed mb-10 ${theme.textSecondary}`}>
              {selectedMbtiDetail
                ? selectedMbtiDetail.description
                : 'MBTI 데이터가 준비되면 이 영역에서 해석을 확인할 수 있습니다.'}
            </p>

            {/* MBTI Bars Grid */}
            {mbtiTraits && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {mbtiTraits.map((trait) => {
                  const percentage = Math.round(trait.score * 100);
                  const labels = trait.pair.split(' / ');
                  return (
                    <div key={trait.pair} className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/5' : 'bg-white/50 border-white/20'}`}>
                      <div className="flex justify-between items-end mb-2">
                        <span className={`text-lg font-bold ${theme.text}`}>{trait.pair}</span>
                        <span className={`text-sm font-bold ${theme.textSubtle}`}>{percentage >= 50 ? `${percentage}%` : `${100 - percentage}%`}</span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-gray-200'} mb-2`}>
                        <div className="relative w-full h-full">
                          <div
                            className="absolute left-0 top-0 h-full bg-[#5A7BFF] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, opacity: percentage >= 50 ? 1 : 0.3 }}
                          />
                          {/* Right highlight for < 50% not strictly needed if we just show the dominant bar or split bar. 
                              The reference image shows a single bar filled from left. Let's keep it simple or double-sided if preferred.
                              I'll stick to the "progress" style for the primary trait of the pair. */}
                          <div
                            className="absolute right-0 top-0 h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${100 - percentage}%`, opacity: percentage < 50 ? 1 : 0.3 }}
                          />
                        </div>
                      </div>
                      <p className={`text-xs ${theme.textSubtle}`}>
                        {percentage >= 50 ? labels[0] : labels[1]} 성향 우세
                      </p>
                    </div>
                  );
                })}
              </div>
            )
            }
          </div >
        </div >

        {/* Strengths & Risks Cards */}
        {
          (analysisData?.strengths && analysisData.strengths.length > 0) || (analysisData?.risks && analysisData.risks.length > 0) ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Strengths Card */}
              {analysisData?.strengths && analysisData.strengths.length > 0 && (
                <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-gradient-to-br from-blue-100 to-purple-200'}`}>
                      <Check size={20} className="text-[#5A7BFF]" />
                    </div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>나의 강점</h3>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    {analysisData.strengths.map((strength, idx) => (
                      <span key={idx} className={`px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm transition-colors ${darkMode ? 'bg-[#5A7BFF]/20 text-blue-300 border-[#5A7BFF]/30 hover:bg-[#5A7BFF]/30' : 'bg-blue-50 text-[#5A7BFF] border-blue-200 hover:bg-blue-100'}`}>
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks Card */}
              {analysisData?.risks && analysisData.risks.length > 0 && (
                <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-500/20' : 'bg-gradient-to-br from-amber-100 to-amber-200'}`}>
                      <AlertCircle size={20} className="text-amber-500" />
                    </div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>주의할 점</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysisData.risks.map((risk, idx) => (
                      <span key={idx} className={`px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm transition-colors ${darkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}>
                        {risk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Values Text List Card (Moved) */}
              {analysisData?.valuesList && analysisData.valuesList.length > 0 && (
                <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#8F5CFF]/20' : 'bg-purple-100'}`}>
                      <Heart size={20} className="text-purple-500" />
                    </div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>나의 핵심 가치</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysisData.valuesList.map((value, idx) => (
                      <span key={idx} className={`px-4 py-2 rounded-full text-sm font-medium border shadow-sm hover:shadow-md hover:scale-105 transition-all ${darkMode ? 'bg-[#8F5CFF]/20 text-purple-300 border-[#8F5CFF]/30' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null
        }

        {/* --- Merged Values Section Content --- */}
        {renderValuesSection()}

        {

        }
      </div >
    );
  };

  const renderValuesSection = () => (
    <div className="space-y-6">

      {valuesChartData && (
        <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
          <h3 className={`text-lg font-semibold ${theme.text}`}>가치관 집중도 (차트)</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valuesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                <XAxis dataKey="name" tick={{ fill: darkMode ? 'rgba(255,255,255,0.7)' : '#374151', fontSize: 12 }} />
                <YAxis tick={{ fill: darkMode ? 'rgba(255,255,255,0.7)' : '#374151', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: darkMode ? 'rgba(90, 123, 255, 0.15)' : 'rgba(90, 123, 255, 0.1)' }}
                  contentStyle={{
                    backgroundColor: darkMode ? 'rgba(15, 15, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                    border: darkMode ? '1px solid rgba(143, 92, 255, 0.3)' : '1px solid rgba(90, 123, 255, 0.3)',
                    borderRadius: '12px',
                    boxShadow: darkMode ? '0 8px 32px rgba(143, 92, 255, 0.2)' : '0 8px 32px rgba(90, 123, 255, 0.15)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{ color: darkMode ? '#fff' : '#1f2937', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ color: darkMode ? 'rgba(255,255,255,0.8)' : '#4b5563' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {valuesChartData.map((entry) => (
                    <Cell key={`cell-${entry.key}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Values Text List Card */}


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
        <div className={`rounded-2xl p-4 sm:p-5 border ${darkMode
          ? 'bg-gradient-to-r from-[#5A7BFF]/10 to-[#8F5CFF]/10 border-[#5A7BFF]/20'
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
          }`}>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bot size={20} className="text-white sm:hidden" />
              <Bot size={24} className="text-white hidden sm:block" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>AI 학습 코치</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#5A7BFF]/20 text-[#5A7BFF]' : 'bg-blue-100 text-blue-600'
                  }`}>맞춤 조언</span>
              </div>
              <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                {coachData.message}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className={`text-xs px-3 py-1.5 rounded-lg ${darkMode ? 'bg-[#5A7BFF]/10 text-[#5A7BFF]' : 'bg-blue-50 text-blue-600'
                  }`}>
                  {coachData.tip}
                </p>
                <Link
                  to={coachData.action}
                  className="text-xs bg-[#5A7BFF] hover:bg-[#4A6BEF] text-white px-4 py-2 rounded-full transition-colors flex items-center gap-1 whitespace-nowrap"
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
          <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <PieChart size={20} className={darkMode ? 'text-white/70' : 'text-slate-600'} />
              </div>
              <h3 className={`text-sm font-bold ${theme.textSecondary}`}>평균 진행률</h3>
            </div>
            <p className={`text-3xl font-bold mb-1 ${theme.text}`}>{totalProgress}%</p>
            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
              <div className="h-full bg-[#5A7BFF] rounded-full" style={{ width: `${totalProgress}%` }} />
            </div>
          </div>

          <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <Target size={20} className={darkMode ? 'text-white/70' : 'text-slate-600'} />
              </div>
              <h3 className={`text-sm font-bold ${theme.textSecondary}`}>평균 점수</h3>
            </div>
            <p className={`text-3xl font-bold mb-1 ${theme.text}`}>{avgScoreAll}점</p>
          </div>

          <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <BookOpen size={20} className={darkMode ? 'text-white/70' : 'text-slate-600'} />
              </div>
              <h3 className={`text-sm font-bold ${theme.textSecondary}`}>진행 중인 학습</h3>
            </div>
            <p className={`text-3xl font-bold mb-1 ${theme.text}`}>{activeCount}개</p>
          </div>
        </div>

        {/* 가장 잘하는 학습 */}
        <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-blue-100'}`}>
                <GraduationCap size={20} className={darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'} />
              </div>
              <h3 className={`text-sm font-bold ${theme.textSecondary}`}>가장 잘하는 학습</h3>
            </div>
            <Link
              to="/learning"
              className={`flex items-center gap-1 text-sm ${theme.textSubtle} hover:${theme.textSecondary}`}
            >
              대시보드
              <ChevronRight size={16} />
            </Link>
          </div>

          {bestPath && bestPathAvgScore > 0 ? (
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-bold ${theme.text}`}>{bestPath.domain}</h4>
                  <p className={`text-sm ${theme.textSubtle}`}>평균 {bestPathAvgScore}점</p>
                </div>
                <Link
                  to={`/learning?career=${encodeURIComponent(bestPath.domain)}`}
                  className="px-3 py-1.5 bg-[#5A7BFF] text-white text-xs font-medium rounded-lg hover:bg-[#4A6BEF] transition-colors"
                >
                  학습하기
                </Link>
              </div>
            </div>
          ) : learningPaths.length === 0 ? (
            <div className="text-center py-6">
              <p className={`text-sm mb-4 ${theme.textSubtle}`}>아직 시작한 학습이 없습니다</p>
              <button
                onClick={() => setActiveTab('roadmap')}
                className="px-4 py-2 bg-[#5A7BFF] text-white text-sm font-medium rounded-lg hover:bg-[#4A6BEF] transition-colors"
              >
                학습 시작하기
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className={`text-sm ${theme.textSubtle}`}>학습을 진행하면 결과가 표시됩니다</p>
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
            <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-yellow-500/20' : 'bg-gradient-to-br from-yellow-100 to-yellow-200'}`}>
                  <MessageSquare size={20} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                </div>
                <h3 className={`text-sm font-bold ${theme.textSecondary}`}>잔여 횟수</h3>
              </div>
              <p className={`text-3xl font-bold mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{remainingSessions}회</p>
            </div>

            {/* 멘토 찾기 */}
            <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-purple-500/20' : 'bg-gradient-to-br from-purple-100 to-purple-200'}`}>
                  <Search size={20} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                </div>
                <h3 className={`text-sm font-bold ${theme.textSecondary}`}>멘토 찾기</h3>
              </div>
              <button onClick={() => navigate('/mentoring')} className={`text-sm font-semibold hover:underline ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                세션 둘러보기
              </button>
            </div>

            {/* 내 예약 */}
            <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-blue-100'}`}>
                  <Heart size={20} className={darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'} />
                </div>
                <h3 className={`text-sm font-bold ${theme.textSecondary}`}>내 예약</h3>
              </div>
              <p className={`text-3xl font-bold mb-1 ${darkMode ? 'text-[#5A7BFF]' : 'text-[#5A7BFF]'}`}>{myBookings.length}건</p>
            </div>
          </div>
        )}

        {/* My Reservations & Become Mentor - 멘티용 */}
        {!isMentor && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Reservations */}
            <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg} h-full`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#5A7BFF] rounded-xl flex items-center justify-center">
                    <Heart size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>나의 예약</h3>
                    <p className={`text-sm ${theme.textSubtle}`}>예약한 멘토링 세션</p>
                  </div>
                </div>
                <Link
                  to="/payments/history"
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all bg-[#5A7BFF] hover:bg-[#4A6BEF] text-white shadow-md hover:shadow-lg"
                >
                  결제 내역
                </Link>
              </div>

              {myBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <Heart size={32} className={darkMode ? 'text-white/40' : 'text-slate-400'} />
                  </div>
                  <p className={`text-sm mb-6 ${theme.textSecondary}`}>예약한 세션이 없습니다</p>
                  <button onClick={() => navigate('/mentoring')} className="px-6 py-3 bg-[#5A7BFF] text-white rounded-xl text-sm font-bold hover:bg-[#4A6BEF] transition-colors shadow-lg">
                    세션 찾아보기
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((booking) => {
                    const status = getBookingStatusStyle(booking.status);
                    return (
                      <div key={booking.bookingId} className={`border rounded-xl p-4 ${darkMode ? 'bg-white/[0.03] border-white/[0.08]' : `${status.bg} ${status.border}`}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#5A7BFF] rounded-full flex items-center justify-center">
                              <User size={20} className="text-white" />
                            </div>
                            <div>
                              <h4 className={`text-sm font-semibold ${theme.text}`}>{booking.mentorName}</h4>
                              <p className={`text-xs ${theme.textSubtle}`}>멘토</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-lg ${status.bg} ${status.text} border ${status.border}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className={`text-sm font-medium mb-2 ${theme.text}`}>{booking.sessionTitle}</p>

                        {booking.rejectionReason && (
                          <div className={`rounded-lg p-2 mb-2 ${darkMode ? 'bg-rose-500/10' : 'bg-white/50'}`}>
                            <p className="text-xs text-rose-500">거절 사유: {booking.rejectionReason}</p>
                          </div>
                        )}

                        <p className={`text-xs mb-3 ${theme.textSubtle}`}>
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

            {/* Become a Mentor CTA */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">멘토가 되어보세요!</h3>
                <p className="text-blue-100 mb-6 max-w-md">
                  후배들의 성장을 도와주실 멘토를 모집합니다.
                </p>
                <button onClick={() => setShowMentorModal(true)} className="px-6 py-3 bg-white text-[#5A7BFF] rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-lg">
                  멘토 신청하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mentor's Sessions (only for approved mentors) */}
        {mentorInfo && mentorInfo.status === 'APPROVED' && (
          <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-500 rounded-xl flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${theme.text}`}>멘토링 세션</h3>
                <p className={`text-sm ${theme.textSubtle}`}>내가 진행하는 멘토링</p>
              </div>
            </div>

            {mentorBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <User size={32} className={darkMode ? 'text-white/40' : 'text-slate-400'} />
                </div>
                <p className={`text-sm mb-6 ${theme.textSecondary}`}>예약된 멘토링이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mentorBookings
                  .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
                  .map((booking) => {
                    const status = getBookingStatusStyle(booking.status);
                    return (
                      <div key={booking.bookingId} className={`border rounded-xl p-4 ${darkMode ? 'bg-white/[0.03] border-white/[0.08]' : `${status.bg} ${status.border}`}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-500 rounded-full flex items-center justify-center">
                              <User size={20} className="text-white" />
                            </div>
                            <div>
                              <h4 className={`text-sm font-semibold ${theme.text}`}>{booking.menteeName}</h4>
                              <p className={`text-xs ${theme.textSubtle}`}>멘티</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-lg ${status.bg} ${status.text} border ${status.border}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className={`text-sm font-medium mb-2 ${theme.text}`}>{booking.sessionTitle}</p>

                        <p className={`text-xs mb-3 ${theme.textSubtle}`}>
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


      </div>
    );
  };

  const renderSettingsSection = () => (
    <div className="space-y-6">
      <div className={`backdrop-blur-lg rounded-3xl p-6 border ${theme.cardBg}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#5A7BFF] rounded-xl flex items-center justify-center">
              <Settings size={24} className="text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${theme.text}`}>계정 정보</h2>
              <p className={`text-sm ${theme.textSubtle}`}>개인정보 확인 및 관리</p>
            </div>
          </div>
          <button disabled className={`px-4 py-2 text-sm ${darkMode ? 'text-[#5A7BFF] hover:text-[#7A9BFF] disabled:text-white/30' : 'text-[#5A7BFF] hover:text-[#4A6BEF] disabled:text-gray-400'} disabled:cursor-not-allowed flex items-center gap-1`}>
            <FileText size={16} />
            수정하기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 이름 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>이름</p>
            <p className={`text-sm font-medium ${theme.text}`}>{currentUser?.name || '-'}</p>
          </div>

          {/* 아이디 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>아이디</p>
            <p className={`text-sm font-medium ${theme.text}`}>{currentUser?.username || '-'}</p>
          </div>

          {/* 이메일 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>이메일</p>
            <p className={`text-sm font-medium ${theme.text}`}>{currentUser?.email || '-'}</p>
          </div>

          {/* 전화번호 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>전화번호</p>
            <p className={`text-sm font-medium ${theme.text}`}>{currentUser?.phone || '-'}</p>
          </div>

          {/* 생년월일 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>생년월일</p>
            <p className={`text-sm font-medium ${theme.text}`}>{formatDate(currentUser?.birth)}</p>
          </div>

          {/* 가입일 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>가입일</p>
            <p className={`text-sm font-medium ${theme.text}`}>{formatDate(currentUser?.createdAt)}</p>
          </div>

          {/* 계정 상태 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>계정 상태</p>
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              활성
            </span>
          </div>

          {/* 역할 */}
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200'}`}>
            <p className={`text-xs mb-1 ${theme.textSubtle}`}>역할</p>
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-[#5A7BFF]/20 text-[#5A7BFF]' : 'bg-blue-50 text-[#5A7BFF]'}`}>
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




      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-[#0a0a0f]' : 'bg-white'} shadow-2xl`}>
        <div className="h-full flex flex-col">
          {/* Mobile Sidebar Header */}
          <div className={`h-16 flex items-center justify-between px-5 border-b ${theme.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                D
              </div>
              <span className={`font-bold text-lg ${theme.text}`}>DreamPath</span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className={`p-2 rounded-lg ${theme.hoverBg} ${theme.textSecondary}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`flex-1 overflow-y-auto py-4 px-3 space-y-6 ${darkMode ? styles['custom-scrollbar-dark'] : styles['custom-scrollbar']}`}>
            <div>
              <h3 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider mb-3 px-3`}>
                Career & AI Analysis
              </h3>
              <nav className="space-y-1">
                <SidebarItem icon={<LayoutGrid size={20} />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
                <SidebarItem icon={<PieChart size={20} />} label="성향 및 가치관 분석" active={activeTab === 'personality'} onClick={() => { setActiveTab('personality'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
                <SidebarItem icon={<Briefcase size={20} />} label="직업 추천" active={activeTab === 'jobs'} onClick={() => { setActiveTab('jobs'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
                <SidebarItem icon={<GraduationCap size={20} />} label="학과 추천" active={activeTab === 'majors'} onClick={() => { setActiveTab('majors'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
              </nav>
            </div>
            <div>
              <h3 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider mb-3 px-3`}>
                Learning & Account
              </h3>
              <nav className="space-y-1">
                <SidebarItem icon={<BookOpen size={20} />} label="학습 현황" active={activeTab === 'learning'} onClick={() => { setActiveTab('learning'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
                <SidebarItem icon={<MessageSquare size={20} />} label="멘토링" active={activeTab === 'mentoring'} onClick={() => { setActiveTab('mentoring'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
                <SidebarItem icon={<Settings size={20} />} label="계정 설정" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }} darkMode={darkMode} />
              </nav>
            </div>
          </div>

          {/* Mobile User Profile */}
          <div className={`p-4 border-t ${theme.border}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-slate-200 to-slate-300'} flex items-center justify-center ${theme.text} font-bold shadow`}>
                {currentUser?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${theme.text} truncate`}>{currentUser?.name || 'Guest'}</p>
                <p className={`text-xs ${theme.textSubtle} truncate`}>Student</p>
              </div>
              <button onClick={handleLogout} className={`${theme.textMuted} hover:${darkMode ? 'text-white' : 'text-slate-600'}`}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container - 헤더(64px) 제외 */}
      <div className={`min-h-[calc(100vh-4rem)] overflow-y-auto ${theme.containerBg} relative flex flex-col ${darkMode ? styles['custom-scrollbar-dark'] : styles['custom-scrollbar']}`}>
        {/* Background Effects */}
        <BackgroundEffects />

        {/* 중앙 정렬 컨테이너 - 충분한 여백으로 스크롤 방지 */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 pt-16 lg:py-6">
          {/* Main Content Area - Container removed */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">

            {/* Scrollable Content */}
            <main className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 ${darkMode ? styles['custom-scrollbar-dark'] : styles['custom-scrollbar']}`}>
              <div className="max-w-7xl mx-auto">
                {isLoading && <p className={theme.textSubtle}>데이터를 불러오는 중입니다...</p>}
                {!isLoading && error && <p className="text-red-500">{error}</p>}
                {!isLoading && !error && (
                  <>
                    {activeTab === 'dashboard' && renderOverviewSection()}
                    {activeTab === 'personality' && renderPersonalitySection()}
                    {activeTab === 'jobs' && (
                      <div className="space-y-4">
                        <h2 className={`text-xl font-bold ${theme.text}`}>AI 직업 추천</h2>
                        {/* Integrated Hybrid Panel (Search + Top 10 Results + Details) */}
                        <HybridJobRecommendPanel
                          embedded={true}
                          // profileId and analysisData removed
                          jobs={recommendationResult?.jobs}
                          isLoading={recommendationLoading}
                        />
                      </div>
                    )}
                    {activeTab === 'majors' && (
                      <div className="space-y-4">
                        <h2 className={`text-xl font-bold ${theme.text}`}>AI 학과 추천</h2>

                        <MajorRecommendPanel
                          embedded={true}
                          majors={recommendationMajors}
                          isLoading={recommendationLoading}
                          errorMessage={recommendationError}
                        />
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
          className={`fixed z-50 p-0 overflow-hidden transform transition-all duration-300
            bottom-4 right-4 left-4 top-20
            sm:bottom-32 sm:right-6 sm:left-auto sm:top-auto
            sm:w-[380px] sm:h-[550px]
            md:w-[420px] md:h-[600px]
            rounded-2xl sm:rounded-3xl shadow-2xl
            ${darkMode
              ? 'bg-[#0f0f14] border border-white/10'
              : 'bg-white border border-gray-200'
            }
            ${showAssistantChat
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0 pointer-events-none"
            }`}
        >
          <AssistantChatbot onClose={() => setShowAssistantChat(false)} />
        </div>
      )}

      {/* Mentor Application Modal */}
      {showMentorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setShowMentorModal(false)}>
          {/* Overlay */}
          <div className={`absolute inset-0 backdrop-blur-md ${darkMode ? 'bg-black/60' : 'bg-black/40'}`}></div>

          {/* Modal Container */}
          <div
            className={`relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border ${darkMode
              ? 'bg-[#0f0f14] border-white/10'
              : 'bg-white border-gray-200'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 px-4 sm:px-8 py-4 sm:py-6 border-b backdrop-blur-xl ${darkMode
              ? 'bg-[#0f0f14]/95 border-white/10'
              : 'bg-white/95 border-gray-200'
              }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] flex items-center justify-center shadow-lg">
                    <User size={20} className="text-white sm:hidden" />
                    <User size={24} className="text-white hidden sm:block" />
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      멘토 신청하기
                    </h2>
                    <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>
                      후배들의 성장을 도와주세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMentorModal(false)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white/70'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                >
                  <X size={18} className="sm:hidden" />
                  <X size={20} className="hidden sm:block" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className={`overflow-y-auto max-h-[calc(95vh-180px)] sm:max-h-[calc(90vh-200px)] px-4 sm:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 ${darkMode ? styles['custom-scrollbar-dark'] : styles['custom-scrollbar']}`}>

              {/* Company Info Section */}
              <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${darkMode
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-gray-50 border-gray-100'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-gradient-to-br from-blue-100 to-purple-100'
                    }`}>
                    <Briefcase size={20} className="text-[#5A7BFF]" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      회사 정보
                    </h3>
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      현재 재직 중인 회사와 직업을 입력해주세요
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* 회사명 */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                      회사명 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className={`w-full p-3 sm:p-3.5 rounded-xl border-2 transition-all text-sm sm:text-base ${darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#5A7BFF] focus:bg-white/10'
                        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#5A7BFF]'
                        } focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/20`}
                      placeholder="예) 카카오"
                    />
                  </div>

                  {/* 직업 */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                      직업 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                      className={`w-full p-3 sm:p-3.5 rounded-xl border-2 transition-all text-sm sm:text-base ${darkMode
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#5A7BFF] focus:bg-white/10'
                        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#5A7BFF]'
                        } focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/20`}
                      placeholder="예) 백엔드 개발자"
                    />
                  </div>

                  {/* 경력 */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
                      경력 <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="number"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                        className={`flex-1 p-3 sm:p-3.5 rounded-xl border-2 transition-all text-sm sm:text-base ${darkMode
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#5A7BFF] focus:bg-white/10'
                          : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#5A7BFF]'
                          } focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/20`}
                        placeholder="예) 3"
                        min="1"
                        max="50"
                      />
                      <span className={`text-sm sm:text-base font-medium ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>년</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${darkMode
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-gray-50 border-gray-100'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#8F5CFF]/20' : 'bg-purple-100'
                    }`}>
                    <FileText size={20} className="text-[#8F5CFF]" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      자기소개
                    </h3>
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      전문 분야와 멘토링 철학을 소개해주세요 (최소 50자)
                    </p>
                  </div>
                </div>
                <textarea
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  className={`w-full h-32 sm:h-40 p-3 sm:p-4 rounded-xl border-2 transition-all resize-none text-sm sm:text-base ${darkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#8F5CFF] focus:bg-white/10'
                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8F5CFF]'
                    } focus:outline-none focus:ring-2 focus:ring-[#8F5CFF]/20`}
                  placeholder="예시) 저는 10년 경력의 백엔드 개발자로, Spring Boot와 MSA 아키텍처에 전문성을 갖추고 있습니다..."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-xs sm:text-sm ${mentorBio.length >= 50 ? 'text-emerald-500' : darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                    {mentorBio.length} / 50자 이상
                  </p>
                  {mentorBio.length >= 50 && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={14} className="text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Career Section */}
              <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${darkMode
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-gray-50 border-gray-100'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                    }`}>
                    <Briefcase size={20} className="text-[#5A7BFF]" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      경력 사항
                    </h3>
                    <p className={`text-xs sm:text-sm ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      주요 경력과 프로젝트 경험을 작성해주세요 (최소 20자)
                    </p>
                  </div>
                </div>
                <textarea
                  value={mentorCareer}
                  onChange={(e) => setMentorCareer(e.target.value)}
                  className={`w-full h-32 sm:h-40 p-3 sm:p-4 rounded-xl border-2 transition-all resize-none text-sm sm:text-base ${darkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#5A7BFF] focus:bg-white/10'
                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#5A7BFF]'
                    } focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/20`}
                  placeholder="예시) • 삼성전자 SW 센터 (2015-2020): 대규모 분산 시스템 설계 및 개발..."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-xs sm:text-sm ${mentorCareer.length >= 20 ? 'text-emerald-500' : darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                    {mentorCareer.length} / 20자 이상
                  </p>
                  {mentorCareer.length >= 20 && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={14} className="text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info Notice */}
              <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 ${darkMode
                ? 'bg-[#5A7BFF]/10 border-[#5A7BFF]/30'
                : 'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${darkMode ? 'bg-[#5A7BFF]/20' : 'bg-blue-100'
                    }`}>
                    <AlertCircle size={18} className="text-[#5A7BFF]" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm sm:text-base mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      멘토링 일정 등록 안내
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>
                      멘토 신청이 승인되면, <span className="font-bold text-[#8F5CFF]">/mentoring 페이지</span>에서
                      멘토링 가능 시간을 등록하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 px-4 sm:px-8 py-4 sm:py-6 border-t ${darkMode
              ? 'bg-[#0f0f14] border-white/10'
              : 'bg-white border-gray-200'
              }`}>
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => setShowMentorModal(false)}
                  className={`flex-1 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all ${darkMode
                    ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    }`}
                >
                  취소
                </button>
                <button
                  disabled={!company || !job || !yearsOfExperience || mentorBio.length < 50 || mentorCareer.length < 20}
                  onClick={async () => {
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
                  className={`flex-1 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg ${!company || !job || !yearsOfExperience || mentorBio.length < 50 || mentorCareer.length < 20
                    ? darkMode
                      ? 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.02]'
                    }`}
                >
                  <Send size={18} />
                  <span>멘토 신청하기</span>
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
function SidebarItem({ icon, label, active = false, onClick, badge, collapsed = false, darkMode = false }: {
  icon: React.ReactNode,
  label: string,
  active?: boolean,
  onClick?: () => void,
  badge?: string,
  collapsed?: boolean,
  darkMode?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl transition-all duration-200 group ${active
        ? 'bg-blue-500 text-white shadow-lg'
        : darkMode
          ? 'text-white/70 hover:bg-white/[0.08] hover:text-white'
          : 'text-slate-600 hover:bg-slate-100'
        }`}
      title={collapsed ? label : undefined}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-white' : darkMode ? 'text-white/50 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-700'}`}>
          {icon}
        </span>
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
      </div>
      {!collapsed && badge && (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${active ? 'bg-blue-400 text-white' : darkMode ? 'bg-white/10 text-white/70' : 'bg-indigo-100 text-indigo-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
