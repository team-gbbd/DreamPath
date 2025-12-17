import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import AgentCard, { type AgentAction } from '../../components/career/AgentCard';
import { API_BASE_URL, PYTHON_AI_SERVICE_URL, authFetch } from '@/lib/api';

const ANALYSIS_UNLOCK_KEY = 'career_chat_analysis_unlocked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentAction?: AgentAction;
  hideContent?: boolean;
  ctaType?: 'personality-agent';
  ctaResolved?: boolean;
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

interface SearchStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'done';
}

interface ThemeColors {
  bg: string;
  headerBg: string;
  headerBorder: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  divider: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
  userBubble: string;
  assistantBubble: string;
  assistantBubbleBorder: string;
}

const generateMessageId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function AISearchingState({ darkMode }: { darkMode: boolean }) {
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
    <div className={cn(
      "p-4 rounded-xl border",
      darkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-gray-200"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", darkMode ? "bg-cyan-400" : "bg-violet-500")} />
        <span className={cn("text-sm font-medium", darkMode ? "text-white" : "text-gray-900")}>AI가 정보를 수집하고 있어요</span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.status === 'done' && (
              <CheckCircle2 className={cn("w-4 h-4", darkMode ? "text-cyan-400" : "text-violet-500")} />
            )}
            {step.status === 'loading' && (
              <Loader2 className={cn("w-4 h-4 animate-spin", darkMode ? "text-cyan-400" : "text-violet-500")} />
            )}
            {step.status === 'pending' && (
              <Circle className={cn("w-4 h-4", darkMode ? "text-slate-500" : "text-gray-300")} />
            )}
            <span className={cn(
              "text-sm",
              step.status === 'done' && (darkMode ? "text-slate-300" : "text-gray-600"),
              step.status === 'loading' && (darkMode ? "text-white" : "text-gray-900"),
              step.status === 'pending' && (darkMode ? "text-slate-500" : "text-gray-400")
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="flex justify-start">
      <div className={cn(
        "rounded-2xl rounded-bl-md px-4 py-3 shadow-sm",
        darkMode
          ? "bg-white/[0.03] border border-white/[0.08]"
          : "bg-white border border-gray-100"
      )}>
        <div className="flex items-center gap-1">
          <span className={cn(
            "w-2 h-2 rounded-full animate-bounce",
            darkMode ? "bg-violet-400" : "bg-primary/60"
          )} style={{ animationDelay: '0ms' }} />
          <span className={cn(
            "w-2 h-2 rounded-full animate-bounce",
            darkMode ? "bg-violet-400" : "bg-primary/60"
          )} style={{ animationDelay: '150ms' }} />
          <span className={cn(
            "w-2 h-2 rounded-full animate-bounce",
            darkMode ? "bg-violet-400" : "bg-primary/60"
          )} style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function CareerChatPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dreampath:theme") === "dark";
    }
    return false;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedAuth = useRef(false);
  const hasProcessedInitialMessage = useRef(false);
  const [researchPanels, setResearchPanels] = useState<ResearchPanel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [similarMentorLoading, setSimilarMentorLoading] = useState<string | null>(null);
  const [personalityPromptDismissed, setPersonalityPromptDismissed] = useState(false);
  const [personalityTriggered, setPersonalityTriggered] = useState(false);
  const [isIdentityLoading, setIsIdentityLoading] = useState(false);
  const [analysisUnlocked, setAnalysisUnlocked] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
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
    headerBg: "bg-[#0B0D14]/95 backdrop-blur-xl",
    headerBorder: "border-white/[0.06]",
    card: "bg-white/[0.02]",
    cardBorder: "border-white/[0.08]",
    text: "text-white",
    textMuted: "text-white/70",
    textSubtle: "text-white/50",
    border: "border-white/[0.08]",
    divider: "border-white/[0.06]",
    input: "bg-white/[0.03] border-white/[0.1] text-white placeholder:text-white/40",
    inputBorder: "border-white/[0.1]",
    inputFocus: "focus:border-violet-500/50 focus:ring-violet-500/20",
    userBubble: "bg-gradient-to-r from-violet-600 to-violet-500 text-white",
    assistantBubble: "bg-white/[0.03] border-white/[0.08]",
    assistantBubbleBorder: "border",
  } : {
    bg: "bg-slate-100",
    headerBg: "bg-white/70 backdrop-blur-xl",
    headerBorder: "border-gray-200/50",
    card: "bg-white/50 backdrop-blur-md",
    cardBorder: "border-white/60",
    text: "text-gray-900",
    textMuted: "text-gray-600",
    textSubtle: "text-gray-500",
    border: "border-gray-200",
    divider: "border-gray-100",
    input: "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
    inputBorder: "border-gray-200",
    inputFocus: "focus:border-primary focus:ring-primary/20",
    userBubble: "bg-primary text-white",
    assistantBubble: "bg-white border-gray-100",
    assistantBubbleBorder: "border",
  };

  const promptMessageText = [
    '사용자님의 상담 내용을 기반으로',
    '성향 분석을 생성할 수 있을 것 같아요.',
    '지금 바로 확인해 보시겠어요?',
  ].join('\n');

  const findSimilarMentors = async (panelId: string, currentSession: MentoringSession) => {
    setSimilarMentorLoading(panelId);
    try {
      const response = await authFetch(`${API_BASE_URL}/mentoring-sessions/available`);
      if (!response.ok) throw new Error('Failed to fetch');

      const allSessions: MentoringSession[] = await response.json();

      const similarSessions = allSessions.filter(s =>
        s.sessionId !== currentSession.sessionId &&
        (s.mentorTitle?.toLowerCase().includes(currentSession.mentorTitle?.toLowerCase().split(' ')[0] || '') ||
         s.topic?.toLowerCase().includes(currentSession.topic?.toLowerCase().split(' ')[0] || ''))
      ).slice(0, 2);

      if (similarSessions.length > 0) {
        setResearchPanels(prev => prev.map(p =>
          p.id === panelId
            ? { ...p, mentoringData: { sessions: similarSessions, total: similarSessions.length } }
            : p
        ));
      } else {
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
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const userStr = localStorage.getItem('dreampath:user');

    if (!userStr) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (analysisUnlocked) {
      setPersonalityPromptDismissed(true);
      setPersonalityTriggered(false);
    }
  }, [analysisUnlocked]);

  // HomePage에서 전달받은 initialMessage 처리
  useEffect(() => {
    const state = location.state as { initialMessage?: string } | null;
    // welcome 메시지가 표시된 후(messages.length > 0)에만 사용자 메시지 전송
    if (state?.initialMessage && sessionId && !isLoading && messages.length > 0 && !hasProcessedInitialMessage.current) {
      hasProcessedInitialMessage.current = true;
      window.history.replaceState({}, document.title);
      sendMessage(state.initialMessage);
    }
  }, [sessionId, location.state, isLoading, messages.length]);

  useEffect(() => {
    if (!sessionId) {
      setAnalysisUnlocked(false);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(ANALYSIS_UNLOCK_KEY) || '{}');
      setAnalysisUnlocked(Boolean(stored[sessionId]));
    } catch {
      setAnalysisUnlocked(false);
    }
  }, [sessionId]);

  const markAnalysisUnlocked = (session: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem(ANALYSIS_UNLOCK_KEY) || '{}');
      stored[session] = true;
      localStorage.setItem(ANALYSIS_UNLOCK_KEY, JSON.stringify(stored));
    } catch {
      localStorage.setItem(ANALYSIS_UNLOCK_KEY, JSON.stringify({ [session]: true }));
    }
    setAnalysisUnlocked(true);
    setPersonalityPromptDismissed(true);
    setPersonalityTriggered(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePersonalityAgentResponse = (agentResult: any) => {
    if (!agentResult || typeof agentResult !== 'object') return;
    if (agentResult.status === 'not_triggered') return;

    const hasPersonalityData =
      Boolean(agentResult.summary) ||
      Boolean(agentResult.big_five) ||
      Boolean(agentResult.mbti) ||
      Boolean(agentResult.embedding_document);

    if (!hasPersonalityData) return;

    setMessages(prev => {
      const hasPendingPrompt = prev.some(
        (message) => message.ctaType === 'personality-agent' && !message.ctaResolved
      );
      if (hasPendingPrompt) {
        return prev;
      }

      const promptMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: promptMessageText,
        timestamp: new Date(),
        ctaType: 'personality-agent',
        ctaResolved: false,
      };

      return [...prev, promptMessage];
    });
  };

  const handlePersonalityPromptAction = async (action: 'view' | 'later', messageId: string) => {
    if (action === 'view') {
      // "네, 확인할래요" 클릭 시 분석 실행 후 대시보드로 이동
      setMessages(prev =>
        prev.map(message =>
          message.id === messageId ? { ...message, ctaResolved: true } : message
        )
      );
      await handleAnalyze();
      return;
    } else {
      setPersonalityPromptDismissed(true);
    }

    setMessages(prev =>
      prev.map(message =>
        message.id === messageId ? { ...message, ctaResolved: true } : message
      )
    );
  };

  const WELCOME_MESSAGE = "안녕! 나는 너의 진로 정체성을 함께 찾아갈 상담사야. 편하게 이야기하자 😊";

  const restoreSessionState = async (existingSessionId: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE_URL}/chat/history/${existingSessionId}`);
      if (response.ok) {
        const history = await response.json();
        if (history && history.length > 0) {
          setSessionId(existingSessionId);

          // 히스토리를 메시지로 변환
          const historyMessages = history.map((msg: any) => ({
            id: generateMessageId(),
            role: msg.role as 'user' | 'assistant',
            content: msg.message,
            timestamp: new Date(msg.timestamp),
          }));

          // 첫 번째 메시지가 환영 메시지가 아니면 환영 메시지를 앞에 추가
          const firstMessage = historyMessages[0];
          const isWelcomeMessage = firstMessage?.role === 'assistant' &&
            firstMessage?.content?.includes('진로 정체성을 함께 찾아갈');

          if (!isWelcomeMessage) {
            const welcomeMsg: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: WELCOME_MESSAGE,
              timestamp: new Date(historyMessages[0]?.timestamp || Date.now()),
            };
            setMessages([welcomeMsg, ...historyMessages]);
          } else {
            setMessages(historyMessages);
          }

          try {
            const savedIdentity = localStorage.getItem('career_chat_identity');
            if (savedIdentity) {
              const identityData = JSON.parse(savedIdentity);
              setIdentityStatus(identityData);
            }
          } catch (err) {
            console.warn('localStorage 정체성 복원 실패');
          }

          try {
            const identityResponse = await authFetch(`${API_BASE_URL}/identity/${existingSessionId}`);
            if (identityResponse.ok) {
              const identityData = await identityResponse.json();
              setIdentityStatus(identityData);
              localStorage.setItem('career_chat_identity', JSON.stringify(identityData));
            }
          } catch (err) {
            console.error('정체성 상태 복원 에러:', err);
          }

          return true;
        }
      }
    } catch (error) {
      console.log('세션 복원 실패:', error);
    }

    return false;
  };

  const initializeSession = async () => {
    const getCurrentUserId = (): number | null => {
      try {
        const userStr = localStorage.getItem('dreampath:user');
        if (userStr) {
          const user = JSON.parse(userStr);
          return user.userId || null;
        }
      } catch (e) {
        console.warn('userId 가져오기 실패:', e);
      }
      return null;
    };

    const currentUserId = getCurrentUserId();

    const savedSessionData = localStorage.getItem('career_chat_session');

    if (savedSessionData) {
      try {
        const sessionData = JSON.parse(savedSessionData);

        if (typeof sessionData === 'string' || !sessionData.userId) {
          localStorage.removeItem('career_chat_session');
          localStorage.removeItem('career_chat_identity');
          await startNewSession(currentUserId);
          return;
        }

        const { sessionId: savedSessionId, userId: savedUserId } = sessionData;

        if (currentUserId && savedUserId && currentUserId !== savedUserId) {
          localStorage.removeItem('career_chat_session');
          localStorage.removeItem('career_chat_identity');
          await startNewSession(currentUserId);
          return;
        }

        const restored = await restoreSessionState(savedSessionId);
        if (restored) {
          return;
        }
      } catch (error) {
        localStorage.removeItem('career_chat_session');
        localStorage.removeItem('career_chat_identity');
      }
    }

    await startNewSession(currentUserId);
  };

  const startNewSession = async (
    currentUserId: number | null = null,
    options?: { forceNew?: boolean; skipRestore?: boolean }
  ) => {
    const { forceNew = false, skipRestore = false } = options || {};

    // 새 상담 시작 시 정체성 상태 즉시 초기화
    if (forceNew) {
      setIdentityStatus(null);
      setMessages([]);
      setResearchPanels([]);
    }

    try {
      let userIdFromStorage: number | null = null;
      try {
        const userStr = localStorage.getItem('dreampath:user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userIdFromStorage = user.userId || null;
        }
      } catch (e) {
        console.warn('localStorage에서 userId 가져오기 실패:', e);
      }

      const userIdToUse = currentUserId ?? userIdFromStorage;

      const response = await authFetch(`${API_BASE_URL}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToUse ? String(userIdToUse) : null,
          forceNew,
        }),
      });

      const data = await response.json();
      setSessionId(data.sessionId);
      setPersonalityPromptDismissed(false);
      setPersonalityTriggered(false);

      localStorage.setItem('career_chat_session', JSON.stringify({
        sessionId: data.sessionId,
        userId: userIdToUse
      }));

      const hasHistory = (!forceNew && !skipRestore)
        ? await restoreSessionState(data.sessionId)
        : false;

      if (!hasHistory) {
        setIdentityStatus(null);
        setMessages([{
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: '세션 시작에 실패했습니다. 나중에 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    }
  };

  const pollAgentResult = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await authFetch(`${PYTHON_AI_SERVICE_URL}/api/chat/agent-result/${taskId}`);
        const task = await response.json();

        if (task.status === 'completed' && task.agentAction) {
          setIsSearching(false);
          const actionType = task.agentAction.type as string;
          const results = task.agentAction.data?.results || [];

          let summary = task.agentAction.summary;
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
            title: task.agentAction.reason || '리서치 결과',
            summary: summary || '검색 결과를 확인하세요.',
            sources: results.map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
            })),
            timestamp: new Date(),
            mentoringData: panelType === 'mentoring' && task.agentAction.data?.sessions ? {
              sessions: task.agentAction.data.sessions,
              total: task.agentAction.data.sessions.length,
            } : undefined,
            learningPathData: panelType === 'learning_path' && task.agentAction.data?.path ? {
              path: task.agentAction.data.path,
              exists: task.agentAction.data.exists,
              canCreate: task.agentAction.data.canCreate,
              createUrl: task.agentAction.data.createUrl,
            } : undefined,
          };
          setResearchPanels(prev => [newResearchPanel, ...prev]);
          return;
        }

        if (task.status === 'skipped' || task.status === 'failed') {
          setIsSearching(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 500);
        } else {
          setIsSearching(false);
        }
      } catch (error) {
        console.error('[폴링] 에러:', error);
        setIsSearching(false);
      }
    };

    poll();
  };

  const sendMessage = async (messageToSend?: string) => {
    const messageContent = messageToSend || inputMessage;
    if (!messageContent.trim() || !sessionId || isLoading) return;

    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsSearching(true);

    try {
      const user = JSON.parse(userStr);
      const userId = user.userId;

      const response = await authFetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: messageContent,
          userId: String(userId),
          identityStatus,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        agentAction: undefined,
        hideContent: false,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      if (data.taskId) {
        pollAgentResult(data.taskId);
      } else {
        setIsSearching(false);
      }

      setIsIdentityLoading(true);
      setTimeout(async () => {
        try {
          const identityResponse = await authFetch(`${API_BASE_URL}/identity/${sessionId}`);
          if (identityResponse.ok) {
            const updatedIdentity = await identityResponse.json();
            setIdentityStatus(updatedIdentity);
            localStorage.setItem('career_chat_identity', JSON.stringify(updatedIdentity));
          }
        } catch (err) {
          console.warn('정체성 상태 폴링 실패:', err);
        } finally {
          setIsIdentityLoading(false);
        }
      }, 2000);

      const personalityAgentPayload =
        data?.personalityAgentResult ??
        data?.personalityAgent ??
        data?.personality_agent ??
        data?.personality_agent_result;

      if (
        personalityAgentPayload &&
        !analysisUnlocked &&
        !personalityPromptDismissed &&
        !messages.some(m => m.ctaType === 'personality-agent' && !m.ctaResolved)
      ) {
        setPersonalityTriggered(true);
        handlePersonalityAgentResponse(personalityAgentPayload);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: generateMessageId(),
        role: 'assistant',
        content: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
      setIsSearching(false);
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

      const userId = JSON.parse(localStorage.getItem('dreampath:user') || '{}').userId;

      // 기존 분석 여부와 관계없이 현재 세션에 대해 새로 분석 실행
      // (이전 로직: 기존 분석이 있으면 스킵 → 새 진로상담 결과가 반영되지 않는 버그)
      console.log('현재 세션에 대해 분석 시작:', sessionId);

      const response = await authFetch(`${API_BASE_URL}/analysis/${sessionId}`, {
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
      console.log('분석 완료:', analysisResult);
      if (sessionId) {
        markAnalysisUnlocked(sessionId);
      }
      setMessages(prev => [...prev, {
        id: generateMessageId(),
        role: 'assistant',
        content: '분석이 완료되었습니다! 이제 대시보드에서 상세한 결과를 확인할 수 있어요.',
        timestamp: new Date(),
      }]);

      // 진로 분석 완료 이벤트 발생 - Assistant 챗봇 캐시 초기화용
      window.dispatchEvent(new CustomEvent('dreampath-career-updated'));

      setTimeout(() => {
        navigate('/profile/dashboard');
      }, 1000);

    } catch (error) {
      console.error('분석 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

      setMessages(prev => [...prev, {
        id: generateMessageId(),
        role: 'assistant',
        content: `분석 중 오류가 발생했습니다: ${errorMessage}\n\n대화를 더 진행한 후 다시 시도해주세요.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem('career_chat_session');
    localStorage.removeItem('career_chat_identity');
    setMessages([]);
    setSessionId(null);
    setIdentityStatus(null);
    setAnalysisUnlocked(false);
    setResearchPanels([]);
    setPersonalityPromptDismissed(false);
    setPersonalityTriggered(false);
    startNewSession(null, { forceNew: true, skipRestore: true });
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

            const response = await authFetch(`${API_BASE_URL}/mentoring-bookings`, {
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
                id: generateMessageId(),
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
        navigate('/profile/dashboard');
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
  const shouldShowAnalyzeButton = analysisUnlocked || (messages.length >= 6 && (personalityTriggered || personalityPromptDismissed));

  // Background Effects
  const BackgroundEffects = () => (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-0 right-1/4 rounded-full ${
            darkMode ? "bg-violet-500/10" : "bg-violet-400/15"
          }`}
          style={{ width: 'min(60vw, 600px)', height: 'min(60vw, 600px)', filter: 'blur(150px)' }}
        />
        <div
          className={`absolute bottom-1/4 left-0 rounded-full ${
            darkMode ? "bg-blue-500/8" : "bg-blue-400/15"
          }`}
          style={{ width: 'min(50vw, 500px)', height: 'min(50vw, 500px)', filter: 'blur(120px)' }}
        />
        <div
          className={`absolute top-1/2 right-0 rounded-full ${
            darkMode ? "bg-cyan-500/6" : "bg-cyan-400/10"
          }`}
          style={{ width: 'min(40vw, 400px)', height: 'min(40vw, 400px)', filter: 'blur(100px)' }}
        />
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

  return (
    <div className={`min-h-screen ${theme.bg} relative px-4 sm:px-6 lg:px-8 py-3`}>
      <BackgroundEffects />

      <div className="max-w-7xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              darkMode
                ? "bg-violet-500/20"
                : "bg-gradient-to-br from-violet-500 to-purple-600"
            )}>
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${theme.text}`}>AI 진로 상담</h1>
              {identityStatus ? (
                <p className={`text-sm ${theme.textSubtle} inline-flex items-center gap-1`}>
                  <StageIcon className={cn("h-3.5 w-3.5", darkMode ? "text-violet-400" : "text-violet-600")} />
                  {stageInfo?.label} 단계
                </p>
              ) : (
                <p className={`text-sm ${theme.textSubtle}`}>진로 정체성을 함께 찾아가요</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 모바일 패널 토글 */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "lg:hidden rounded-xl",
                darkMode
                  ? "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                  : "border-slate-200"
              )}
              onClick={() => setShowMobilePanel(!showMobilePanel)}
            >
              {showMobilePanel ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              className={cn(
                "rounded-xl",
                darkMode
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-violet-500 hover:bg-violet-600 text-white"
              )}
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">새 상담</span>
            </Button>
          </div>
        </div>

      <main className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 채팅 영역 */}
          <div className="lg:col-span-2">
            <div
              className={cn(
                "h-[calc(100vh-90px)] sm:h-[calc(100vh-96px)] flex flex-col shadow-sm border rounded-xl",
                theme.cardBorder
              )}
              style={{
                backgroundColor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {messages.map((message, index) => (
                    <div key={message.id ?? index} className="animate-in">
                      {!message.hideContent && (
                        <div className={cn(
                          "flex",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                          <div className={cn(
                            "max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3",
                            message.role === 'user'
                              ? `${theme.userBubble} rounded-br-md`
                              : `${theme.assistantBubble} ${theme.assistantBubbleBorder} shadow-sm rounded-bl-md`
                          )}>
                            <p className={cn(
                              "text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap",
                              message.role === 'user'
                                ? 'text-white'
                                : theme.text
                            )}>
                              {message.content}
                            </p>
                            {message.ctaType === 'personality-agent' && !message.ctaResolved && (
                              <div className="mt-4 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePersonalityPromptAction('view', message.id)}
                                  className={cn(
                                    "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition",
                                    darkMode
                                      ? "bg-gradient-to-r from-violet-600 to-violet-500 hover:opacity-90"
                                      : "bg-gradient-to-r from-primary to-violet-600 hover:opacity-90"
                                  )}
                                >
                                  네, 확인할래요
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePersonalityPromptAction('later', message.id)}
                                  className={cn(
                                    "w-full rounded-xl border px-4 py-2 text-sm font-semibold transition",
                                    darkMode
                                      ? "border-white/[0.1] text-white/70 hover:bg-white/[0.05]"
                                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                                  )}
                                >
                                  조금 더 이야기할래요
                                </button>
                              </div>
                            )}
                            <p className={cn(
                              "text-xs mt-2",
                              message.role === 'user'
                                ? 'text-white/60'
                                : theme.textSubtle
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
                          <div className="max-w-[90%] sm:max-w-[85%]">
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

                  {isLoading && <TypingIndicator darkMode={darkMode} />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 입력 영역 */}
              <div className={cn(
                "border-t p-3 sm:p-4",
                theme.divider,
                darkMode ? "bg-white/[0.01]" : "bg-gray-50/50"
              )}>
                {shouldShowAnalyzeButton && (
                  <div className="mb-3 flex justify-center">
                    <Button
                      onClick={handleAnalyze}
                      className={cn(
                        "rounded-full shadow-lg",
                        darkMode
                          ? "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-violet-500/20"
                          : "bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-primary/25"
                      )}
                      disabled={isLoading}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      종합 분석하기
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3 max-w-2xl mx-auto">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요..."
                    className={cn(
                      "min-h-[48px] sm:min-h-[52px] max-h-32 resize-none rounded-2xl",
                      theme.input,
                      theme.inputFocus
                    )}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    size="icon"
                    className={cn(
                      "h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] shrink-0 rounded-2xl shadow-lg",
                      darkMode
                        ? "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20"
                        : "bg-primary hover:bg-primary/90 shadow-primary/25"
                    )}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 패널 - 데스크톱 */}
          <div className="hidden lg:block lg:col-span-1">
            <RightPanel
              darkMode={darkMode}
              theme={theme}
              identityStatus={identityStatus}
              isIdentityLoading={isIdentityLoading}
              stageInfo={stageInfo}
              StageIcon={StageIcon}
              isSearching={isSearching}
              researchPanels={researchPanels}
              setResearchPanels={setResearchPanels}
              expandedSources={expandedSources}
              toggleSourceExpand={toggleSourceExpand}
              similarMentorLoading={similarMentorLoading}
              findSimilarMentors={findSimilarMentors}
              getResearchIcon={getResearchIcon}
              navigate={navigate}
            />
          </div>
        </div>

        {/* 모바일 패널 오버레이 */}
        {showMobilePanel && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobilePanel(false)}
            />
            <div className={cn(
              "absolute right-0 top-0 h-full w-full max-w-md",
              theme.bg
            )}>
              <div className={cn(
                "flex justify-between items-center px-4 py-3 border-b",
                theme.divider
              )}>
                <span className={`font-medium ${theme.text}`}>정보 패널</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={darkMode ? "text-white/70 hover:bg-white/[0.05]" : ""}
                  onClick={() => setShowMobilePanel(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <RightPanel
                darkMode={darkMode}
                theme={theme}
                identityStatus={identityStatus}
                isIdentityLoading={isIdentityLoading}
                stageInfo={stageInfo}
                StageIcon={StageIcon}
                isSearching={isSearching}
                researchPanels={researchPanels}
                setResearchPanels={setResearchPanels}
                expandedSources={expandedSources}
                toggleSourceExpand={toggleSourceExpand}
                similarMentorLoading={similarMentorLoading}
                findSimilarMentors={findSimilarMentors}
                getResearchIcon={getResearchIcon}
                navigate={navigate}
                isMobile
              />
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

// Right Panel Component
interface RightPanelProps {
  darkMode: boolean;
  theme: ThemeColors;
  identityStatus: IdentityStatus | null;
  isIdentityLoading: boolean;
  stageInfo: { label: string; icon: any } | null;
  StageIcon: any;
  isSearching: boolean;
  researchPanels: ResearchPanel[];
  setResearchPanels: React.Dispatch<React.SetStateAction<ResearchPanel[]>>;
  expandedSources: Set<string>;
  toggleSourceExpand: (panelId: string) => void;
  similarMentorLoading: string | null;
  findSimilarMentors: (panelId: string, session: MentoringSession) => void;
  getResearchIcon: (type: ResearchPanel['type']) => JSX.Element;
  navigate: (path: string) => void;
  isMobile?: boolean;
}

function RightPanel({
  darkMode,
  theme,
  identityStatus,
  isIdentityLoading,
  stageInfo,
  StageIcon,
  isSearching,
  researchPanels,
  setResearchPanels,
  expandedSources,
  toggleSourceExpand,
  similarMentorLoading,
  findSimilarMentors,
  getResearchIcon,
  navigate,
  isMobile = false,
}: RightPanelProps) {
  const [identityExpanded, setIdentityExpanded] = useState(true);
  const [researchExpanded, setResearchExpanded] = useState(true);
  const height = isMobile ? "h-[calc(100vh-56px)]" : "h-[calc(100vh-96px)]";

  return (
    <Card className={cn(
      "flex flex-col overflow-hidden border-0 shadow-lg",
      darkMode ? "bg-[#0B0D14]" : "bg-white/80 backdrop-blur-sm",
      isMobile ? height : `sticky top-24 ${height}`
    )}>
      <ScrollArea className="h-full">
        <div className="flex flex-col">
          {/* 나의 정체성 섹션 */}
          <div className={cn(
            "border-b",
            darkMode ? "border-white/[0.06]" : "border-gray-200"
          )}>
            {/* 아코디언 헤더 */}
            <button
              onClick={() => setIdentityExpanded(!identityExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 transition-colors",
                darkMode
                  ? "hover:bg-white/[0.03]"
                  : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center",
                  darkMode ? "bg-violet-500/20" : "bg-violet-100"
                )}>
                  <User className={cn(
                    "h-4 w-4",
                    darkMode ? "text-violet-400" : "text-violet-600"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  darkMode ? "text-white" : "text-gray-900"
                )}>
                  나의 정체성
                </span>
                {identityStatus?.clarity != null && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    darkMode ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600"
                  )}>
                    {identityStatus.clarity}%
                  </span>
                )}
              </div>
              {identityExpanded ? (
                <ChevronUp className={cn("h-4 w-4", darkMode ? "text-white/50" : "text-gray-400")} />
              ) : (
                <ChevronDown className={cn("h-4 w-4", darkMode ? "text-white/50" : "text-gray-400")} />
              )}
            </button>

            {/* 아코디언 컨텐츠 */}
            {identityExpanded && (
              <div className={cn(
                "px-4 pb-4 space-y-4",
                darkMode ? "bg-white/[0.02]" : "bg-white"
              )}>
                {isIdentityLoading && (
                  <div className={cn(
                    "rounded-xl p-4",
                    darkMode
                      ? "bg-gradient-to-r from-violet-500/10 to-violet-600/10 border border-violet-500/20"
                      : "bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <Loader2 className={cn(
                        "h-5 w-5 animate-spin",
                        darkMode ? "text-violet-400" : "text-primary"
                      )} />
                      <div>
                        <p className={`text-sm font-medium ${theme.text}`}>정체성 분석 중...</p>
                        <p className={`text-xs ${theme.textSubtle}`}>대화 내용을 분석하고 있어요</p>
                      </div>
                    </div>
                  </div>
                )}

                {identityStatus ? (
                  <>
                    {/* 새로운 인사이트 */}
                    {identityStatus.recentInsight?.hasInsight && identityStatus.recentInsight?.insight && (
                      <div className={cn(
                        "rounded-xl p-4",
                        darkMode
                          ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                          : "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            darkMode ? "bg-amber-500/20" : "bg-amber-100"
                          )}>
                            <Lightbulb className={cn(
                              "h-4 w-4",
                              darkMode ? "text-amber-400" : "text-amber-600"
                            )} />
                          </div>
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              darkMode ? "text-amber-400" : "text-amber-800"
                            )}>새로운 발견!</p>
                            <p className={cn(
                              "text-sm mt-1",
                              darkMode ? "text-amber-300/80" : "text-amber-700"
                            )}>
                              {identityStatus.recentInsight.insight}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 현재 단계 */}
                    {identityStatus.currentStage && (
                      <div className={cn(
                        "rounded-xl p-4",
                        darkMode
                          ? "bg-gradient-to-r from-violet-500/10 to-violet-600/10 border border-violet-500/20"
                          : "bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <StageIcon className={cn(
                              "h-5 w-5",
                              darkMode ? "text-violet-400" : "text-primary"
                            )} />
                            <span className={`font-medium ${theme.text}`}>
                              {stageInfo?.label} 단계
                            </span>
                          </div>
                          <span className={cn(
                            "text-sm font-semibold",
                            darkMode ? "text-violet-400" : "text-primary"
                          )}>
                            {identityStatus.overallProgress}%
                          </span>
                        </div>
                        {identityStatus.stageDescription && (
                          <p className={`text-sm ${theme.textMuted}`}>
                            {identityStatus.stageDescription}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 명확도 */}
                    {identityStatus.clarity != null && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-medium ${theme.textMuted}`}>정체성 명확도</span>
                          <span className={cn(
                            "text-sm font-semibold",
                            darkMode ? "text-violet-400" : "text-primary"
                          )}>
                            {identityStatus.clarity}%
                          </span>
                        </div>
                        <Progress value={identityStatus.clarity} className="h-2" />
                        {identityStatus.clarityReason && (
                          <p className={`text-xs ${theme.textSubtle}`}>
                            {identityStatus.clarityReason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 핵심 정체성 */}
                    {identityStatus.identityCore && identityStatus.identityCore !== '탐색 중...' && (
                      <div className={cn(
                        "rounded-xl p-4",
                        darkMode ? "bg-white/[0.03]" : "bg-gray-50"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className={cn(
                            "h-4 w-4",
                            darkMode ? "text-white/40" : "text-gray-500"
                          )} />
                          <span className={`text-xs font-medium uppercase tracking-wide ${theme.textSubtle}`}>핵심 정체성</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${theme.text}`}>{identityStatus.identityCore}</p>
                        {identityStatus.confidence != null && identityStatus.confidence > 0 && (
                          <p className={`text-xs mt-2 ${theme.textSubtle}`}>
                            확신도 {identityStatus.confidence}%
                          </p>
                        )}
                      </div>
                    )}

                    {/* 발견된 특징 */}
                    {identityStatus.traits && identityStatus.traits.length > 0 && (
                      <div className="space-y-3">
                        <span className={`text-xs font-medium uppercase tracking-wide ${theme.textSubtle}`}>발견된 특징</span>
                        {identityStatus.traits.map((item, index) => (
                          <div key={index} className={cn(
                            "rounded-lg p-3 shadow-sm border",
                            darkMode
                              ? "bg-white/[0.02] border-white/[0.06]"
                              : "bg-white border-gray-100"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${theme.text}`}>{item.trait}</span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                darkMode ? "bg-white/[0.05] text-white/60" : "bg-gray-100 text-gray-400"
                              )}>
                                {item.category}
                              </span>
                            </div>
                            {item.evidence && (
                              <p className={`text-xs ${theme.textSubtle}`}>"{item.evidence}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {identityStatus.nextFocus && (
                      <div className={cn(
                        "rounded-xl p-4",
                        darkMode
                          ? "bg-gradient-to-r from-violet-500/10 to-violet-600/10 border border-violet-500/20"
                          : "bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/10"
                      )}>
                        <div className="flex items-start gap-3">
                          <ArrowRight className={cn(
                            "h-5 w-5 mt-0.5",
                            darkMode ? "text-violet-400" : "text-primary"
                          )} />
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              darkMode ? "text-violet-400" : "text-primary"
                            )}>다음 탐색</p>
                            <p className={`text-sm mt-1 ${theme.textMuted}`}>
                              {identityStatus.nextFocus}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center mb-3",
                      darkMode ? "bg-white/[0.03]" : "bg-gray-100"
                    )}>
                      <MessageSquare className={cn(
                        "h-6 w-6",
                        darkMode ? "text-white/20" : "text-gray-300"
                      )} />
                    </div>
                    <p className={`text-sm ${theme.textSubtle}`}>
                      대화를 시작하면<br/>정체성 분석이 표시됩니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Assistant 섹션 */}
          <div>
            {/* 아코디언 헤더 */}
            <button
              onClick={() => setResearchExpanded(!researchExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 transition-colors",
                darkMode
                  ? "hover:bg-white/[0.03]"
                  : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center",
                  darkMode ? "bg-cyan-500/20" : "bg-cyan-100"
                )}>
                  <Search className={cn(
                    "h-4 w-4",
                    darkMode ? "text-cyan-400" : "text-cyan-600"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  darkMode ? "text-white" : "text-gray-900"
                )}>
                  AI Assistant
                </span>
                {researchPanels.length > 0 && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    darkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-600"
                  )}>
                    {researchPanels.length}
                  </span>
                )}
                {isSearching && (
                  <Loader2 className={cn(
                    "h-3 w-3 animate-spin ml-1",
                    darkMode ? "text-cyan-400" : "text-cyan-600"
                  )} />
                )}
              </div>
              {researchExpanded ? (
                <ChevronUp className={cn("h-4 w-4", darkMode ? "text-white/50" : "text-gray-400")} />
              ) : (
                <ChevronDown className={cn("h-4 w-4", darkMode ? "text-white/50" : "text-gray-400")} />
              )}
            </button>

            {/* 아코디언 컨텐츠 */}
            {researchExpanded && (
              <div className={cn(
                "px-4 pb-4",
                darkMode ? "bg-slate-900/50" : "bg-gray-50"
              )}>
                {isSearching && <AISearchingState darkMode={darkMode} />}

                {!isSearching && researchPanels.length > 0 && (() => {
                  const panel = researchPanels[0];
                  return (
                    <div className="relative group mt-2">
                      <div className={cn(
                        "absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl blur transition",
                        darkMode ? "opacity-30 group-hover:opacity-50" : "opacity-20 group-hover:opacity-30"
                      )} />

                      <div className={cn(
                        "relative rounded-xl p-4",
                        darkMode ? "bg-slate-800" : "bg-white border border-gray-200"
                      )}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center",
                              darkMode ? "bg-slate-700 text-cyan-400" : "bg-violet-100 text-violet-600"
                            )}>
                              {getResearchIcon(panel.type)}
                            </div>
                            <div>
                              <h4 className={cn(
                                "text-sm font-medium line-clamp-1",
                                darkMode ? "text-white" : "text-gray-900"
                              )}>
                                {panel.title}
                              </h4>
                              <span className={cn("text-xs", darkMode ? "text-slate-400" : "text-gray-500")}>
                                {panel.timestamp.toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {panel.type === 'web_search' && (
                          <p className={cn(
                            "text-sm leading-relaxed mb-4 whitespace-pre-line",
                            darkMode ? "text-slate-300" : "text-gray-600"
                          )}>
                            {panel.summary}
                          </p>
                        )}

                        {panel.type === 'mentoring' && panel.mentoringData?.sessions && panel.mentoringData.sessions.length > 0 && (
                          <div className={cn("pt-3 border-t", darkMode ? "border-slate-700" : "border-gray-200")}>
                            <p className={cn("text-xs mb-3", darkMode ? "text-slate-400" : "text-gray-500")}>이런 멘토링도 있어요</p>
                            <div className="space-y-3">
                              {panel.mentoringData.sessions.slice(0, 2).map((session, idx) => (
                                <div key={idx} className={cn("rounded-lg p-4", darkMode ? "bg-slate-700/50" : "bg-gray-50 border border-gray-200")}>
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                                      {session.mentorName?.charAt(0) || 'M'}
                                    </div>
                                    <div className="flex-1">
                                      <p className={cn("font-medium", darkMode ? "text-white" : "text-gray-900")}>{session.mentorName}</p>
                                      <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-gray-500")}>{session.mentorTitle}</p>
                                    </div>
                                  </div>

                                  <div className="mb-3">
                                    <p className={cn("text-sm font-medium mb-1", darkMode ? "text-cyan-400" : "text-violet-600")}>{session.topic}</p>
                                    {session.description && (
                                      <p className={cn("text-xs leading-relaxed line-clamp-2", darkMode ? "text-slate-300" : "text-gray-600")}>{session.description}</p>
                                    )}
                                  </div>

                                  <div className={cn("flex items-center gap-3 mb-4 text-xs", darkMode ? "text-slate-400" : "text-gray-500")}>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{session.sessionDate}</span>
                                    </div>
                                    {session.price !== undefined && session.price > 0 && (
                                      <span className={darkMode ? "text-cyan-400" : "text-violet-600"}>{session.price.toLocaleString()}원</span>
                                    )}
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className={cn("flex-1 text-white text-xs", darkMode ? "bg-cyan-500 hover:bg-cyan-600" : "bg-violet-500 hover:bg-violet-600")}
                                      onClick={() => navigate(`/mentoring/book/${session.sessionId}`)}
                                    >
                                      예약하기
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={cn(
                                        "flex-1 text-xs",
                                        darkMode ? "border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300" : "border-violet-300 text-violet-600 hover:bg-violet-50"
                                      )}
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
                                      className={cn(
                                        "flex-1 text-xs",
                                        darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                      )}
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

                        {panel.type === 'learning_path' && panel.learningPathData?.path && (
                          <div className={cn("pt-3 border-t", darkMode ? "border-slate-700" : "border-gray-200")}>
                            <p className={cn("text-xs mb-3", darkMode ? "text-slate-400" : "text-gray-500")}>이런 학습으로 시작해보는건 어때요?</p>
                            <div className={cn("rounded-lg p-4", darkMode ? "bg-slate-700/50" : "bg-gray-50 border border-gray-200")}>
                              <div className="flex items-start gap-3 mb-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                                  <BookOpen className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className={cn("font-medium", darkMode ? "text-white" : "text-gray-900")}>{panel.learningPathData.path.career}</p>
                                  <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-gray-500")}>{panel.learningPathData.path.weeks}주 학습 코스</p>
                                </div>
                              </div>
                              {panel.learningPathData.path.topics && panel.learningPathData.path.topics.length > 0 && (
                                <div className="mb-4">
                                  <p className={cn("text-xs mb-2", darkMode ? "text-slate-400" : "text-gray-500")}>학습 주제</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {panel.learningPathData.path.topics.slice(0, 4).map((topic, idx) => (
                                      <span key={idx} className={cn("px-2 py-1 text-xs rounded", darkMode ? "bg-slate-600/50 text-slate-300" : "bg-violet-100 text-violet-700")}>
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {panel.learningPathData.exists ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={darkMode ? "text-slate-400" : "text-gray-500"}>진행률</span>
                                    <span className={darkMode ? "text-cyan-400" : "text-violet-600"}>{panel.learningPathData.path.progress || 0}%</span>
                                  </div>
                                  <Progress value={panel.learningPathData.path.progress || 0} className="h-1.5" />
                                  <Button
                                    className={cn("w-full mt-2 text-white", darkMode ? "bg-cyan-500 hover:bg-cyan-600" : "bg-violet-500 hover:bg-violet-600")}
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
                                <p className={cn("text-xs text-center", darkMode ? "text-slate-400" : "text-gray-500")}>준비 중인 학습 경로입니다</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full mt-3",
                                darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              )}
                              onClick={() => navigate('/learning')}
                            >
                              다른 학습 경로 보기
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}

                        {panel.sources && panel.sources.length > 0 && panel.type !== 'mentoring' && panel.type !== 'learning_path' && (
                          <div className={cn("pt-3 border-t", darkMode ? "border-slate-700" : "border-gray-200")}>
                            <button
                              onClick={() => toggleSourceExpand(panel.id)}
                              className={cn(
                                "flex items-center justify-between w-full text-xs transition-colors",
                                darkMode ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"
                              )}
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
                                  <div key={idx} className={cn("rounded-lg p-3", darkMode ? "bg-slate-800/50" : "bg-gray-50 border border-gray-200")}>
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-start gap-2 text-sm transition-colors mb-1.5",
                                        darkMode ? "text-cyan-400 hover:text-cyan-300" : "text-violet-600 hover:text-violet-700"
                                      )}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                      <span className="font-medium leading-tight">{source.title}</span>
                                    </a>
                                    {source.snippet && (
                                      <p className={cn("text-xs leading-relaxed pl-5", darkMode ? "text-slate-400" : "text-gray-500")}>
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

                {!isSearching && researchPanels.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center mb-3",
                      darkMode ? "bg-slate-800" : "bg-gray-100"
                    )}>
                      <Search className={cn("h-6 w-6", darkMode ? "text-slate-600" : "text-gray-400")} />
                    </div>
                    <p className={cn("text-sm mb-1", darkMode ? "text-slate-400" : "text-gray-500")}>
                      리서치 결과가 없어요
                    </p>
                    <p className={cn("text-xs", darkMode ? "text-slate-500" : "text-gray-400")}>
                      대화 중 필요한 정보를<br/>AI가 자동으로 검색합니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}