import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Decentralized WebRTC | Communication without compromise';
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between selection:bg-white selection:text-black antialiased relative animate-fade-in"
      style={{ animation: 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Top Navigation */}
      <header className="absolute top-0 left-0 w-full z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight text-white">
              Decentralized WebRTC
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Full-Screen Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-5xl mx-auto pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-white/80 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Peer-to-Peer &amp; End-to-End Encrypted</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60 leading-[1.08] max-w-4xl mx-auto">
          Communication without compromise
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mt-6 sm:mt-8 leading-relaxed font-normal">
          Direct, sovereign peer-to-peer audio, video, and real-time messaging powered by WebRTC with end-to-end encryption. No central servers eavesdropping on your conversations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 sm:mt-12 w-full sm:w-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-semibold rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base text-center shadow-lg shadow-white/5"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 border border-white/20 text-white font-semibold rounded-full hover:bg-white/10 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base text-center backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold mb-3">
            Architecture &amp; Security
          </h2>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Built for uncompromising privacy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1: End-to-End Encrypted */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                End-to-End Encrypted
              </h3>
              <p className="text-sm md:text-base text-white/60 leading-relaxed">
                Direct cryptographic key exchange ensures all messages, calls, and shared media remain strictly confidential between verified peers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-xs text-white/40 font-mono">
              AES-GCM • ECDH Key Exchange
            </div>
          </div>

          {/* Feature 2: Peer-to-Peer WebRTC */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 8.82a15 15 0 0 1 20 0" />
                  <path d="M5 12.86a10 10 0 0 1 14 0" />
                  <path d="M8.5 16.9a5 5 0 0 1 7 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Peer-to-Peer WebRTC
              </h3>
              <p className="text-sm md:text-base text-white/60 leading-relaxed">
                Direct browser-to-browser mesh channels eliminate middleboxes and surveillance relays, keeping data flows purely peer-to-peer.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-xs text-white/40 font-mono">
              Direct DataChannel • Mesh Topology
            </div>
          </div>

          {/* Feature 3: Zero Latency */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Zero Latency
              </h3>
              <p className="text-sm md:text-base text-white/60 leading-relaxed">
                Ultra-low latency UDP streaming provides instantaneous message delivery, high-fidelity voice, and smooth video with no centralized bottleneck.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-xs text-white/40 font-mono">
              Sub-millisecond UDP • Native Media
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              Decentralized Real-Time Chat
            </span>
            <span className="text-white/40">•</span>
            <span className="text-white/60 text-sm">End-to-End Encrypted</span>
          </div>
          <p className="text-white/60 text-sm">
            Built with WebRTC
          </p>
        </div>
      </footer>
    </div>
  );
}
