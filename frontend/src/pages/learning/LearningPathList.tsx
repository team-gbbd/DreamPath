import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { LearningPath } from '@/types';
import Header from '@/components/feature/Header';

export default function LearningPathList() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);

  // 현재 로그인한 유저 정보 가져오기
  const getCurrentUserId = (): number | null => {
    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.userId || null;
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    loadPaths(userId);
  }, []);

  const loadPaths = async (userId: number) => {
    try {
      setLoading(true);
      const data = await learningPathService.getUserLearningPaths(userId);
      setPaths(data);
    } catch (error) {
      console.error('학습 경로 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePath = async () => {
    if (!newDomain.trim()) {
      alert('학습 분야를 입력해주세요');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      setCreating(true);
      const newPath = await learningPathService.createLearningPath({
        userId,
        domain: newDomain.trim(),
      });
      setPaths([newPath, ...paths]);
      setShowCreateModal(false);
      setNewDomain('');
      navigate(`/learning/${newPath.pathId}`);
    } catch (error) {
      console.error('학습 경로 생성 실패:', error);
      alert('학습 경로 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
        진행중
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        완료
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              나의 학습 경로
            </h1>
            <p className="text-gray-600">AI 기반 4주 학습 로드맵</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <i className="ri-add-line text-xl"></i> 새 학습 경로 만들기
          </button>
        </div>

        {/* Learning Paths Grid */}
        {paths.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-16 text-center">
            <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-book-open-line text-5xl text-pink-500"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              아직 학습 경로가 없습니다
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              새로운 학습 경로를 만들어 시작해보세요!<br/>
              AI가 4주 학습 로드맵을 자동으로 생성합니다.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
            >
              <i className="ri-add-line text-xl"></i> 시작하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paths.map((path) => (
              <div
                key={path.pathId}
                onClick={() => navigate(`/learning/${path.pathId}`)}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{path.domain}</h3>
                    {getStatusBadge(path.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">진도율</span>
                      <span className="font-semibold text-gray-900">
                        {path.weeklySessions.filter((w) => w.status === 'COMPLETED').length} / 4 주차
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-pink-400 to-purple-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (path.weeklySessions.filter((w) => w.status === 'COMPLETED').length / 4) * 100
                          }%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">정답률</span>
                      <span className="font-semibold text-gray-900">
                        {path.correctRate?.toFixed(1) || 0}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">총 문제 수</span>
                      <span className="font-semibold text-gray-900">
                        {path.correctCount} / {path.totalQuestions}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <i className="ri-calendar-line"></i>
                      시작일: {new Date(path.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">새 학습 경로 만들기</h2>
              <p className="text-gray-600 mb-6">
                학습하고 싶은 분야를 입력하면 AI가 4주 학습 로드맵을 생성합니다
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  학습 분야 *
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="예: React, Python, Machine Learning"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreatePath()}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDomain('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePath}
                  className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
                  disabled={creating}
                >
                  {creating ? '생성 중...' : '만들기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
