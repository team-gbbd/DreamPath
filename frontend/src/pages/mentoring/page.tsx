import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Room {
  name: string;
  sid: string;
  numParticipants: number;
  maxParticipants: number;
  creationTime: number;
}

interface User {
  name: string;
  email?: string;
}

const API_BASE_URL = 'http://localhost:8080';

export default function MentoringPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 로그인 체크
  useEffect(() => {
    const stored = localStorage.getItem('dreampath:user');
    if (!stored) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    setCurrentUser(JSON.parse(stored));
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchRooms();
      // 5초마다 방 목록 갱신
      const interval = setInterval(fetchRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/video/rooms`);
      // 참가자가 있는 방만 표시 (빈 방 필터링)
      const activeRooms = response.data.filter((room: Room) => room.numParticipants > 0);
      setRooms(activeRooms);
    } catch (error) {
      console.error('방 목록 조회 실패:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName) {
      alert('방 이름을 입력하세요.');
      return;
    }

    if (!currentUser) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // 토큰을 요청하면 자동으로 방이 생성됨
      // 방 이름에 생성자 이름을 포함 (예: "React 멘토링 - 홍길동")
      const roomNameWithCreator = `${newRoomName} - ${currentUser.name}`;
      navigate(`/mentoring/room?room=${encodeURIComponent(roomNameWithCreator)}&name=${encodeURIComponent(currentUser.name)}`);
    } catch (error) {
      console.error('방 생성 실패:', error);
      alert('방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = (roomName: string) => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    navigate(`/mentoring/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(currentUser.name)}`);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                <i className="ri-video-chat-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">멘토링 화상통화</h1>
                <p className="text-sm text-gray-500">멘토와 실시간으로 소통하세요</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
            >
              <i className="ri-add-line text-xl"></i>
              <span>방 생성하기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Room List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">현재 진행 중인 멘토링</h2>
          <p className="text-gray-600">참여하고 싶은 멘토링 세션을 선택하세요</p>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-video-off-line text-gray-400 text-4xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">진행 중인 멘토링이 없습니다</h3>
            <p className="text-gray-500 mb-6">새로운 멘토링 세션을 시작해보세요!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              방 생성하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.sid}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] rounded-lg flex items-center justify-center">
                      <i className="ri-live-line text-white text-2xl"></i>
                    </div>
                    <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 text-sm font-medium">LIVE</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{room.name}</h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600">
                      <i className="ri-user-line mr-2"></i>
                      <span>참가자: {room.numParticipants}명</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <i className="ri-time-line mr-2"></i>
                      <span>시작: {formatTime(room.creationTime)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => joinRoom(room.name)}
                    className="w-full py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    참가하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchRooms}
            className="text-gray-600 hover:text-[#5A7BFF] transition-colors flex items-center space-x-2 mx-auto"
          >
            <i className="ri-refresh-line"></i>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">새 멘토링 방 생성</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">방 이름</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7BFF] focus:border-transparent"
                  placeholder="예: React 기초 멘토링"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <i className="ri-user-line mr-2"></i>
                  참가자 이름: <span className="font-semibold">{currentUser?.name}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={createRoom}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-[#5A7BFF] to-[#8F5CFF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
