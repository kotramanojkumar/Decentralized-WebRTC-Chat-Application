// Realistic 3D-Styled SVG Icons with Volumetric Gradients, Glossy Highlights, and Depth

export function RobotShield3D({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_8px_16px_rgba(6,182,212,0.4)] overflow-visible`}>
      <defs>
        <radialGradient id="rHead" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="85%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <radialGradient id="rVisor" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="80%" stopColor="#020617" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <linearGradient id="rRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* Outer Glowing Neon Ring */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#rRing)" strokeWidth="3" filter="drop-shadow(0 0 6px #06b6d4)" />
      {/* Head Chassis */}
      <rect x="24" y="24" width="52" height="48" rx="16" fill="url(#rHead)" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Ears */}
      <rect x="18" y="38" width="6" height="18" rx="3" fill="#38bdf8" />
      <rect x="76" y="38" width="6" height="18" rx="3" fill="#38bdf8" />
      {/* Screen Visor */}
      <rect x="30" y="32" width="40" height="30" rx="10" fill="url(#rVisor)" />
      {/* Smiling Glowing Cyan Eyes */}
      <path d="M37 46 Q43 38 49 46" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 4px #22d3ee)" />
      <path d="M51 46 Q57 38 63 46" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" fill="none" filter="drop-shadow(0 0 4px #22d3ee)" />
      {/* Corner Bracket */}
      <path d="M34 36 L32 36 L32 40" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M66 36 L68 36 L68 40" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
      {/* Chin Vent */}
      <rect x="42" y="65" width="16" height="3" rx="1.5" fill="#38bdf8" opacity="0.9" />
    </svg>
  );
}

export function VideoCamera3D({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_10px_20px_rgba(59,130,246,0.45)] overflow-visible`}>
      <defs>
        <linearGradient id="camBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="camLens" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </radialGradient>
      </defs>
      {/* 3D Main Camera Housing */}
      <rect x="18" y="28" width="48" height="44" rx="14" fill="url(#camBody)" stroke="#93c5fd" strokeWidth="1.5" />
      {/* Top Handle / Mic Sensor */}
      <rect x="28" y="20" width="28" height="8" rx="4" fill="#1e40af" stroke="#60a5fa" strokeWidth="1" />
      <circle cx="48" cy="24" r="2" fill="#ef4444" className="animate-pulse" />
      {/* 3D Lens Bezel */}
      <circle cx="42" cy="50" r="16" fill="#0f172a" stroke="#60a5fa" strokeWidth="2" />
      <circle cx="42" cy="50" r="12" fill="url(#camLens)" filter="drop-shadow(0 0 6px #38bdf8)" />
      <circle cx="38" cy="46" r="3" fill="#ffffff" opacity="0.8" />
      {/* Projector Cone / Viewfinder */}
      <path d="M66 42 L84 28 C87 26, 88 28, 88 32 L88 68 C88 72, 87 74, 84 72 L66 58 Z" fill="url(#camBody)" stroke="#93c5fd" strokeWidth="1.2" />
      {/* Specular Highlight */}
      <path d="M22 32 C30 30, 50 30, 60 32" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function JoinLink3D({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_10px_20px_rgba(16,185,129,0.45)] overflow-visible`}>
      <defs>
        <linearGradient id="linkEmerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="85%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
      </defs>
      {/* First 3D Interlocking Ring */}
      <path
        d="M38 28 C48 18, 66 18, 76 28 C86 38, 86 56, 76 66 L68 74 C58 84, 42 84, 32 74 C28 70, 26 64, 26 58"
        stroke="url(#linkEmerald)"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      {/* Second 3D Interlocking Ring Crossing Over */}
      <path
        d="M62 72 C52 82, 34 82, 24 72 C14 62, 14 44, 24 34 L32 26 C42 16, 58 16, 68 26 C72 30, 74 36, 74 42"
        stroke="#6ee7b7"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
        filter="drop-shadow(0 0 8px rgba(16,185,129,0.6))"
      />
      {/* Core Energy Spark */}
      <circle cx="50" cy="50" r="5" fill="#ffffff" filter="drop-shadow(0 0 6px #34d399)" className="animate-pulse" />
    </svg>
  );
}

export function QuickNotes3D({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_6px_12px_rgba(245,158,11,0.35)] overflow-visible`}>
      <defs>
        <linearGradient id="noteCover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Notebook Base */}
      <rect x="20" y="16" width="56" height="70" rx="8" fill="url(#noteCover)" stroke="#fde68a" strokeWidth="1.5" />
      {/* Spiral Binder Loops */}
      {[24, 36, 48, 60, 72].map(y => (
        <rect key={y} x="16" y={y} width="10" height="4" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
      ))}
      {/* Page Lines */}
      <line x1="34" y1="34" x2="66" y2="34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <line x1="34" y1="46" x2="64" y2="46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="34" y1="58" x2="58" y2="58" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* 3D Stylus Pen Resting */}
      <g transform="rotate(28 70 65)">
        <rect x="68" y="30" width="6" height="45" rx="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        <polygon points="68,75 74,75 71,83" fill="#0f172a" />
      </g>
    </svg>
  );
}

