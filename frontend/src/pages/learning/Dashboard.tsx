import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { learningPathService } from "@/lib/api";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from "recharts";

interface LearningPath {
    pathId: number;
    domain: string;
    subDomain?: string;
    overallProgress: number;
    currentWeek: number;
}

interface WeeklyProgress {
    weekNumber: number;
    status: string;
    questionCount: number;
    correctCount: number;
    earnedScore: number;
    totalScore: number;
    scoreRate: number;
    correctRate: number;
}

interface TypeAccuracy {
    questionType: string;
    accuracy: number;
}

interface WeaknessAnalysis {
    totalWeak: number;
    weakTags: string[];
    feedbackList?: FeedbackItem[];
}

interface FeedbackItem {
    questionText: string;
    feedback: string;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    correctAnswer?: string;
    userAnswer?: string;
    questionType?: string;
}

interface WeaknessTagItem {
    tag: string;
    count: number;
    severity: string;  // high, medium, low
    description: string;
}

interface RadarDataItem {
    category: string;
    score: number;
    fullMark: number;
}

interface AIWeaknessAnalysis {
    weaknessTags: WeaknessTagItem[];
    recommendations: string[];
    overallAnalysis: string;
    radarData: RadarDataItem[];
}

interface DashboardStats {
    correctRate: number;
    correctCount: number;
    earnedScore: number;
    totalMaxScore: number;
    scoreRate: number;
    totalQuestions: number;
    answeredQuestions: number;
    weeklyProgress: WeeklyProgress[];
    typeAccuracy: TypeAccuracy[];
    weaknessAnalysis: WeaknessAnalysis;
    aiWeaknessAnalysis?: AIWeaknessAnalysis;
}

