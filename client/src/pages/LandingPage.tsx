import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThreeMeshGlobe from '../components/ThreeMeshGlobe';

export default function LandingPage() {
  useEffect(() => {
    document.title = 'P2PConnect | Decentralized Real-Time WebRTC Architecture';
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between selection:bg-white selection:text-black antialiased relative overflow-hidden font-sans">
      
      {/* 3D WebGL P2P Mesh Visualizer in Background */}
      <ThreeMeshGlobe />

      {/* Guiding Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-blue-600/12 via-indigo-600/8 to-transparent blur-[140px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-0 w-[600px] h-[500px] bg-violet-600/8 blur-[140px] pointer-events-none -z-0" />

      {/* Minimalist Glass Header */}
      <header className="relative z-30 w-full border-b border-white/10 bg-[#000000]/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <img
              src="/assets/p2p_connect_icon.png"
              alt="P2PConnect"
              className="w-10 h-10 object-contain rounded-2xl drop-shadow-md hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-bold text-lg tracking-tight text-white block">
                P2PConnect
              </span>
              <span className="hidden sm:inline-block text-[10px] tracking-widest uppercase text-neutral-400 font-medium">
                Decentralized P2P Mesh
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs sm:text-sm font-semibold bg-white text-black px-6 py-2.5 rounded-full hover:bg-neutral-200 shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Flagship Hero Section */}
      <section className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-5xl mx-auto py-20">
        
        {/* Core Architecture Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-neutral-900/80 border border-white/15 text-xs font-medium text-neutral-200 mb-8 backdrop-blur-xl shadow-lg"
        >
          <span className="text-cyan-400 font-bold text-sm">✦</span>
          <span>Decentralized WebRTC Architecture • 100% Client-Side E2EE</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] max-w-4xl mx-auto"
        >
          <span className="text-white">
            Communication without compromise.
          </span>
          <br />
          <span className="bg-gradient-to-r from-neutral-200 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
            Direct. Encrypted. Decentralized.
          </span>
        </motion.h1>

        {/* Authentic Project Scope */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-base sm:text-lg text-neutral-300 max-w-3xl mx-auto mt-6 sm:mt-8 leading-relaxed font-normal"
        >
          A browser-based real-time communication platform combining peer-to-peer text chat, voice calls, video calls, screen sharing, and direct file transfer. The backend manages authentication, signaling, and room coordination, while all communication content travels directly between users without passing through a central server.
        </motion.p>

        {/* High-Contrast Pill Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 sm:mt-12 w-full sm:w-auto"
        >
          <Link
            to="/register"
            className="w-full sm:w-auto px-9 py-3.5 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 hover:scale-105 active:scale-95 shadow-xl transition-all duration-200 text-sm text-center"
          >
            Create Free Account
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-9 py-3.5 border border-white/25 bg-transparent hover:bg-white/10 text-white font-medium rounded-full hover:border-white transition-all duration-200 text-sm text-center"
          >
            Sign In to Secure Node
          </Link>
        </motion.div>

      </section>

      {/* Bento Grid Showcase with High-Res 3D Circular Custom Icons */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-300">
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
              iconSrc: '/assets/auth_privacy_icon.png'
            },
            {
              title: '2) Adaptive P2P File Transfer Research',
              desc: 'Direct file sharing through WebRTC DataChannels using chunk-based transmission and transfer progress tracking. Evaluates how file transfer behavior adapts dynamically to network conditions such as Round-Trip Time (RTT), throughput, and packet loss during live calls.',
              badge: 'SCTP DataChannel • Chunk Transfer',
              iconSrc: '/assets/p2p_file_transfer_icon.png'
            },
            {
              title: '3) Peer-to-Peer Real-Time Communication',
              desc: 'Direct audio calls, video calls, text chat, and screen sharing powered by WebRTC. Once signaling is complete via Socket.IO, supported media streams and data channels travel directly between connected users without passing through a central media server.',
              badge: 'WebRTC MediaStream • Voice & Video',
              iconSrc: '/assets/p2p_communication_icon.png'
            }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
              className="p-8 rounded-[32px] bg-neutral-950/80 border border-white/10 hover:border-white/25 backdrop-blur-2xl shadow-xl flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 mb-6 shadow-md backdrop-blur-md group-hover:scale-105 group-hover:border-cyan-500/40 transition-all">
                  <img
                    src={card.iconSrc}
                    alt={card.title}
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 tracking-tight group-hover:text-cyan-300 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {card.desc}
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/10 text-xs font-medium text-neutral-300 flex items-center gap-2">
                <span className="text-cyan-400">✦</span>
                <span>{card.badge}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6 bg-[#000000]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-neutral-400">
          <div>
            <span className="text-white font-semibold">P2PConnect</span> • Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
          </div>
          <div className="text-neutral-500">
            React • Node.js • Socket.IO • WebRTC • Prisma
          </div>
        </div>
      </footer>

    </div>
  );
}
