import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Globe,
  ShieldCheck,
  Share2,
  Video,
  ArrowRight,
  Lock,
  Zap,
  Activity,
  Cpu,
  FileText,
  Users,
  FileDown,
  Monitor,
  KeyRound,
} from 'lucide-react';
import ThreeMeshGlobe from '../components/ThreeMeshGlobe';
import ErrorBoundary from '../components/ErrorBoundary';
import ThemeToggle from '../components/ThemeToggle';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy'>('terms');

  useEffect(() => {
    document.title = 'Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption';
  }, []);

  const openLegalModal = (tab: 'terms' | 'privacy') => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  // Motion animation presets honoring prefers-reduced-motion
  const fadeIn = (delay = 0) => ({
    initial: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: shouldReduceMotion ? 0 : 0.55,
      delay: shouldReduceMotion ? 0 : delay,
      ease: 'easeOut' as const,
    },
  });

  return (
    <div className="min-h-screen bg-[#060911] text-white flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 antialiased relative overflow-hidden font-sans">
      
      {/* 3D WebGL P2P Mesh Visualizer in Background with 2D Fallback */}
      <ErrorBoundary isWebGL fallbackTitle="Decentralized Peer-to-Peer Lattice" fallbackDescription="Hardware-accelerated 2D canvas mode active.">
        <ThreeMeshGlobe />
      </ErrorBoundary>

      {/* Atmospheric Radial Lighting Vignettes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-cyan-500/10 via-blue-600/6 to-transparent blur-[140px] pointer-events-none -z-0" />
      <div className="absolute top-1/3 -right-48 w-[600px] h-[600px] bg-violet-600/8 blur-[160px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 -left-48 w-[500px] h-[500px] bg-cyan-600/6 blur-[140px] pointer-events-none -z-0" />

      {/* Minimalist Futuristic Header */}
      <header className="relative z-30 w-full border-b border-white/10 bg-[#060911]/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Project Identity */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer max-w-xl">
            <div className="relative shrink-0">
              <img
                src="/assets/p2p_connect_icon.png"
                alt="Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption"
                className="w-10 h-10 object-contain rounded-2xl drop-shadow-[0_0_15px_rgba(34,211,238,0.25)] group-hover:scale-105 transition-transform duration-200"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060911] shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white block group-hover:text-cyan-300 transition-colors leading-tight">
                Decentralized Real-Time Chat Application
              </span>
              <span className="hidden sm:inline-block text-[10px] tracking-wider uppercase text-neutral-400 font-mono">
                WebRTC with End-to-End Encryption
              </span>
            </div>
          </Link>

          {/* Quick Anchor Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-neutral-300">
            <a href="#capabilities" className="hover:text-cyan-300 transition-colors">
              Capabilities
            </a>
            <a href="#architecture" className="hover:text-cyan-300 transition-colors">
              Architecture
            </a>
            <a href="#features" className="hover:text-cyan-300 transition-colors">
              Features
            </a>
            <button
              type="button"
              onClick={() => openLegalModal('privacy')}
              className="hover:text-cyan-300 transition-colors cursor-pointer text-left"
            >
              Privacy & Security
            </button>
          </nav>

          {/* Actions: Theme Toggle + Auth Links */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />

            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white px-4 py-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="text-xs sm:text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-neutral-200 shadow-md hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Flagship Hero Section */}
      <section className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-5xl mx-auto py-16 sm:py-24">
        
        {/* Core Architecture Badge */}
        <motion.div
          {...fadeIn(0.1)}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-neutral-900/80 border border-white/15 text-[11px] sm:text-xs font-medium text-neutral-200 mb-8 backdrop-blur-xl shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-cyan-300 font-mono">WebRTC P2P Mesh</span>
          <span className="text-neutral-500">•</span>
          <span>Client-Side DTLS-SRTP Media & SCTP DataChannels</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeIn(0.2)}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] max-w-4xl mx-auto"
        >
          <span className="text-white">
            Communication without compromise.
          </span>
          <br />
          <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            Direct. Resilient. Decentralized.
          </span>
        </motion.h1>

        {/* Accurate Project Scope Description */}
        <motion.p
          {...fadeIn(0.3)}
          className="text-sm sm:text-base md:text-lg text-neutral-300 max-w-3xl mx-auto mt-6 sm:mt-8 leading-relaxed font-normal"
        >
          A browser-based real-time communication platform combining peer-to-peer text chat, voice calls, video calls, screen sharing, and adaptive file transfer. The backend coordinates authentication, room metadata, and Socket.IO signaling, while real-time media and data channels travel directly between connected users.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          {...fadeIn(0.4)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10 w-full sm:w-auto"
        >
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-full hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium rounded-full hover:border-cyan-400/50 transition-all duration-200 text-sm flex items-center justify-center gap-2 backdrop-blur-xl cursor-pointer"
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Sign In to Node</span>
          </Link>
        </motion.div>

        {/* Architecture Telemetry Highlights Strip */}
        <motion.div
          {...fadeIn(0.5)}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-14 sm:mt-16 w-full max-w-4xl"
        >
          {[
            { label: 'Media Transport', value: 'WebRTC Mesh', sub: 'Direct DTLS-SRTP', icon: Video },
            { label: 'File DataChannels', value: 'SCTP Chunking', sub: 'Adaptive RTT Telemetry', icon: Share2 },
            { label: 'Account Security', value: 'Optional 2FA', sub: '6-Digit Email OTP', icon: KeyRound },
            { label: 'Local Intelligence', value: 'On-Device AI', sub: 'In-Browser Summaries', icon: Cpu },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl text-left flex flex-col justify-between hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-neutral-400 font-mono uppercase">{item.label}</span>
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-white tracking-tight">{item.value}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{item.sub}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

      </section>

      {/* Core Capabilities Section (The 3 Primary Project Pillars) */}
      <section id="capabilities" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-xs font-semibold uppercase tracking-wider text-cyan-300 font-mono">
            ✦ Core Capabilities
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-4">
            Designed for privacy. Built for scale.
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto mt-3 text-sm sm:text-base">
            Combining peer-to-peer real-time communication, direct DataChannel file transfer, and privacy-oriented collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: '1) Authentication & Privacy Controls',
              desc: 'User registration with email OTP verification, password hashing, and session management. Active rooms feature invite codes, optional passwords, and session-closing controls, complemented by on-device local AI conversation summaries.',
              badge: 'JWT Auth • OTP • On-Device AI',
              iconSrc: '/assets/auth_privacy_icon.png',
              lucide: ShieldCheck,
              accent: 'from-blue-500/20 to-transparent',
              borderColor: 'hover:border-blue-400/40',
            },
            {
              title: '2) Adaptive P2P File Transfer Research',
              desc: 'Direct file sharing through WebRTC DataChannels using chunk-based transmission and transfer progress tracking. Evaluates how file transfer behavior adapts dynamically to network conditions such as Round-Trip Time (RTT), throughput, and packet loss during live calls.',
              badge: 'SCTP DataChannel • Chunk Transfer',
              iconSrc: '/assets/p2p_file_transfer_icon.png',
              lucide: Share2,
              accent: 'from-cyan-500/20 to-transparent',
              borderColor: 'hover:border-cyan-400/40',
            },
            {
              title: '3) Peer-to-Peer Real-Time Communication',
              desc: 'Direct audio calls, video calls, text chat, and screen sharing powered by WebRTC. Once signaling is complete via Socket.IO, supported media streams and data channels travel directly between connected users without passing through a central media server.',
              badge: 'WebRTC MediaStream • Voice & Video',
              iconSrc: '/assets/p2p_communication_icon.png',
              lucide: Video,
              accent: 'from-violet-500/20 to-transparent',
              borderColor: 'hover:border-violet-400/40',
            },
          ].map((card, idx) => {
            const LucideIcon = card.lucide;
            return (
              <motion.div
                key={idx}
                whileHover={shouldReduceMotion ? {} : { y: -6 }}
                transition={{ duration: 0.2 }}
                className={`p-7 sm:p-8 rounded-[32px] bg-neutral-950/80 border border-white/10 ${card.borderColor} backdrop-blur-2xl shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden`}
              >
                {/* Subtle top card glow gradient */}
                <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${card.accent} pointer-events-none opacity-60`} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-md backdrop-blur-md group-hover:scale-105 group-hover:border-cyan-500/40 transition-all">
                      <img
                        src={card.iconSrc}
                        alt={card.title}
                        className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                      />
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-cyan-300 transition-colors">
                      <LucideIcon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3 tracking-tight group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 text-xs font-medium text-neutral-300 flex items-center gap-2 relative z-10">
                  <LucideIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-[11px] text-neutral-300">{card.badge}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Technical Architecture & Separation of Concerns Section */}
      <section id="architecture" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-white/10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono">
            ✦ System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-4">
            Signaling coordination vs. direct media exchange
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto mt-3 text-xs sm:text-sm">
            Understanding the distinction between server-assisted signaling and browser-to-browser communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 1: Central Signaling */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono uppercase text-blue-400 font-semibold">Phase 1 • Signaling</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Socket.IO Handshake</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                The Node.js server facilitates user authentication, room membership verification, SDP offer/answer exchanges, and ICE candidate negotiation. It never inspects media payload content.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Node.js • Express • Socket.IO</span>
            </div>
          </div>

          {/* Step 2: Direct Peer-to-Peer */}
          <div className="p-6 rounded-3xl bg-cyan-950/20 border border-cyan-500/30 backdrop-blur-xl flex flex-col justify-between shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono uppercase text-cyan-300 font-semibold">Phase 2 • Direct Media</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">WebRTC P2P Data Mesh</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Upon establishing peer connections via STUN/TURN, audio, video, screen share streams, and SCTP DataChannel file packets travel directly between participant browsers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Direct DTLS-SRTP & SCTP Channels</span>
            </div>
          </div>

          {/* Step 3: Local On-Device AI */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono uppercase text-violet-400 font-semibold">Phase 3 • In-Browser AI</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Client-Side Summarization</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Meeting notes and conversation summaries run entirely inside browser Web Workers using ONNX Runtime Web. Chat transcripts never leave your device for third-party AI analysis.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>ONNX Web Runtime • Web Workers</span>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="features" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-white/10">
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
            ✦ Feature Overview
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Engineered for real-time peer collaboration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              title: 'Multi-User Audio & Video',
              desc: 'Peer mesh audio and video streams with microphone mute, camera toggle, and adaptive resolution.',
              icon: Video,
            },
            {
              title: 'Native Screen Sharing',
              desc: 'High-definition desktop or browser tab sharing transmitted directly via WebRTC MediaStream.',
              icon: Monitor,
            },
            {
              title: 'SCTP Chunk File Transfer',
              desc: 'Direct binary file sharing across DataChannels with real-time transfer progress bars and throughput estimation.',
              icon: FileDown,
            },
            {
              title: 'Two-Step Verification (OTP)',
              desc: 'Optional account protection sending single-use 6-digit codes to registered emails with a 10-minute expiry.',
              icon: KeyRound,
            },
            {
              title: 'Host Room Governance',
              desc: 'Room invite codes, optional room passcodes, peer participant lists, and host session termination controls.',
              icon: Users,
            },
            {
              title: 'Local Privacy Notes',
              desc: 'In-meeting scratch notes and meeting task action items saved strictly to your local browser storage.',
              icon: FileText,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 hover:border-white/20 transition-all flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{item.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Direct Call to Action Banner */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="p-8 sm:p-12 rounded-[36px] bg-gradient-to-b from-cyan-950/40 via-neutral-950/80 to-[#060911] border border-cyan-500/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to connect directly?
          </h2>
          <p className="text-neutral-300 text-xs sm:text-sm max-w-xl mx-auto mt-3 leading-relaxed">
            Create an account or sign in to start a peer-to-peer room with direct audio, video, and SCTP file sharing.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full sm:w-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              Sign In to Existing Node
            </Link>
          </div>
        </div>
      </section>

      {/* Futuristic Accessible Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-6 bg-[#060911]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-neutral-400">
          
          {/* Project Identity */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <img
              src="/assets/p2p_connect_icon.png"
              alt="Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption"
              className="w-8 h-8 object-contain rounded-xl"
            />
            <div>
              <span className="text-white font-semibold">
                Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
              </span>
            </div>
          </div>

          {/* Legal Modal Links & Route Links */}
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => openLegalModal('terms')}
              className="text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Terms of Service</span>
            </button>
            <span className="text-neutral-600">•</span>
            <button
              type="button"
              onClick={() => openLegalModal('privacy')}
              className="text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Technical Stack Pills */}
          <div className="text-[11px] font-mono text-neutral-500 text-center md:text-right">
            React • Three.js • WebRTC • Node.js • Socket.IO • Prisma
          </div>

        </div>
      </footer>

      {/* Interactive Terms & Privacy Documentation Modal */}
      <TermsPrivacyModal
        isOpen={legalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setLegalModalOpen(false)}
      />

    </div>
  );
}
