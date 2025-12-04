/**
 * AgentThinkingIndicator - ReAct 에이전트 사고 과정 시각화 컴포넌트
 *
 * AI가 생각하는 동안 단계별 진행 상황을 보여줍니다.
 */
import { useState, useEffect } from 'react';

export interface AgentStep {
  step: 'analyze' | 'tool' | 'answer';
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tool?: string;
  thought?: string;
  hasData?: boolean;
}

interface AgentThinkingIndicatorProps {
  isLoading: boolean;
  completedSteps?: AgentStep[];
}

// 로딩 중일 때 시뮬레이션할 기본 단계들
const DEFAULT_LOADING_STEPS: AgentStep[] = [
  { step: 'analyze', label: '질문 분석', status: 'in_progress' },
  { step: 'tool', label: '정보 검색', status: 'pending' },
  { step: 'answer', label: '답변 생성', status: 'pending' },
];

export default function AgentThinkingIndicator({
  isLoading,
  completedSteps,
}: AgentThinkingIndicatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displaySteps, setDisplaySteps] = useState<AgentStep[]>(DEFAULT_LOADING_STEPS);

  // 로딩 중일 때 단계 시뮬레이션
  useEffect(() => {
    if (!isLoading) {
      // 로딩 끝나면 실제 완료된 단계 표시
      if (completedSteps && completedSteps.length > 0) {
        setDisplaySteps(completedSteps);
        setCurrentStepIndex(completedSteps.length);
      }
      return;
    }

    // 로딩 시작 시 초기화
    setCurrentStepIndex(0);
    setDisplaySteps(DEFAULT_LOADING_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? 'in_progress' : 'pending',
    })));

    // 2초마다 다음 단계로 진행
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next >= DEFAULT_LOADING_STEPS.length) {
          return prev; // 마지막 단계에서 멈춤
        }

        setDisplaySteps((steps) =>
          steps.map((s, i) => ({
            ...s,
            status: i < next ? 'completed' : i === next ? 'in_progress' : 'pending',
          }))
        );

        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [isLoading, completedSteps]);

  // 로딩 중이 아니고 completedSteps도 없으면 표시 안함
  if (!isLoading && (!completedSteps || completedSteps.length === 0)) {
    return null;
  }

  const getStepIcon = (step: AgentStep) => {
    switch (step.status) {
      case 'completed':
        return <i className="ri-check-line text-green-500"></i>;
      case 'in_progress':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'failed':
        return <i className="ri-close-line text-red-500"></i>;
      default:
        return <i className="ri-time-line text-gray-300"></i>;
    }
  };

  const getStepColor = (step: AgentStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600 font-medium';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStepTypeIcon = (step: AgentStep) => {
    if (step.step === 'analyze') return 'ri-brain-line';
    if (step.step === 'answer') return 'ri-edit-line';

    // 도구별 아이콘
    switch (step.tool) {
      case 'search_mentoring_sessions':
        return 'ri-user-voice-line';
      case 'get_learning_path':
        return 'ri-road-map-line';
      case 'search_job_postings':
        return 'ri-briefcase-line';
      case 'web_search':
        return 'ri-search-line';
      case 'book_mentoring':
        return 'ri-calendar-check-line';
      default:
        return 'ri-tools-line';
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 my-3 border border-indigo-100 animate-fadeIn">
      {/* 헤더 */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
          <i className="ri-robot-line text-white text-xs"></i>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {isLoading ? 'AI가 생각하고 있어요' : 'AI 처리 완료'}
        </span>
        {isLoading && (
          <span className="text-xs text-gray-400 animate-pulse">...</span>
        )}
      </div>

      {/* 단계 목록 */}
      <div className="space-y-2 ml-1">
        {displaySteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center space-x-3 transition-all duration-300 ${
              step.status === 'pending' ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {/* 연결선 */}
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 flex items-center justify-center">
                {getStepIcon(step)}
              </div>
              {index < displaySteps.length - 1 && (
                <div
                  className={`w-0.5 h-4 mt-1 ${
                    step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </div>

            {/* 단계 정보 */}
            <div className="flex-1 flex items-center space-x-2">
              <i className={`${getStepTypeIcon(step)} ${getStepColor(step)} text-sm`}></i>
              <span className={`text-sm ${getStepColor(step)}`}>{step.label}</span>

              {/* 데이터 있음 표시 */}
              {step.hasData && step.status === 'completed' && (
                <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                  결과 있음
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 생각 내용 (thought) 표시 */}
      {!isLoading && displaySteps[0]?.thought && (
        <div className="mt-3 pt-3 border-t border-indigo-100">
          <div className="flex items-start space-x-2">
            <i className="ri-lightbulb-line text-amber-500 mt-0.5"></i>
            <p className="text-xs text-gray-500 italic">
              "{displaySteps[0].thought}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
