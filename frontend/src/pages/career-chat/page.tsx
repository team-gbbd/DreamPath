import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Send,
  MessageSquare,
  Lightbulb,
  Compass,
  Target,
  Sparkles,
  ArrowRight,
  Search,
  Users,
  Route,
  ExternalLink,
  Link as LinkIcon,
  BarChart3,
  CheckCircle2,
  Circle,
  Loader2,
  Calendar,
  BookOpen,
  GraduationCap,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import SurveyModal from '../../components/profile/SurveyModal';
import AgentCard, { AgentAction } from '../../components/career/AgentCard';
import { API_BASE_URL } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentAction?: AgentAction;
  hideContent?: boolean;
}

interface IdentityTrait {
  category: string;
  trait: string;
  evidence: string;
}

interface RecentInsight {
  hasInsight: boolean;
  insight: string;
  type: string;
}

type RightPanelTab = 'identity' | 'research';

interface ResearchSource {
  title: string;
  url?: string;
  snippet?: string;
}

interface MentoringSession {
  sessionId: number;
  mentorName: string;
  mentorTitle: string;
  topic: string;
  description?: string;
  sessionDate: string;
  price?: number;
}

interface LearningPath {
  pathId?: number;
  career: string;
  domain?: string;
  weeks: number;
  topics?: string[];
  status?: string;
  progress?: number;
}

interface ResearchPanel {
  id: string;
  type: 'web_search' | 'mentoring' | 'learning_path';
  title: string;
  summary: string;
  sources?: ResearchSource[];
  timestamp: Date;
  // 멘토링/학습경로 전용 데이터
  mentoringData?: {
    sessions: MentoringSession[];
    total?: number;
  };
  learningPathData?: {
    path: LearningPath;
    exists?: boolean;
    canCreate?: boolean;
    createUrl?: string;
  };
}

interface IdentityStatus {
  sessionId: string;
  currentStage: string;
  stageDescription: string;
  overallProgress: number;
  clarity: number;
  clarityReason: string;
  identityCore: string;
  confidence: number;
  traits: IdentityTrait[];
  insights: string[];
  nextFocus: string;
  recentInsight: RecentInsight;
}

// 검색 단계 타입
interface SearchStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'done';
}