export function AlarmClock3D({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_6px_14px_rgba(239,68,68,0.4)] overflow-visible`}>
      <defs>
        <radialGradient id="alarmCase" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>
      {/* Twin Bells */}
      <ellipse cx="26" cy="24" rx="10" ry="6" transform="rotate(-35 26 24)" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.2" />
      <ellipse cx="74" cy="24" rx="10" ry="6" transform="rotate(35 74 24)" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.2" />
      {/* Feet */}
      <line x1="30" y1="78" x2="22" y2="88" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      <line x1="70" y1="78" x2="78" y2="88" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {/* Main Clock Face Housing */}
      <circle cx="50" cy="54" r="32" fill="url(#alarmCase)" stroke="#fecaca" strokeWidth="2" />
      {/* White Dial */}
      <circle cx="50" cy="54" r="23" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      {/* Clock Hands */}
      <line x1="50" y1="54" x2="50" y2="40" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="54" x2="62" y2="54" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="54" r="2.5" fill="#ef4444" />
    </svg>
  );
}

export function NamaskarAvatar3D({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} drop-shadow-[0_12px_24px_rgba(245,158,11,0.3)] overflow-visible`}>
      <defs>
        <radialGradient id="skin3D" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="55%" stopColor="#fba979" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
        <linearGradient id="kurta3D" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <radialGradient id="auraGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Background Spiritual Aura Glow */}
      <circle cx="60" cy="55" r="50" fill="url(#auraGold)" />
      {/* Kurta Body / Torso with 3D Shading */}
      <path d="M26 120 C26 92, 50 82, 60 82 C70 82, 94 92, 94 120 Z" fill="url(#kurta3D)" stroke="#bae6fd" strokeWidth="1" />
      {/* Collar */}
      <path d="M52 86 L60 96 L68 86" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Neck */}
      <rect x="53" y="66" width="14" height="18" rx="5" fill="url(#skin3D)" />
      {/* Head */}
      <ellipse cx="60" cy="46" rx="26" ry="28" fill="url(#skin3D)" stroke="#f97316" strokeWidth="0.8" />
      {/* Hair */}
      <path d="M34 40 C34 16, 86 16, 86 40 C84 22, 60 20, 34 40 Z" fill="#0f172a" />
      {/* Eyebrows */}
      <path d="M44 38 Q51 34 57 38" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M63 38 Q69 34 76 38" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Tilak / Auspicious Chandan Mark */}
      <line x1="60" y1="34" x2="60" y2="43" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="45" r="2" fill="#ef4444" />
      {/* Smiling Eyes (Gentle, Peaceful, Welcoming) */}
      <path d="M46 47 Q52 53 58 47" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M62 47 Q68 53 74 47" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Warm Smile */}
      <path d="M52 60 Q60 67 68 60" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Folded Palms / Namaskar Gesture (Anjali Mudra 🙏) */}
      <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.25))">
        {/* Forearms */}
        <path d="M36 104 Q53 96, 57 82" stroke="url(#skin3D)" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M84 104 Q67 96, 63 82" stroke="url(#skin3D)" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Palms joined together */}
        <ellipse cx="60" cy="79" rx="5" ry="11" fill="url(#skin3D)" stroke="#ea580c" strokeWidth="1" />
        <line x1="60" y1="70" x2="60" y2="88" stroke="#ea580c" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
