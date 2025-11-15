import { useState, useEffect, useRef } from 'react';
import { OpenVidu, Session, Publisher, StreamManager, Subscriber } from 'openvidu-browser';
import VideoControls from './components/VideoControls';
import ChatPanel from './components/ChatPanel';
import VideoDisplay from './components/VideoDisplay';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

export default function VideoInterviewPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const OVRef = useRef<OpenVidu | null>(null);

  useEffect(() => {
    initializeSession();
    return () => {
      leaveSession();
    };
  }, []);

  const initializeSession = async () => {
    try {
      const OV = new OpenVidu();
      OVRef.current = OV;

      const newSession = OV.initSession();
      setSession(newSession);

      // 상대방 스트림 수신 이벤트
      newSession.on('streamCreated', (event) => {
        const newSubscriber = newSession.subscribe(event.stream, undefined);
        setSubscriber(newSubscriber);
      });

      // 상대방 퇴장 이벤트
      newSession.on('streamDestroyed', () => {
        setSubscriber(null);
      });

      // 채팅 메시지 수신
      newSession.on('signal:chat', (event: any) => {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: data.sender,
          text: data.message,
          timestamp: new Date()
        }]);
      });

      // 데모용 토큰 (실제로는 서버에서 받아와야 함)
      const token = await getToken();
      
      await newSession.connect(token, { clientData: '면접자' });

      // 내 비디오 스트림 생성
      const newPublisher = await OV.initPublisherAsync(undefined, {
        audioSource: undefined,
        videoSource: undefined,
        publishAudio: true,
        publishVideo: true,
        resolution: '640x480',
        frameRate: 30,
        insertMode: 'APPEND',
        mirror: true
      });

      newSession.publish(newPublisher);
      setPublisher(newPublisher);
      setIsConnected(true);

    } catch (error) {
      console.error('세션 초기화 실패:', error);
    }
  };

  const getToken = async (): Promise<string> => {
    // 실제 환경에서는 백엔드 API를 통해 토큰을 받아와야 합니다
    // 데모용으로 임시 토큰 반환
    return 'demo-token-' + Math.random().toString(36).substring(7);
  };

  const toggleAudio = () => {
    if (publisher) {
      publisher.publishAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (publisher) {
      publisher.publishVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const sendMessage = (text: string) => {
    if (session && text.trim()) {
      const messageData = {
        sender: '나',
        message: text
      };
      
      session.signal({
        data: JSON.stringify(messageData),
        type: 'chat'
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: '나',
        text: text,
        timestamp: new Date()
      }]);
    }
  };

  const leaveSession = () => {
    if (session) {
      session.disconnect();
    }
    setSession(null);
    setPublisher(null);
    setSubscriber(null);
    setIsConnected(false);
    
    // 홈으로 이동
    if (window.REACT_APP_NAVIGATE) {
      window.REACT_APP_NAVIGATE('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-video-chat-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">화상 면접</h1>
                <p className="text-sm text-gray-400">
                  {isConnected ? '연결됨' : '연결 중...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">면접 진행 중</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Video Area */}
          <div className="lg:col-span-3 flex flex-col space-y-4">
            {/* 상대방 화면 (큰 화면) */}
            <div className="flex-1 bg-gray-800 rounded-2xl overflow-hidden relative shadow-2xl">
              {subscriber ? (
                <VideoDisplay streamManager={subscriber} isMain={true} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center mb-6">
                    <i className="ri-user-line text-white text-6xl"></i>
                  </div>
                  <p className="text-gray-400 text-lg">면접관이 입장하기를 기다리는 중...</p>
                  <div className="flex space-x-2 mt-4">
                    <div className="w-3 h-3 bg-[#5A7BFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-[#7B6CFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-[#8F5CFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              
              {/* 내 화면 (작은 화면 - PIP) */}
              <div className="absolute bottom-6 right-6 w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700">
                {publisher ? (
                  <VideoDisplay streamManager={publisher} isMain={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="ri-user-line text-gray-600 text-4xl"></i>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  나
                </div>
              </div>
            </div>

            {/* Controls */}
            <VideoControls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onLeave={leaveSession}
            />
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <ChatPanel messages={messages} onSendMessage={sendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
