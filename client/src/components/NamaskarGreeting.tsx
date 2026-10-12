import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../utils/parrotAudio';

interface NamaskarGreetingProps {
  displayName?: string;
}

export default function NamaskarGreeting({ displayName }: NamaskarGreetingProps) {
  const [isHovered, setIsHovered] = useState(false);
  const audioCooldownRef = useRef(false);

  const rawName = displayName || localStorage.getItem('displayName') || localStorage.getItem('username') || 'Friend';
  const name = rawName.trim();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const currentGreeting = `${getTimeGreeting()}, ${name}!`;

  const speakGreeting = () => {
    soundEngine.speakFemale(`${getTimeGreeting()}, ${name}! Namaskar!`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!audioCooldownRef.current) {
      audioCooldownRef.current = true;
      speakGreeting();
      setTimeout(() => {
        audioCooldownRef.current = false;
      }, 4000);
    }
  };

  const handleAvatarClick = () => {
    speakGreeting();
  };

  return (
    <div className="liquid-glass-card p-6 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col items-center sm:items-start text-center sm:text-left">
      {/* Soft Ambient Radial Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
        
        {/* Clear Proper Indian Girl Namaskar Avatar */}
        <div
          className="relative shrink-0 cursor-pointer group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleAvatarClick}
          title="Click to hear greeting"
        >
          {/* Glowing Ambient Halo */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-cyan-400 opacity-75 blur-sm group-hover:opacity-100 transition duration-300 animate-pulse" />

          {/* Avatar Image Frame */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-neutral-900 transform group-hover:scale-105 transition-all duration-300">
            <img
              src="/assets/indian_girl_namaskar.jpg"
              alt="Indian Girl Namaskar Greeting"
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Namaskar Hands Badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center text-sm shadow-md border-2 border-white dark:border-neutral-900 group-hover:scale-110 transition-transform">
            🙏
          </div>

          {/* Interactive Dynamic Hover Speech Balloon: "Good Morning/Evening, Name!" */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 sm:left-full sm:translate-x-2 sm:top-2 z-50 whitespace-nowrap bg-neutral-900/95 text-white text-xs font-bold px-3.5 py-1.5 rounded-2xl border border-amber-400/40 shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-1.5"
              >
                <span>🙏</span>
                <span className="text-amber-300 font-extrabold">{currentGreeting}</span>
                <span className="text-[10px] text-cyan-300">🔊</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text Greeting Area */}
        <div className="flex-1 min-w-0">
          
          {/* Time & Namaskar Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-2 shadow-sm">
            <span>🙏 Namaskar, Hello!</span>
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span className="font-bold text-amber-600 dark:text-amber-300">{getTimeGreeting()}</span>
          </div>

          {/* Two-Line Heading: Line 1 = "Welcome,", Line 2 = Name (No Ellipsis, Bold & Clear!) */}
          <h2 className="tracking-tight text-neutral-900 dark:text-white leading-tight">
            <span className="block text-base sm:text-lg font-semibold text-neutral-500 dark:text-neutral-400">
              Welcome,
            </span>
            <span className="block text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-400 bg-clip-text text-transparent break-words mt-0.5">
              {name}
            </span>
          </h2>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
            Your decentralized real-time chat and video rooms are ready.
          </p>
        </div>
      </div>

      {/* Trust pill */}
      <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/10 w-full flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>WebRTC P2P Ready</span>
        </span>
        <span>End-to-End Encrypted</span>
      </div>
    </div>
  );
}
