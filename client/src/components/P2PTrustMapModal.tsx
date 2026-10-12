import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Radio,
  RefreshCw,
  Copy,
  Check,
  X,
  Lock,
  Wifi,
  Activity,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { PeerTelemetry } from '../webrtc/WebRTCManager';

export interface TrustMapPeerData {
  peerId: string;
  displayName: string;
  telemetry?: PeerTelemetry;
  safetyNumber?: string | null;
  remotePublicKey?: string | null;
  isVerified: boolean;
  hasKeyChanged: boolean;
}

interface P2PTrustMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  peers: TrustMapPeerData[];
  selectedPeerId?: string | null;
  onSelectPeer: (peerId: string) => void;
  onToggleVerify: (peerId: string, currentVerifiedState: boolean) => void;
}

export default function P2PTrustMapModal({
  isOpen,
  onClose,
  peers,
  selectedPeerId,
  onSelectPeer,
  onToggleVerify,
}: P2PTrustMapModalProps) {
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Active peer or fallback to first peer
  const activePeer = peers.find((p) => p.peerId === selectedPeerId) || peers[0];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    setCopyError(null);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedFingerprint(true);
        setTimeout(() => setCopiedFingerprint(false), 2400);
        return;
      }
      throw new Error('Clipboard API not available');
    } catch (_) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (success) {
          setCopiedFingerprint(true);
          setTimeout(() => setCopiedFingerprint(false), 2400);
        } else {
          setCopyError('Copy restricted. Long-press the number below to copy.');
          setTimeout(() => setCopyError(null), 4000);
        }
      } catch (err) {
        setCopyError('Clipboard access denied. Select text manually.');
        setTimeout(() => setCopyError(null), 4000);
      }
    }
  };

  const isDirect = activePeer?.telemetry?.connectionPath.toLowerCase().includes('direct');
  const isRelayed = activePeer?.telemetry?.connectionPath.toLowerCase().includes('relay');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trustmap-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-neutral-900/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="trustmap-modal-title"
                className="text-base font-bold text-white tracking-wide flex items-center gap-2"
              >
                <span>P2P TrustMap &amp; Identity Verification</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Live
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Transport telemetry, candidate-pair path, and out-of-band safety numbers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close TrustMap"
            aria-label="Close TrustMap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Peer Selection Tabs if multiple peers */}
        {peers.length > 1 && (
          <div className="flex border-b border-white/10 bg-black/20 px-6 pt-2 overflow-x-auto gap-2">
            {peers.map((peer, idx) => (
              <button
                key={peer.peerId}
                onClick={() => onSelectPeer(peer.peerId)}
                className={`pb-2.5 px-3.5 font-medium text-xs rounded-t-lg transition flex items-center gap-2 cursor-pointer border-b-2 ${
                  activePeer?.peerId === peer.peerId
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {peer.isVerified ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : peer.hasKeyChanged ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                ) : (
                  <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>
                  {peer.displayName || `Peer #${idx + 1}`} ({peer.peerId.slice(0, 6)})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activePeer ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              <Radio className="w-8 h-8 text-neutral-600 mx-auto mb-2 animate-pulse" />
              <p>No remote peers connected to this room yet.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Once a peer enters the session, their live transport telemetry and safety fingerprint will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Key Change Warning Alert */}
              {activePeer.hasKeyChanged && (
                <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 space-y-2 animate-pulse shadow-lg shadow-rose-950/50">
                  <div className="flex items-center gap-2 font-bold text-rose-100 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>SECURITY WARNING: Peer Cryptographic Identity Changed</span>
                  </div>
                  <p className="leading-relaxed">
                    The public key received from this peer does not match the key previously verified in this browser.
                    This may occur if the peer rejoined from a new browser or private window, but could also indicate
                    an active Man-in-the-Middle (MITM) substitution on signaling.
                  </p>
                  <p className="font-semibold text-rose-300">
                    Do not transmit sensitive credentials until you re-verify this peer’s 60-digit safety number out-of-band.
                  </p>
                </div>
              )}

              {/* Peer Header Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-white text-base">
                    P
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {activePeer.displayName || 'Remote Participant'}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400">
                        #{activePeer.peerId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Connection Path Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isDirect
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isRelayed
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {isDirect ? (
                          <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                        ) : isRelayed ? (
                          <RefreshCw className="w-2.5 h-2.5 text-amber-400" />
                        ) : (
                          <Activity className="w-2.5 h-2.5 text-cyan-400" />
                        )}
                        <span>{activePeer.telemetry?.connectionPath || 'WebRTC Active'}</span>
                      </span>

                      {/* Verification Status Badge */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          activePeer.isVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {activePeer.isVerified ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Verified Peer</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-3 h-3 text-amber-400" />
                            <span>Unverified Key</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verify / Unverify Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleVerify(activePeer.peerId, activePeer.isVerified)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                    activePeer.isVerified
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-white/10'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/25'
                  }`}
                >
                  {activePeer.isVerified ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Revoke Verification</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Mark as Verified</span>
                    </>
                  )}
                </button>
              </div>

              {/* 60-Digit Deterministic Safety Number Section */}
              <div className="p-5 rounded-2xl bg-white/5 border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      ECDH Safety Fingerprint (60 Digits)
                    </h3>
                  </div>
                  {activePeer.safetyNumber && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activePeer.safetyNumber!)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono transition flex items-center gap-1.5 cursor-pointer"
                      title="Copy fingerprint to clipboard"
                    >
                      {copiedFingerprint ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-300" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {copyError && (
                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
                    {copyError}
                  </div>
                )}

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Deterministically derived from both peers’ ephemeral ECDH public keys via SHA-256.
                  Compare this number over a trusted second channel (e.g., in person or voice call) to verify identity.
                </p>

                {/* Fingerprint Display Block */}
                {activePeer.safetyNumber ? (
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-center font-mono text-xs sm:text-sm tracking-[0.22em] text-cyan-300 font-semibold select-all break-all leading-relaxed">
                    {activePeer.safetyNumber}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-neutral-500 font-mono">
                    Generating deterministic safety number...
                  </div>
                )}

                <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>
                    Identical safety numbers on both devices guarantee no intermediary altered the ephemeral session key exchange.
                  </span>
                </div>
              </div>

              {/* WebRTC Live Transport Telemetry Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Transport &amp; Network Diagnostics</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Latency RTT */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-neutral-400 block mb-1">Measured Latency</span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        activePeer.telemetry?.rtt !== null && activePeer.telemetry?.rtt !== undefined && activePeer.telemetry.rtt < 80
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {activePeer.telemetry?.rtt !== null && activePeer.telemetry?.rtt !== undefined && activePeer.telemetry.rtt > 0
                        ? `${activePeer.telemetry.rtt} ms`
                        : 'N/A (Measuring)'}
                    </span>
                  </div>

                  {/* Transport Candidate */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-neutral-400 block mb-1">Candidate Type</span>
                    <span className="font-mono text-xs text-cyan-300 block truncate" title={activePeer.telemetry?.candidateType}>
                      {activePeer.telemetry?.candidateType || 'Unknown'}
                    </span>
                  </div>

                  {/* Packet Loss */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-neutral-400 block mb-1">Packet Loss</span>
                    <span className="font-mono text-xs text-emerald-400 block">
                      {activePeer.telemetry?.packetLoss !== null && activePeer.telemetry?.packetLoss !== undefined
                        ? `${activePeer.telemetry.packetLoss}%`
                        : '0% Recorded'}
                    </span>
                  </div>

                  {/* Data Traffic */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-neutral-400 block mb-1">Traffic (Out / In)</span>
                    <span className="font-mono text-xs text-neutral-300 block">
                      {activePeer.telemetry
                        ? `${(activePeer.telemetry.bytesSent / 1024).toFixed(1)}K / ${(activePeer.telemetry.bytesReceived / 1024).toFixed(1)}K`
                        : '0 KB / 0 KB'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Standards Disclosure */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-[11px] text-neutral-400 space-y-1.5">
                <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-1">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Protocol Specification Details</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span>Media Stream Transport:</span>
                  <span className="font-mono text-neutral-200">DTLS 1.2 / SRTP (WebRTC Standard)</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span>DataChannel Payload Cipher:</span>
                  <span className="font-mono text-cyan-400">AES-GCM-256 (IV: 96-bit random)</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span>Session Key Agreement:</span>
                  <span className="font-mono text-violet-300">Ephemeral ECDH (NIST P-384)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Signaling Channel Security:</span>
                  <span className="font-mono text-amber-300">Unauthenticated ECDH (Out-of-band verification required)</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>P2PConnect Direct Trust Protocol</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
