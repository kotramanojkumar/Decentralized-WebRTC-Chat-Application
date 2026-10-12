import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { parrotAudio } from '../utils/parrotAudio';

interface BuddyRobotProps {
  userName?: string;
  isLoggedInSuccess?: boolean;
  isFocusEmail?: boolean;
  isFocusPassword?: boolean;
  isRegister?: boolean;
}

export default function BuddyRobot({
  userName: _userName = '',
  isLoggedInSuccess = false,
  isFocusEmail: _isFocusEmail = false,
  isFocusPassword = false,
  isRegister: _isRegister = false,
}: BuddyRobotProps) {
  const [isWaving, setIsWaving] = useState(false);

  // Play audio when Buddy is tapped
  const handleBuddyClick = () => {
    parrotAudio.playChirp();
    setIsWaving(true);
    setTimeout(() => setIsWaving(false), 1600);
  };

  useEffect(() => {
    if (isLoggedInSuccess) {
      setIsWaving(true);
    }
  }, [isLoggedInSuccess]);

  return (
    <div className="relative w-full max-w-[420px] flex flex-col items-center justify-center select-none py-4">
      
      {/* Concentric Ambient Energy Rings behind Buddy (from reference image) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] pointer-events-none -z-0">
        <div className="absolute -top-10 -left-6 w-52 h-52 rounded-full border border-blue-400/25 animate-[spin_24s_linear_infinite]" />
        <div className="absolute top-2 left-10 w-64 h-64 rounded-full border border-cyan-400/20 animate-[spin_32s_linear_infinite_reverse]" />
        <div className="absolute top-12 left-4 w-44 h-44 rounded-full border border-indigo-500/25" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-transparent blur-2xl" />
      </div>

      {/* Main Buddy Interactive Avatar */}
      <motion.div
        onClick={handleBuddyClick}
        className="relative z-10 cursor-pointer group"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut',
        }}
      >
        <svg
          viewBox="0 0 280 280"
          className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-[0_20px_40px_rgba(30,58,138,0.45)] overflow-visible"
        >
          <defs>
            {/* Glossy White Ceramic Body Gradient */}
            <linearGradient id="buddyBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#f1f5f9" />
              <stop offset="85%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Cyan/Blue Accent Color Gradient */}
            <linearGradient id="buddyBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Dark Visor Screen */}
            <radialGradient id="buddyScreen" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Glowing Chest Arc Reactor Core */}
            <radialGradient id="buddyCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#67e8f9" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>

            {/* Specular Visor Gloss */}
            <linearGradient id="buddyGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Antenna Ears Left & Right */}
          {/* Left Ear */}
          <g>
            <path d="M54 90 C34 76, 30 115, 52 118 Z" fill="url(#buddyBlue)" />
            <circle cx="48" cy="98" r="9" fill="#93c5fd" />
            <circle cx="48" cy="98" r="5" fill="#3b82f6" />
          </g>

          {/* Right Ear */}
          <g>
            <path d="M226 90 C246 76, 250 115, 228 118 Z" fill="url(#buddyBlue)" />
            <circle cx="232" cy="98" r="9" fill="#93c5fd" />
            <circle cx="232" cy="98" r="5" fill="#3b82f6" />
          </g>

          {/* Torso / Body */}
          <ellipse cx="140" cy="216" rx="58" ry="46" fill="url(#buddyBody)" />
          {/* Blue Torso Bib Accent */}
          <path d="M102 195 Q140 220 178 195 Q184 228 140 240 Q96 228 102 195 Z" fill="url(#buddyBlue)" />

          {/* Glowing Circular Chest Core Light */}
          <circle cx="140" cy="214" r="15" fill="url(#buddyCore)" filter="drop-shadow(0 0 10px #22d3ee)" />
          <circle cx="140" cy="214" r="7" fill="#ffffff" className="animate-pulse" />

          {/* Left Arm Resting / Floating */}
          <path
            d="M86 200 C64 205, 54 224, 62 242 C70 256, 88 245, 96 228 Z"
            fill="url(#buddyBody)"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <path d="M58 230 C54 238, 62 248, 72 244 Z" fill="url(#buddyBlue)" />

          {/* Animated Waving Right Hand & Arm */}
          <g
            className={`transition-transform duration-300 origin-[195px_200px] ${
              isWaving || isLoggedInSuccess ? 'animate-[bounce_0.6s_infinite]' : ''
            }`}
            style={{
              transform: isWaving || isLoggedInSuccess ? 'rotate(-12deg)' : 'rotate(0deg)',
            }}
          >
            {/* Right Arm Reaching Upward */}
            <path
              d="M192 196 C214 175, 228 150, 218 132 C210 118, 194 135, 186 160 Z"
              fill="url(#buddyBody)"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {/* Waving Hand Palm */}
            <ellipse
              cx="218"
              cy="126"
              rx="16"
              ry="22"
              transform="rotate(18 218 126)"
              fill="url(#buddyBody)"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            {/* Fingers highlight */}
            <path
              d="M210 110 Q218 102 226 112"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Head: Rounded White Ceramic Monitor Casing */}
          <rect
            x="64"
            y="44"
            width="152"
            height="124"
            rx="46"
            fill="url(#buddyBody)"
            stroke="#e2e8f0"
            strokeWidth="2"
          />

          {/* Inner Dark Visor Screen */}
          <rect
            x="76"
            y="54"
            width="128"
            height="104"
            rx="36"
            fill="url(#buddyScreen)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Reticle Corner Brackets [ ] inside screen (exact from user's image) */}
          <path d="M88 68 L84 68 L84 74" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M192 68 L196 68 L196 74" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M88 144 L84 144 L84 138" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M192 144 L196 144 L196 138" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />

          {/* Animated Expressive Cyan Eyes */}
          {isLoggedInSuccess ? (
            /* Sparkling Victory Heart Eyes on Login Success! */
            <g className="animate-pulse" filter="drop-shadow(0 0 8px #38bdf8)">
              {/* Left Eye Heart */}
              <path
                d="M106 102 C106 96, 96 92, 92 98 C88 92, 78 96, 78 102 C78 112, 92 122, 92 122 C92 122, 106 112, 106 102 Z"
                fill="#38bdf8"
                transform="translate(18, -4)"
              />
              {/* Right Eye Heart */}
              <path
                d="M106 102 C106 96, 96 92, 92 98 C88 92, 78 96, 78 102 C78 112, 92 122, 92 122 C92 122, 106 112, 106 102 Z"
                fill="#38bdf8"
                transform="translate(68, -4)"
              />
            </g>
          ) : isFocusPassword ? (
            /* Playful Peek / Shield Eyes */
            <g filter="drop-shadow(0 0 6px #38bdf8)">
              {/* Curved Happy Wink Arches */}
              <path
                d="M98 106 Q112 90 126 106"
                stroke="#38bdf8"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M154 106 Q168 90 182 106"
                stroke="#38bdf8"
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* Standard Warm Smiling Arches (Exact from user image: ^ ^) */
            <g filter="drop-shadow(0 0 8px #38bdf8)">
              <path
                d="M96 112 Q112 88 128 112"
                stroke="#38bdf8"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M152 112 Q168 88 184 112"
                stroke="#38bdf8"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* Screen Glass Specular Highlight Arc */}
          <path
            d="M80 62 Q140 48 200 62 Q194 92 86 92 Z"
            fill="url(#buddyGloss)"
            className="pointer-events-none"
          />
        </svg>
      </motion.div>
    </div>
  );
}
