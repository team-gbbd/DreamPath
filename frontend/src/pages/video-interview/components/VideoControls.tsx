interface VideoControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

export default function VideoControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave
}: VideoControlsProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-center space-x-4">
        {/* 마이크 토글 */}
        <button
          onClick={onToggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isAudioEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isAudioEnabled ? '마이크 끄기' : '마이크 켜기'}
        >
          <i className={`${isAudioEnabled ? 'ri-mic-line' : 'ri-mic-off-line'} text-2xl`}></i>
        </button>

        {/* 비디오 토글 */}
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isVideoEnabled ? '비디오 끄기' : '비디오 켜기'}
        >
          <i className={`${isVideoEnabled ? 'ri-vidicon-line' : 'ri-vidicon-off-line'} text-2xl`}></i>
        </button>

        {/* 화면 공유 */}
        <button
          className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
          title="화면 공유"
        >
          <i className="ri-screen-share-line text-2xl"></i>
        </button>

        {/* 설정 */}
        <button
          className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
          title="설정"
        >
          <i className="ri-settings-3-line text-2xl"></i>
        </button>

        {/* 종료 버튼 */}
        <button
          onClick={onLeave}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 cursor-pointer ml-8"
          title="면접 종료"
        >
          <i className="ri-phone-line text-2xl"></i>
        </button>
      </div>

      {/* 추가 정보 */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-400">
        <div className="flex items-center space-x-2">
          <i className="ri-time-line"></i>
          <span>00:00:00</span>
        </div>
        <div className="flex items-center space-x-2">
          <i className="ri-signal-wifi-line"></i>
          <span>연결 상태: 양호</span>
        </div>
      </div>
    </div>
  );
}
