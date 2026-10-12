import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parrotAudio } from '../utils/parrotAudio';

interface CyberGuardianProps {
  isFocusEmail?: boolean;
  isFocusPassword?: boolean;
  isFocusName?: boolean;
  showPassword?: boolean;
  textLength?: number;
  isCelebrating?: boolean;
  onCelebrationComplete?: () => void;
}

export default function CyberGuardian({
  isFocusEmail = false,
  isFocusPassword = false,
  isFocusName = false,
  showPassword = false,
  textLength = 0,
  isCelebrating = false,
  onCelebrationComplete,
}: CyberGuardianProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse / Gaze coordinates relative to center (-1 to 1)
  const [gaze, setGaze] = useState({ x: 0, y: 0.2 });
  const [isHovered, setIsHovered] = useState(false);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Update privacy shield based on password focus and showPassword toggle
  useEffect(() => {
    if (isFocusPassword && !showPassword) {
      setIsShieldActive(true);
    } else {
      setIsShieldActive(false);
    }
  }, [isFocusPassword, showPassword]);

  // Handle celebration trigger
  useEffect(() => {
    if (isCelebrating && !isWarping) {
      setIsWarping(true);
      parrotAudio.playCelebrationSound();

      const timer = setTimeout(() => {
        setIsWarping(false);
        if (onCelebrationComplete) onCelebrationComplete();
      }, 1900);
      return () => clearTimeout(timer);
    }
  }, [isCelebrating, onCelebrationComplete, isWarping]);

  // Mouse tracking across viewport
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isWarping || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);

      // Clamp gaze between -1 and 1
      setGaze({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-0.8, Math.min(1, dy)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isWarping || !containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.touches[0].clientX - cx) / (window.innerWidth / 2);
      const dy = (e.touches[0].clientY - cy) / (window.innerHeight / 2);

      setGaze({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-0.8, Math.min(1, dy)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isWarping]);

  // Handle Tap / Click on the Sentinel
  const handleBotClick = () => {
    parrotAudio.playChirp();
    setPulseCount(prev => prev + 1);
  };

  // Determine eye offset pixels based on gaze, typing, & focus
  const typingSweep = (isFocusEmail || isFocusName) ? Math.min(8, (textLength % 20) * 0.4 - 4) : 0;
  const eyeOffsetX = gaze.x * 14 + typingSweep;
  const eyeOffsetY = isFocusEmail || isFocusName ? 12 : gaze.y * 10;
  const headTiltY = isFocusEmail || isFocusName ? 16 : gaze.y * 12;
  const headTiltX = gaze.x * 16 + typingSweep * 1.2;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-center -mb-8 z-30 select-none pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        {isWarping ? (
          /* Hyper-drive Celebration Warp Flight */
          <motion.div
            key="warping"
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
            initial={{ scale: 0.8, x: 0, y: 0, opacity: 1 }}
            animate={{
              x: [0, -180, 260, -80, 0],
              y: [0, -220, 140, -320, -900],
              scale: [1, 1.4, 1.2, 1.8, 0.2],
              rotate: [0, -25, 45, -20, 360],
              opacity: [1, 1, 1, 1, 0],
            }}
            transition={{ duration: 1.85, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Warp Energy Trail Ring */}
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-spin" />
              <div className="w-full h-full flex items-center justify-center text-5xl">
                🚀
              </div>
            </div>
          </motion.div>
        ) : (
          /* Standard Floating Interactive Cyber Sentinel */
          <motion.div
            key="sentinel"
            onClick={handleBotClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative cursor-pointer group"
            animate={{
              y: [0, -8, 0],
              rotateZ: pulseCount % 2 === 1 ? [0, 360] : 0,
            }}
            transition={{
              y: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
              rotateZ: { duration: 0.65, ease: 'easeInOut' },
            }}
          >
            {/* Ambient Back Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/25 via-cyan-500/20 to-indigo-500/25 rounded-full blur-xl pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Status Pill Badge */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-neutral-900/80 dark:bg-neutral-800/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5 shadow-md transition-all">
              <span className={`w-1.5 h-1.5 rounded-full ${isShieldActive ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
              <span>
                {isShieldActive
                  ? 'Visor Shield Engaged'
                  : isFocusEmail || isFocusName
                  ? 'Optical Scanner Active'
                  : 'P2P Cyber Sentinel'}
              </span>
            </div>

            {/* Futuristic 3D Cyber Sentinel Bot SVG */}
            <svg
              viewBox="0 0 160 160"
              className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-2xl overflow-visible transition-transform duration-200"
              style={{
                transform: `perspective(600px) rotateY(${headTiltX}deg) rotateX(${-headTiltY}deg) scale(${isHovered ? 1.05 : 1})`,
              }}
            >
              <defs>
                {/* Outer Shell Gradient */}
                <radialGradient id="shellGradient" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#94a3b8" />
                  <stop offset="75%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>

                {/* Dark Obsidian Shell Gradient for Dark Mode */}
                <radialGradient id="darkShellGradient" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="45%" stopColor="#1e293b" />
                  <stop offset="85%" stopColor="#090d16" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>

                {/* Cyber Eye Visor Glow */}
                <radialGradient id="lensGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="60%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#022c22" />
                </radialGradient>

                {/* Holographic Visor Reflection */}
                <linearGradient id="visorGloss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Scanner Beam Gradient */}
                <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Holographic Scanner Beam (Active when typing email / name) */}
              {(isFocusEmail || isFocusName) && (
                <path
                  d="M60 85 L20 160 L140 160 L100 85 Z"
                  fill="url(#scanBeam)"
                  className="animate-pulse opacity-70 pointer-events-none"
                />
              )}

              {/* Outer HUD Orbiting Ring */}
              <circle
                cx="80"
                cy="80"
                r="72"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 14"
                className="opacity-40 animate-[spin_12s_linear_infinite]"
              />

              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="4 22"
                className="opacity-30 animate-[spin_18s_linear_infinite_reverse]"
              />

              {/* Floating Levitation Thruster Wings (Left & Right) */}
              <g className="transition-transform duration-300">
                {/* Left Thruster */}
                <path
                  d="M18 70 C8 70, 4 85, 12 95 C18 102, 28 92, 26 80 Z"
                  fill="#1e293b"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  className="opacity-90"
                />
                <circle cx="14" cy="85" r="3" fill="#34d399" className="animate-ping" />

                {/* Right Thruster */}
                <path
                  d="M142 70 C152 70, 156 85, 148 95 C142 102, 132 92, 134 80 Z"
                  fill="#1e293b"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  className="opacity-90"
                />
                <circle cx="146" cy="85" r="3" fill="#34d399" className="animate-ping" />
              </g>

              {/* Main Spherical Titanium Chassis */}
              <circle
                cx="80"
                cy="80"
                r="52"
                fill="url(#darkShellGradient)"
                stroke="#334155"
                strokeWidth="2.5"
                className="drop-shadow-xl"
              />

              {/* Top Sensor Antenna / Beacon */}
              <rect x="78" y="20" width="4" height="12" rx="2" fill="#64748b" />
              <circle cx="80" cy="18" r="4.5" fill="#10b981" className="animate-pulse" />

              {/* Front Recessed Visor Frame */}
              <ellipse
                cx="80"
                cy="80"
                rx="38"
                ry="28"
                fill="#050811"
                stroke="#1e293b"
                strokeWidth="2"
              />

              {/* Interactive Holographic Eye Lens tracking cursor */}
              <g
                style={{
                  transform: `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`,
                  transition: 'transform 0.08s ease-out',
                }}
              >
                {/* Glowing Eye Core */}
                <circle
                  cx="80"
                  cy="80"
                  r={isFocusEmail || isFocusName ? 16 : 14}
                  fill="url(#lensGlow)"
                  filter="drop-shadow(0 0 8px #10b981)"
                />

                {/* High-Tech Pupil / Reticle */}
                <circle
                  cx="80"
                  cy="80"
                  r={isHovered ? 6 : 5}
                  fill="#ffffff"
                  className="transition-all duration-150"
                />

                {/* Optical Rings */}
                <circle
                  cx="80"
                  cy="80"
                  r="10"
                  fill="none"
                  stroke="#6ee7b7"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />

                {/* Specular Glint */}
                <circle cx="77" cy="76" r="2.5" fill="#ffffff" opacity="0.9" />
              </g>

              {/* Carbon-Fiber Privacy Shield (Closes when focusing on Password!) */}
              <g
                style={{
                  transform: isShieldActive ? 'translateY(0px)' : 'translateY(-60px)',
                  opacity: isShieldActive ? 1 : 0,
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s',
                }}
              >
                {/* Visor Cover Plate */}
                <path
                  d="M42 58 C54 50, 106 50, 118 58 L116 104 C104 112, 56 112, 44 104 Z"
                  fill="#090d16"
                  stroke="#eab308"
                  strokeWidth="1.8"
                />

                {/* Security Lock Icon / Carbon Weave Pattern on Visor */}
                <circle cx="80" cy="80" r="10" fill="#eab308" opacity="0.15" />
                <path
                  d="M76 80 L76 76 C76 73.8, 77.8 72, 80 72 C82.2 72, 84 73.8, 84 76 L84 80 M74 80 L86 80 L86 88 L74 88 Z"
                  stroke="#facc15"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>

              {/* Visor Glass Gloss Overlay */}
              <ellipse
                cx="80"
                cy="74"
                rx="34"
                ry="18"
                fill="url(#visorGloss)"
                className="pointer-events-none"
              />

              {/* Lower Chin Vent / Status Grid */}
              <line x1="72" y1="120" x2="88" y2="120" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
              <line x1="75" y1="124" x2="85" y2="124" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
