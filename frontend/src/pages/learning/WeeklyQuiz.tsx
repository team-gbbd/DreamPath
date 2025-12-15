import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathService } from '@/lib/api';
import type { Question, StudentAnswer } from '@/types';
import { useToast } from '@/components/common/Toast';

interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  input: string;
  inputFocus: string;
  optionBg: string;
  optionHover: string;
  optionSelected: string;
  optionSelectedBorder: string;
}

export default function WeeklyQuiz() {
  const { pathId, weeklyId } = useParams<{ pathId: string; weeklyId: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submissions, setSubmissions] = useState<Map<number, StudentAnswer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    input: "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40",
    inputFocus: "focus:ring-violet-500/50 focus:border-violet-500/50",
    optionBg: "bg-white/[0.02]",
    optionHover: "hover:bg-white/[0.05] hover:border-white/[0.15]",
    optionSelected: "bg-violet-500/10",
    optionSelectedBorder: "border-violet-500/50",
  } : {
    bg: "bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50",
    card: "bg-white border-slate-200",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-500",
    border: "border-slate-200",
    divider: "border-slate-100",
    input: "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400",
    inputFocus: "focus:ring-violet-500 focus:border-violet-500",
    optionBg: "bg-white",
    optionHover: "hover:bg-violet-50/50 hover:border-violet-200",
    optionSelected: "bg-violet-50",
    optionSelectedBorder: "border-violet-500",
  };

  const getCurrentUserId = (): number => {
    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      showToast('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return 1;
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
      const sortedQuestions = data.sort((a: Question, b: Question) => a.orderNum - b.orderNum);
      setQuestions(sortedQuestions);

      const existingSubmissions = new Map<number, StudentAnswer>();
      const existingAnswers = new Map<number, string>();

      sortedQuestions.forEach((q: Question) => {
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
      await learningPathService.completeSession(Number(weeklyId));
      showToast('주차를 완료했습니다!', 'success');
      navigate(`/learning/${pathId}`, { state: { refresh: true } });
    } catch (error) {
      console.error('주차 완료 실패:', error);
      showToast('주차 완료 처리에 실패했습니다', 'error');
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    if (darkMode) {
      switch (difficulty) {
        case 'EASY':
          return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '기초' };
        case 'MEDIUM':
          return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '중급' };
        case 'HARD':
          return { bg: 'bg-rose-500/20', text: 'text-rose-400', label: '고급' };
        default:
          return { bg: 'bg-white/[0.05]', text: 'text-white/60', label: difficulty };
      }
    } else {
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
    }
  };

  const getTypeBadge = (type: string) => {
    if (darkMode) {
      switch (type) {
        case 'MCQ':
          return { bg: 'bg-sky-500/20', text: 'text-sky-400', label: '객관식' };
        case 'SCENARIO':
          return { bg: 'bg-violet-500/20', text: 'text-violet-400', label: '시나리오' };
        case 'CODING':
          return { bg: 'bg-pink-500/20', text: 'text-pink-400', label: '코딩' };
        case 'DESIGN':
          return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '설계' };
        default:
          return { bg: 'bg-white/[0.05]', text: 'text-white/60', label: type };
      }
    } else {
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

  if (questions.length === 0) {
    return (
      <div className={`min-h-screen ${theme.bg} relative flex items-center justify-center`}>
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <p className={`${theme.textMuted} mb-4`}>문제가 없습니다</p>
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
              darkMode
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-violet-500 hover:bg-violet-600 text-white'
            }`}
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

  const getQuestionOptions = (question: Question): string[] | null => {
    if (!question.options) return null;
    if (Array.isArray(question.options)) return question.options;
    try {
      return JSON.parse(question.options as unknown as string);
    } catch {
      return null;
    }
  };

  const questionOptions = getQuestionOptions(currentQuestion);

  return (
    <div className={`min-h-screen ${theme.bg} relative`}>
      <BackgroundEffects />
      <ToastContainer />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 상단 네비게이션 */}
        <div className={`flex items-center justify-between mb-5 pb-4 border-b ${theme.divider}`}>
          <button
            onClick={() => navigate(`/learning/${pathId}`)}
            className={`text-sm ${theme.textMuted} flex items-center gap-1 transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로
          </button>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <span className={theme.textSubtle}>
              문제 <span className={`font-medium ${theme.text}`}>{currentIndex + 1}</span>/{questions.length}
            </span>
            <span className={theme.textSubtle}>|</span>
            <span className={theme.textSubtle}>
              제출 <span className="font-medium text-violet-500">{completedCount}</span>/{questions.length}
            </span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mb-5">
          <div className={`h-1.5 rounded-full overflow-hidden ${
            darkMode ? 'bg-violet-500/20' : 'bg-violet-100'
          }`}>
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 문제 카드 */}
        <div className={`rounded-2xl border backdrop-blur-sm mb-5 overflow-hidden ${theme.card}`}>
          {/* 문제 헤더 */}
          <div className={`px-4 sm:px-5 py-3 border-b ${theme.divider} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${difficultyBadge.bg} ${difficultyBadge.text}`}>
                {difficultyBadge.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${typeBadge.bg} ${typeBadge.text}`}>
                {typeBadge.label}
              </span>
            </div>
            <span className={`text-xs ${theme.textSubtle}`}>{currentQuestion.maxScore}점</span>
          </div>

          {/* 문제 내용 */}
          <div className="p-4 sm:p-5">
            <h2 className={`text-base font-medium ${theme.text} leading-relaxed whitespace-pre-wrap mb-5`}>
              {currentQuestion.questionText}
            </h2>

            {/* MCQ 옵션 */}
            {currentQuestion.questionType === 'MCQ' && questionOptions && (
              <div className="space-y-2">
                {questionOptions.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isSubmitted && handleAnswerChange(option)}
                    className={`p-3 sm:p-4 border rounded-xl cursor-pointer transition-all ${
                      currentAnswer === option
                        ? `${theme.optionSelected} ${theme.optionSelectedBorder}`
                        : `${theme.optionBg} ${theme.border} ${theme.optionHover}`
                    } ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          currentAnswer === option
                            ? 'border-violet-500 bg-violet-500'
                            : darkMode ? 'border-white/30' : 'border-slate-300'
                        }`}
                      >
                        {currentAnswer === option && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className={`text-sm ${theme.textMuted}`}>{option}</span>
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
                  className={`w-full px-4 py-3 border rounded-xl text-sm ${theme.input} ${theme.inputFocus} focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all`}
                  rows={currentQuestion.questionType === 'CODING' ? 12 : 6}
                  placeholder="답안을 입력하세요..."
                />
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          {!isSubmitted && (
            <div className="px-4 sm:px-5 pb-5">
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !currentAnswer}
                className={`w-full py-3 text-sm rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-violet-500 hover:bg-violet-600 text-white'
                }`}
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
            <div className={`border-t ${theme.divider}`}>
              {/* 결과 헤더 */}
              <div className={`px-4 sm:px-5 py-3 flex items-center justify-between ${
                currentSubmission.score === currentQuestion.maxScore
                  ? darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'
                  : currentSubmission.score > 0
                  ? darkMode ? 'bg-amber-500/10' : 'bg-amber-50'
                  : darkMode ? 'bg-rose-500/10' : 'bg-rose-50'
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
                      ? darkMode ? 'text-emerald-400' : 'text-emerald-700'
                      : currentSubmission.score > 0
                      ? darkMode ? 'text-amber-400' : 'text-amber-700'
                      : darkMode ? 'text-rose-400' : 'text-rose-700'
                  }`}>
                    {currentSubmission.score === currentQuestion.maxScore ? '정답입니다!' : currentSubmission.score > 0 ? '부분 정답' : '오답입니다'}
                  </span>
                </div>
                <span className={`text-lg font-bold ${
                  currentSubmission.score === currentQuestion.maxScore
                    ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                    : currentSubmission.score > 0
                    ? darkMode ? 'text-amber-400' : 'text-amber-600'
                    : darkMode ? 'text-rose-400' : 'text-rose-600'
                }`}>
                  {currentSubmission.score}/{currentQuestion.maxScore}점
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* 제출한 답 */}
                <div>
                  <p className={`text-xs font-medium ${theme.textSubtle} mb-2`}>내가 제출한 답</p>
                  <div className={`text-sm ${theme.text} p-3 rounded-xl border ${
                    darkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    {currentSubmission.userAnswer}
                  </div>
                </div>

                {/* AI 피드백 */}
                <div className={`rounded-xl overflow-hidden border ${
                  currentSubmission.score === currentQuestion.maxScore
                    ? darkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50'
                    : darkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-200 bg-blue-50/50'
                }`}>
                  <div className={`px-4 py-2 border-b ${
                    currentSubmission.score === currentQuestion.maxScore
                      ? darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-100/50 border-emerald-200'
                      : darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-100/50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 ${
                        currentSubmission.score === currentQuestion.maxScore
                          ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                          : darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className={`text-xs font-semibold ${
                        currentSubmission.score === currentQuestion.maxScore
                          ? darkMode ? 'text-emerald-400' : 'text-emerald-700'
                          : darkMode ? 'text-blue-400' : 'text-blue-700'
                      }`}>AI 학습 피드백</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className={`text-sm ${theme.textMuted} leading-relaxed whitespace-pre-wrap`}>
                      {currentSubmission.aiFeedback}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-3 sm:px-4 py-2 text-sm border rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-white/[0.1] text-white/70 hover:bg-white/[0.05]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            이전
          </button>

          {/* 문제 번호 네비게이션 */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 justify-center px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {questions.map((q, idx) => (
              <button
                key={q.questionId}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-xs rounded-lg transition-colors flex-shrink-0 ${
                  idx === currentIndex
                    ? 'bg-violet-500 text-white'
                    : submissions.has(q.questionId)
                    ? darkMode
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-violet-100 text-violet-600'
                    : darkMode
                      ? 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 && completedCount === questions.length ? (
            <button
              onClick={handleComplete}
              className="px-3 sm:px-4 py-2 text-sm bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              완료하기
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className={`px-3 sm:px-4 py-2 text-sm rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-violet-500 hover:bg-violet-600 text-white'
              }`}
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}