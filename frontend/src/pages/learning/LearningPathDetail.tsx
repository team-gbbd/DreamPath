import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { LearningPath, WeeklySessionInfo } from '@/types';

export default function LearningPathDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);

  useEffect(() => {
    if (pathId) {
      loadPath();
    }
  }, [pathId]);

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

    console.log('문제 생성 시작:', { weeklyId: session.weeklyId, weekNumber: session.weekNumber });

    try {
      setGeneratingWeek(session.weekNumber);
      console.log('API 호출 전');
      await learningPathService.generateQuestions(session.weeklyId, 5);
      console.log('API 호출 성공');
      await loadPath(); // 새로고침
      alert(`${session.weekNumber}주차 문제가 생성되었습니다!`);
    } catch (error) {
      console.error('문제 생성 실패:', error);
      alert('문제 생성에 실패했습니다. 오류: ' + (error as any)?.response?.data?.message || (error as any)?.message);
    } finally {
      setGeneratingWeek(null);
    }
  };

  const handleStartWeek = (session: WeeklySessionInfo) => {
    if (session.status === 'LOCKED') {
      alert('이전 주차를 먼저 완료해주세요');
      return;
    }

    if (session.questionCount === 0) {
      handleGenerateQuestions(session);
    } else {
      navigate(`/learning/${pathId}/week/${session.weeklyId}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LOCKED':
        return '🔒';
      case 'UNLOCKED':
        return '📝';
      case 'COMPLETED':
        return '✅';
      default:
        return '📝';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'LOCKED':
        return '잠김';
      case 'UNLOCKED':
        return '진행 가능';
      case 'COMPLETED':
        return '완료';
      default:
        return status;
    }
  };

  const getDifficultyInfo = (weekNumber: number) => {
    const difficulties = [
      { week: 1, level: 'EASY', color: 'text-green-600', label: '기초' },
      { week: 2, level: 'EASY-MEDIUM', color: 'text-blue-600', label: '초급' },
      { week: 3, level: 'MEDIUM', color: 'text-orange-600', label: '중급' },
      { week: 4, level: 'HARD', color: 'text-red-600', label: '고급' },
    ];
    return difficulties[weekNumber - 1] || difficulties[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">학습 경로를 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/learning')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← 목록으로
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{path.domain}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 진도율</div>
                <div className="text-2xl font-bold text-blue-600">
                  {((path.weeklySessions.filter((w) => w.status === 'COMPLETED').length / 4) * 100).toFixed(0)}%
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">정답률</div>
                <div className="text-2xl font-bold text-green-600">
                  {path.correctRate?.toFixed(1) || 0}%
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">맞춘 문제</div>
                <div className="text-2xl font-bold text-gray-900">
                  {path.correctCount} / {path.totalQuestions}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => navigate(`/learning/${pathId}/dashboard`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📊 대시보드 보기
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Sessions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">주차별 학습 진행</h2>

          {path.weeklySessions
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((session) => {
              const difficultyInfo = getDifficultyInfo(session.weekNumber);
              const isGenerating = generatingWeek === session.weekNumber;

              return (
                <div
                  key={session.weeklyId}
                  className={`bg-white rounded-lg shadow-md p-6 transition-all ${
                    session.status === 'LOCKED'
                      ? 'opacity-60'
                      : 'hover:shadow-lg cursor-pointer'
                  }`}
                  onClick={() => !isGenerating && handleStartWeek(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{getStatusIcon(session.status)}</span>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {session.weekNumber}주차
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-sm font-semibold ${difficultyInfo.color}`}
                            >
                              {difficultyInfo.label}
                            </span>
                            <span className="text-sm text-gray-500">
                              • {getStatusText(session.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {session.aiSummary && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-700">{session.aiSummary}</div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">문제 수: </span>
                          <span className="font-semibold">{session.questionCount}개</span>
                        </div>
                        <div>
                          <span className="text-gray-600">정답: </span>
                          <span className="font-semibold">
                            {session.correctCount} / {session.questionCount}
                          </span>
                        </div>
                        {session.questionCount > 0 && (
                          <div>
                            <span className="text-gray-600">정답률: </span>
                            <span className="font-semibold">
                              {session.questionCount > 0
                                ? ((session.correctCount / session.questionCount) * 100).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {session.status === 'COMPLETED' ? (
                        <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-sm">
                          완료
                        </span>
                      ) : session.status === 'LOCKED' ? (
                        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
                          잠김
                        </span>
                      ) : (
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50"
                          disabled={isGenerating}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartWeek(session);
                          }}
                        >
                          {isGenerating
                            ? '생성 중...'
                            : session.questionCount === 0
                            ? '문제 생성'
                            : '계속하기'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
