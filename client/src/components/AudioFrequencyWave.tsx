import { useEffect, useRef } from 'react';

interface AudioFrequencyWaveProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  barCount?: number;
  height?: number;
  width?: number;
}

export default function AudioFrequencyWave({
  stream,
  isMuted = false,
  onSpeakingChange,
  barCount = 20,
  height = 36,
  width = 160
}: AudioFrequencyWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let dataArray: Uint8Array | null = null;

    const hasAudioTrack = stream && stream.getAudioTracks().length > 0 && !isMuted;

    if (hasAudioTrack && stream) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;

        sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNode.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn('Web Audio API initialized in fallback mode', err);
      }
    }

    let phase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      phase += 0.08;

      ctx.clearRect(0, 0, width, height);

      let isSpeakingNow = false;

      if (analyser && dataArray && !isMuted) {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        isSpeakingNow = avg > 12;

        if (speakingRef.current !== isSpeakingNow) {
          speakingRef.current = isSpeakingNow;
          onSpeakingChange?.(isSpeakingNow);
        }

        const barWidth = Math.floor(width / barCount) - 2;
        const step = Math.floor(dataArray.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const normalized = val / 255;
          const barHeight = Math.max(3, normalized * (height - 6));
          const x = i * (barWidth + 2) + 2;
          const y = (height - barHeight) / 2;

          // Holographic gradient: violet -> cyan -> mint
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          if (isSpeakingNow) {
            grad.addColorStop(0, '#10b981'); // neon mint top
            grad.addColorStop(0.5, '#22d3ee'); // holographic cyan mid
            grad.addColorStop(1, '#8b5cf6'); // electric violet base
          } else {
            grad.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
            grad.addColorStop(1, 'rgba(139, 92, 246, 0.25)');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Idle futuristic breathing sine wave
        if (speakingRef.current) {
          speakingRef.current = false;
          onSpeakingChange?.(false);
        }

        const barWidth = Math.floor(width / barCount) - 2;
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(phase + (i / barCount) * Math.PI * 2);
          const barHeight = Math.max(3, Math.abs(wave) * 8 + 3);
          const x = i * (barWidth + 2) + 2;
          const y = (height - barHeight) / 2;

          ctx.fillStyle = 'rgba(139, 92, 246, 0.35)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      if (sourceNode) {
        try { sourceNode.disconnect(); } catch (_) {}
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (_) {}
      }
    };
  }, [stream, isMuted, barCount, height, width, onSpeakingChange]);

  return (
    <div className="flex items-center justify-center p-1 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
    </div>
  );
}
