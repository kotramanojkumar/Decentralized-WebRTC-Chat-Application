import { useEffect, useRef } from 'react';

export default function VideoPlayer({ stream, isLocal = false, muted = false }: { stream: MediaStream | null, isLocal?: boolean, muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-500 rounded-lg">No Video</div>;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal || muted}
      className={`w-full h-full object-cover rounded-lg ${isLocal ? 'transform -scale-x-100' : ''}`}
    />
  );
}
