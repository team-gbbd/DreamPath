import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { learningPathService } from "@/lib/api";
import Header from "@/components/feature/Header";

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
    const navigate = useNavigate();

    const [learningPaths, setLearningPaths] = useState([]);
    const [selectedPathId, setSelectedPathId] = useState<number | null>(null);

    const [stats, setStats] = useState(null);
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
            case "MCQ":
                return "객관식";
            case "SCENARIO":
                return "시나리오";
            case "CODING":
                return "코딩";
            case "DESIGN":
                return "설계";
            default:
                return type;
        }
    };

    const weeklyProgressData =
        stats?.weeklyProgress?.map((w) => ({
            name: `${w.weekNumber}주차`,
            정답률: w.correctRate,
        })) ?? [];

    const typeAccuracyData =
        stats?.typeAccuracy?.map((t) => ({
            name: getTypeLabel(t.questionType),
            정답률: t.accuracy,
        })) ?? [];

    return (
        <div className="min-h-screen bg-[#FFF5F7]">
            <Header />

            <div className="max-w-[1650px] mx-auto px-6 pt-24 pb-10 flex gap-8">

                {/* ===================================================
            오른쪽 상단 고정 카드 리스트 (MPM 사이드 바 느낌)
        =================================================== */}
                <aside className="w-[360px] flex-shrink-0 sticky top-28">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">진행중인 학습</h2>

                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">

                        {learningPaths.length === 0 && (
                            <div className="py-16 text-center text-gray-500 text-sm">
                                진행 중인 학습이 없습니다
                            </div>
                        )}

                        {learningPaths.map((p) => (
                            <div
                                key={p.pathId}
                                className={`
                  p-4 border rounded-xl cursor-pointer transition-all shadow-sm
                  ${
                                    selectedPathId === p.pathId
                                        ? "border-pink-400 bg-pink-50 shadow"
                                        : "border-pink-200 bg-white hover:border-pink-300 hover:shadow"
                                }
                `}
                                onClick={() => handlePathSelect(p.pathId)}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
                                        <i className="ri-book-line text-white text-lg" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {p.domain}
                                        </p>
                                        {p.subDomain && (
                                            <p className="text-xs text-gray-500 truncate">{p.subDomain}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-gradient-to-r from-pink-400 to-pink-500"
                                        style={{ width: `${p.overallProgress}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-gray-600">
                                    <span className="font-bold">{p.overallProgress}% 완료</span>
                                    <span>{p.currentWeek}/4주차</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ===================================================
            메인 상세 대시보드 (ㄴ자형 MPM 분석 레이아웃)
        =================================================== */}
                <main className="flex-1 space-y-8">

                    {/* 선택 안됨 */}
                    {!selectedPathId && (
                        <div className="h-[600px] flex flex-col items-center justify-center">
                            <i className="ri-bar-chart-line text-7xl text-gray-300 mb-5" />
                            <p className="text-lg text-gray-700 font-semibold">학습 경로를 선택해주세요</p>
                            <p className="text-sm text-gray-400 mt-2">
                                오른쪽 학습 카드에서 선택하면 상세 분석이 표시됩니다
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-[600px] flex flex-col items-center justify-center">
                            <div className="h-10 w-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4" />
                            <p className="text-sm text-gray-500">데이터 로딩 중...</p>
                        </div>
                    )}

                    {/* ================================ */}
                    {/*   선택된 학습 상세 데이터 출력   */}
                    {/* ================================ */}
                    {!loading && stats && (
                        <>
                            {/* 상단 KPI 카드들 */}
                            <section className="grid grid-cols-4 gap-4">
                                {[
                                    {
                                        label: "전체 정답률",
                                        icon: "ri-percent-line",
                                        value: `${stats.correctRate.toFixed(1)}%`,
                                        sub: `${stats.correctCount} / ${stats.totalQuestions}`,
                                    },
                                    {
                                        label: "완료한 문제",
                                        icon: "ri-checkbox-circle-line",
                                        value: stats.answeredQuestions,
                                        sub: `/ ${stats.totalQuestions}`,
                                    },
                                    {
                                        label: "완료 주차",
                                        icon: "ri-calendar-check-line",
                                        value: stats.weeklyProgress.filter((w) => w.status === "COMPLETED").length,
                                        sub: "/ 4",
                                    },
                                    {
                                        label: "약점 개수",
                                        icon: "ri-alert-line",
                                        value: stats.weaknessAnalysis.totalWeak,
                                        sub: "개",
                                    },
                                ].map((c, i) => (
                                    <div
                                        key={i}
                                        className="bg-white border border-pink-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center mb-3">
                                            <i className={`${c.icon} text-white text-lg`} />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                                        <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
                                    </div>
                                ))}
                            </section>

                            {/* ======= ㄴ자형 MPM 레이아웃 ======= */}
                            <section className="grid grid-cols-3 gap-8">

                                {/* -----------------------------------
                    좌측 패널 (유형별 / 약점)
                ----------------------------------- */}
                                <div className="col-span-1 space-y-8">
                                    {/* 문제 유형별 */}
                                    <div className="bg-white border border-pink-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                            문제 유형별 정답률
                                        </h3>

                                        {stats.typeAccuracy.map((t) => (
                                            <div key={t.questionType} className="mb-4">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-gray-700">{getTypeLabel(t.questionType)}</span>
                                                    <span className="font-semibold text-gray-900">{t.accuracy.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-pink-400 to-pink-500"
                                                        style={{ width: `${t.accuracy}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* 바 차트 */}
                                        <div className="mt-6">
                                            <ResponsiveContainer width="100%" height={120}>
                                                <BarChart data={typeAccuracyData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                                                    <XAxis dataKey="name" fontSize={10} />
                                                    <YAxis fontSize={10} />
                                                    <Tooltip />
                                                    <Bar dataKey="정답률" fill="#f472b6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* 약점 분석 */}
                                    <div className="bg-white border border-pink-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">약점 분석</h3>

                                        {stats.weaknessAnalysis.totalWeak === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="text-4xl mb-2">🎉</div>
                                                <p className="text-gray-700 font-semibold">약점이 없습니다!</p>
                                                <p className="text-xs text-gray-400 mt-1">모든 영역에서 잘하고 있어요</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                                                    <p className="text-sm font-semibold text-orange-800 mb-1">
                                                        총 {stats.weaknessAnalysis.totalWeak} 개의 약점 발견
                                                    </p>
                                                    <p className="text-xs text-orange-700">아래 항목을 집중적으로 공부하세요!</p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {stats.weaknessAnalysis.weakTags.map((tag, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1 bg-orange-100 border border-orange-200 text-orange-800 rounded-md text-xs"
                                                        >
                              {tag}
                            </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* -----------------------------------
                    우측 패널 (트렌드 + 테이블)
                ----------------------------------- */}
                                <div className="col-span-2 space-y-8">

                                    {/* 라인 차트 */}
                                    <div className="bg-white border border-pink-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-gray-900">주차별 학습 진도</h3>
                                        <p className="text-xs text-gray-400 mb-4">정답률 추이</p>

                                        <ResponsiveContainer width="100%" height={240}>
                                            <LineChart data={weeklyProgressData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                                                <XAxis dataKey="name" fontSize={11} />
                                                <YAxis fontSize={11} />
                                                <Tooltip />
                                                <Line
                                                    type="monotone"
                                                    dataKey="정답률"
                                                    stroke="#f472b6"
                                                    strokeWidth={2.5}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 테이블 */}
                                    <div className="bg-white border border-pink-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">주차별 상세 현황</h3>

                                        <table className="w-full text-xs">
                                            <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2">주차</th>
                                                <th className="text-left py-2">상태</th>
                                                <th className="text-right py-2">문제</th>
                                                <th className="text-right py-2">정답</th>
                                                <th className="text-right py-2">정답률</th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {stats.weeklyProgress.map((w) => (
                                                <tr
                                                    key={w.weekNumber}
                                                    className="border-b hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="py-3">{w.weekNumber}주차</td>
                                                    <td className="py-3">
                              <span
                                  className={`px-2 py-1 rounded-md border text-xs font-semibold
                                  ${
                                      w.status === "COMPLETED"
                                          ? "bg-pink-50 text-pink-700 border-pink-300"
                                          : w.status === "UNLOCKED"
                                              ? "bg-pink-100 text-pink-800 border-pink-400"
                                              : "bg-gray-50 text-gray-600 border-gray-300"
                                  }
                                `}
                              >
                                {w.status === "COMPLETED"
                                    ? "완료"
                                    : w.status === "UNLOCKED"
                                        ? "진행중"
                                        : "잠김"}
                              </span>
                                                    </td>

                                                    <td className="py-3 text-right">{w.questionCount}</td>
                                                    <td className="py-3 text-right">{w.correctCount}</td>
                                                    <td className="py-3 text-right font-bold">
                                                        {w.correctRate.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                </div>
                            </section>
                        </>
                    )}

                </main>
            </div>
        </div>
    );
}