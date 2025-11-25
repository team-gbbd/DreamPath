import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { Question, StudentAnswer } from '@/types';
import Header from '@/components/feature/Header';
import { useToast } from '@/components/common/Toast';

export default function WeeklyQuiz() {
  const { pathId, weeklyId } = useParams<{ pathId: string; weeklyId: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
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
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return 1; // fallback
    }
    const user = JSON.parse(userStr);
    return user.userId || 1;
  };

  const userId = getCurrentUserId();

  useEffect(() => {
    if (weeklyId && userId) {
      loadQuestions();
    }
  }, [weeklyId, userId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await learningPathService.getWeeklyQuestions(Number(weeklyId), userId);
      const sortedQuestions = data.sort((a, b) => a.orderNum - b.orderNum);
      setQuestions(sortedQuestions);

      // 기존 제출 답안이 있으면 submissions에 로드
      const existingSubmissions = new Map<number, StudentAnswer>();
      const existingAnswers = new Map<number, string>();

      sortedQuestions.forEach((q) => {
        if (q.submittedAnswer) {
          existingSubmissions.set(q.questionId, {
            answerId: q.submittedAnswer.answerId,
            questionId: q.questionId,
            userId: userId,
            userAnswer: q.submittedAnswer.userAnswer,
            score: q.submittedAnswer.score,
            aiFeedback: q.submittedAnswer.aiFeedback,
            submittedAt: q.submittedAnswer.submittedAt,
          });
          existingAnswers.set(q.questionId, q.submittedAnswer.userAnswer);
        }
      });

      if (existingSubmissions.size > 0) {
        setSubmissions(existingSubmissions);
        setAnswers(existingAnswers);
      }
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
      showToast('답을 입력해주세요', 'warning');
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
      showToast('답안 제출에 실패했습니다', 'error');
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
      showToast(`아직 제출하지 않은 문제가 ${unanswered.length}개 있습니다`, 'warning');
      return;
    }

    try {
      // 주차 완료 처리
      await learningPathService.completeSession(Number(weeklyId));
      showToast('주차를 완료했습니다!', 'success');
      // state를 통해 새로고침 요청
      navigate(`/learning/${pathId}`, { state: { refresh: true } });
    } catch (error) {
      console.error('주차 완료 실패:', error);
      showToast('주차 완료 처리에 실패했습니다', 'error');
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '기초' };
      case 'MEDIUM':
        return { bg: 'bg-amber-50', text: 'text-amber-600', label: '중급' };
      case 'HARD':
        return { bg: 'bg-rose-50', text: 'text-rose-600', label: '고급' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: difficulty };
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'MCQ':
        return { bg: 'bg-sky-50', text: 'text-sky-600', label: '객관식' };
      case 'SCENARIO':
        return { bg: 'bg-violet-50', text: 'text-violet-600', label: '시나리오' };
      case 'CODING':
        return { bg: 'bg-pink-50', text: 'text-pink-600', label: '코딩' };
      case 'DESIGN':
        return { bg: 'bg-orange-50', text: 'text-orange-600', label: '설계' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: type };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">문제가 없습니다</p>
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className="px-4 py-2 bg-pink-500 text-white text-sm rounded hover:bg-pink-600 transition-colors"
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
  const completedCount = submissions.size;

  const difficultyBadge = getDifficultyBadge(currentQuestion.difficulty);
  const typeBadge = getTypeBadge(currentQuestion.questionType);

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
    <div className="min-h-screen bg-[#FFF5F7]">
      <ToastContainer />
      <Header />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-8">
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-pink-100">
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1 transition-colors"
          >
            <i className="ri-arrow-left-s-line"></i> 목록으로
          </button>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              문제 <span className="font-medium text-gray-900">{currentIndex + 1}</span>/{questions.length}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              제출 <span className="font-medium text-pink-600">{completedCount}</span>/{questions.length}
            </span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mb-5">
          <div className="h-1 bg-pink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white border border-gray-200 rounded-lg mb-5">
          {/* 문제 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${difficultyBadge.bg} ${difficultyBadge.text}`}>
                {difficultyBadge.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${typeBadge.bg} ${typeBadge.text}`}>
                {typeBadge.label}
              </span>
            </div>
            <span className="text-xs text-gray-400">{currentQuestion.maxScore}점</span>
          </div>

          {/* 문제 내용 */}
          <div className="p-5">
            <h2 className="text-base font-medium text-gray-900 leading-relaxed whitespace-pre-wrap mb-5">
              {currentQuestion.questionText}
            </h2>

            {/* MCQ 옵션 */}
            {currentQuestion.questionType === 'MCQ' && questionOptions && (
              <div className="space-y-2">
                {questionOptions.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isSubmitted && handleAnswerChange(option)}
                    className={`p-3 border rounded cursor-pointer transition-all ${
                      currentAnswer === option
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50/30'
                    } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          currentAnswer === option
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {currentAnswer === option && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 서술형 답안 */}
            {currentQuestion.questionType !== 'MCQ' && (
              <div>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={isSubmitted}
                  className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                  rows={currentQuestion.questionType === 'CODING' ? 12 : 6}
                  placeholder="답안을 입력하세요..."
                />
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          {!isSubmitted && (
            <div className="px-5 pb-5">
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !currentAnswer}
                className="w-full py-3 bg-pink-500 text-white text-sm rounded font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    채점중...
                  </span>
                ) : (
                  '제출하기'
                )}
              </button>
            </div>
          )}

          {/* 채점 결과 */}
          {isSubmitted && currentSubmission && (
            <div className="border-t border-gray-100">
              {/* 결과 헤더 */}
              <div className={`px-5 py-3 flex items-center justify-between ${
                currentSubmission.score === currentQuestion.maxScore
                  ? 'bg-emerald-50'
                  : currentSubmission.score > 0
                  ? 'bg-amber-50'
                  : 'bg-rose-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    currentSubmission.score === currentQuestion.maxScore
                      ? 'bg-emerald-500'
                      : currentSubmission.score > 0
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}>
                    {currentSubmission.score === currentQuestion.maxScore ? '✓' : currentSubmission.score > 0 ? '△' : '✗'}
                  </span>
                  <span className={`text-sm font-semibold ${
                    currentSubmission.score === currentQuestion.maxScore
                      ? 'text-emerald-700'
                      : currentSubmission.score > 0
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}>
                    {currentSubmission.score === currentQuestion.maxScore ? '정답입니다!' : currentSubmission.score > 0 ? '부분 정답' : '오답입니다'}
                  </span>
                </div>
                <span className={`text-lg font-bold ${
                  currentSubmission.score === currentQuestion.maxScore
                    ? 'text-emerald-600'
                    : currentSubmission.score > 0
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  {currentSubmission.score}/{currentQuestion.maxScore}점
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* 제출한 답 */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">내가 제출한 답</p>
                  <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">
                    {currentSubmission.userAnswer}
                  </div>
                </div>

                {/* AI 피드백 */}
                <div className={`rounded-lg overflow-hidden border ${
                  currentSubmission.score === currentQuestion.maxScore
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-blue-200 bg-blue-50/50'
                }`}>
                  <div className={`px-4 py-2 border-b ${
                    currentSubmission.score === currentQuestion.maxScore
                      ? 'bg-emerald-100/50 border-emerald-200'
                      : 'bg-blue-100/50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <i className={`ri-sparkling-line ${
                        currentSubmission.score === currentQuestion.maxScore
                          ? 'text-emerald-600'
                          : 'text-blue-600'
                      }`}></i>
                      <span className={`text-xs font-semibold ${
                        currentSubmission.score === currentQuestion.maxScore
                          ? 'text-emerald-700'
                          : 'text-blue-700'
                      }`}>AI 학습 피드백</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentSubmission.aiFeedback}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>

          {/* 문제 번호 네비게이션 */}
          <div className="flex items-center gap-1">
            {questions.map((q, idx) => (
              <button
                key={q.questionId}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 text-xs rounded transition-colors ${
                  idx === currentIndex
                    ? 'bg-pink-500 text-white'
                    : submissions.has(q.questionId)
                    ? 'bg-pink-100 text-pink-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 && completedCount === questions.length ? (
            <button
              onClick={handleComplete}
              className="px-4 py-2 text-sm bg-emerald-500 text-white rounded font-medium hover:bg-emerald-600 transition-colors"
            >
              완료하기
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-2 text-sm bg-pink-500 text-white rounded font-medium hover:bg-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
