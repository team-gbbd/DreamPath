import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '@/lib/api';
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
    iceTransportPolicy: 'all', // 'relay'가 아닌 'all' 사용
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

// 모던 라이트 테마 미팅 UI 컴포넌트
function ProfessionalMeetingUI({
  onLeave,
  onComplete,
  isMentor
}: {
  onLeave: () => void;
  onComplete: () => void;
  isMentor: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 비디오 트랙 가져오기
  const remoteCameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });

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
        // 화면 공유 중지
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        // 화면 공유 시작
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('화면 공유 오류:', error);
      alert('화면 공유를 시작할 수 없습니다.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 overflow-hidden flex">
      {/* 좌측 세로 네비게이션 바 */}
      <div className="w-20 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col items-center py-6 space-y-4 z-20">
        <button
          onClick={() => onLeave()}
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all shadow-md"
        >
          <i className="ri-arrow-left-line text-white text-xl"></i>
        </button>

        <div className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all">
          <i className="ri-layout-grid-line text-gray-600 text-xl"></i>
        </div>

        <div className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all">
          <i className="ri-group-line text-gray-600 text-xl"></i>
        </div>

        <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center cursor-pointer shadow-md">
          <i className="ri-vidicon-line text-white text-xl"></i>
        </div>

        <div className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all">
          <i className="ri-calendar-line text-gray-600 text-xl"></i>
        </div>

        <div className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all">
          <i className="ri-line-chart-line text-gray-600 text-xl"></i>
        </div>

        <div className="flex-1"></div>

        <div className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all">
          <i className="ri-settings-3-line text-gray-600 text-xl"></i>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 헤더 */}
        <div className="px-6 py-4 flex items-center justify-end">
          <div className="flex items-center space-x-3">
            <span className="text-gray-700 text-sm font-medium">{localParticipant.name || '나'}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
              <i className="ri-user-line text-white text-lg"></i>
            </div>
          </div>
        </div>

        {/* 비디오 영역과 우측 패널 */}
        <div className="flex-1 flex px-6 pb-6 space-x-4 overflow-hidden">
          {/* 메인 비디오 영역 */}
          <div className="flex-1 relative">
            {/* 타이머 */}
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-10">
              <i className="ri-time-line text-blue-500"></i>
              <span className="text-gray-700 text-sm font-medium">{formatTime(elapsedTime)}</span>
            </div>

            {/* 메인 원격 참가자 비디오 */}
            <div className="w-full h-full bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden relative">
              {remoteCameraTracks.length > 0 ? (
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
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <i className="ri-user-line text-5xl text-white"></i>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">참가자 대기 중...</p>
                  </div>
                </div>
              )}

              {/* 하단 컨트롤 버튼들 */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-3 rounded-full shadow-2xl">
                {/* 음소거 토글 */}
                <button
                  onClick={async () => {
                    if (room) {
                      await room.localParticipant.setMicrophoneEnabled(!isMicOn);
                      setIsMicOn(!isMicOn);
                    }
                  }}
                  className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isMicOn
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <i className={`${isMicOn ? 'ri-mic-line' : 'ri-mic-off-line'} text-2xl`}></i>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {isMicOn ? '음소거' : '음소거 해제'}
                  </div>
                </button>

                {/* 비디오 토글 */}
                <button
                  onClick={async () => {
                    if (room) {
                      await room.localParticipant.setCameraEnabled(!isCameraOn);
                      setIsCameraOn(!isCameraOn);
                    }
                  }}
                  className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCameraOn
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <i className={`${isCameraOn ? 'ri-vidicon-line' : 'ri-vidicon-off-line'} text-2xl`}></i>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {isCameraOn ? '비디오 끄기' : '비디오 켜기'}
                  </div>
                </button>

                {/* 화면 공유 */}
                <button
                  onClick={toggleScreenShare}
                  className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isScreenSharing
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <i className={`${isScreenSharing ? 'ri-stop-circle-line' : 'ri-computer-line'} text-2xl`}></i>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {isScreenSharing ? '공유 중지' : '화면 공유'}
                  </div>
                </button>

                {/* 구분선 */}
                <div className="w-px h-8 bg-gray-300 mx-1"></div>

                {/* 멘토링 완료 버튼 (멘토만 표시) */}
                {isMentor && (
                  <button
                    onClick={() => {
                      if (confirm('멘토링을 완료 처리하시겠습니까?\n완료 후 세션이 종료됩니다.')) {
                        onComplete();
                      }
                    }}
                    className="group relative w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
                  >
                    <i className="ri-checkbox-circle-line text-2xl"></i>
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      멘토링 완료
                    </div>
                  </button>
                )}

                {/* 나가기 (빨간색) */}
                <button
                  onClick={() => {
                    if (confirm('미팅을 종료하시겠습니까?')) {
                      onLeave();
                    }
                  }}
                  className="group relative w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
                >
                  <i className="ri-phone-line text-2xl"></i>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    나가기
                  </div>
                </button>
              </div>
            </div>

            {/* 우측 하단 로컬 참가자 PIP */}
            <div className="absolute bottom-24 right-4 w-64 h-48 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-pink-300 to-pink-200 z-10">
              {isCameraOn && localCameraTrack ? (
                <VideoTrack
                  trackRef={localCameraTrack}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-user-line text-5xl text-white"></i>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-white text-sm font-medium">나</span>
                {!isMicOn && (
                  <i className="ri-mic-off-fill text-red-400 text-sm ml-1"></i>
                )}
              </div>
            </div>
          </div>

          {/* 우측 채팅 패널 */}
          <div className="w-96 bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-gray-800 font-semibold text-lg flex items-center space-x-2">
                <i className="ri-chat-3-line text-blue-500"></i>
                <span>채팅</span>
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <i className="ri-group-line"></i>
                <span>{participants.length}명 참가 중</span>
              </div>
            </div>

            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <i className="ri-chat-smile-3-line text-4xl text-gray-300 mb-2"></i>
                    <p className="text-gray-400 text-sm">아직 메시지가 없습니다</p>
                    <p className="text-gray-400 text-xs mt-1">첫 메시지를 보내보세요!</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isMe = msg.sender === localParticipant.identity;
                    return (
                      <div key={msg.id} className={`flex items-start space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {/* 아바타 */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isMe ? 'bg-gradient-to-br from-pink-400 to-purple-400' : 'bg-gradient-to-br from-blue-400 to-indigo-400'
                        }`}>
                          <i className="ri-user-line text-white text-sm"></i>
                        </div>

                        {/* 메시지 버블 */}
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          <p className={`text-xs text-gray-500 mb-1 ${isMe ? 'text-right' : ''}`}>
                            {isMe ? '나' : msg.senderName}
                          </p>
                          <div className={`rounded-lg px-3 py-2 ${
                            isMe
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/80 text-gray-800'
                          }`}>
                            <p className="text-sm break-words">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
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
            <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
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
                className="flex-1 px-4 py-2 bg-white/80 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all shadow-md"
              >
                <i className="ri-send-plane-fill text-white"></i>
              </button>
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
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const userStr = localStorage.getItem('dreampath:user');
        if (!userStr) {
          alert('로그인이 필요합니다.');
          navigate('/login');
          return;
        }

        const user = JSON.parse(userStr);
        const userId = user.userId;

        // 사용자 역할 확인
        setIsMentor(user.role === 'MENTOR');

        // LiveKit 토큰 가져오기
        const tokenData = await bookingService.getLiveKitToken(
          Number(bookingId),
          userId
        );

        console.log('Received token:', tokenData);
        // 토큰이 문자열이면 그대로, 객체면 추출
        const actualToken = typeof tokenData === 'string' ? tokenData : tokenData.token || tokenData;
        console.log('Actual token to use:', actualToken);

        setToken(actualToken);
        setIsLoading(false);
      } catch (err: any) {
        console.error('토큰 로드 실패:', err);
        setError(err.response?.data || '미팅 입장 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    if (bookingId) {
      loadToken();
    }
  }, [bookingId, navigate]);

  const handleDisconnect = () => {
    console.log('LiveKit disconnected');
    // 사용자가 의도적으로 나가는지 확인
    const confirmLeave = confirm('미팅을 종료하시겠습니까?');
    if (confirmLeave) {
      navigate('/mentoring');
    }
  };

  const handleComplete = async () => {
    if (!bookingId) return;

    try {
      await bookingService.completeBooking(Number(bookingId));
      alert('멘토링이 완료 처리되었습니다.');
      navigate('/mypage/mentor');
    } catch (err: any) {
      console.error('멘토링 완료 처리 실패:', err);
      alert(err.response?.data || '멘토링 완료 처리에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-[#5A7BFF] animate-spin"></i>
          <p className="mt-4 text-gray-600">미팅 준비 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <i className="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">입장 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={LIVEKIT_URL}
        options={roomOptions}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        connect={true}
      >
        <ProfessionalMeetingUI
          onLeave={() => navigate('/mentoring')}
          onComplete={handleComplete}
          isMentor={isMentor}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
