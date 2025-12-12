import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { LearningPath, WeeklySessionInfo } from '@/types';
import { useToast } from '@/components/common/Toast';

export default function LearningPathDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastContainer } = useToast();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);

  useEffect(() => {
    if (pathId) {
      loadPath();
    }
  }, [pathId]);

  // location.state가 변경될 때마다 새로고침
  useEffect(() => {
    if (location.state?.refresh && pathId) {
      loadPath();
      // state 초기화
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
      await loadPath(); // 새로고침
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
    switch (status) {
      case 'LOCKED':
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: '잠김' };
      case 'UNLOCKED':
        return { bg: 'bg-pink-50', text: 'text-pink-600', label: '진행중' };
      case 'COMPLETED':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '완료' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
    }
  };

  const getDifficultyBadge = (weekNumber: number) => {
    const difficulties = [
      { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '기초' },
      { bg: 'bg-sky-50', text: 'text-sky-600', label: '초급' },
      { bg: 'bg-amber-50', text: 'text-amber-600', label: '중급' },
      { bg: 'bg-rose-50', text: 'text-rose-600', label: '고급' },
    ];
    return difficulties[weekNumber - 1] || difficulties[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center">
        <div className="text-gray-500">학습 경로를 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7]">
      <ToastContainer />
      
      <div className="max-w-4xl mx-auto px-6 py-8 pb-8">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-pink-100">
          <button
            onClick={() => navigate('/learning')}
            className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1 transition-colors"
          >
            <i className="ri-arrow-left-s-line"></i> 대시보드
          </button>
          <button
            onClick={() => navigate('/learning', { state: { selectPathId: Number(pathId) } })}
            className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1 transition-colors"
          >
            <i className="ri-bar-chart-2-line"></i> 통계 보기
          </button>
        </div>

        {/* 헤더 카드 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{path.domain}</h1>
              {path.subDomain && (
                <p className="text-sm text-gray-500 mt-0.5">{path.subDomain}</p>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {path.weeklySessions.filter((w) => w.status === 'COMPLETED').length}/4 주차 완료
            </span>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-900">
                {((path.weeklySessions.filter((w) => w.status === 'COMPLETED').length / 4) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">진도율</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-900">
                {path.correctRate?.toFixed(0) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">정답률</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold text-gray-900">
                {path.correctCount}<span className="text-sm font-normal text-gray-400">/{path.totalQuestions}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">맞춘 문제</p>
            </div>
          </div>
        </div>

        {/* 주차별 목록 */}
        <div className="space-y-3">
          {path.weeklySessions
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((session) => {
              const difficultyBadge = getDifficultyBadge(session.weekNumber);
              const statusBadge = getStatusBadge(session.status);
              const isGenerating = generatingWeek === session.weekNumber;
              const correctRate = session.questionCount > 0
                ? ((session.correctCount / session.questionCount) * 100).toFixed(0)
                : 0;

              return (
                <div
                  key={session.weeklyId}
                  className={`bg-white border border-gray-200 rounded-lg transition-all ${
                    session.status === 'LOCKED'
                      ? 'opacity-50'
                      : 'hover:border-pink-200 cursor-pointer'
                  }`}
                  onClick={() => !isGenerating && session.status !== 'LOCKED' && handleStartWeek(session)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      {/* 좌측: 주차 정보 */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-50 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-pink-600">{session.weekNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{session.weekNumber}주차</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyBadge.bg} ${difficultyBadge.text}`}>
                              {difficultyBadge.label}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{session.questionCount}문제</span>
                            {session.questionCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{session.correctCount}/{session.questionCount} 정답</span>
                                <span>•</span>
                                <span className={Number(correctRate) >= 70 ? 'text-pink-600' : ''}>{correctRate}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 우측: 버튼 */}
                      <div>
                        {session.status === 'COMPLETED' ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <i className="ri-check-line"></i> 완료
                          </span>
                        ) : session.status === 'LOCKED' ? (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <i className="ri-lock-line"></i> 잠김
                          </span>
                        ) : (
                          <button
                            className="text-sm bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
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
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-600 leading-relaxed">{session.aiSummary}</p>
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
