/**
 * AgentCard - AI 에이전트 제안 카드 컴포넌트
 * ChatGPT + NAVER 스타일: 따뜻하고 신뢰감 있는 디자인
 */
import { useState } from 'react';
import {
  Users,
  Route,
  Briefcase,
  CheckCircle2,
  Search,
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  User,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 타입 정의
export interface ActionButton {
  id: string;
  label: string;
  primary?: boolean;
  params?: Record<string, any>;
}

export interface AgentAction {
  type: 'mentoring_suggestion' | 'learning_path_suggestion' | 'job_posting_suggestion' | 'booking_confirmed' | 'web_search_results';
  reason: string;
  data: Record<string, any>;
  actions: ActionButton[];
}

interface MentoringSession {
  sessionId: number;
  mentorName: string;
  mentorTitle: string;
  mentorCompany?: string;
  topic: string;
  description?: string;
  sessionDate?: string;
  price?: number;
  durationMinutes?: number;
}

interface LearningPath {
  career: string;
  topics: string[];
  estimatedWeeks: number;
}

interface JobPosting {
  jobId: string;
  title: string;
  company: string;
  matchScore: number;
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface BookingData {
  bookingId: number;
  mentorName: string;
  sessionDate: string;
}

interface AgentCardProps {
  action: AgentAction;
  onActionClick: (actionId: string, params?: Record<string, any>) => void;
  onDismiss?: () => void;
}

export default function AgentCard({ action, onActionClick, onDismiss }: AgentCardProps) {
  const defaultExpanded = !['web_search_results', 'job_posting_suggestion'].includes(action.type);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentMentorIndex, setCurrentMentorIndex] = useState(0);

  const getTypeConfig = () => {
    switch (action.type) {
      case 'mentoring_suggestion':
        return {
          icon: Users,
          gradient: 'from-violet-500 to-purple-600',
          bgColor: 'bg-violet-50',
          borderColor: 'border-violet-200',
          title: '멘토링 추천',
        };
      case 'learning_path_suggestion':
        return {
          icon: Route,
          gradient: 'from-emerald-500 to-teal-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          title: '학습 경로',
        };
      case 'job_posting_suggestion':
        return {
          icon: Briefcase,
          gradient: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: '채용 공고',
        };
      case 'booking_confirmed':
        return {
          icon: CheckCircle2,
          gradient: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '예약 완료',
        };
      case 'web_search_results':
        return {
          icon: Search,
          gradient: 'from-cyan-500 to-blue-600',
          bgColor: 'bg-cyan-50',
          borderColor: 'border-cyan-200',
          title: '검색 결과',
        };
      default:
        return {
          icon: Sparkles,
          gradient: 'from-gray-500 to-slate-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: '정보',
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  // 멘토링 세션 렌더링
  const renderMentoringSessions = () => {
    const sessions = action.data?.sessions as MentoringSession[] | undefined;
    const singleSession = action.data?.session as MentoringSession | undefined;
    const sessionList = sessions || (singleSession ? [singleSession] : []);

    if (sessionList.length === 0) return null;

    const session = sessionList[currentMentorIndex];

    return (
      <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-lg shadow-violet-500/25">
            {session.mentorName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900">{session.mentorName}</h4>
            <p className="text-sm text-gray-500">{session.mentorTitle}</p>
            {session.mentorCompany && (
              <p className="text-xs text-gray-400">{session.mentorCompany}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-800">{session.topic}</p>
          {session.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{session.description}</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {session.sessionDate && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Calendar className="h-3.5 w-3.5" />
              {session.sessionDate}
            </span>
          )}
          {session.durationMinutes && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              {session.durationMinutes}분
            </span>
          )}
          {session.price !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <DollarSign className="h-3.5 w-3.5" />
              {session.price === 0 ? '무료' : `${session.price.toLocaleString()}원`}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 학습 경로 렌더링
  const renderLearningPath = () => {
    const path = action.data as LearningPath | undefined;
    if (!path) return null;

    return (
      <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{path.career}</h4>
            <p className="text-xs text-gray-500">예상 {path.estimatedWeeks}주 과정</p>
          </div>
        </div>
        {path.topics && path.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {path.topics.map((topic, index) => (
              <span key={index} className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 채용 공고 렌더링
  const renderJobPostings = () => {
    const jobs = action.data?.jobs as JobPosting[] | undefined;
    if (!jobs || jobs.length === 0) return null;

    return (
      <div className="space-y-2 mt-4">
        {jobs.map((job, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{job.title}</h4>
                <p className="text-sm text-gray-500">{job.company}</p>
              </div>
              {job.matchScore && (
                <span className="text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-2.5 py-1 rounded-full">
                  {job.matchScore}% 매칭
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 예약 완료 렌더링
  const renderBookingConfirmed = () => {
    const booking = action.data as BookingData | undefined;
    if (!booking) return null;

    return (
      <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-green-800">예약이 확정되었습니다!</h4>
            <p className="text-sm text-green-600">예약 번호: #{booking.bookingId}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <User className="h-4 w-4" />
            <span>멘토: {booking.mentorName}</span>
          </div>
          {booking.sessionDate && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Calendar className="h-4 w-4" />
              <span>일시: {booking.sessionDate}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 웹 검색 요약 렌더링
  const renderWebSearchSummary = () => {
    const results = action.data?.results as WebSearchResult[] | undefined;
    if (!results || results.length === 0) return null;

    const combinedSnippets = results
      .slice(0, 3)
      .map(r => r.snippet.replace(/\.{3}$/, ''))
      .join(' ')
      .slice(0, 200);

    return (
      <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {combinedSnippets}...
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-cyan-600">
            <FileText className="h-3.5 w-3.5" />
            <span>{results.length}개 문서에서 수집</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
          >
            원본 보기
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // 웹 검색 결과 렌더링
  const renderWebSearchResults = () => {
    const results = action.data?.results as WebSearchResult[] | undefined;
    if (!results || results.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FileText className="h-3.5 w-3.5" />
          <span>원본 문서 ({results.length}개)</span>
        </div>
        {results.map((result, index) => (
          <a
            key={index}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all"
          >
            <h4 className="font-medium text-gray-900 line-clamp-1 hover:text-cyan-600 transition-colors">
              {result.title}
            </h4>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{result.snippet}</p>
            <p className="text-xs text-cyan-600 mt-2 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              {new URL(result.url).hostname}
            </p>
          </a>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (action.type) {
      case 'mentoring_suggestion':
        return renderMentoringSessions();
      case 'learning_path_suggestion':
        return renderLearningPath();
      case 'job_posting_suggestion':
        return renderJobPostings();
      case 'booking_confirmed':
        return renderBookingConfirmed();
      case 'web_search_results':
        return isExpanded ? renderWebSearchResults() : renderWebSearchSummary();
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "my-3 rounded-2xl border shadow-sm overflow-hidden animate-in",
      config.bgColor,
      config.borderColor
    )}>
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              config.gradient,
              `shadow-${config.gradient.split('-')[1]}-500/25`
            )}>
              <IconComponent className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">AI 추천</span>
              </div>
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {onDismiss && (
              <button
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                onClick={onDismiss}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* 제안 이유 */}
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{action.reason}</p>

        {/* 콘텐츠 */}
        {(isExpanded || action.type === 'web_search_results') && renderContent()}

        {/* 멘토링 전용 버튼 */}
        {isExpanded && action.type === 'mentoring_suggestion' && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
            <Button
              className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
              onClick={() => {
                const sessions = action.data?.sessions as MentoringSession[] | undefined;
                const session = sessions?.[currentMentorIndex] || action.data?.session;
                if (session) {
                  onActionClick('book', { sessionId: session.sessionId });
                }
              }}
            >
              예약하기
            </Button>
            {(() => {
              const sessions = action.data?.sessions as MentoringSession[] | undefined;
              const hasMore = sessions && sessions.length > 1;
              if (!hasMore) return null;
              return (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setCurrentMentorIndex((prev) => (prev + 1) % sessions.length)}
                >
                  다른 멘토 추천
                </Button>
              );
            })()}
            {onDismiss && (
              <Button variant="ghost" className="rounded-full text-gray-500" onClick={onDismiss}>
                필요없어요
              </Button>
            )}
          </div>
        )}

        {/* 기타 타입 액션 버튼 */}
        {isExpanded && action.type !== 'mentoring_suggestion' && action.actions && action.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
            {action.actions.map((btn) => (
              <Button
                key={btn.id}
                variant={btn.primary ? 'default' : 'outline'}
                className={cn(
                  "rounded-full",
                  btn.primary && `bg-gradient-to-r ${config.gradient} hover:opacity-90 shadow-lg`
                )}
                onClick={() => onActionClick(btn.id, btn.params)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
