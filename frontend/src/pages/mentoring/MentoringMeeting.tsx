import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import {
  LiveKitRoom,
  VideoConference,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  AudioTrack,
  RoomAudioRenderer,
  TrackToggle,
  useRoomContext,
  useDataChannel,
} from '@livekit/components-react';
import { Track, RoomOptions, DataPacket_Kind } from 'livekit-client';
import '@livekit/components-styles';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

// WebRTC 연결 옵션 (OpenVidu/LiveKit 로컬 연결)
const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
  },
  rtcConfig: {
    iceTransportPolicy: 'all',
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  },
};

// 채팅 메시지 타입
interface ChatMessage {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  timestamp: number;
}

// 모던 미팅 UI 컴포넌트
function ProfessionalMeetingUI({
  onLeave,
  onComplete,
  isMentor,
  showToast,
  darkMode,
  theme,
}: {
  onLeave: () => void;
  onComplete: () => void;
  isMentor: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  darkMode: boolean;
  theme: any;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 비디오 트랙 가져오기
  const remoteCameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

  // 화면 공유 트랙 가져오기
  const screenShareTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  // 상대방의 화면 공유 트랙
  const remoteScreenShare = screenShareTracks.find(
    track => track.participant.identity !== localParticipant.identity
  );

  const localCameraTrack = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  }).find(track => track.participant.identity === localParticipant.identity);

  // LiveKit Data Channel로 채팅 메시지 수신
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  useDataChannel((payload) => {
    if (payload.topic === 'chat') {
      const messageData = JSON.parse(decoder.decode(payload.payload));
      setMessages((prev) => [...prev, messageData]);
    }
  });

  // 경과 시간 카운터
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 메시지가 추가될 때마다 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!messageInput.trim() || !room) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: localParticipant.identity,
      senderName: localParticipant.name || localParticipant.identity,
      message: messageInput,
      timestamp: Date.now(),
    };

    // 내 화면에도 메시지 추가
    setMessages((prev) => [...prev, message]);

    // 다른 참가자에게 전송
    const data = encoder.encode(JSON.stringify(message));
    room.localParticipant.publishData(data, {
      reliable: true,
      topic: 'chat',
    });

    setMessageInput('');
  };

  // 화면 공유 토글
  const toggleScreenShare = async () => {
    if (!room) return;

    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('화면 공유 오류:', error);
      showToast('화면 공유를 시작할 수 없습니다.', 'error');
    }
  };

  return (
    <div className={`relative w-full h-[calc(100vh-64px)] overflow-hidden flex ${darkMode ? 'bg-[#0B0D14]' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
        <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: darkMode
            ? "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)"
            : "linear-gradient(rgba(90,123,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90,123,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* 상단 헤더 */}
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          {/* 뒤로가기 */}
          <button
            onClick={() => onLeave()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] flex items-center justify-center"
          >
            <i className="ri-arrow-left-line text-white text-lg"></i>
          </button>

          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${theme.text}`}>{localParticipant.name || '나'}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] flex items-center justify-center">
              <i className="ri-user-line text-white text-lg"></i>
            </div>
          </div>
        </div>

        {/* 비디오 영역과 우측 패널 */}
        <div className="flex-1 flex px-3 md:px-6 pb-3 md:pb-6 space-x-0 md:space-x-4 overflow-hidden">
          {/* 메인 비디오 영역 */}
          <div className="flex-1 relative">
            {/* 타이머 */}
            <div className={`absolute top-3 md:top-4 left-3 md:left-4 flex items-center space-x-2 ${darkMode ? 'bg-white/[0.1]' : 'bg-white/90'} backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-10`}>
              <i className="ri-time-line text-[#5A7BFF]"></i>
              <span className={`text-sm font-medium ${theme.text}`}>{formatTime(elapsedTime)}</span>
            </div>

            {/* 모바일 채팅 토글 버튼 */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`md:hidden absolute top-3 right-3 z-10 w-10 h-10 rounded-lg ${darkMode ? 'bg-white/[0.1]' : 'bg-white/90'} backdrop-blur-sm flex items-center justify-center shadow-md`}
            >
              <i className={`ri-chat-3-line text-lg ${showChat ? 'text-[#5A7BFF]' : theme.textMuted}`}></i>
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              )}
            </button>

            {/* 메인 원격 참가자 비디오 */}
            <div className={`w-full h-full ${darkMode ? 'bg-white/[0.03]' : 'bg-white/60'} backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden relative`}>
              {remoteScreenShare ? (
                <div className="w-full h-full relative">
                  <VideoTrack
                    trackRef={remoteScreenShare}
                    className="w-full h-full object-contain bg-gray-900"
                  />
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] px-3 py-1.5 rounded-lg flex items-center space-x-2">
                    <i className="ri-computer-line text-white"></i>
                    <span className="text-white text-sm font-medium">화면 공유 중</span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-white text-sm font-medium">{remoteScreenShare.participant.name || remoteScreenShare.participant.identity}</span>
                  </div>
                </div>
              ) : remoteCameraTracks.length > 0 ? (
                remoteCameraTracks
                  .filter(track => track.participant.identity !== localParticipant.identity)
                  .slice(0, 1)
                  .map((track) => (
                    <div key={track.participant.identity} className="w-full h-full relative">
                      <VideoTrack
                        trackRef={track}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-white text-sm font-medium">{track.participant.name || track.participant.identity}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <i className="ri-user-line text-4xl md:text-5xl text-white"></i>
                    </div>
                    <p className={`text-base md:text-lg font-medium ${theme.textMuted}`}>참가자 대기 중...</p>
                  </div>
                </div>
              )}

              {/* 하단 컨트롤 버튼들 */}
              <div className={`absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-1 md:space-x-2 ${darkMode ? 'bg-white/[0.1]' : 'bg-white/90'} backdrop-blur-md px-3 md:px-4 py-2 md:py-3 rounded-full shadow-2xl`}>
                {/* 음소거 토글 */}
                <button
                  onClick={async () => {
                    if (room) {
                      await room.localParticipant.setMicrophoneEnabled(!isMicOn);
                      setIsMicOn(!isMicOn);
                    }
                  }}
                  className={`group relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isMicOn
                      ? darkMode ? 'bg-white/[0.1] hover:bg-white/[0.2] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <i className={`${isMicOn ? 'ri-mic-line' : 'ri-mic-off-line'} text-xl md:text-2xl`}></i>
                </button>

                {/* 비디오 토글 */}
                <button
                  onClick={async () => {
                    if (room) {
                      await room.localParticipant.setCameraEnabled(!isCameraOn);
                      setIsCameraOn(!isCameraOn);
                    }
                  }}
                  className={`group relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCameraOn
                      ? darkMode ? 'bg-white/[0.1] hover:bg-white/[0.2] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <i className={`${isCameraOn ? 'ri-vidicon-line' : 'ri-vidicon-off-line'} text-xl md:text-2xl`}></i>
                </button>

                {/* 화면 공유 - 데스크톱만 */}
                <button
                  onClick={toggleScreenShare}
                  className={`hidden md:flex group relative w-14 h-14 rounded-full items-center justify-center transition-all duration-200 ${
                    isScreenSharing
                      ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white'
                      : darkMode ? 'bg-white/[0.1] hover:bg-white/[0.2] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <i className={`${isScreenSharing ? 'ri-stop-circle-line' : 'ri-computer-line'} text-2xl`}></i>
                </button>

                {/* 구분선 */}
                <div className={`w-px h-6 md:h-8 ${darkMode ? 'bg-white/20' : 'bg-gray-300'} mx-1`}></div>

                {/* 멘토링 완료 버튼 (멘토만 표시) */}
                {isMentor && (
                  <button
                    onClick={() => {
                      if (confirm('멘토링을 완료 처리하시겠습니까?\n완료 후 세션이 종료됩니다.')) {
                        onComplete();
                      }
                    }}
                    className="group relative w-11 h-11 md:w-14 md:h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
                  >
                    <i className="ri-checkbox-circle-line text-xl md:text-2xl"></i>
                  </button>
                )}

                {/* 나가기 */}
                <button
                  onClick={() => {
                    if (confirm('미팅을 종료하시겠습니까?')) {
                      onLeave();
                    }
                  }}
                  className="group relative w-11 h-11 md:w-14 md:h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
                >
                  <i className="ri-phone-line text-xl md:text-2xl"></i>
                </button>
              </div>
            </div>

            {/* 우측 하단 로컬 참가자 PIP */}
            <div className={`absolute bottom-20 md:bottom-24 right-3 md:right-4 w-32 h-24 md:w-64 md:h-48 rounded-xl overflow-hidden shadow-2xl z-10 ${darkMode ? 'bg-gradient-to-br from-[#5A7BFF]/30 to-[#8F5CFF]/30' : 'bg-gradient-to-br from-[#5A7BFF]/30 to-[#8F5CFF]/30'}`}>
              {isCameraOn && localCameraTrack ? (
                <VideoTrack
                  trackRef={localCameraTrack}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-user-line text-3xl md:text-5xl text-white"></i>
                </div>
              )}
              <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 bg-black/70 px-2 md:px-3 py-1 md:py-1.5 rounded-lg flex items-center space-x-1 md:space-x-2">
                <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-green-500 rounded-full"></div>
                <span className="text-white text-xs md:text-sm font-medium">나</span>
                {!isMicOn && (
                  <i className="ri-mic-off-fill text-red-400 text-xs md:text-sm ml-1"></i>
                )}
              </div>
            </div>
          </div>

          {/* 우측 채팅 패널 - 데스크톱: 항상 표시, 모바일: 토글 */}
          <div className={`${showChat ? 'fixed inset-0 z-50 md:relative md:inset-auto' : 'hidden'} md:block md:w-80 lg:w-96`}>
            {/* 모바일 오버레이 배경 */}
            <div className={`md:hidden absolute inset-0 bg-black/50 ${showChat ? '' : 'hidden'}`} onClick={() => setShowChat(false)} />

            <div className={`${showChat ? 'absolute bottom-0 left-0 right-0 h-[70vh] md:h-auto md:relative' : ''} ${darkMode ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/60 border-white/20'} backdrop-blur-sm rounded-t-2xl md:rounded-2xl shadow-xl p-4 flex flex-col md:h-full border md:border-0`}>
              <div className={`flex items-center justify-between mb-4 pb-3 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-lg flex items-center space-x-2 ${theme.text}`}>
                  <i className="ri-chat-3-line text-[#5A7BFF]"></i>
                  <span>채팅</span>
                </h3>
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-2 text-xs ${theme.textMuted}`}>
                    <i className="ri-group-line"></i>
                    <span>{participants.length}명</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="md:hidden">
                    <i className={`ri-close-line text-xl ${theme.textMuted}`}></i>
                  </button>
                </div>
              </div>

              {/* 채팅 메시지 영역 */}
              <div
                className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: darkMode ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.15) transparent',
                }}
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <i className={`ri-chat-smile-3-line text-4xl ${darkMode ? 'text-white/20' : 'text-gray-300'} mb-2`}></i>
                      <p className={`text-sm ${theme.textMuted}`}>아직 메시지가 없습니다</p>
                      <p className={`text-xs mt-1 ${theme.textSubtle}`}>첫 메시지를 보내보세요!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMe = msg.sender === localParticipant.identity;
                      return (
                        <div key={msg.id} className={`flex items-start space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isMe ? 'bg-gradient-to-br from-[#5A7BFF] to-[#8F5CFF]' : 'bg-gradient-to-br from-emerald-400 to-teal-400'
                          }`}>
                            <i className="ri-user-line text-white text-sm"></i>
                          </div>

                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            <p className={`text-xs mb-1 ${isMe ? 'text-right' : ''} ${theme.textMuted}`}>
                              {isMe ? '나' : msg.senderName}
                            </p>
                            <div className={`rounded-lg px-3 py-2 ${
                              isMe
                                ? 'bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white'
                                : darkMode ? 'bg-white/[0.1] text-white' : 'bg-white/80 text-gray-800'
                            }`}>
                              <p className="text-sm break-words">{msg.message}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : theme.textSubtle}`}>
                                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 하단 메시지 입력 */}
              <div className={`flex items-center space-x-2 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="메시지를 입력하세요..."
                  className={`flex-1 px-4 py-2 ${darkMode ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30' : 'bg-white/80 border-gray-200 text-gray-800 placeholder-gray-400'} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7BFF]/50`}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all shadow-md"
                >
                  <i className="ri-send-plane-fill text-white"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MentoringMeetingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isMentor, setIsMentor] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Theme 객체
  const theme = {
    text: darkMode ? "text-white" : "text-slate-900",
    textMuted: darkMode ? "text-white/60" : "text-slate-600",
    textSubtle: darkMode ? "text-white/40" : "text-slate-500",
    card: darkMode
      ? "bg-white/[0.03] border-white/[0.08]"
      : "bg-white border-slate-200 shadow-sm",
  };

  useEffect(() => {
    // 테마 로드
    const savedTheme = localStorage.getItem('dreampath:theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }

    // 테마 변경 이벤트 리스너
    const handleThemeChange = () => {
      const theme = localStorage.getItem('dreampath:theme');
      setDarkMode(theme === 'dark');
    };

    window.addEventListener('dreampath-theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('dreampath-theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const userStr = localStorage.getItem('dreampath:user');
        if (!userStr) {
          showToast('로그인이 필요합니다.', 'warning');
          navigate('/login');
          return;
        }

        const user = JSON.parse(userStr);
        const userId = user.userId;

        setIsMentor(user.role === 'MENTOR');

        const tokenData = await bookingService.getLiveKitToken(
          Number(bookingId),
          userId
        );

        const actualToken = typeof tokenData === 'string' ? tokenData : tokenData.token || tokenData;

        setToken(actualToken);
        setIsLoading(false);
      } catch (err) {
        console.error('토큰 로드 실패:', err);
        const apiError = err as { response?: { data?: string } };
        setError(apiError.response?.data || '미팅 입장 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    if (bookingId) {
      loadToken();
    }
  }, [bookingId, navigate]);

  const handleDisconnect = () => {
    navigate('/mentoring');
  };

  const handleComplete = async () => {
    if (!bookingId) return;

    try {
      await bookingService.completeBooking(Number(bookingId));
      showToast('멘토링이 완료 처리되었습니다.', 'success');
      navigate('/profile/dashboard');
    } catch (err) {
      console.error('멘토링 완료 처리 실패:', err);
      const apiError = err as { response?: { data?: string } };
      showToast(apiError.response?.data || '멘토링 완료 처리에 실패했습니다.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0B0D14]' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'}`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
        </div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-[#5A7BFF]/30 border-t-[#5A7BFF] rounded-full animate-spin mx-auto"></div>
          <p className={`mt-4 ${theme.textMuted}`}>미팅 준비 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${darkMode ? 'bg-[#0B0D14]' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'}`}>
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${darkMode ? "bg-[#5A7BFF]/10" : "bg-[#5A7BFF]/20"}`} />
          <div className={`absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] ${darkMode ? "bg-[#8F5CFF]/10" : "bg-[#8F5CFF]/20"}`} />
        </div>
        <div className={`text-center rounded-2xl shadow-xl p-6 md:p-8 max-w-md relative z-10 ${darkMode ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white'}`}>
          <i className="ri-error-warning-line text-5xl md:text-6xl text-red-500 mb-4"></i>
          <h2 className={`text-xl md:text-2xl font-bold mb-4 ${theme.text}`}>입장 실패</h2>
          <p className={`mb-6 ${theme.textMuted}`}>{error}</p>
          <button
            onClick={() => navigate('/mentoring')}
            className="px-6 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            멘토링 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[calc(100vh-64px)] overflow-hidden ${darkMode ? 'bg-[#0B0D14]' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'}`}>
      <ToastContainer />
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={LIVEKIT_URL}
        options={roomOptions}
        data-lk-theme="default"
        style={{ height: '100%' }}
        connect={true}
      >
        <ProfessionalMeetingUI
          onLeave={() => navigate('/mentoring')}
          onComplete={handleComplete}
          isMentor={isMentor}
          showToast={showToast}
          darkMode={darkMode}
          theme={theme}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}