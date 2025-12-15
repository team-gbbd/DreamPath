'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { chatService, API_BASE_URL } from '@/lib/api';
import { Send, BarChart3, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import IdentityPanel from './IdentityPanel';
import './ChatPage.css';

const ANALYSIS_UNLOCK_KEY = 'career_chat_analysis_completed';

interface ChatPageProps {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export default function ChatPage({ sessionId, setSessionId }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [identityStatus, setIdentityStatus] = useState<any>(null);
  const [stageChanged, setStageChanged] = useState(false);
  const [analysisUnlocked, setAnalysisUnlocked] = useState(false);
  const [personalityPromptDismissed, setPersonalityPromptDismissed] = useState(false);
  const [personalityTriggered, setPersonalityTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChat();
    checkExistingAnalysis();
  }, []);

  useEffect(() => {
    if (analysisUnlocked) {
      setPersonalityPromptDismissed(true);
      setPersonalityTriggered(false);
    }
  }, [analysisUnlocked]);

  const checkExistingAnalysis = async () => {
    try {
      const storedFlag = localStorage.getItem(ANALYSIS_UNLOCK_KEY);
      if (storedFlag === 'true') {
        setAnalysisUnlocked(true);
        return;
      }

      const user = JSON.parse(localStorage.getItem('dreampath:user') || '{}');
      if (!user?.userId) return;

      const response = await fetch(`${API_BASE_URL}/profiles/${user.userId}/analysis`, {
        credentials: 'include',
      });
      if (response.ok) {
        markAnalysisUnlocked();
      }
    } catch (error) {
      console.warn('기존 분석 확인 실패:', error);
    }
  };

  const markAnalysisUnlocked = () => {
    localStorage.setItem(ANALYSIS_UNLOCK_KEY, 'true');
    setAnalysisUnlocked(true);
    setPersonalityPromptDismissed(true);
    setPersonalityTriggered(false);
  };

  const initializeChat = async () => {
    try {
      setIsInitializing(true);
      const data = await chatService.startSession();
      setSessionId(data.sessionId);

      // 웰컴 메시지 추가
      setMessages([
        {
          role: 'assistant',
          message: data.message,
          timestamp: Date.now(),
        },
      ]);
    } catch (error: any) {
      console.error('세션 시작 실패:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        '연결에 문제가 발생했습니다.';
      setMessages([
        {
          role: 'assistant',
          message: `죄송합니다. ${errorMessage} 잠시 후 다시 시도해주세요.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !sessionId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      message: inputMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(sessionId, inputMessage);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: response.message,
          timestamp: response.timestamp,
        },
      ]);

      // 실시간 정체성 상태 업데이트
      if (response.identityStatus) {
        setIdentityStatus(response.identityStatus);
      }

      // 단계 변경 알림
      if (response.stageChanged) {
        setStageChanged(true);
        setTimeout(() => setStageChanged(false), 1000);
      }
    } catch (error: any) {
      console.error('메시지 전송 실패:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        '응답을 생성하는 중 오류가 발생했습니다.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: `죄송합니다. ${errorMessage}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!analysisUnlocked && messages.length < 5) {
      alert('분석을 위해 더 많은 대화가 필요합니다.');
      return;
    }
    markAnalysisUnlocked();
    router.push(`/analysis?sessionId=${sessionId}`);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-page">
      <div className="chat-container chat-with-panel">
        <div className="chat-header">
          <div className="header-content">
            <h1>🎯 DreamPath</h1>
            <p>AI 진로 상담사와 함께하는 진로 탐색</p>
          </div>
          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={!sessionId || (!analysisUnlocked && messages.length < 5)}
            title={!sessionId ? '세션을 불러오는 중입니다' : (!analysisUnlocked && messages.length < 5 ? '더 많은 대화가 필요합니다' : '분석 결과 보기')}
          >
            <BarChart3 size={20} />
            분석하기
          </button>
        </div>

        <div className="messages-container">
          {isInitializing ? (
            <div className="loading-container">
              <Loader2 className="spinner-icon" />
              <p>AI 상담사를 준비하고 있습니다...</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  <div className="message-content">
                    <div className="message-text">{msg.message}</div>
                    <div className="message-time">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant-message">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form className="input-container" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading || isInitializing}
            className="message-input"
          />
          <button
            type="submit"
            disabled={isLoading || isInitializing || !inputMessage.trim()}
            className="send-button"
          >
            {isLoading ? (
              <Loader2 className="spinner-icon" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>
      <IdentityPanel identityStatus={identityStatus} stageChanged={stageChanged} />
    </div>
  );
}
