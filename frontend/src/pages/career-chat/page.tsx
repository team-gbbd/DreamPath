import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import SurveyModal from '../../components/profile/SurveyModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

const generateMessageId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export default function CareerChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [personalityPromptDismissed, setPersonalityPromptDismissed] = useState(false);
  const [personalityTriggered, setPersonalityTriggered] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedAuth = useRef(false); // 인증 확인 중복 방지

  // 로그인한 사용자 정보 가져오기 및 세션 초기화
  useEffect(() => {
    // 이미 인증 확인을 했다면 스킵 (React Strict Mode 대응)
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // 로그인 확인
    const userStr = localStorage.getItem('dreampath:user');

    if (!userStr) {
      // 비회원인 경우 로그인 페이지로 리다이렉트
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 로그인 사용자만 세션 초기화
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const restoreSessionState = async (existingSessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/history/${existingSessionId}`);
      if (response.ok) {
        const history = await response.json();
        if (history && history.length > 0) {
          setSessionId(existingSessionId);
          setMessages(history.map((msg: any) => ({
            id: generateMessageId(),
            role: msg.role as 'user' | 'assistant',
            content: msg.message,
            timestamp: new Date(msg.timestamp),
          })));
          console.log('기존 세션 복원:', existingSessionId, '메시지 수:', history.length);

          try {
            const savedIdentity = localStorage.getItem('career_chat_identity');
            if (savedIdentity) {
              const identityData = JSON.parse(savedIdentity);
              console.log('localStorage에서 정체성 복원:', identityData);
              setIdentityStatus(identityData);
            }
          } catch (err) {
            console.warn('localStorage 정체성 복원 실패');
          }

          try {
            console.log('백엔드에서 정체성 상태 조회 시도:', existingSessionId);
            const identityResponse = await fetch(`${API_BASE_URL}/identity/${existingSessionId}`);
            console.log('정체성 응답 상태:', identityResponse.status);
            if (identityResponse.ok) {
              const identityData = await identityResponse.json();
              console.log('백엔드 정체성 데이터:', identityData);
              setIdentityStatus(identityData);
              localStorage.setItem('career_chat_identity', JSON.stringify(identityData));
            } else {
              console.warn('정체성 상태 조회 실패, 상태 코드:', identityResponse.status);
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
    // localStorage에서 userId 가져오기
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

    // localStorage에서 기존 세션 정보 확인
    const savedSessionData = localStorage.getItem('career_chat_session');

    if (savedSessionData) {
      try {
        const sessionData = JSON.parse(savedSessionData);

        // 마이그레이션: 이전 형식(문자열만 저장)인 경우 삭제
        if (typeof sessionData === 'string' || !sessionData.userId) {
          console.warn('이전 형식의 세션 데이터 감지, 삭제 후 새 세션 시작');
          localStorage.removeItem('career_chat_session');
          localStorage.removeItem('career_chat_identity');
          await startNewSession();
          return;
        }

        const { sessionId: savedSessionId, userId: savedUserId } = sessionData;

        // userId 검증: 현재 로그인한 사용자와 세션의 사용자가 다르면 세션 삭제
        if (currentUserId && savedUserId && currentUserId !== savedUserId) {
          console.warn('다른 사용자의 세션 감지, 세션 초기화');
          localStorage.removeItem('career_chat_session');
          localStorage.removeItem('career_chat_identity');
          await startNewSession();
          return;
        }

        const restored = await restoreSessionState(savedSessionId);
        if (restored) {
          return;
        }
      } catch (error) {
        console.log('세션 복원 실패, 새 세션 시작:', error);
        localStorage.removeItem('career_chat_session');
        localStorage.removeItem('career_chat_identity');
      }
    }

    // 새 세션 시작
    await startNewSession(currentUserId);
  };

  const startNewSession = async (
    currentUserId: number | null = null,
    options?: { forceNew?: boolean; skipRestore?: boolean }
  ) => {
    const { forceNew = false, skipRestore = false } = options || {};
    try {
      // localStorage에서 userId 가져오기
      let userId: number | null = null;
      try {
        const userStr = localStorage.getItem('dreampath:user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.userId || null;
        }
      } catch (e) {
        console.warn('localStorage에서 userId 가져오기 실패:', e);
      }

      if (currentUserId !== null && currentUserId !== undefined) {
        userId = currentUserId;
      }

      const response = await fetch(`${API_BASE_URL}/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId ? String(userId) : null,
          forceNew
        }),
      });

      const data = await response.json();
      setSessionId(data.sessionId);
      setPersonalityPromptDismissed(false);
      setPersonalityTriggered(false);
      // localStorage에 세션 정보 저장 (userId와 함께)
      localStorage.setItem('career_chat_session', JSON.stringify({
        sessionId: data.sessionId,
        userId: userId
      }));

      const hasHistory = (!forceNew && !skipRestore)
        ? await restoreSessionState(data.sessionId)
        : false;

      // 설문조사 필요 여부 확인
      if (data.needsSurvey && data.surveyQuestions) {
        setSurveyQuestions(data.surveyQuestions);
        setShowSurvey(true);
      }

      if (!hasHistory) {
        setIdentityStatus(null);
        setMessages([{
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }]);
      }

      console.log('새 세션 시작:', data.sessionId, 'userId:', userId);
    } catch (error) {
      console.error('세션 시작 실패:', error);
      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: '세션 시작에 실패했습니다. 나중에 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    }
  };

  const promptMessageText = [
    '사용자님의 상담 내용을 기반으로',
    '성향 분석을 생성할 수 있을 것 같아요.',
    '지금 바로 확인해 보시겠어요?',
  ].join('\n');

  const handlePersonalityAgentResponse = (agentResult: any) => {
    if (!agentResult || typeof agentResult !== 'object') return;
    if (agentResult.status === 'not_triggered') return;

    const hasPersonalityData =
      Boolean(agentResult.summary) ||
      Boolean(agentResult.big_five) ||
      Boolean(agentResult.mbti) ||
      Boolean(agentResult.embedding_document);

    if (!hasPersonalityData) return;

    setMessages((prev) => {
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

  const handlePersonalityPromptAction = (action: 'view' | 'later', messageId: string) => {
    if (action === 'view') {
      navigate('/profile/dashboard');
    } else {
      setPersonalityPromptDismissed(true);
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, ctaResolved: true } : message
      )
    );
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    // 로그인 확인
    const userStr = localStorage.getItem('dreampath:user');
    if (!userStr) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    console.log('SEND payload:', {
      sessionId,
      msg: inputMessage,
      history: messages.length,
    });

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // userId 가져오기
      const user = JSON.parse(userStr);
      const userId = user.userId;

      const chatPayload = {
        sessionId: sessionId,
        message: inputMessage,
        userId: String(userId),
      };
      console.log('SEND /api/chat payload:', chatPayload);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatPayload),
      });

      const data = await response.json();

      console.log('백엔드 응답:', data);
      console.log('정체성 상태:', data.identityStatus);

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 정체성 상태 업데이트
      if (data.identityStatus) {
        console.log('정체성 업데이트:', data.identityStatus);
        setIdentityStatus(data.identityStatus);

        // localStorage에도 마지막 정체성 상태 저장
        try {
          localStorage.setItem('career_chat_identity', JSON.stringify(data.identityStatus));
        } catch (e) {
          console.warn('정체성 상태 저장 실패');
        }
      } else {
        console.warn('정체성 상태가 없습니다');
      }

      const personalityAgentPayload =
        data?.personalityAgentResult ??
        data?.personalityAgent ??
        data?.personality_agent ??
        data?.personality_agent_result;

      if (personalityAgentPayload && !personalityPromptDismissed) {
        setPersonalityTriggered(true);
        handlePersonalityAgentResponse(personalityAgentPayload);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStageKorean = (stage: string) => {
    const stages: { [key: string]: string } = {
      'EXPLORATION': '탐색',
      'DEEPENING': '심화',
      'INTEGRATION': '통합',
      'DIRECTION': '방향 설정',
    };
    return stages[stage] || stage;
  };

  const handleAnalyze = async () => {
    if (!sessionId) {
      alert('세션 정보가 없습니다. 대화를 먼저 진행해주세요.');
      return;
    }

    try {
      setIsLoading(true);

      // 먼저 성향 분석 결과가 이미 존재하는지 확인
      const userId = JSON.parse(localStorage.getItem('dreampath:user') || '{}').userId;

      if (userId) {
        try {
          // UserProfile이 아니라 실제 분석 결과(ProfileAnalysis)가 있는지 확인
          const analysisCheckResponse = await fetch(`http://localhost:8080/api/profiles/${userId}/analysis`);

          if (analysisCheckResponse.ok) {
            // 분석 결과가 이미 존재하면 바로 대시보드로 이동
            console.log('✅ 기존 분석 결과 발견, 대시보드로 이동');

            setMessages(prev => [...prev, {
              id: generateMessageId(),
              role: 'assistant',
              content: '✨ 이미 분석이 완료되어 있습니다! 대시보드로 이동합니다.',
              timestamp: new Date(),
            }]);

            setTimeout(() => {
              navigate('/profile/dashboard');
            }, 800);

            setIsLoading(false);
            return;
          }
        } catch (error) {
          // 프로파일이 없으면 계속 진행
          console.log('프로파일 없음, 새로 분석 시작');
        }
      }

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
        id: generateMessageId(),
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
        id: generateMessageId(),
        role: 'assistant',
        content: `분석 중 오류가 발생했습니다: ${errorMessage}\n\n대화를 더 진행한 후 다시 시도해주세요.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    // 현재 세션 종료하고 새 세션 시작
    localStorage.removeItem('career_chat_session');
    localStorage.removeItem('career_chat_identity');
    setMessages([]);
    setSessionId(null);
    setIdentityStatus(null);
    setShowSurvey(false);
    setSurveyQuestions([]);
    await startNewSession(null, { forceNew: true, skipRestore: true });
  };

  const handleSurveyComplete = () => {
    setShowSurvey(false);
    // 설문조사 완료 후 환영 메시지 업데이트
    setMessages(prev => [...prev, {
      id: generateMessageId(),
      role: 'assistant',
      content: '설문조사가 완료되었습니다! 이제 진로 정체성 탐색을 시작해볼까요? 😊',
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* 설문조사 모달 */}
      {sessionId && (
        <SurveyModal
          isOpen={showSurvey}
          questions={surveyQuestions}
          sessionId={sessionId}
          onComplete={handleSurveyComplete}
        />
      )}
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <i className="ri-arrow-left-line text-2xl"></i>
                </button>
                <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                  <i className="ri-chat-voice-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">AI 진로 상담</h1>
                  <p className="text-sm text-gray-600">
                    {identityStatus ? `${getStageKorean(identityStatus.currentStage)} 단계` : '대화 시작'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <i className="ri-add-line mr-1"></i>
                새 상담 시작
              </button>
            </div>

            {identityStatus && identityStatus.overallProgress != null && (
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-gray-600">전체 진행률:</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] transition-all duration-500"
                    style={{ width: `${identityStatus.overallProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800">{identityStatus.overallProgress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-200px)] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 ${message.role === 'user'
                        ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white'
                        : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
                      {message.ctaType === 'personality-agent' && !message.ctaResolved && (
                        <div className="mt-4 flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => handlePersonalityPromptAction('view', message.id)}
                            className="w-full rounded-xl bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 transition"
                          >
                            네, 확인할래요
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePersonalityPromptAction('later', message.id)}
                            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                          >
                            조금 더 이야기할래요
                          </button>
                        </div>
                      )}
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-5 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                {messages.length >= 6 && (personalityTriggered || personalityPromptDismissed) && (
                  <div className="mb-3 flex justify-center">
                    <button
                      onClick={handleAnalyze}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center space-x-2"
                    >
                      <i className="ri-line-chart-line text-xl"></i>
                      <span className="font-medium">종합 분석하기</span>
                    </button>
                  </div>
                )}
                <div className="flex space-x-3">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="ri-send-plane-fill text-xl"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Status Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <i className="ri-user-heart-line text-[#5A7BFF] mr-2"></i>
                나의 정체성
              </h3>

              {identityStatus ? (
                <div className="space-y-4">
                  {/* 인사이트 알림 */}
                  {identityStatus.recentInsight?.hasInsight && identityStatus.recentInsight?.insight && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 animate-pulse">
                      <div className="flex items-start">
                        <i className="ri-lightbulb-flash-line text-green-600 mr-2 mt-0.5"></i>
                        <div>
                          <div className="text-xs font-semibold text-green-800 mb-1">새로운 발견!</div>
                          <div className="text-xs text-green-700">{identityStatus.recentInsight.insight}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 현재 단계 */}
                  {identityStatus.currentStage && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <i className="ri-compass-3-line text-[#5A7BFF] mr-2"></i>
                          <span className="text-sm font-bold text-gray-800">{identityStatus.currentStage}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#5A7BFF]">{identityStatus.overallProgress}%</span>
                      </div>
                      {identityStatus.stageDescription && (
                        <p className="text-xs text-gray-600">{identityStatus.stageDescription}</p>
                      )}
                    </div>
                  )}

                  {/* 명확도 */}
                  {identityStatus.clarity != null && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-gray-700">정체성 명확도</span>
                        <span className="text-sm font-bold text-[#5A7BFF]">{identityStatus.clarity}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${identityStatus.clarity}%` }}
                        ></div>
                      </div>
                      {identityStatus.clarityReason && (
                        <p className="text-xs text-gray-600">{identityStatus.clarityReason}</p>
                      )}
                    </div>
                  )}

                  {/* 핵심 정체성 */}
                  {identityStatus.identityCore && identityStatus.identityCore !== '탐색 중...' && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4 border border-purple-100">
                      <div className="flex items-center mb-2">
                        <i className="ri-focus-3-line text-purple-600 mr-2"></i>
                        <span className="text-xs font-semibold text-gray-700">지금까지의 당신</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium mb-2">{identityStatus.identityCore}</p>
                      {identityStatus.confidence != null && identityStatus.confidence > 0 && (
                        <div className="flex items-center">
                          <span className="text-xs text-purple-600 font-semibold">확신도 {identityStatus.confidence}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 발견된 특징 */}
                  {identityStatus.traits && identityStatus.traits.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <i className="ri-eye-line text-gray-600 mr-1"></i>
                        발견된 특징
                      </h4>
                      <div className="space-y-2">
                        {identityStatus.traits.map((item, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-2 border border-gray-200"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-700">{item.trait}</span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">{item.category}</span>
                            </div>
                            {item.evidence && (
                              <p className="text-xs text-gray-600">"{item.evidence}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 인사이트 */}
                  {identityStatus.insights && identityStatus.insights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <i className="ri-lightbulb-line text-green-500 mr-1 text-xs"></i>
                        발견한 것들
                      </h4>
                      <div className="space-y-1">
                        {identityStatus.insights.map((insight, index) => (
                          <div key={index} className="text-xs text-gray-600 flex items-start">
                            <span className="text-green-500 mr-1 mt-0.5">•</span>
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 다음 탐색 영역 */}
                  {identityStatus.nextFocus && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-start">
                        <i className="ri-arrow-right-line text-blue-600 mr-2 mt-0.5"></i>
                        <div>
                          <div className="text-xs font-semibold text-blue-800 mb-1">다음 탐색</div>
                          <div className="text-xs text-blue-700">{identityStatus.nextFocus}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="ri-chat-smile-3-line text-4xl text-gray-300 mb-3"></i>
                  <p className="text-sm text-gray-500">
                    대화를 시작하면 나의 정체성이 여기에 표시됩니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
