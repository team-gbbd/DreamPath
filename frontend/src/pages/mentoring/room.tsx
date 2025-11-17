import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Room,
  RoomEvent,
  VideoPresets,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalTrackPublication,
  Track,
  LogLevel,
  setLogLevel,
  Participant,
} from 'livekit-client';
import VideoControls from './components/VideoControls';
import ChatPanel from './components/ChatPanel';
import axios from 'axios';

// LiveKit 디버그 로깅 활성화
setLogLevel(LogLevel.debug);

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

const API_BASE_URL = 'http://localhost:8080';

export default function VideoInterviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [participantName, setParticipantName] = useState(searchParams.get('name') || '');
  const [roomName, setRoomName] = useState(searchParams.get('room') || '');
  const [showJoinForm, setShowJoinForm] = useState(!searchParams.get('room') || !searchParams.get('name'));
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
    }
  }, [localVideoTrack, isVideoEnabled]); // isVideoEnabled 추가 - 비디오 켜기/끄기 시 재마운트

  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoTrack) {
      // LiveKit의 attach() 메서드 사용 - adaptive streaming이 제대로 작동하도록
      remoteVideoTrack.attach(remoteVideoRef.current);
      console.log('원격 비디오 트랙 attach 완료');

      return () => {
        if (remoteVideoRef.current) {
          remoteVideoTrack.detach(remoteVideoRef.current);
        }
      };
    }
  }, [remoteVideoTrack, showJoinForm]); // showJoinForm 추가 - DOM 마운트 타이밍 고려

  const joinRoom = async () => {
    if (!roomName || !participantName) {
      alert('방 이름과 참가자 이름을 입력하세요.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/video/token`, {
        roomName,
        participantName,
      });

      const { token, livekitUrl } = response.data;

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      setupRoomEventListeners(newRoom);

      // LiveKit WebSocket URL (환경 변수 또는 기본값 사용)
      const wsUrl = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';
      console.log('Connecting to LiveKit server:', wsUrl);

      await newRoom.connect(wsUrl, token, {
        autoSubscribe: true,
        peerConnectionTimeout: 60000, // 60초 타임아웃으로 증가
      });

      console.log('Connected to room, enabling camera and microphone...');
      await newRoom.localParticipant.enableCameraAndMicrophone();

      const localVideoPublication = newRoom.localParticipant.getTrackPublication(Track.Source.Camera);
      if (localVideoPublication?.track) {
        setLocalVideoTrack(localVideoPublication.track.mediaStreamTrack);
      }

      // 기존 참가자들의 비디오 트랙 확인
      console.log('현재 방 참가자 수:', newRoom.remoteParticipants.size);
      newRoom.remoteParticipants.forEach((participant) => {
        console.log('기존 참가자 발견:', participant.identity);
        participant.videoTrackPublications.forEach((publication) => {
          console.log('기존 참가자 비디오 publication:', publication.trackSid, 'subscribed:', publication.isSubscribed);
          if (publication.track) {
            console.log('기존 참가자 비디오 트랙 설정:', participant.identity);
            setRemoteVideoTrack(publication.track as RemoteTrack);
          } else if (publication.isSubscribed) {
            console.log('트랙이 구독되었지만 아직 로드되지 않음');
          }
        });
      });

      setRoom(newRoom);
      setIsConnected(true);
      setShowJoinForm(false);
    } catch (error) {
      console.error('방 참가 실패:', error);
      alert('방 참가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // URL 파라미터가 있으면 자동 입장
  useEffect(() => {
    const roomParam = searchParams.get('room');
    const nameParam = searchParams.get('name');
    if (roomParam && nameParam && !autoJoinAttempted.current && !isConnected) {
      autoJoinAttempted.current = true;
      joinRoom();
    }
  }, [roomName, participantName]);

  const setupRoomEventListeners = (newRoom: Room) => {
    newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('참가자 연결:', participant.identity);
      // 새 참가자가 연결되면 기존 트랙 확인
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track) {
          console.log('새 참가자의 기존 비디오 트랙 발견:', participant.identity);
          setRemoteVideoTrack(publication.track as RemoteTrack);
        }
      });
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('참가자 퇴장:', participant.identity);
      setRemoteVideoTrack(null);
    });

    newRoom.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('트랙 구독됨:', track?.kind, '참가자:', participant.identity);
        if (track && track.kind === Track.Kind.Video) {
          console.log('원격 비디오 트랙 설정:', track);
          setRemoteVideoTrack(track);
        }
      }
    );

    newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      console.log('트랙 구독 해제:', track?.kind);
      if (track && track.kind === Track.Kind.Video) {
        setRemoteVideoTrack(null);
      }
    });

    newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: participant?.identity || '알 수 없음',
          text: data.message,
          timestamp: new Date(),
        },
      ]);
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      setLocalVideoTrack(null);
      setRemoteVideoTrack(null);
    });

    // 로컬 트랙 발행 이벤트 - 카메라 껐다 켤 때 새 트랙으로 업데이트
    newRoom.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
      console.log('로컬 트랙 발행됨:', publication.source);
      if (publication.source === Track.Source.Camera && publication.track) {
        console.log('로컬 카메라 트랙 업데이트');
        setLocalVideoTrack(publication.track.mediaStreamTrack);
      }
    });

    // 로컬 트랙 해제 이벤트
    newRoom.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
      console.log('로컬 트랙 해제됨:', publication.source);
      if (publication.source === Track.Source.Camera) {
        setLocalVideoTrack(null);
      }
    });

    // 음성 활동 감지 (디스코드 스타일 초록색 테두리)
    newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const localSpeaking = speakers.some(
        (speaker) => speaker.identity === newRoom.localParticipant.identity
      );
      const remoteSpeaking = speakers.some(
        (speaker) => speaker.identity !== newRoom.localParticipant.identity
      );
      setIsLocalSpeaking(localSpeaking);
      setIsRemoteSpeaking(remoteSpeaking);
    });
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.setMicrophoneEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = async () => {
    if (room) {
      const newEnabled = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newEnabled);
      setIsVideoEnabled(newEnabled);

      // 카메라를 켤 때 새 트랙 가져오기
      if (newEnabled) {
        const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (videoPublication?.track) {
          console.log('비디오 켜짐 - 새 트랙 설정');
          setLocalVideoTrack(videoPublication.track.mediaStreamTrack);
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (room && text.trim()) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ message: text }));
      await room.localParticipant.publishData(data);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: '나',
          text: text,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const leaveSession = () => {
    if (room) {
      room.disconnect();
    }
    setRoom(null);
    setLocalVideoTrack(null);
    setRemoteVideoTrack(null);
    setIsConnected(false);
    setShowJoinForm(true);
    // 멘토링 로비로 리다이렉트
    navigate('/mentoring');
  };

  if (showJoinForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
              <i className="ri-video-chat-line text-white text-xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-white">화상 면접 참가</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">방 이름</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                placeholder="예: interview-room-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">참가자 이름</label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                placeholder="예: 홍길동"
              />
            </div>

            <button
              onClick={joinRoom}
              className="w-full py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <i className="ri-video-chat-line text-white text-xl"></i>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">화상 면접</h1>
                <p className="text-sm text-gray-400">{isConnected ? `연결됨 - ${roomName}` : '연결 중...'}</p>
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

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          <div className="lg:col-span-3 flex flex-col space-y-4">
            <div className={`flex-1 bg-gray-800 rounded-2xl overflow-hidden relative shadow-2xl transition-all duration-200 ${isRemoteSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : ''}`}>
              {remoteVideoTrack ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
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

              <div className={`absolute bottom-6 right-6 w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-200 ${isLocalSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : 'border-2 border-gray-700'}`}>
                {/* 비디오 엘리먼트는 항상 유지, 숨기기만 함 */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <i className="ri-camera-off-line text-gray-500 text-3xl"></i>
                      <p className="text-gray-500 text-xs mt-2">카메라 꺼짐</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center space-x-1">
                  {isLocalSpeaking && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                  <span>{participantName || '나'}</span>
                </div>
              </div>
            </div>

            <VideoControls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onLeave={leaveSession}
            />
          </div>

          <div className="lg:col-span-1">
            <ChatPanel messages={messages} onSendMessage={sendMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
