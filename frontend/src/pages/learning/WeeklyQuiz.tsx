import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { Question, StudentAnswer } from '@/types';
import Header from '@/components/feature/Header';

export default function WeeklyQuiz() {
  const { pathId, weeklyId } = useParams<{ pathId: string; weeklyId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submissions, setSubmissions] = useState<Map<number, StudentAnswer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 현재 로그인한 유저 정보 가져오기
  const getCurrentUserId = (): number => {
    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return 1; // fallback
    }
    const user = JSON.parse(userStr);
    return user.userId || 1;
  };

  const userId = getCurrentUserId();

  useEffect(() => {
    if (weeklyId) {
      loadQuestions();
    }
  }, [weeklyId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await learningPathService.getWeeklyQuestions(Number(weeklyId));
      setQuestions(data.sort((a, b) => a.orderNum - b.orderNum));
    } catch (error) {
      console.error('문제 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questions[currentIndex].questionId, value);
    setAnswers(newAnswers);
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    const answer = answers.get(currentQuestion.questionId);

    if (!answer?.trim()) {
      alert('답을 입력해주세요');
      return;
    }

    try {
      setSubmitting(true);
      const result = await learningPathService.submitAnswer(currentQuestion.questionId, {
        userId,
        answer: answer,
      });

      const newSubmissions = new Map(submissions);
      newSubmissions.set(currentQuestion.questionId, result);
      setSubmissions(newSubmissions);
    } catch (error) {
      console.error('답안 제출 실패:', error);
      alert('답안 제출에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = async () => {
    const unanswered = questions.filter(
      (q) => !submissions.has(q.questionId)
    );

    if (unanswered.length > 0) {
      alert(`아직 제출하지 않은 문제가 ${unanswered.length}개 있습니다`);
      return;
    }

    try {
      // 주차 완료 처리
      await learningPathService.completeSession(Number(weeklyId));
      alert('주차를 완료했습니다! 🎉');
      // state를 통해 새로고침 요청
      navigate(`/learning/${pathId}`, { state: { refresh: true } });
    } catch (error) {
      console.error('주차 완료 실패:', error);
      alert('주차 완료 처리에 실패했습니다');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">문제 로딩 중...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">문제가 없습니다</div>
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.questionId) || '';
  const currentSubmission = submissions.get(currentQuestion.questionId);
  const isSubmitted = !!currentSubmission;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const completedCount = submissions.size;

  // JSONB 필드는 문자열로 올 수 있으므로 파싱
  const getQuestionOptions = (question: Question): string[] | null => {
    if (!question.options) return null;
    if (Array.isArray(question.options)) return question.options;
    try {
      return JSON.parse(question.options as any);
    } catch {
      return null;
    }
  };

  const questionOptions = getQuestionOptions(currentQuestion);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-blue-50/30">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className="text-pink-600 hover:text-pink-700 mb-4 flex items-center gap-2 font-medium transition-colors"
          >
            <i className="ri-arrow-left-line"></i> 돌아가기
          </button>

          {/* Progress Bar */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100/50 p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">
                문제 {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-sm font-semibold text-gray-700">
                제출: {completedCount} / {questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-pink-400 to-purple-400 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          {/* Question Header */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(
                currentQuestion.difficulty
              )}`}
            >
              {currentQuestion.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {getTypeLabel(currentQuestion.questionType)}
            </span>
            <span className="text-sm text-gray-600">{currentQuestion.maxScore}점</span>
          </div>

          {/* Question Text */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 whitespace-pre-wrap">
              {currentQuestion.questionText}
            </h2>

            {/* Options for MCQ */}
            {currentQuestion.questionType === 'MCQ' && questionOptions && (
              <div className="space-y-2 mt-4">
                {questionOptions.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isSubmitted && handleAnswerChange(option)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      currentAnswer === option
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${isSubmitted ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          currentAnswer === option
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {currentAnswer === option && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Answer Input for non-MCQ */}
          {currentQuestion.questionType !== 'MCQ' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                답안 작성
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                disabled={isSubmitted}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={currentQuestion.questionType === 'CODING' ? 10 : 6}
                placeholder="답안을 입력하세요..."
              />
            </div>
          )}

          {/* Submit Button */}
          {!isSubmitted && (
            <button
              onClick={handleSubmitAnswer}
              disabled={submitting || !currentAnswer}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '채점 중...' : '제출하기'}
            </button>
          )}

          {/* Feedback */}
          {isSubmitted && currentSubmission && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">채점 결과</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {currentSubmission.score} / {currentQuestion.maxScore}점
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">AI 피드백</div>
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {currentSubmission.aiFeedback}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">제출한 답</div>
                  <div className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded">
                    {currentSubmission.userAnswer}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 이전 문제
          </button>

          {currentIndex === questions.length - 1 && completedCount === questions.length ? (
            <button
              onClick={handleComplete}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              완료하기 ✓
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음 문제 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
