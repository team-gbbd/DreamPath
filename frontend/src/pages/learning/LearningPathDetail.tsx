import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { LearningPath, WeeklySessionInfo } from '@/types';
import { useToast } from '@/components/common/Toast';

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
  accentBg: string;
  statBg: string;
}

// 남은 시간 계산 헬퍼
const getRemainingTime = (unlockAt: string | null): string | null => {
  if (!unlockAt) return null;
  const now = new Date();
  const unlock = new Date(unlockAt);
  const diff = unlock.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}일 ${hours}시간 후 해제`;
  if (hours > 0) return `${hours}시간 후 해제`;
  return '곧 해제';
};

export default function LearningPathDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);

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
    cardHover: "hover:border-violet-500/30",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/20",
    statBg: "bg-white/[0.03]",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50",
    card: "bg-white border-slate-200",
    cardHover: "hover:border-violet-300",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-100",
    accent: "text-violet-600",
    accentBg: "bg-violet-100",
    statBg: "bg-slate-50",
  };

  useEffect(() => {
    if (pathId) {
      loadPath();
    }
  }, [pathId]);

  useEffect(() => {
    if (location.state?.refresh && pathId) {
      loadPath();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, pathId]);

  const loadPath = async () => {
    try {
      setLoading(true);
      const data = await learningPathService.getLearningPath(Number(pathId));
      setPath(data);
    } catch (error) {
      console.error('학습 경로 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async (session: WeeklySessionInfo) => {
    if (!path) return;

    try {
      setGeneratingWeek(session.weekNumber);
      await learningPathService.generateQuestions(session.weeklyId, 5);
      await loadPath();
      showToast(`${session.weekNumber}주차 문제가 생성되었습니다!`, 'success');
    } catch (error) {
      console.error('문제 생성 실패:', error);
      const apiError = error as { response?: { data?: { message?: string } }; message?: string };
      showToast('문제 생성에 실패했습니다: ' + (apiError.response?.data?.message || apiError.message || '알 수 없는 오류'), 'error');
    } finally {
      setGeneratingWeek(null);
    }
  };

  const handleStartWeek = (session: WeeklySessionInfo) => {
    if (session.status === 'LOCKED') {
      showToast('이전 주차를 먼저 완료해주세요', 'warning');
      return;
    }

    if (session.questionCount === 0) {
      handleGenerateQuestions(session);
    } else {
      navigate(`/learning/${pathId}/week/${session.weeklyId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    if (darkMode) {
      switch (status) {
        case 'LOCKED':
          return { bg: 'bg-white/[0.05]', text: 'text-white/40', label: '잠김' };
        case 'UNLOCKED':
          return { bg: 'bg-violet-500/20', text: 'text-violet-400', label: '진행중' };
        case 'COMPLETED':
          return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '완료' };
        default:
          return { bg: 'bg-white/[0.05]', text: 'text-white/40', label: status };
      }
    } else {
      switch (status) {
        case 'LOCKED':
          return { bg: 'bg-gray-100', text: 'text-gray-500', label: '잠김' };
        case 'UNLOCKED':
          return { bg: 'bg-violet-100', text: 'text-violet-600', label: '진행중' };
        case 'COMPLETED':
          return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '완료' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
      }
    }
  };

  const getDifficultyBadge = (weekNumber: number) => {
    if (darkMode) {
      const difficulties = [
        { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '기초' },
        { bg: 'bg-sky-500/20', text: 'text-sky-400', label: '초급' },
        { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '중급' },
        { bg: 'bg-rose-500/20', text: 'text-rose-400', label: '고급' },
      ];
      return difficulties[weekNumber - 1] || difficulties[0];
    } else {
      const difficulties = [
        { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '기초' },
        { bg: 'bg-sky-50', text: 'text-sky-600', label: '초급' },
        { bg: 'bg-amber-50', text: 'text-amber-600', label: '중급' },
        { bg: 'bg-rose-50', text: 'text-rose-600', label: '고급' },
      ];
      return difficulties[weekNumber - 1] || difficulties[0];
    }
  };

  // Background Effects
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${
          darkMode ? "bg-violet-500/10" : "bg-violet-400/20"
        }`} />
        <div className={`absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full blur-[100px] ${
          darkMode ? "bg-purple-500/8" : "bg-purple-400/15"
        }`} />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} relative flex items-center justify-center`}>
        <BackgroundEffects />
        <div className="relative z-10">
          <div className={`w-6 h-6 border-2 rounded-full animate-spin ${
            darkMode ? 'border-violet-500/20 border-t-violet-500' : 'border-violet-200 border-t-violet-500'
          }`}></div>
        </div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className={`min-h-screen ${theme.bg} relative flex items-center justify-center`}>
        <BackgroundEffects />
        <div className={`relative z-10 ${theme.textMuted}`}>학습 경로를 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <BackgroundEffects />
      <ToastContainer />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 상단 네비게이션 */}
        <div className={`flex items-center justify-between mb-6 pb-4 border-b ${theme.divider}`}>
          <button
            onClick={() => navigate('/learning')}
            className={`text-sm ${theme.textMuted} hover:${theme.accent} flex items-center gap-1 transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드
          </button>
          <button
            onClick={() => navigate('/learning', { state: { selectPathId: Number(pathId) } })}
            className={`text-sm ${theme.accent} flex items-center gap-1 transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            통계 보기
          </button>
        </div>

        {/* 헤더 카드 */}
        <div className={`rounded-2xl border backdrop-blur-sm p-5 sm:p-6 mb-6 ${theme.card}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h1 className={`text-lg sm:text-xl font-semibold ${theme.text}`}>{path.domain}</h1>
              {path.subDomain && (
                <p className={`text-sm ${theme.textMuted} mt-0.5`}>{path.subDomain}</p>
              )}
            </div>
            <span className={`text-xs ${theme.textSubtle}`}>
              {path.weeklySessions.filter((w) => w.status === 'COMPLETED').length}/4 주차 완료
            </span>
          </div>

          {/* 통계 */}
          {(() => {
            // weeklySessions에서 실제 점수 계산
            const completedSessions = path.weeklySessions.filter((s: any) => s.status === 'COMPLETED');
            const totalEarned = completedSessions.reduce((sum: number, s: any) => sum + (s.earnedScore || 0), 0);
            const avgScore = completedSessions.length > 0 ? Math.round(totalEarned / completedSessions.length) : 0;

            // 현재 주차: UNLOCKED 또는 IN_PROGRESS 상태인 주차, 없으면 마지막 완료 주차 + 1
            const currentWeek = path.weeklySessions.find((s: any) => s.status === 'UNLOCKED' || s.status === 'IN_PROGRESS')?.weekNumber
              || (completedSessions.length > 0 ? Math.min(completedSessions.length + 1, 4) : 1);

            return (
              <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2 sm:gap-4">
                <div className={`text-center p-3 sm:p-3 rounded-xl ${theme.statBg}`}>
                  <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>
                    {((completedSessions.length / 4) * 100).toFixed(0)}%
                  </p>
                  <p className={`text-xs ${theme.textSubtle} mt-1`}>진도율</p>
                </div>
                <div className={`text-center p-3 sm:p-3 rounded-xl ${theme.statBg}`}>
                  <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>
                    {avgScore}<span className={`text-xs sm:text-sm font-normal ${theme.textSubtle}`}>점</span>
                  </p>
                  <p className={`text-xs ${theme.textSubtle} mt-1`}>평균 점수</p>
                </div>
                <div className={`text-center p-3 sm:p-3 rounded-xl ${theme.statBg}`}>
                  <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>
                    {currentWeek}<span className={`text-xs sm:text-sm font-normal ${theme.textSubtle}`}>주차</span>
                  </p>
                  <p className={`text-xs ${theme.textSubtle} mt-1`}>현재 주차</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 주차별 목록 */}
        <div className="space-y-3">
          {path.weeklySessions
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((session) => {
              const difficultyBadge = getDifficultyBadge(session.weekNumber);
              const statusBadge = getStatusBadge(session.status);
              const isGenerating = generatingWeek === session.weekNumber;
              const scoreRate = session.totalScore > 0
                ? ((session.earnedScore / session.totalScore) * 100).toFixed(0)
                : 0;

              return (
                <div
                  key={session.weeklyId}
                  className={`rounded-2xl border backdrop-blur-sm transition-all ${theme.card} ${
                    session.status === 'LOCKED'
                      ? 'opacity-50'
                      : `${theme.cardHover} cursor-pointer`
                  }`}
                  onClick={() => !isGenerating && session.status !== 'LOCKED' && handleStartWeek(session)}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* 좌측: 주차 정보 */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${theme.accentBg}`}>
                          <span className={`text-base sm:text-lg font-bold ${theme.accent}`}>{session.weekNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-medium ${theme.text}`}>{session.weekNumber}주차</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyBadge.bg} ${difficultyBadge.text}`}>
                              {difficultyBadge.label}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className={`flex items-center gap-3 mt-1 text-xs ${theme.textSubtle}`}>
                            <span>{session.questionCount}문제</span>
                            {session.questionCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{session.earnedScore}/{session.totalScore}점</span>
                                <span>•</span>
                                <span className={Number(scoreRate) >= 70 ? theme.accent : ''}>{scoreRate}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 우측: 버튼 */}
                      <div className="ml-auto sm:ml-0">
                        {session.status === 'COMPLETED' ? (
                          <span className="text-xs text-emerald-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            완료
                          </span>
                        ) : session.status === 'LOCKED' ? (
                          <div className="text-right">
                            <span className={`text-xs ${theme.textSubtle} flex items-center gap-1`}>
                              <i className="ri-lock-line"></i> 잠김
                            </span>
                            {session.unlockAt && (
                              <span className="text-xs text-pink-400 mt-1 block">
                                {getRemainingTime(session.unlockAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            className={`text-sm px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 ${
                              darkMode
                                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                                : 'bg-violet-500 hover:bg-violet-600 text-white'
                            }`}
                            disabled={isGenerating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWeek(session);
                            }}
                          >
                            {isGenerating ? (
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                                생성중
                              </span>
                            ) : session.questionCount === 0 ? (
                              '문제 생성'
                            ) : (
                              '계속하기'
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* AI 요약 */}
                    {session.aiSummary && (
                      <div className={`mt-3 pt-3 border-t ${theme.divider}`}>
                        <p className={`text-xs ${theme.textMuted} leading-relaxed`}>{session.aiSummary}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}