import { useState, useRef, useEffect } from 'react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMe?: boolean;
}

export default function VoiceMessagePlayer({ audioUrl, duration = 0, isMe = false }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const downloadVoiceNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `VoiceNote_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`p-2.5 rounded-2xl flex items-center gap-3 w-full max-w-[280px] sm:max-w-[320px] shadow-sm select-none transition-all ${
      isMe
        ? 'bg-[#005c4b] text-white'
        : 'bg-[#202c33] text-neutral-200'
    }`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play / Pause Pill Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
        title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Animated Audio Waveform Bars */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="flex items-center gap-0.5 sm:gap-1 h-6 overflow-hidden">
          {[40, 75, 55, 90, 30, 85, 60, 100, 45, 70, 95, 50, 80, 65, 88, 42, 68].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, (h * (0.6 + Math.random() * 0.4)))}%` : `${h}%`,
              }}
            />
          ))}
        </div>

        {/* Duration & Time Stamp */}
        <div className="flex justify-between items-center text-[10px] opacity-80 font-mono">
          <span>{formatSec(isPlaying ? currentTime : totalDuration)}</span>
          <span className="text-[9px] uppercase tracking-wider">Voice Note</span>
        </div>
      </div>

      {/* Save to Computer Download Icon */}
      <button
        type="button"
        onClick={downloadVoiceNote}
        className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer shrink-0"
        title="Save voice note locally on computer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </div>
  );
}
