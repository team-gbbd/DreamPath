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

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

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
            // career 파라미터가 있으면 학습 경로 생성 시도
            createLearningPathFromCareer(userId, careerParam);
        } else {
            // state로 selectPathId가 전달되면 해당 경로 선택
            const state = location.state as { selectPathId?: number } | null;
            const selectId = state?.selectPathId;

            loadLearningPaths(userId).then(() => {
                if (selectId) {
                    handlePathSelect(selectId);
                    // state 초기화
                    window.history.replaceState({}, document.title);
                }
            });
        }
    }, []);

    const createLearningPathFromCareer = async (userId: number, career: string) => {
        setCreating(true);
        try {
            // 먼저 기존 학습 경로 조회
            const existingPaths = await learningPathService.getUserLearningPaths(userId);

            // 같은 도메인의 기존 학습 경로가 있는지 확인
            const careerLower = career.toLowerCase();
            const existingPath = existingPaths.find(
                (p: LearningPath) => p.domain.toLowerCase() === careerLower ||
                    p.domain.toLowerCase().includes(careerLower) ||
                    careerLower.includes(p.domain.toLowerCase())
            );

            if (existingPath) {
                // 기존 경로가 있으면 바로 상세 페이지로 이동
                console.log("기존 학습 경로 발견:", existingPath.domain);
                navigate(`/learning/${existingPath.pathId}`);
                return;
            }

            // 기존 경로가 없으면 새로 생성
            const newPath = await learningPathService.createLearningPath({
                userId,
                domain: career,
            });

            // 생성 성공 시 바로 상세 페이지로 이동
            if (newPath.pathId) {
                navigate(`/learning/${newPath.pathId}`);
            } else {
                // pathId가 없으면 대시보드에서 목록 새로고침
                setSearchParams({});
                await loadLearningPaths(userId);
            }
        } catch (error) {
            console.error("학습 경로 생성 실패:", error);
            // 실패해도 기존 목록은 로드
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

    const weeklyProgressData = stats?.weeklyProgress?.map((w) => ({
        name: `${w.weekNumber}주차`,
        점수: w.scoreRate,
    })) ?? [];

    const typeAccuracyData = stats?.typeAccuracy?.map((t) => ({
        name: getTypeLabel(t.questionType),
        점수: t.accuracy,
    })) ?? [];

    const selectedPath = learningPaths.find(p => p.pathId === selectedPathId);

    // 계산된 값들
    const scoreRate = stats?.scoreRate ?? 0;
    const earnedScore = stats?.earnedScore ?? 0;
    const totalMaxScore = stats?.totalMaxScore ?? 0;

    // 평균 점수 계산 (완료된 주차 기준)
    const completedWeeks = stats?.weeklyProgress?.filter((w: any) => w.status === 'COMPLETED') ?? [];
    const avgScore = completedWeeks.length > 0
        ? Math.round(completedWeeks.reduce((sum: number, w: any) => sum + (w.earnedScore || 0), 0) / completedWeeks.length)
        : 0;

    return (
        <div className="min-h-screen bg-[#FFF5F7]">
            <div className="max-w-[1600px] mx-auto px-6 py-8">
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-pink-100">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-gray-900">학습 대시보드</h1>
                        {selectedPath && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-pink-300">|</span>
                                <span className="text-gray-600">{selectedPath.domain}</span>
                                {selectedPath.subDomain && (
                                    <span className="text-gray-400 text-xs">/ {selectedPath.subDomain}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-5">
                    {/* 좌측: 메인 통계 영역 */}
                    <div className="col-span-9 space-y-5">
                        {/* 상단 KPI */}
                        {stats && (
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-xs text-gray-500 mb-1">평균 점수</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {completedWeeks.length > 0 ? `${avgScore}점` : '-'}
                                    </p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-xs text-gray-500 mb-1">완료한 문제</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.answeredQuestions}문제</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {stats.totalQuestions > 0 ? `/ ${stats.totalQuestions}문제` : '-'}
                                    </p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-xs text-gray-500 mb-1">완료 주차</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.weeklyProgress.filter((w) => w.status === "COMPLETED").length}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">/ 4 주차</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-xs text-gray-500 mb-1">약점 태그</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.weaknessAnalysis.totalWeak}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {stats.weaknessAnalysis.totalWeak > 0 ? (
                                            <span className="text-rose-500">주의 필요</span>
                                        ) : (
                                            <span className="text-emerald-500">양호</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 차트 영역 */}
                        {stats && (
                            <div className="grid grid-cols-2 gap-4">
                                {/* 주차별 점수 추이 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-medium text-gray-900">점수 추이</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                                                점수
                                            </span>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={weeklyProgressData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    border: '1px solid #fce7f3',
                                                    borderRadius: 4,
                                                    boxShadow: 'none'
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="점수"
                                                stroke="#ec4899"
                                                strokeWidth={2}
                                                dot={{ fill: '#ec4899', r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* 유형별 점수 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-sm font-medium text-gray-900 mb-4">유형별 점수</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={typeAccuracyData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" horizontal={false} />
                                            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                                            <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={60} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    border: '1px solid #fce7f3',
                                                    borderRadius: 4,
                                                    boxShadow: 'none'
                                                }}
                                            />
                                            <Bar dataKey="점수" fill="#f472b6" radius={[0, 2, 2, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* AI 약점 분석 섹션 */}
                        {stats && stats.aiWeaknessAnalysis && (
                            <div className="grid grid-cols-2 gap-4">
                                {/* 역량 레이더 차트 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-sm font-medium text-gray-900 mb-4">역량 분석</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <RadarChart data={stats.aiWeaknessAnalysis.radarData}>
                                            <PolarGrid stroke="#fce7f3" />
                                            <PolarAngleAxis
                                                dataKey="category"
                                                fontSize={11}
                                                tick={{ fill: '#6b7280' }}
                                            />
                                            <PolarRadiusAxis
                                                angle={90}
                                                domain={[0, 100]}
                                                fontSize={10}
                                                tick={{ fill: '#9ca3af' }}
                                            />
                                            <Radar
                                                name="역량"
                                                dataKey="score"
                                                stroke="#ec4899"
                                                fill="#ec4899"
                                                fillOpacity={0.3}
                                                strokeWidth={2}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    border: '1px solid #fce7f3',
                                                    borderRadius: 4,
                                                    boxShadow: 'none'
                                                }}
                                                formatter={(value: number) => [`${value}점`, '역량']}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* 약점 태그 및 추천 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-sm font-medium text-gray-900 mb-3">약점 분석</p>

                                    {/* 약점 태그 */}
                                    {stats.aiWeaknessAnalysis.weaknessTags.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {stats.aiWeaknessAnalysis.weaknessTags.map((tag, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-between p-2 rounded text-xs ${
                                                        tag.severity === 'high'
                                                            ? 'bg-rose-50 border border-rose-200'
                                                            : tag.severity === 'medium'
                                                            ? 'bg-amber-50 border border-amber-200'
                                                            : 'bg-gray-50 border border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            tag.severity === 'high' ? 'bg-rose-500' :
                                                            tag.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                                                        }`}></span>
                                                        <span className="font-medium text-gray-700">{tag.tag}</span>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                        tag.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                                                        tag.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {tag.count}회
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mb-4">아직 분석할 약점이 없습니다</p>
                                    )}

                                    {/* 종합 분석 */}
                                    <div className="p-3 bg-pink-50/50 rounded border border-pink-100 mb-3">
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            {stats.aiWeaknessAnalysis.overallAnalysis}
                                        </p>
                                    </div>

                                    {/* 학습 추천 */}
                                    {stats.aiWeaknessAnalysis.recommendations.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-2">추천 학습</p>
                                            <ul className="space-y-1">
                                                {stats.aiWeaknessAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                                        <span className="text-pink-500 mt-0.5">•</span>
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
                            <div className="bg-white border border-gray-200 rounded">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">주차별 상세 현황</p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">주차</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">상태</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">문제 수</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">점수</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.weeklyProgress.map((w) => (
                                            <tr key={w.weekNumber} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 text-gray-900">{w.weekNumber}주차</td>
                                                <td className="px-4 py-2.5">
                                                    {w.status === "COMPLETED" ? (
                                                        <span className="text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded">완료</span>
                                                    ) : w.status === "UNLOCKED" ? (
                                                        <span className="text-xs text-pink-500 bg-pink-50/50 px-2 py-0.5 rounded">진행중</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">잠김</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">{w.questionCount}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">
                                                    {w.totalScore > 0 ? `${w.earnedScore}/${w.totalScore}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* AI 학습 피드백 */}
                        {stats && stats.weaknessAnalysis.feedbackList && stats.weaknessAnalysis.feedbackList.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded">
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900">AI 학습 피드백</p>
                                        {stats.weaknessAnalysis.totalWeak > 0 && (
                                            <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                                오답 {stats.weaknessAnalysis.totalWeak}개
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">최근 {stats.weaknessAnalysis.feedbackList.length}문제</span>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                    {stats.weaknessAnalysis.feedbackList.map((item, i) => (
                                        <div key={i} className={`p-4 ${item.isCorrect ? 'bg-white' : 'bg-rose-50/30'}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                    item.isCorrect
                                                        ? 'bg-pink-100 text-pink-600'
                                                        : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                    {item.isCorrect ? '✓' : '✗'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {item.questionType === 'MCQ' ? '객관식' :
                                                                 item.questionType === 'SCENARIO' ? '시나리오' :
                                                                 item.questionType === 'CODING' ? '코딩' : '설계'}
                                                            </span>
                                                            <p className="text-sm text-gray-700 truncate">{item.questionText}</p>
                                                        </div>
                                                        <span className={`flex-shrink-0 text-xs font-medium ${
                                                            item.isCorrect ? 'text-pink-600' : 'text-rose-600'
                                                        }`}>
                                                            {item.score}/{item.maxScore}점
                                                        </span>
                                                    </div>

                                                    {/* 내 답변 vs 정답 */}
                                                    {!item.isCorrect && (
                                                        <div className="mb-2 p-2 bg-white rounded border border-gray-100 text-xs">
                                                            <div className="flex gap-4">
                                                                <div className="flex-1">
                                                                    <span className="text-gray-400">내 답변: </span>
                                                                    <span className="text-rose-600">{item.userAnswer || '-'}</span>
                                                                </div>
                                                                {item.correctAnswer && (
                                                                    <div className="flex-1">
                                                                        <span className="text-gray-400">정답: </span>
                                                                        <span className="text-pink-600 font-medium">{item.correctAnswer}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI 피드백 */}
                                                    <div className="text-xs text-gray-600 leading-relaxed">
                                                        <span className="text-pink-500 font-medium">AI: </span>
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
                        {!stats && !loading && (
                            <div className="bg-white border border-gray-200 rounded p-12 text-center">
                                <p className="text-gray-400 text-sm">우측에서 학습을 선택해주세요</p>
                            </div>
                        )}

                        {/* 로딩 */}
                        {loading && (
                            <div className="bg-white border border-gray-200 rounded p-12 text-center">
                                <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
                                <p className="text-gray-400 text-sm mt-3">로딩 중...</p>
                            </div>
                        )}

                        {/* 학습 경로 생성 중 */}
                        {creating && (
                            <div className="bg-white border border-gray-200 rounded p-12 text-center">
                                <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
                                <p className="text-gray-700 text-sm mt-4 font-medium">학습 경로를 생성하고 있어요</p>
                                <p className="text-gray-400 text-xs mt-1">AI가 맞춤형 커리큘럼을 준비 중입니다...</p>
                            </div>
                        )}
                    </div>

                    {/* 우측: 학습 목록 */}
                    <div className="col-span-3">
                        <div className="bg-white border border-gray-200 rounded sticky top-24">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">진행중인 학습</p>
                                <span className="text-xs text-gray-400">{learningPaths.length}개</span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                {learningPaths.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <i className="ri-chat-smile-2-line text-xl text-pink-400"></i>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">아직 학습이 없어요</p>
                                        <p className="text-xs text-gray-400 mb-4">진로 상담 후 직업을 선택하면<br/>맞춤 학습이 생성됩니다</p>
                                        <button
                                            onClick={() => navigate('/career-chat')}
                                            className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                                        >
                                            진로 상담 시작하기 →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {learningPaths.map((p) => (
                                            <div
                                                key={p.pathId}
                                                className={`px-4 py-3 transition-colors ${
                                                    selectedPathId === p.pathId
                                                        ? "bg-pink-50 border-l-2 border-l-pink-500"
                                                        : "hover:bg-pink-50/30 border-l-2 border-l-transparent"
                                                }`}
                                            >
                                                <div
                                                    onClick={() => handlePathSelect(p.pathId)}
                                                    className="cursor-pointer"
                                                >
                                                    <p className={`text-sm truncate ${
                                                        selectedPathId === p.pathId ? "text-pink-700 font-medium" : "text-gray-700"
                                                    }`}>
                                                        {p.domain}
                                                    </p>
                                                    {p.subDomain && (
                                                        <p className="text-xs text-gray-400 truncate mt-0.5">{p.subDomain}</p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-gray-400">{p.currentWeek ?? 1}/4주차</span>
                                                        <span className={`text-xs font-medium ${
                                                            selectedPathId === p.pathId ? "text-pink-600" : "text-gray-500"
                                                        }`}>
                                                            {p.overallProgress ?? 0}%
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 h-1 bg-pink-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                selectedPathId === p.pathId ? "bg-pink-500" : "bg-pink-300"
                                                            }`}
                                                            style={{ width: `${p.overallProgress ?? 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* 학습하기 버튼 */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/learning/${p.pathId}`);
                                                    }}
                                                    className="mt-3 w-full py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium rounded transition-colors"
                                                >
                                                    문제 풀기
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
