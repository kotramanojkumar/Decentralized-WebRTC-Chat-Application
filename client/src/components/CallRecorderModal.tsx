import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CallRecorderModalProps {
  recordedBlob: Blob | null;
  recordingType: 'video' | 'audio';
  durationSeconds: number;
  onClose: () => void;
}

export default function CallRecorderModal({
  recordedBlob,
  recordingType,
  durationSeconds,
  onClose,
}: CallRecorderModalProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    setBlobUrl(url);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const defaultName = recordingType === 'video'
      ? `P2PConnect_Meeting_${dateStr}_${timeStr}.webm`
      : `P2PConnect_AudioCall_${dateStr}_${timeStr}.webm`;
    setFileName(defaultName);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recordedBlob, recordingType]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || (recordingType === 'video' ? 'call_recording.webm' : 'audio_call.webm');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const fileSizeMB = recordedBlob ? (recordedBlob.size / (1024 * 1024)).toFixed(2) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl rounded-[32px] bg-[#0c142c] border border-blue-500/30 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-white relative overflow-hidden"
      >
        {/* Glow Halo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">
              {recordingType === 'video' ? '📹' : '🎙️'}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                {recordingType === 'video' ? 'Video Call Recording Ready' : 'Audio Call Recording Ready'}
              </h3>
              <p className="text-xs text-neutral-400">
                Duration: {formatDuration(durationSeconds)} • Size: {fileSizeMB} MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="mb-5 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center min-h-[220px] max-h-[340px]">
          {recordingType === 'video' ? (
            <video
              ref={videoRef}
              src={blobUrl}
              controls
              className="w-full max-h-[340px] object-contain rounded-2xl"
              autoPlay={false}
            />
          ) : (
            <div className="p-8 w-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl animate-pulse">
                🎙️
              </div>
              <audio ref={audioRef} src={blobUrl} controls className="w-full max-w-md" />
            </div>
          )}
        </div>

        {/* File Save Customization */}
        <div className="mb-6 space-y-2">
          <label className="text-xs font-semibold text-neutral-300 block">
            File Name to Save
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="flex-1 bg-[#131d3d] border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full sm:flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm rounded-full shadow-[0_8px_20px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>💾</span>
            <span>Save Recording to Computer</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-6 rounded-full bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            Discard & Close
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-3 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
            <span>✅</span>
            <span>Downloaded! You can find the recording in your computer's Downloads / chosen folder.</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
