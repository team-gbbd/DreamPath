import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatService } from '../../services/dw/api'
import { Send, BarChart3, Loader2 } from 'lucide-react'
import './ChatPage.css'

const ChatPage = ({ sessionId, setSessionId }) => {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    initializeChat()
  }, [])

  const initializeChat = async () => {
    try {
      setIsInitializing(true)
      const data = await chatService.startSession()
      setSessionId(data.sessionId)
      
      // 웰컴 메시지 추가
      setMessages([
        {
          role: 'assistant',
          message: data.message,
          timestamp: Date.now(),
        },
      ])
    } catch (error) {
      console.error('세션 시작 실패:', error)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '연결에 문제가 발생했습니다.'
      setMessages([
        {
          role: 'assistant',
          message: `죄송합니다. ${errorMessage} 잠시 후 다시 시도해주세요.`,
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsInitializing(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      message: inputMessage,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(sessionId, inputMessage)
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: response.message,
          timestamp: response.timestamp,
        },
      ])
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '응답을 생성하는 중 오류가 발생했습니다.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: `죄송합니다. ${errorMessage}`,
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = () => {
    if (messages.length < 5) {
      alert('분석을 위해 더 많은 대화가 필요합니다.')
      return
    }
    navigate('/analysis')
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-content">
            <h1>🎯 DreamPath</h1>
            <p>AI 진로 상담사와 함께하는 진로 탐색</p>
          </div>
          <button 
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={messages.length < 5}
            title={messages.length < 5 ? '더 많은 대화가 필요합니다' : '분석 결과 보기'}
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
    </div>
  )
}

export default ChatPage

