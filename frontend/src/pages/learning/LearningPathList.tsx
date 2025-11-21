import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { LearningPath } from '@/types';

export default function LearningPathList() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);

  // TODO: 실제 userId는 인증 컨텍스트에서 가져와야 함
  const userId = 1;

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">
                나의 학습 경로
              </span>
            </h1>
            <p className="text-gray-600 mt-2">AI 기반 4주 학습 로드맵</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
          >
            + 새 학습 경로 만들기
          </button>
        </div>

        {/* Learning Paths Grid */}
        {paths.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              아직 학습 경로가 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              새로운 학습 경로를 만들어 시작해보세요!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
            >
              시작하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paths.map((path) => (
              <div
                key={path.pathId}
                onClick={() => navigate(`/learning/${path.pathId}`)}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-[#5A7BFF]/30"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#5A7BFF] transition-colors duration-300">{path.domain}</h3>
                    {getStatusBadge(path.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">진도율</span>
                      <span className="font-semibold text-gray-900">
                        {path.weeklySessions.filter((w) => w.status === 'COMPLETED').length} / 4
                        주차
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (path.weeklySessions.filter((w) => w.status === 'COMPLETED')
                              .length /
                              4) *
                            100
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
                    <div className="text-xs text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] bg-clip-text text-transparent">새 학습 경로 만들기</h2>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreatePath()}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDomain('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePath}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
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
