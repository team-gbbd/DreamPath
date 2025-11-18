import { useEffect, useRef } from 'react';
import { StreamManager } from 'openvidu-browser';

interface VideoDisplayProps {
  streamManager: StreamManager;
  isMain: boolean;
}

export default function VideoDisplay({ streamManager, isMain }: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (streamManager && videoRef.current) {
      streamManager.addVideoElement(videoRef.current);
    }
  }, [streamManager]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
