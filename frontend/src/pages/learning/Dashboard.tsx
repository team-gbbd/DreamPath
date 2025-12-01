import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { learningPathService } from "@/lib/api";
import Header from "@/components/feature/Header";

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

interface DashboardStats {
    correctRate: number;
    correctCount: number;
    totalQuestions: number;
    answeredQuestions: number;
    weeklyProgress: WeeklyProgress[];
    typeAccuracy: TypeAccuracy[];
    weaknessAnalysis: WeaknessAnalysis;
}

export default function Dashboard() {
    const navigate = useNavigate();

    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);

    const getCurrentUserId = () => {
        const raw = localStorage.getItem("dreampath:user");
        if (!raw) return null;
        return JSON.parse(raw).userId;
    };

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return navigate("/login");
        loadLearningPaths(userId);
    }, []);

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
        정답률: w.correctRate,
    })) ?? [];

    const typeAccuracyData = stats?.typeAccuracy?.map((t) => ({
        name: getTypeLabel(t.questionType),
        정답률: t.accuracy,
    })) ?? [];

    const selectedPath = learningPaths.find(p => p.pathId === selectedPathId);

    // 계산된 값들
    const totalQ = stats ? calcTotalQuestions(stats) : 0;
    const correctC = stats ? calcCorrectCount(stats) : 0;
    const correctRate = safePercent(correctC, totalQ);

    return (
        <div className="min-h-screen bg-[#FFF5F7]">
            <Header />

            <div className="max-w-[1600px] mx-auto px-6 pt-24 pb-8">
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
                                    <p className="text-xs text-gray-500 mb-1">전체 정답률</p>
                                    <p className="text-2xl font-bold text-gray-900">{safeNumber(correctRate)}%</p>
                                    <p className="text-xs text-gray-400 mt-1">{correctC} / {totalQ}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-xs text-gray-500 mb-1">완료한 문제</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.answeredQuestions}</p>
                                    <p className="text-xs text-gray-400 mt-1">/ {totalQ} 문제</p>
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
                                {/* 주차별 정답률 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-medium text-gray-900">주차별 정답률</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                                                정답률
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
                                                dataKey="정답률"
                                                stroke="#ec4899"
                                                strokeWidth={2}
                                                dot={{ fill: '#ec4899', r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* 유형별 정답률 */}
                                <div className="bg-white border border-gray-200 rounded p-4">
                                    <p className="text-sm font-medium text-gray-900 mb-4">유형별 정답률</p>
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
                                            <Bar dataKey="정답률" fill="#f472b6" radius={[0, 2, 2, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
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
                                            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">정답 수</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">정답률</th>
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
                                                <td className="px-4 py-2.5 text-right text-gray-600">{w.correctCount}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className={w.correctRate >= 70 ? "text-pink-600" : w.correctRate >= 40 ? "text-amber-600" : "text-rose-600"}>
                                                        {safeNumber(w.correctRate)}%
                                                    </span>
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
                                                onClick={() => handlePathSelect(p.pathId)}
                                                className={`px-4 py-3 cursor-pointer transition-colors ${
                                                    selectedPathId === p.pathId
                                                        ? "bg-pink-50 border-l-2 border-l-pink-500"
                                                        : "hover:bg-pink-50/30 border-l-2 border-l-transparent"
                                                }`}
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
