import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ShieldCheck } from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy';
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsPrivacyModal({
  isOpen,
  initialTab = 'terms',
  onClose,
  onAccept
}: TermsPrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window (Liquid Glass) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-3xl rounded-[32px] liquid-glass-card border border-white/20 dark:border-white/10 p-6 sm:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] text-neutral-900 dark:text-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-black/10 dark:border-white/10 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src="/assets/p2p_connect_icon.png"
                  alt="Icon"
                  className="w-6 h-6 object-contain rounded-lg"
                />
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-cyan-400">
                  Legal & Privacy Documentation
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer ml-2"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 my-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Terms of Service</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal flex-1 scrollbar-thin">
            {activeTab === 'terms' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-cyan-200 text-xs">
                  <strong>Effective Date:</strong> October 2026 • <strong>Architecture:</strong> Decentralized Peer-to-Peer Full Mesh (WebRTC)
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">1. Acceptance of Terms</h3>
                  <p>
                    By accessing or registering an account on <strong>Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption</strong> (hereinafter referred to as "the Platform" or "P2PConnect"), you agree to abide by these Terms of Service. If you do not agree, do not use the application.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">2. Peer-to-Peer Communication Architecture</h3>
                  <p>
                    The Platform operates as a peer-to-peer communication system utilizing WebRTC. Video streams, voice calls, direct text messages, and SCTP DataChannel file transmissions travel directly between user browsers. The central signaling server only assists with initial SDP handshake, ICE candidate exchange, and room coordination.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">3. End-to-End Encryption & Security</h3>
                  <p>
                    All real-time media streams utilize WebRTC DTLS-SRTP, and direct DataChannels utilize AES-GCM-256 client-side encryption. The platform maintains zero visibility into live call streams, microphone audio, screen recordings, or transferred file contents.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">4. Two-Step Verification (OTP Authentication)</h3>
                  <p>
                    Users may opt to enable optional Two-Step Verification within Account Settings. When enabled, successful password authentication triggers a 6-digit One-Time Password (OTP) dispatched to the registered email address. Full account access is restricted until OTP verification succeeds.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">5. Acceptable Use Policy</h3>
                  <p>
                    You agree not to use the Platform for unlawful, abusive, harassing, or harmful activities, nor to deploy automated attacks, packet flooding, or attempts to disrupt peer signaling nodes.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">6. Limitation of Liability</h3>
                  <p>
                    The Platform is provided "as is" without warranties of uninterrupted service. Since data flows directly between client devices, connection quality depends on user network bandwidth, NAT traversal, and firewall topologies.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs">
                  <strong>Zero-Knowledge Principle:</strong> We do not log, inspect, store, or sell your calls, messages, or transferred files.
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">1. Information We Collect</h3>
                  <p>
                    We collect minimal authentication credentials necessary for session security: your email address, an irreversible bcrypt password hash, and optional display name/username. We never collect or retain unencrypted plaintext passwords.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">2. Zero Central Media Storage</h3>
                  <p>
                    Audio calls, video calls, screen shares, and file transfers are strictly peer-to-peer. Our backend database stores room invite codes and active membership timestamps, but never receives or stores actual audio frames, video frames, or file contents.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">3. Two-Step Verification (OTP) Data Usage</h3>
                  <p>
                    When Two-Step Verification is enabled, temporary 6-digit cryptographic OTP tokens are generated with a strict 10-minute expiry time. Upon successful authentication or expiry, OTP records are permanently invalidated and purged.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">4. Local Browser Storage</h3>
                  <p>
                    Settings (such as theme preference, audio chime controls, and local quick notes) and recorded call sessions reside solely in your browser's local sandbox (`localStorage` / IndexedDB). They are never uploaded to any remote analytics provider.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">5. Account Deletion & Data Rights</h3>
                  <p>
                    Users hold the complete right to revoke device sessions or permanently delete their account and associated cryptographic records at any time via Settings &rarr; Danger Zone.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Decentralized WebRTC Cryptographic Architecture
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-neutral-300 dark:border-white/20 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onAccept) onAccept();
                  onClose();
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer hover:scale-105 active:scale-95"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