// AI 검색 중 상태 컴포넌트
function AISearchingState() {
  const [steps, setSteps] = useState<SearchStep[]>([
    { id: '1', label: '질문 분석', status: 'done' },
    { id: '2', label: '관련 정보 검색 중', status: 'loading' },
    { id: '3', label: '결과 분석', status: 'pending' },
    { id: '4', label: '요약 생성', status: 'pending' },
  ]);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setSteps(prev => prev.map(s => s.id === '2' ? { ...s, status: 'done' } : s.id === '3' ? { ...s, status: 'loading' } : s));
    }, 2000);
    const timer2 = setTimeout(() => {
      setSteps(prev => prev.map(s => s.id === '3' ? { ...s, status: 'done' } : s.id === '4' ? { ...s, status: 'loading' } : s));
    }, 4000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-white text-sm font-medium">AI가 정보를 수집하고 있어요</span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.status === 'done' && (
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            )}
            {step.status === 'loading' && (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            )}
            {step.status === 'pending' && (
              <Circle className="w-4 h-4 text-slate-500" />
            )}
            <span className={cn(
              "text-sm",
              step.status === 'done' && "text-slate-300",
              step.status === 'loading' && "text-white",
              step.status === 'pending' && "text-slate-500"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}

// 채팅 타이핑 인디케이터
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function CareerChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('identity');
  const [researchPanels, setResearchPanels] = useState<ResearchPanel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [similarMentorLoading, setSimilarMentorLoading] = useState<string | null>(null);

  // 비슷한 멘토 찾기
  const findSimilarMentors = async (panelId: string, currentSession: MentoringSession) => {
    setSimilarMentorLoading(panelId);
    try {
      // 현재 멘토의 직무로 비슷한 멘토 검색
      const response = await fetch(`${API_BASE_URL}/mentoring-sessions/available`);
      if (!response.ok) throw new Error('Failed to fetch');

      const allSessions: MentoringSession[] = await response.json();

      // 현재 세션 제외하고 비슷한 직무의 멘토 찾기
      const similarSessions = allSessions.filter(s =>
        s.sessionId !== currentSession.sessionId &&
        (s.mentorTitle?.toLowerCase().includes(currentSession.mentorTitle?.toLowerCase().split(' ')[0] || '') ||
         s.topic?.toLowerCase().includes(currentSession.topic?.toLowerCase().split(' ')[0] || ''))
      ).slice(0, 2);

      if (similarSessions.length > 0) {
        // 해당 패널의 멘토링 세션 교체
        setResearchPanels(prev => prev.map(p =>
          p.id === panelId
            ? { ...p, mentoringData: { sessions: similarSessions, total: similarSessions.length } }
            : p
        ));
      } else {
        // 비슷한 멘토 없음 알림
        alert('비슷한 멘토가 없어요');
      }
    } catch (error) {
      console.error('Similar mentor search failed:', error);
      alert('비슷한 멘토가 없어요');
    } finally {
      setSimilarMentorLoading(null);
    }
  };

  const toggleSourceExpand = (panelId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    const savedSessionId = localStorage.getItem('career_chat_session_id');

    if (savedSessionId) {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/history/${savedSessionId}`);
        if (response.ok) {
          const history = await response.json();
          if (history && history.length > 0) {
            setSessionId(savedSessionId);
            setMessages(history.map((msg: any) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.message,
              timestamp: new Date(msg.timestamp),
            })));
            try {
              const savedIdentity = localStorage.getItem('career_chat_identity');
              if (savedIdentity) {
                setIdentityStatus(JSON.parse(savedIdentity));
              }
            } catch (err) {
              console.warn('Failed to restore identity from localStorage');
            }

            try {
              const identityResponse = await fetch(`${API_BASE_URL}/identity/${savedSessionId}`);
              if (identityResponse.ok) {
                const identityData = await identityResponse.json();
                setIdentityStatus(identityData);
                localStorage.setItem('career_chat_identity', JSON.stringify(identityData));
              }
            } catch (err) {
              console.error('Failed to fetch identity:', err);
            }
            return;
          }
        }
      } catch (error) {
        console.log('Session restore failed, starting new session:', error);
      }
    }

    await startNewSession();
  };

  const startNewSession = async () => {
    try {
      const userStr = localStorage.getItem("dreampath:user");
      const userId = userStr ? JSON.parse(userStr).userId : null;

      const response = await fetch(`${API_BASE_URL}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId ? String(userId) : null
        }),
      });

      const data = await response.json();
      setSessionId(data.sessionId);

      // localStorage에 세션 ID 저장
      localStorage.setItem('career_chat_session_id', data.sessionId);

      // 설문조사 필요 여부 확인
      if (data.needsSurvey && data.surveyQuestions) {
        setSurveyQuestions(data.surveyQuestions);
        setShowSurvey(true);
      }

      // 초기 메시지 추가
      setMessages([{
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }]);

      console.log('새 세션 시작:', data.sessionId);
    } catch (error) {
      console.error('Failed to start session:', error);
      setMessages([{
        role: 'assistant',
        content: '세션 시작에 실패했습니다. 나중에 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsSearching(true); // 낙관적 표시: 도구 안 쓰면 빨리 사라짐, 쓰면 자연스럽게 결과로 대체

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: inputMessage,
          userId: (() => {
            const userStr = localStorage.getItem("dreampath:user");
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                return user.userId ? String(user.userId) : null;
              } catch { return null; }
            }
            return null;
          })(),
          identityStatus,
        }),
      });

      const data = await response.json();

      console.log('백엔드 응답:', data);
      console.log('정체성 상태:', data.identityStatus);

      if (data.agentAction) {
        setIsSearching(false); // 검색 완료
        const actionType = data.agentAction.type as string;
        const results = data.agentAction.data?.results || [];

        let summary = data.agentAction.summary;
        if (!summary || summary.trim().length === 0) {
          summary = results
            .slice(0, 3)
            .map((r: any) => r.snippet?.replace(/\.{3}$/, '') || '')
            .filter((s: string) => s.length > 0)
            .join(' ')
            .slice(0, 300);
        }

        const panelType = actionType === 'web_search_results' ? 'web_search' :
              actionType === 'mentoring_suggestion' ? 'mentoring' :
              actionType === 'learning_path_suggestion' ? 'learning_path' : 'web_search';

        const newResearchPanel: ResearchPanel = {
          id: `research-${Date.now()}`,
          type: panelType,
          title: data.agentAction.reason || '리서치 결과',
          summary: summary || '검색 결과를 확인하세요.',
          sources: results.map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
          })),
          timestamp: new Date(),
          // 멘토링 세션 데이터 추가
          mentoringData: panelType === 'mentoring' && data.agentAction.data?.sessions ? {
            sessions: data.agentAction.data.sessions,
            total: data.agentAction.data.sessions.length,
          } : undefined,
          // 학습 경로 데이터 추가
          learningPathData: panelType === 'learning_path' && data.agentAction.data?.path ? {
            path: data.agentAction.data.path,
            exists: data.agentAction.data.exists,
            canCreate: data.agentAction.data.canCreate,
            createUrl: data.agentAction.data.createUrl,
          } : undefined,
        };
        setResearchPanels(prev => [newResearchPanel, ...prev]);
        setRightPanelTab('research');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        agentAction: undefined,
        hideContent: false,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 정체성 상태 업데이트
      if (data.identityStatus) {
        setIdentityStatus(data.identityStatus);

        // localStorage에도 마지막 정체성 상태 저장
        try {
          localStorage.setItem('career_chat_identity', JSON.stringify(data.identityStatus));
        } catch (e) {
          console.warn('Failed to save identity status');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setIsSearching(false); // 혹시 남아있으면 정리
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStageInfo = (stage: string) => {
    const stages: { [key: string]: { label: string; icon: any } } = {
      'EXPLORATION': { label: '탐색', icon: Compass },
      'DEEPENING': { label: '심화', icon: Target },
      'INTEGRATION': { label: '통합', icon: Sparkles },
      'DIRECTION': { label: '방향 설정', icon: ArrowRight },
    };
    return stages[stage] || { label: stage, icon: Compass };
  };

  const handleAnalyze = async () => {
    if (!sessionId) {
      alert('세션 정보가 없습니다. 대화를 먼저 진행해주세요.');
      return;
    }

    try {
      setIsLoading(true);

      console.log('🔍 분석 API 호출 시작:', sessionId);

      // 분석 API 호출
      const response = await fetch(`http://localhost:8080/api/analysis/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '분석 요청 실패');
      }

      const analysisResult = await response.json();
      console.log('✅ 분석 완료:', analysisResult);

      // 성공 메시지 추가
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✨ 분석이 완료되었습니다! 이제 대시보드에서 상세한 결과를 확인할 수 있어요.',
        timestamp: new Date(),
      }]);

      // 잠시 후 대시보드로 이동
      setTimeout(() => {
        navigate('/profile/dashboard');
      }, 1000);

    } catch (error) {
      console.error('❌ 분석 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `분석 중 오류가 발생했습니다: ${errorMessage}\n\n대화를 더 진행한 후 다시 시도해주세요.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem('career_chat_session_id');
    localStorage.removeItem('career_chat_identity');
    setMessages([]);
    setSessionId(null);
    setIdentityStatus(null);
    setShowSurvey(false);
    setSurveyQuestions([]);
    setResearchPanels([]);
    setRightPanelTab('identity');
    startNewSession();
  };

  const handleSurveyComplete = () => {
    setShowSurvey(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '설문조사가 완료되었습니다! 이제 진로 정체성 탐색을 시작해볼까요?',
      timestamp: new Date(),
    }]);
  };

  const handleAgentAction = async (actionId: string, params?: Record<string, any>, messageIndex?: number) => {
    switch (actionId) {
      case 'book':
        if (params?.sessionId) {
          try {
            const userStr = localStorage.getItem("dreampath:user");
            const userId = userStr ? JSON.parse(userStr).userId : null;

            if (!userId) {
              alert('로그인이 필요합니다.');
              navigate('/auth/login');
              return;
            }

            const response = await fetch(`${API_BASE_URL}/mentoring-bookings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: params.sessionId,
                menteeId: userId,
                reason: '진로 상담 중 AI 추천으로 예약',
              }),
            });

            if (response.ok) {
              const booking = await response.json();
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `멘토링 예약이 완료되었습니다! 예약 번호: ${booking.bookingId}`,
                timestamp: new Date(),
              }]);
              if (messageIndex !== undefined) {
                handleDismissAgentCard(messageIndex);
              }
            } else {
              const error = await response.json();
              alert(`예약 실패: ${error.message || '다시 시도해주세요.'}`);
            }
          } catch (error) {
            console.error('Booking error:', error);
            alert('예약 중 오류가 발생했습니다.');
          }
        }
        break;

      case 'skip':
        if (messageIndex !== undefined) {
          setMessages(prev => prev.map((msg, idx) =>
            idx === messageIndex ? { ...msg, hideContent: false, agentAction: undefined } : msg
          ));
        }
        break;

      case 'create':
      case 'start_learning':
        navigate(params?.career ? `/learning?career=${encodeURIComponent(params.career)}` : '/learning');
        break;

      case 'view_booking':
        navigate('/mypage/bookings');
        break;

      case 'view_details':
        navigate('/learning');
        break;

      default:
        if (actionId.startsWith('open_link_') && params?.url) {
          window.open(params.url, '_blank', 'noopener,noreferrer');
        } else if (actionId.startsWith('view_session_') && params?.sessionId) {
          navigate(`/mentoring/book/${params.sessionId}`);
        }
    }
  };

  const handleDismissAgentCard = (messageIndex: number) => {
    setMessages(prev => prev.map((msg, idx) =>
      idx === messageIndex ? { ...msg, agentAction: undefined } : msg
    ));
  };

  const getResearchIcon = (type: ResearchPanel['type']) => {
    switch (type) {
      case 'web_search': return <Search className="h-4 w-4" />;
      case 'mentoring': return <Users className="h-4 w-4" />;
      case 'learning_path': return <Route className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const stageInfo = identityStatus ? getStageInfo(identityStatus.currentStage) : null;
  const StageIcon = stageInfo?.icon || Compass;

  return (
    <div className="min-h-screen bg-slate-100">
      {sessionId && (
        <SurveyModal
          isOpen={showSurvey}
          questions={surveyQuestions}
          sessionId={sessionId}
          onComplete={handleSurveyComplete}
        />
      )}

      {/* 헤더 - 따뜻하고 깔끔한 스타일 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900">AI 진로 상담</h1>
                  {identityStatus && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <StageIcon className="h-3.5 w-3.5 text-primary" />
                      <span>{stageInfo?.label} 단계</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {identityStatus && identityStatus.overallProgress != null && (
                <div className="hidden md:flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2">
                  <span className="text-sm text-gray-600">진행률</span>
                  <Progress value={identityStatus.overallProgress} className="w-24 h-2" />
                  <span className="text-sm font-semibold text-primary">{identityStatus.overallProgress}%</span>
                </div>
              )}
              <Button variant="outline" size="sm" className="rounded-full" onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-1.5" />
                새 상담
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 채팅 영역 - 밝고 따뜻한 테마 */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-160px)] flex flex-col bg-white shadow-sm border-gray-200">
              {/* 메시지 영역 */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {messages.map((message, index) => (
                    <div key={index} className="animate-in">
                      {!message.hideContent && (
                        <div className={cn(
                          "flex",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3",
                            message.role === 'user'
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-white border border-gray-100 shadow-sm rounded-bl-md'
                          )}>
                            <p className={cn(
                              "text-[15px] leading-relaxed whitespace-pre-wrap",
                              message.role === 'user' ? 'text-white' : 'text-gray-800'
                            )}>
                              {message.content}
                            </p>
                            <p className={cn(
                              "text-xs mt-2",
                              message.role === 'user' ? 'text-white/60' : 'text-gray-400'
                            )}>
                              {message.timestamp.toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      {message.role === 'assistant' && message.agentAction && (
                        <div className="flex justify-start mt-3">
                          <div className="max-w-[85%]">
                            <AgentCard
                              action={message.agentAction}
                              onActionClick={(actionId, params) => handleAgentAction(actionId, params, index)}
                              onDismiss={() => handleDismissAgentCard(index)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 입력 영역 */}
              <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                {messages.length >= 6 && (
                  <div className="mb-3 flex justify-center">
                    <Button
                      onClick={handleAnalyze}
                      className="rounded-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-lg shadow-primary/25"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      종합 분석하기
                    </Button>
                  </div>
                )}
                <div className="flex gap-3 max-w-2xl mx-auto">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요..."
                    className="min-h-[52px] max-h-32 resize-none rounded-2xl border-gray-200 bg-white focus:border-primary focus:ring-primary/20"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    size="icon"
                    className="h-[52px] w-[52px] shrink-0 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* 우측 패널 - 탭 구조 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 h-[calc(100vh-160px)] flex flex-col overflow-hidden border-0 shadow-lg">
              <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as RightPanelTab)} className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-none">
                  <TabsTrigger value="identity" className="data-[state=active]:bg-white rounded-md">
                    나의 정체성
                  </TabsTrigger>
                  <TabsTrigger value="research" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-md">
                    AI Research
                  </TabsTrigger>
                </TabsList>

                {/* 정체성 탭 */}
                <TabsContent value="identity" className="flex-1 overflow-hidden m-0 bg-white">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {identityStatus ? (
                        <>
                          {/* 새로운 인사이트 */}
                          {identityStatus.recentInsight?.hasInsight && identityStatus.recentInsight?.insight && (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                  <Lightbulb className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-amber-800">새로운 발견!</p>
                                  <p className="text-sm text-amber-700 mt-1">
                                    {identityStatus.recentInsight.insight}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 현재 단계 */}
                          {identityStatus.currentStage && (
                            <div className="bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <StageIcon className="h-5 w-5 text-primary" />
                                  <span className="font-medium text-gray-900">
                                    {stageInfo?.label} 단계
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  {identityStatus.overallProgress}%
                                </span>
                              </div>
                              {identityStatus.stageDescription && (
                                <p className="text-sm text-gray-600">
                                  {identityStatus.stageDescription}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 명확도 */}
                          {identityStatus.clarity != null && (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">정체성 명확도</span>
                                <span className="text-sm font-semibold text-primary">
                                  {identityStatus.clarity}%
                                </span>
                              </div>
                              <Progress value={identityStatus.clarity} className="h-2" />
                              {identityStatus.clarityReason && (
                                <p className="text-xs text-gray-500">
                                  {identityStatus.clarityReason}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 핵심 정체성 */}
                          {identityStatus.identityCore && identityStatus.identityCore !== '탐색 중...' && (
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-gray-500" />
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">핵심 정체성</span>
                              </div>
                              <p className="text-sm text-gray-800 leading-relaxed">{identityStatus.identityCore}</p>
                              {identityStatus.confidence != null && identityStatus.confidence > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  확신도 {identityStatus.confidence}%
                                </p>
                              )}
                            </div>
                          )}

                          {/* 발견된 특징 */}
                          {identityStatus.traits && identityStatus.traits.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">발견된 특징</span>
                              {identityStatus.traits.map((item, index) => (
                                <div key={index} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-800">{item.trait}</span>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                      {item.category}
                                    </span>
                                  </div>
                                  {item.evidence && (
                                    <p className="text-xs text-gray-500">"{item.evidence}"</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 다음 탐색 */}
                          {identityStatus.nextFocus && (
                            <div className="bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-primary">다음 탐색</p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {identityStatus.nextFocus}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500">
                            대화를 시작하면<br/>정체성 분석이 표시됩니다
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* AI Research 탭 */}
                <TabsContent value="research" className="flex-1 overflow-hidden m-0 ai-panel-dark">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                    {/* 검색 중 상태 */}
                    {isSearching && <AISearchingState />}

                    {/* 최신 리서치 결과 1개만 표시 */}
                    {!isSearching && researchPanels.length > 0 && (() => {
                      const panel = researchPanels[0]; // 최신 1개만
                      return (
                        <div className="relative group">
                          {/* 글로우 테두리 */}
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl opacity-30 group-hover:opacity-50 blur transition" />

                          {/* 카드 본체 */}
                          <div className="relative bg-slate-800 rounded-xl p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-cyan-400">
                                  {getResearchIcon(panel.type)}
                                </div>
                                <div>
                                  <h4 className="text-white text-sm font-medium line-clamp-1">
                                    {panel.title}
                                  </h4>
                                  <span className="text-xs text-slate-400">
                                    {panel.timestamp.toLocaleTimeString('ko-KR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                                {/* 웹 검색일 때만 summary 표시 (멘토링/학습경로는 카드로 대체) */}
                                {panel.type === 'web_search' && (
                                  <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-line">
                                    {panel.summary}
                                  </p>
                                )}

                                {/* ========== 멘토링 세션 카드 ========== */}
                                {panel.type === 'mentoring' && panel.mentoringData?.sessions && panel.mentoringData.sessions.length > 0 && (
                                  <div className="pt-3 border-t border-slate-700">
                                    <p className="text-xs text-slate-400 mb-3">이런 멘토링도 있어요</p>
                                    <div className="space-y-3">
                                      {panel.mentoringData.sessions.slice(0, 2).map((session, idx) => (
                                        <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                                          {/* 멘토 정보 */}
                                          <div className="flex items-start gap-3 mb-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                                              {session.mentorName?.charAt(0) || 'M'}
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-white font-medium">{session.mentorName}</p>
                                              <p className="text-slate-400 text-xs">{session.mentorTitle}</p>
                                            </div>
                                          </div>

                                          {/* 세션 정보 */}
                                          <div className="mb-3">
                                            <p className="text-cyan-400 text-sm font-medium mb-1">{session.topic}</p>
                                            {session.description && (
                                              <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">{session.description}</p>
                                            )}
                                          </div>

                                          {/* 일정 & 가격 */}
                                          <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>{session.sessionDate}</span>
                                            </div>
                                            {session.price !== undefined && session.price > 0 && (
                                              <span className="text-cyan-400">{session.price.toLocaleString()}원</span>
                                            )}
                                          </div>

                                          {/* 액션 버튼 3개 가로 배치 */}
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-xs"
                                              onClick={() => navigate(`/mentoring/book/${session.sessionId}`)}
                                            >
                                              예약하기
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                                              disabled={similarMentorLoading === panel.id}
                                              onClick={() => findSimilarMentors(panel.id, session)}
                                            >
                                              {similarMentorLoading === panel.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                '비슷한 멘토'
                                              )}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700/50 text-xs"
                                              onClick={() => {
                                                setResearchPanels(prev => prev.filter(p => p.id !== panel.id));
                                              }}
                                            >
                                              괜찮아요
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ========== 학습 경로 카드 ========== */}
                                {panel.type === 'learning_path' && panel.learningPathData?.path && (
                                  <div className="pt-3 border-t border-slate-700">
                                    <p className="text-xs text-slate-400 mb-3">이런 학습으로 시작해보는건 어때요?</p>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                      <div className="flex items-start gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                                          <BookOpen className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-white font-medium">{panel.learningPathData.path.career}</p>
                                          <p className="text-slate-400 text-xs">{panel.learningPathData.path.weeks}주 학습 코스</p>
                                        </div>
                                      </div>
                                      {panel.learningPathData.path.topics && panel.learningPathData.path.topics.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-xs text-slate-400 mb-2">학습 주제</p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {panel.learningPathData.path.topics.slice(0, 4).map((topic, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
                                                {topic}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {panel.learningPathData.exists ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">진행률</span>
                                            <span className="text-cyan-400">{panel.learningPathData.path.progress || 0}%</span>
                                          </div>
                                          <Progress value={panel.learningPathData.path.progress || 0} className="h-1.5" />
                                          <Button
                                            className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600 text-white"
                                            onClick={() => navigate(`/learning?career=${encodeURIComponent(panel.learningPathData!.path.career)}`)}
                                          >
                                            이어서 학습하기
                                          </Button>
                                        </div>
                                      ) : panel.learningPathData.canCreate ? (
                                        <Button
                                          className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white"
                                          onClick={() => navigate(`/learning?career=${encodeURIComponent(panel.learningPathData!.path.career)}`)}
                                        >
                                          학습 시작하기
                                        </Button>
                                      ) : (
                                        <p className="text-xs text-slate-400 text-center">준비 중인 학습 경로입니다</p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="w-full mt-3 text-slate-400 hover:text-white hover:bg-slate-700/50"
                                      onClick={() => navigate('/learning')}
                                    >
                                      다른 학습 경로 보기
                                      <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                  </div>
                                )}

                                {/* 출처 - 웹 검색용 (접힘/펼침) */}
                                {panel.sources && panel.sources.length > 0 && panel.type !== 'mentoring' && panel.type !== 'learning_path' && (
                                  <div className="pt-3 border-t border-slate-700">
                                    <button
                                      onClick={() => toggleSourceExpand(panel.id)}
                                      className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-300 transition-colors"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <LinkIcon className="h-3 w-3" />
                                        <span>{panel.sources.length}개 출처에서 수집</span>
                                      </div>
                                      <ChevronDown className={cn(
                                        "h-4 w-4 transition-transform",
                                        expandedSources.has(panel.id) && "rotate-180"
                                      )} />
                                    </button>
                                    {expandedSources.has(panel.id) && (
                                      <div className="space-y-3 mt-3">
                                        {panel.sources.map((source, idx) => (
                                          <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                                            <a
                                              href={source.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-start gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-1.5"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                              <span className="font-medium leading-tight">{source.title}</span>
                                            </a>
                                            {source.snippet && (
                                              <p className="text-xs text-slate-400 leading-relaxed pl-5">
                                                {source.snippet}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 리서치 결과 없을 때 */}
                        {!isSearching && researchPanels.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                              <Search className="h-8 w-8 text-slate-600" />
                            </div>
                            <p className="text-sm text-slate-400 mb-1">
                              리서치 결과가 없어요
                            </p>
                            <p className="text-xs text-slate-500">
                              대화 중 필요한 정보를<br/>AI가 자동으로 검색합니다
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
}
