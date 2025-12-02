import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  required: boolean;
}

interface SurveyModalProps {
  isOpen: boolean;
  questions: SurveyQuestion[];
  sessionId: string;
  onComplete: () => void;
  onClose?: () => void;
}

export default function SurveyModal({ isOpen, questions, sessionId, onComplete, onClose }: SurveyModalProps) {
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 초기값 설정
      const initialAnswers: { [key: string]: any } = {};
      questions.forEach(q => {
        if (q.type === 'multiselect') {
          initialAnswers[q.id] = [];
        } else {
          initialAnswers[q.id] = '';
        }
      });
      setAnswers(initialAnswers);
    }
  }, [isOpen, questions]);

  const handleChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultiSelectChange = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      const newValue = current.includes(option)
        ? current.filter((v: string) => v !== option)
        : [...current, option];
      return {
        ...prev,
        [questionId]: newValue
      };
    });
  };

  const handleSubmit = async () => {
    // 필수 항목 체크
    const requiredQuestions = questions.filter(q => q.required);
    const missingRequired = requiredQuestions.find(q => {
      const answer = answers[q.id];
      if (q.type === 'multiselect') {
        return !answer || answer.length === 0;
      }
      return !answer || answer.toString().trim() === '';
    });

    if (missingRequired) {
      alert(`${missingRequired.question}을(를) 입력해주세요.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          name: answers.name || null,
          age: answers.age ? parseInt(answers.age) : null,
          interests: answers.interests || [],
          favoriteSubjects: answers.favoriteSubjects || [],
          difficultSubjects: answers.difficultSubjects || [],
          hasDreamCareer: answers.hasDreamCareer || null,
          careerPressure: answers.careerPressure || null,
          concern: answers.concern || null,
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const error = await response.json();
        alert(`설문조사 제출 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('설문조사 제출 실패:', error);
      alert('설문조사 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">간단한 설문조사</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {question.question}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {question.type === 'text' && (
                <input
                  type={question.id === 'age' ? 'number' : 'text'}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                  placeholder={question.id === 'age' ? '나이를 입력하세요' : '답변을 입력하세요'}
                />
              )}

              {question.type === 'select' && question.options && (
                <select
                  value={answers[question.id] || ''}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {question.type === 'multiselect' && question.options && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const isSelected = (answers[question.id] || []).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleMultiSelectChange(question.id, option)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-[#5A7BFF] text-white border-[#5A7BFF]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#5A7BFF]'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {(answers[question.id] || []).length > 0 && (
                    <p className="text-xs text-gray-500">
                      선택됨: {(answers[question.id] || []).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              나중에
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

