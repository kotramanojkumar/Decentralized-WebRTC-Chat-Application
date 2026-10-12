import React from 'react';

interface WebGLCanvasFallbackProps {
  title?: string;
  description?: string;
  showBadge?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function WebGLCanvasFallback({
  title = '2D Decentralized Mesh',
  description = 'Hardware-accelerated 2D mode active.',
  showBadge = false,
  className = '',
  children,
}: WebGLCanvasFallbackProps) {
  return (
    <div
      className={`relative w-full h-full min-h-[280px] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-6 select-none ${className}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(14, 28, 54, 0.7) 0%, rgba(6, 9, 17, 0.95) 100%)',
      }}
    >
      {/* Subtle Futuristic SVG Coordinate Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="fallback-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.5" fill="rgba(56, 189, 248, 0.6)" />
          </pattern>
          <radialGradient id="fallback-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(6, 9, 17, 0.85)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#fallback-grid)" />
        <rect width="100%" height="100%" fill="url(#fallback-vignette)" />
      </svg>

      {/* Prismatic Fluid Glow Rings */}
      <div className="absolute w-64 h-64 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none -bottom-8 -right-8" />

      {/* Central 2D P2P Node Visualization */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(34,211,238,0.2)]">
          <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 12h3m12 0h3M12 3v3m0 12v3" strokeLinecap="round" />
            <path d="M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{description}</p>

        {showBadge && (
          <span className="mt-3 px-3 py-1 rounded-full bg-neutral-900/80 border border-white/10 text-[10px] font-mono text-cyan-300 tracking-wider uppercase">
            2D Fallback Active
          </span>
        )}

        {children && <div className="mt-4 w-full">{children}</div>}
      </div>
    </div>
  );
}
