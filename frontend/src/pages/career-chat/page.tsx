import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SurveyModal from '../../components/profile/SurveyModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

export default function CareerChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 로그인한 사용자 정보 가져오기 및 세션 초기화
  useEffect(() => {
    const userStr = localStorage.getItem('dreampath:user');
    let currentUserId: string | null = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        currentUserId = user.id?.toString() || user.userId?.toString() || null;
        setUserId(currentUserId);
        console.log('로그인 사용자 ID:', currentUserId);
      } catch (e) {
        console.warn('사용자 정보 파싱 실패');
      }
    }
    // userId 설정 후 세션 초기화
    initializeSession(currentUserId);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async (currentUserId: string | null = null) => {
    // localStorage에서 기존 세션 ID 확인
    const savedSessionId = localStorage.getItem('career_chat_session_id');
    
    if (savedSessionId) {
      // 기존 세션이 있으면 대화 이력 불러오기
      try {
        const response = await fetch(`http://localhost:8080/api/chat/history/${savedSessionId}`);
        if (response.ok) {
          const history = await response.json();
          if (history && history.length > 0) {
            setSessionId(savedSessionId);
            setMessages(history.map((msg: any) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.message,
              timestamp: new Date(msg.timestamp),
            })));
            console.log('기존 세션 복원:', savedSessionId, '메시지 수:', history.length);
            
            // 마지막 정체성 상태 복원
            // 1. 먼저 localStorage에서 시도
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
            
            // 2. 백엔드에서 다시 계산해서 가져오기
            try {
              console.log('백엔드에서 정체성 상태 조회 시도:', savedSessionId);
              const identityResponse = await fetch(`http://localhost:8080/api/identity/${savedSessionId}`);
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
            return;
          }
        }
      } catch (error) {
        console.log('세션 복원 실패, 새 세션 시작:', error);
      }
    }
    
    // 새 세션 시작
    await startNewSession(currentUserId);
  };

  const startNewSession = async (currentUserId: string | null = null) => {
    const userIdToUse = currentUserId || userId;
    try {
      const response = await fetch('http://localhost:8080/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToUse,
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
      console.error('세션 시작 실패:', error);
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

    try {
      const response = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: inputMessage,
          userId: userId,
        }),
      });

      const data = await response.json();
      
      console.log('백엔드 응답:', data);
      console.log('정체성 상태:', data.identityStatus);
      
      const assistantMessage: Message = {
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
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage: Message = {
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

  const handleAnalyze = () => {
    if (!sessionId) return;
    navigate('/profile/input');
  };

  const handleNewChat = () => {
    // 현재 세션 종료하고 새 세션 시작
    localStorage.removeItem('career_chat_session_id');
    localStorage.removeItem('career_chat_identity');
    setMessages([]);
    setSessionId(null);
    setIdentityStatus(null);
    setShowSurvey(false);
    setSurveyQuestions([]);
    startNewSession();
  };

  const handleSurveyComplete = () => {
    setShowSurvey(false);
    // 설문조사 완료 후 환영 메시지 업데이트
    setMessages(prev => [...prev, {
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

              {/* 대화 진행률 표시 (8턴 기준) */}
              <div className="hidden md:flex items-center space-x-3 ml-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">분석 정확도</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((turn) => {
                      const userMessageCount = messages.filter(m => m.role === 'user').length;
                      const isCompleted = userMessageCount >= turn;
                      return (
                        <div
                          key={turn}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF]'
                              : 'bg-gray-200'
                          }`}
                          title={`${turn}번째 대화`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {Math.min(messages.filter(m => m.role === 'user').length, 8)}/8
                  </span>
                </div>
                {messages.filter(m => m.role === 'user').length < 8 && (
                  <span className="text-xs text-orange-500 font-medium">
                    {8 - messages.filter(m => m.role === 'user').length}회 더 대화 필요
                  </span>
                )}
                {messages.filter(m => m.role === 'user').length >= 8 && (
                  <span className="text-xs text-green-500 font-medium flex items-center">
                    <i className="ri-checkbox-circle-fill mr-1"></i>
                    정확한 분석 가능
                  </span>
                )}
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
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
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
                {messages.length >= 6 && (
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