interface ThemeColors {
    bg: string;
    card: string;
    cardHover: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    border: string;
    divider: string;
    accent: string;
    accentLight: string;
    accentBg: string;
    chartGrid: string;
    tableHeaderBg: string;
    tableRowHover: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("dreampath:theme") === "dark";
        }
        return false;
    });

    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);

    // Theme sync
    useEffect(() => {
        const handleThemeChange = () => {
            setDarkMode(localStorage.getItem("dreampath:theme") === "dark");
        };
        window.addEventListener("dreampath-theme-change", handleThemeChange);
        window.addEventListener("storage", handleThemeChange);
        return () => {
            window.removeEventListener("dreampath-theme-change", handleThemeChange);
            window.removeEventListener("storage", handleThemeChange);
        };
    }, []);

    const theme: ThemeColors = darkMode ? {
        bg: "bg-[#0B0D14]",
        card: "bg-white/[0.02] border-white/[0.08]",
        cardHover: "hover:bg-white/[0.04]",
        text: "text-white",
        textMuted: "text-white/70",
        textSubtle: "text-white/50",
        border: "border-white/[0.08]",
        divider: "border-white/[0.06]",
        accent: "text-violet-400",
        accentLight: "text-violet-300",
        accentBg: "bg-violet-500/20",
        chartGrid: "rgba(139, 92, 246, 0.1)",
        tableHeaderBg: "bg-white/[0.02]",
        tableRowHover: "hover:bg-white/[0.03]",
    } : {
        bg: "bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50",
        card: "bg-white border-slate-200",
        cardHover: "hover:bg-slate-50",
        text: "text-slate-900",
        textMuted: "text-slate-600",
        textSubtle: "text-slate-500",
        border: "border-slate-200",
        divider: "border-slate-100",
        accent: "text-violet-600",
        accentLight: "text-violet-500",
        accentBg: "bg-violet-100",
        chartGrid: "#f3e8ff",
        tableHeaderBg: "bg-slate-50/50",
        tableRowHover: "hover:bg-slate-50/50",
    };

    const chartColors = {
        primary: darkMode ? "#a78bfa" : "#8b5cf6",
        secondary: darkMode ? "#c4b5fd" : "#a78bfa",
        grid: theme.chartGrid,
    };

    const getCurrentUserId = () => {
        const raw = localStorage.getItem("dreampath:user");
        if (!raw) return null;
        return JSON.parse(raw).userId;
    };

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return navigate("/login");

        const careerParam = searchParams.get("career");
        if (careerParam) {
            createLearningPathFromCareer(userId, careerParam);
        } else {
            const state = location.state as { selectPathId?: number } | null;
            const selectId = state?.selectPathId;

            loadLearningPaths(userId).then(() => {
                if (selectId) {
                    handlePathSelect(selectId);
                    window.history.replaceState({}, document.title);
                }
            });
        }
    }, []);

    const createLearningPathFromCareer = async (userId: number, career: string) => {
        setCreating(true);
        try {
            const existingPaths = await learningPathService.getUserLearningPaths(userId);
            const careerLower = career.toLowerCase();
            const existingPath = existingPaths.find(
                (p: LearningPath) => p.domain.toLowerCase() === careerLower ||
                    p.domain.toLowerCase().includes(careerLower) ||
                    careerLower.includes(p.domain.toLowerCase())
            );

            if (existingPath) {
                navigate(`/learning/${existingPath.pathId}`);
                return;
            }

            const newPath = await learningPathService.createLearningPath({
                userId,
                domain: career,
            });

            if (newPath.pathId) {
                navigate(`/learning/${newPath.pathId}`);
            } else {
                setSearchParams({});
                await loadLearningPaths(userId);
            }
        } catch (error) {
            console.error("학습 경로 생성 실패:", error);
            setSearchParams({});
            await loadLearningPaths(userId);
        } finally {
            setCreating(false);
        }
    };

    const loadLearningPaths = async (userId: number) => {
        const data = await learningPathService.getUserLearningPaths(userId);
        setLearningPaths(data);
    };

    const handlePathSelect = async (id: number) => {
        setSelectedPathId(id);
        setLoading(true);
        setShowSidebar(false);
        try {
            const data = await learningPathService.getDashboard(id);
            setStats(data);
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "MCQ": return "객관식";
            case "SCENARIO": return "시나리오";
            case "CODING": return "코딩";
            case "DESIGN": return "설계";
            default: return type;
        }
    };

    // 안전한 계산 함수들
    const safePercent = (part: number, total: number): number => {
        if (!total || total === 0) return 0;
        return (part / total) * 100;
    };

    const safeNumber = (value: number, decimals: number = 1): string => {
        if (isNaN(value) || !isFinite(value)) return "0";
        return value.toFixed(decimals);
    };

    const calcTotalQuestions = (s: DashboardStats): number => {
        if (s.totalQuestions > 0) return s.totalQuestions;
        return s.weeklyProgress?.reduce((sum, w) => sum + w.questionCount, 0) || 0;
    };

    const calcCorrectCount = (s: DashboardStats): number => {
        if (s.correctCount > 0) return s.correctCount;
        return s.weeklyProgress?.reduce((sum, w) => sum + w.correctCount, 0) || 0;
    };

    // 완료되거나 진행 중인 주차만 차트에 표시 (LOCKED 제외, 문제 푼 적 있는 주차만)
    const weeklyProgressData = stats?.weeklyProgress
        ?.filter((w) => w.status === 'COMPLETED' || (w.status === 'UNLOCKED' && w.questionCount > 0))
        ?.map((w) => ({
            name: `${w.weekNumber}주차`,
            점수: Math.round(w.scoreRate),
        })) ?? [];

    const typeAccuracyData = stats?.typeAccuracy?.map((t) => ({
        name: getTypeLabel(t.questionType),
        점수: Math.round(t.accuracy),
    })) ?? [];

    const selectedPath = learningPaths.find(p => p.pathId === selectedPathId);
    const scoreRate = stats?.scoreRate ?? 0;
    const totalMaxScore = stats?.totalMaxScore ?? 0;

    // Sidebar Component
    const Sidebar = () => (
        <div className={`rounded-2xl border backdrop-blur-sm sticky top-24 ${theme.card}`}>
            <div className={`px-4 py-3 border-b ${theme.divider} flex items-center justify-between`}>
                <p className={`text-sm font-medium ${theme.text}`}>진행중인 학습</p>
                <span className={theme.textSubtle}>{learningPaths.length}개</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
                {learningPaths.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${theme.accentBg}`}>
                            <svg className={`w-6 h-6 ${theme.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <p className={`text-sm ${theme.textMuted} mb-1`}>아직 학습이 없어요</p>
                        <p className={`text-xs ${theme.textSubtle} mb-4`}>진로 상담 후 직업을 선택하면<br/>맞춤 학습이 생성됩니다</p>
                        <button
                            onClick={() => navigate('/career-chat')}
                            className={`text-xs font-medium ${theme.accent} hover:underline`}
                        >
                            진로 상담 시작하기 →
                        </button>
                    </div>
                ) : (
                    <div className={`divide-y ${theme.divider}`}>
                        {learningPaths.map((p) => (
                            <div
                                key={p.pathId}
                                className={`px-4 py-3 transition-colors ${
                                    selectedPathId === p.pathId
                                        ? darkMode
                                            ? "bg-violet-500/10 border-l-2 border-l-violet-500"
                                            : "bg-violet-50 border-l-2 border-l-violet-500"
                                        : `${theme.cardHover} border-l-2 border-l-transparent`
                                }`}
                            >
                                <div
                                    onClick={() => handlePathSelect(p.pathId)}
                                    className="cursor-pointer"
                                >
                                    <p className={`text-sm truncate ${
                                        selectedPathId === p.pathId
                                            ? darkMode ? "text-violet-300 font-medium" : "text-violet-700 font-medium"
                                            : theme.text
                                    }`}>
                                        {p.domain}
                                    </p>
                                    {p.subDomain && (
                                        <p className={`text-xs ${theme.textSubtle} truncate mt-0.5`}>{p.subDomain}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className={`text-xs ${theme.textSubtle}`}>{p.currentWeek ?? 1}/4주차</span>
                                        <span className={`text-xs font-medium ${
                                            selectedPathId === p.pathId ? theme.accent : theme.textMuted
                                        }`}>
                                            {p.overallProgress ?? 0}%
                                        </span>
                                    </div>
                                    <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${
                                        darkMode ? "bg-violet-500/20" : "bg-violet-100"
                                    }`}>
                                        <div
                                            className={`h-full rounded-full ${
                                                selectedPathId === p.pathId
                                                    ? "bg-violet-500"
                                                    : darkMode ? "bg-violet-400" : "bg-violet-300"
                                            }`}
                                            style={{ width: `${p.overallProgress ?? 0}%` }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/learning/${p.pathId}`);
                                    }}
                                    className={`mt-3 w-full py-2 text-white text-xs font-medium rounded-xl transition-all ${
                                        darkMode
                                            ? "bg-violet-600 hover:bg-violet-500"
                                            : "bg-violet-500 hover:bg-violet-600"
                                    }`}
                                >
                                    문제 풀기
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // 평균 점수 계산 (완료된 주차 기준)
    const completedWeeks = stats?.weeklyProgress?.filter((w: any) => w.status === 'COMPLETED') ?? [];
    const avgScore = completedWeeks.length > 0
        ? Math.round(completedWeeks.reduce((sum: number, w: any) => sum + (w.earnedScore || 0), 0) / completedWeeks.length)
        : 0;

    return (
        <div className={`min-h-screen ${theme.bg} px-4 sm:px-6 lg:px-8 py-6 pt-24`}>
            <div className="max-w-7xl mx-auto">
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            darkMode ? 'bg-violet-500/20' : 'bg-gradient-to-br from-violet-500 to-purple-600'
                        }`}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <h1 className={`text-xl font-bold ${theme.text}`}>학습 대시보드</h1>
                            {selectedPath && (
                                <p className={`text-sm ${theme.textSubtle}`}>
                                    {selectedPath.domain}
                                    {selectedPath.subDomain && ` / ${selectedPath.subDomain}`}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* 모바일 사이드바 토글 */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`lg:hidden p-2 rounded-xl ${theme.card} ${theme.border} border`}
                    >
                        <svg className={`w-5 h-5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* 메인 콘텐츠 영역 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 좌측: 메인 통계 영역 */}
                    <div className="lg:col-span-9 space-y-6">
                                {/* 상단 KPI */}
                                {stats && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                            <p className={`text-xs ${theme.textSubtle} mb-1`}>평균 점수</p>
                                            <p className={`text-2xl font-bold ${theme.accent}`}>
                                                {completedWeeks.length > 0 ? `${avgScore}점` : '-'}
                                            </p>
                                        </div>
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-xs ${theme.textSubtle} mb-1`}>완료한 문제</p>
                                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.answeredQuestions}문제</p>
                                    <p className={`text-xs ${theme.textSubtle} mt-1`}>
                                        {stats.totalQuestions > 0 ? `/ ${stats.totalQuestions}문제` : '-'}
                                    </p>
                                </div>
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-xs ${theme.textSubtle} mb-1`}>완료 주차</p>
                                    <p className={`text-2xl font-bold ${theme.text}`}>
                                        {stats.weeklyProgress.filter((w) => w.status === "COMPLETED").length}
                                    </p>
                                    <p className={`text-xs ${theme.textSubtle} mt-1`}>/ 4 주차</p>
                                </div>
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-xs ${theme.textSubtle} mb-1`}>약점 태그</p>
                                    <p className={`text-2xl font-bold ${theme.text}`}>{stats.weaknessAnalysis.totalWeak}</p>
                                    <p className={`text-xs mt-1 ${
                                        stats.weaknessAnalysis.totalWeak > 0
                                            ? "text-rose-500"
                                            : "text-emerald-500"
                                    }`}>
                                        {stats.weaknessAnalysis.totalWeak > 0 ? "주의 필요" : "양호"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 차트 영역 */}
                        {stats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 주차별 점수 추이 */}
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className={`text-sm font-medium ${theme.text}`}>점수 추이</p>
                                        <div className={`flex items-center gap-3 text-xs ${theme.textSubtle}`}>
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                                                점수
                                            </span>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={weeklyProgressData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                                                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                                                    borderRadius: 8,
                                                    color: darkMode ? '#fff' : '#1f2937',
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="점수"
                                                stroke={chartColors.primary}
                                                strokeWidth={2}
                                                dot={{ fill: chartColors.primary, r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* 유형별 점수 */}
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-sm font-medium ${theme.text} mb-4`}>유형별 점수</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={typeAccuracyData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                                            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                            <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={60} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                                                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                                                    borderRadius: 8,
                                                    color: darkMode ? '#fff' : '#1f2937',
                                                }}
                                            />
                                            <Bar dataKey="점수" fill={chartColors.secondary} radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* AI 약점 분석 섹션 */}
                        {stats && stats.aiWeaknessAnalysis && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 역량 레이더 차트 */}
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-sm font-medium ${theme.text} mb-2`}>역량 분석</p>
                                    <div className="flex justify-center items-center">
                                        <ResponsiveContainer width="100%" height={320}>
                                            <RadarChart
                                                data={stats.aiWeaknessAnalysis.radarData}
                                                cx="50%"
                                                cy="55%"
                                                outerRadius={100}
                                                margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                                            >
                                                <PolarGrid stroke={chartColors.grid} />
                                                <PolarAngleAxis
                                                    dataKey="category"
                                                    fontSize={11}
                                                    tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', dy: 3 }}
                                                />
                                                <PolarRadiusAxis
                                                    angle={90}
                                                    domain={[0, 100]}
                                                    fontSize={10}
                                                    tick={{ fill: darkMode ? '#6b7280' : '#9ca3af' }}
                                                    tickCount={5}
                                                />
                                                <Radar
                                                    name="역량"
                                                    dataKey="score"
                                                    stroke={chartColors.primary}
                                                    fill={chartColors.primary}
                                                    fillOpacity={0.3}
                                                    strokeWidth={2}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        fontSize: 12,
                                                        backgroundColor: darkMode ? '#1f2937' : '#fff',
                                                        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                                                        borderRadius: 8,
                                                        color: darkMode ? '#fff' : '#1f2937',
                                                    }}
                                                    formatter={(value: number) => [`${value}점`, '역량']}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* 약점 태그 및 추천 */}
                                <div className={`rounded-xl border backdrop-blur-sm p-4 ${theme.card}`}>
                                    <p className={`text-sm font-medium ${theme.text} mb-3`}>약점 분석</p>

                                    {stats.aiWeaknessAnalysis.weaknessTags.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {stats.aiWeaknessAnalysis.weaknessTags.map((tag, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                                                        tag.severity === 'high'
                                                            ? darkMode ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'
                                                            : tag.severity === 'medium'
                                                            ? darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                                                            : darkMode ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-gray-50 border border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            tag.severity === 'high' ? 'bg-rose-500' :
                                                            tag.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                                                        }`}></span>
                                                        <span className={`font-medium ${theme.text}`}>{tag.tag}</span>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                        tag.severity === 'high'
                                                            ? darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
                                                            : tag.severity === 'medium'
                                                            ? darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                                                            : darkMode ? 'bg-white/[0.05] text-white/60' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {tag.count}회
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={`text-xs ${theme.textSubtle} mb-4`}>아직 분석할 약점이 없습니다</p>
                                    )}

                                    <div className={`p-3 rounded-lg border mb-3 ${
                                        darkMode ? 'bg-violet-500/5 border-violet-500/10' : 'bg-violet-50/50 border-violet-100'
                                    }`}>
                                        <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                                            {stats.aiWeaknessAnalysis.overallAnalysis}
                                        </p>
                                    </div>

                                    {stats.aiWeaknessAnalysis.recommendations.length > 0 && (
                                        <div>
                                            <p className={`text-xs font-medium ${theme.textSubtle} mb-2`}>추천 학습</p>
                                            <ul className="space-y-1">
                                                {stats.aiWeaknessAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                                                    <li key={i} className={`text-xs ${theme.textMuted} flex items-start gap-1.5`}>
                                                        <span className={theme.accent}>•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 주차별 상세 테이블 */}
                        {stats && (
                            <div className={`rounded-xl border backdrop-blur-sm overflow-hidden ${theme.card}`}>
                                <div className={`px-4 py-3 border-b ${theme.divider}`}>
                                    <p className={`text-sm font-medium ${theme.text}`}>주차별 상세 현황</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className={`border-b ${theme.divider} ${theme.tableHeaderBg}`}>
                                                <th className={`text-left px-4 py-2.5 text-xs font-medium ${theme.textSubtle}`}>주차</th>
                                                <th className={`text-left px-4 py-2.5 text-xs font-medium ${theme.textSubtle}`}>상태</th>
                                                <th className={`text-right px-4 py-2.5 text-xs font-medium ${theme.textSubtle}`}>문제 수</th>
                                                <th className={`text-right px-4 py-2.5 text-xs font-medium ${theme.textSubtle}`}>점수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.weeklyProgress.map((w) => (
                                                <tr key={w.weekNumber} className={`border-b ${theme.divider} ${theme.tableRowHover}`}>
                                                    <td className={`px-4 py-2.5 ${theme.text}`}>{w.weekNumber}주차</td>
                                                    <td className="px-4 py-2.5">
                                                        {w.status === "COMPLETED" ? (
                                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                                darkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                                                            }`}>완료</span>
                                                        ) : w.status === "UNLOCKED" ? (
                                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                                darkMode ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-50 text-violet-500'
                                                            }`}>진행중</span>
                                                        ) : (
                                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                                darkMode ? 'bg-white/[0.05] text-white/40' : 'bg-gray-100 text-gray-400'
                                                            }`}>잠김</span>
                                                        )}
                                                    </td>
                                                    <td className={`px-4 py-2.5 text-right ${theme.textMuted}`}>{w.questionCount}</td>
                                                    <td className={`px-4 py-2.5 text-right ${theme.textMuted}`}>
                                                        {w.totalScore > 0 ? `${w.earnedScore}/${w.totalScore}` : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* AI 학습 피드백 */}
                        {stats && stats.weaknessAnalysis.feedbackList && stats.weaknessAnalysis.feedbackList.length > 0 && (
                            <div className={`rounded-xl border backdrop-blur-sm overflow-hidden ${theme.card}`}>
                                <div className={`px-4 py-3 border-b ${theme.divider} flex items-center justify-between`}>
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-medium ${theme.text}`}>AI 학습 피드백</p>
                                        {stats.weaknessAnalysis.totalWeak > 0 && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                오답 {stats.weaknessAnalysis.totalWeak}개
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs ${theme.textSubtle}`}>최근 {stats.weaknessAnalysis.feedbackList.length}문제</span>
                                </div>
                                <div className={`divide-y ${theme.divider} max-h-[500px] overflow-y-auto`}>
                                    {stats.weaknessAnalysis.feedbackList.map((item, i) => (
                                        <div key={i} className={`p-4 ${
                                            item.isCorrect
                                                ? ''
                                                : darkMode ? 'bg-rose-500/5' : 'bg-rose-50/30'
                                        }`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                    item.isCorrect
                                                        ? darkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                                                        : darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                    {item.isCorrect ? '✓' : '✗'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                darkMode ? 'bg-white/[0.05] text-white/60' : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                                {getTypeLabel(item.questionType || '')}
                                                            </span>
                                                            <p className={`text-sm ${theme.text} truncate`}>{item.questionText}</p>
                                                        </div>
                                                        <span className={`flex-shrink-0 text-xs font-medium ${
                                                            item.isCorrect ? theme.accent : 'text-rose-500'
                                                        }`}>
                                                            {item.score}/{item.maxScore}점
                                                        </span>
                                                    </div>

                                                    {!item.isCorrect && (
                                                        <div className={`mb-2 p-2 rounded-lg border text-xs ${
                                                            darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-gray-100'
                                                        }`}>
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                                                <div className="flex-1">
                                                                    <span className={theme.textSubtle}>내 답변: </span>
                                                                    <span className="text-rose-500">{item.userAnswer || '-'}</span>
                                                                </div>
                                                                {item.correctAnswer && (
                                                                    <div className="flex-1">
                                                                        <span className={theme.textSubtle}>정답: </span>
                                                                        <span className={`font-medium ${theme.accent}`}>{item.correctAnswer}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={`text-xs ${theme.textMuted} leading-relaxed`}>
                                                        <span className={`font-medium ${theme.accent}`}>AI: </span>
                                                        {item.feedback}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 선택 안됨 */}
                        {!stats && !loading && !creating && (
                            <div className={`rounded-xl border backdrop-blur-sm p-12 text-center ${theme.card}`}>
                                <p className={`text-sm ${theme.textSubtle}`}>
                                    {learningPaths.length > 0 ? '학습을 선택해주세요' : '진로 상담 후 학습을 시작해주세요'}
                                </p>
                            </div>
                        )}

                        {/* 로딩 */}
                        {loading && (
                            <div className={`rounded-xl border backdrop-blur-sm p-12 text-center ${theme.card}`}>
                                <div className={`w-6 h-6 border-2 rounded-full animate-spin mx-auto ${
                                    darkMode ? 'border-violet-500/20 border-t-violet-500' : 'border-violet-200 border-t-violet-500'
                                }`}></div>
                                <p className={`text-sm ${theme.textSubtle} mt-3`}>로딩 중...</p>
                            </div>
                        )}

                        {/* 학습 경로 생성 중 */}
                        {creating && (
                            <div className={`rounded-xl border backdrop-blur-sm p-12 text-center ${theme.card}`}>
                                <div className={`w-8 h-8 border-2 rounded-full animate-spin mx-auto ${
                                    darkMode ? 'border-violet-500/20 border-t-violet-500' : 'border-violet-200 border-t-violet-500'
                                }`}></div>
                                <p className={`text-sm ${theme.text} mt-4 font-medium`}>학습 경로를 생성하고 있어요</p>
                                <p className={`text-xs ${theme.textSubtle} mt-1`}>AI가 맞춤형 커리큘럼을 준비 중입니다...</p>
                            </div>
                        )}
                    </div>

                    {/* 우측: 학습 목록 (데스크톱) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <Sidebar />
                    </div>
                </div>
            </div>

            {/* 모바일 사이드바 오버레이 */}
            {showSidebar && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowSidebar(false)}
                    />
                    <div className={`absolute right-0 top-0 h-full w-80 p-4 ${theme.bg}`}>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowSidebar(false)}
                                className={`p-2 rounded-xl ${theme.card} ${theme.border} border`}
                            >
                                <svg className={`w-5 h-5 ${theme.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <Sidebar />
                    </div>
                </div>
            )}
        </div>
    );
}