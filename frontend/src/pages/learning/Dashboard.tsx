import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { DashboardStats } from '@/types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathId) {
      loadDashboard();
    }
  }, [pathId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await learningPathService.getDashboard(Number(pathId));
      setStats(data);
    } catch (error) {
      console.error('대시보드 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">대시보드 로딩 중...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">통계 데이터를 찾을 수 없습니다</div>
      </div>
    );
  }

  // 주차별 진도율 차트 데이터
  const weeklyProgressData = Array.isArray(stats.weeklyProgress)
    ? stats.weeklyProgress.map((week) => ({
        name: `${week.weekNumber}주차`,
        정답률: week.correctRate,
        문제수: week.questionCount,
        정답수: week.correctCount,
      }))
    : [];

  // 문제 유형별 정답률 차트 데이터
  const typeAccuracyData = Array.isArray(stats.typeAccuracy)
    ? stats.typeAccuracy.map((type) => ({
        name: getTypeLabel(type.questionType),
        정답률: type.accuracy,
        총문제: type.totalQuestions,
        정답수: type.correctCount,
      }))
    : [];

  function getTypeLabel(type: string) {
    switch (type) {
      case 'MCQ':
        return '객관식';
      case 'SCENARIO':
        return '시나리오';
      case 'CODING':
        return '코딩';
      case 'DESIGN':
        return '설계';
      default:
        return type;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← 돌아가기
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">학습 대시보드</h1>
          <p className="text-gray-600">{stats.domain}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-2">전체 정답률</div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {stats.correctRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              {stats.correctCount} / {stats.totalQuestions} 문제
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-2">완료한 문제</div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {stats.answeredQuestions}
            </div>
            <div className="text-xs text-gray-500">/ {stats.totalQuestions} 문제</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-2">완료 주차</div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {stats.weeklyProgress.filter((w) => w.status === 'COMPLETED').length}
            </div>
            <div className="text-xs text-gray-500">/ 4 주차</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 mb-2">약점 개수</div>
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {stats.weaknessAnalysis.totalWeak}
            </div>
            <div className="text-xs text-gray-500">개선 필요</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Progress Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">주차별 학습 진도</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="정답률"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {stats.weeklyProgress.map((week) => (
                <div key={week.weekNumber} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">{week.weekNumber}주차</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {week.correctRate.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type Accuracy Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">문제 유형별 정답률</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="정답률" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {stats.typeAccuracy.map((type) => (
                <div
                  key={type.questionType}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {getTypeLabel(type.questionType)}
                  </span>
                  <span className="text-sm text-gray-600">
                    {type.correctCount} / {type.totalQuestions} (
                    {type.accuracy.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weakness Analysis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">약점 분석</h2>

          {stats.weaknessAnalysis.totalWeak === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🎉</div>
              <div className="text-lg font-semibold text-gray-700">
                약점이 발견되지 않았습니다!
              </div>
              <div className="text-gray-500 mt-2">모든 영역에서 잘 하고 있어요</div>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-800 font-semibold">
                    총 {stats.weaknessAnalysis.totalWeak}개의 약점이 발견되었습니다
                  </span>
                </div>
                <div className="text-sm text-orange-700">
                  아래 영역에 집중하여 학습하면 더 큰 발전이 있을 거예요!
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {stats.weaknessAnalysis.weakTags.map((tag, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full font-semibold text-sm"
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-semibold text-blue-900 mb-2">💡 학습 팁</div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 약점 영역의 문제를 다시 풀어보세요</li>
                  <li>• 관련 개념을 복습하고 추가 학습 자료를 찾아보세요</li>
                  <li>• 다음 주차에서 비슷한 유형의 문제에 집중하세요</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Details Table */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">주차별 상세 현황</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    주차
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    상태
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    문제 수
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    정답 수
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    정답률
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.weeklyProgress.map((week) => (
                  <tr key={week.weekNumber} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {week.weekNumber}주차
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          week.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : week.status === 'UNLOCKED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {week.status === 'COMPLETED'
                          ? '완료'
                          : week.status === 'UNLOCKED'
                          ? '진행중'
                          : '잠김'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {week.questionCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {week.correctCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span
                        className={`font-semibold ${
                          week.correctRate >= 80
                            ? 'text-green-600'
                            : week.correctRate >= 60
                            ? 'text-blue-600'
                            : 'text-orange-600'
                        }`}
                      >
                        {week.correctRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
