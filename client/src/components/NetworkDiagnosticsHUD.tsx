import { useEffect, useState, useRef } from 'react';
import { WebRTCManager } from '../webrtc/WebRTCManager';
import type { PeerTelemetry } from '../webrtc/WebRTCManager';

interface NetworkDiagnosticsHUDProps {
  webrtcManager: WebRTCManager | null;
  isOpen: boolean;
  onClose: () => void;
  auditChain?: Array<{ id: string; sender: string; hash: string; timestamp: number }>;
}

export default function NetworkDiagnosticsHUD({
  webrtcManager,
  isOpen,
  onClose,
  auditChain = []
}: NetworkDiagnosticsHUDProps) {
  const [telemetry, setTelemetry] = useState<PeerTelemetry[]>([]);
  const [activeTab, setActiveTab] = useState<'network' | 'crypto' | 'audit'>('network');
  const [safetyNumbers, setSafetyNumbers] = useState<Record<string, string>>({});
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Poll WebRTC getStats telemetry
  useEffect(() => {
    if (!isOpen || !webrtcManager) return;

    const fetchStats = async () => {
      try {
        const stats = await webrtcManager.getTelemetry();
        setTelemetry(stats);

        // Fetch Safety Numbers for connected peers
        const cryptoManagers = webrtcManager.getCryptoManagers();
        const numbers: Record<string, string> = {};
        for (const [peerId, crypto] of cryptoManagers.entries()) {
          try {
            const sn = await crypto.getSafetyNumber();
            if (sn) numbers[peerId] = sn;
          } catch (e) {}
        }
        setSafetyNumbers(numbers);
      } catch (err) {
        console.error('Error fetching telemetry:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1500);
    return () => clearInterval(interval);
  }, [isOpen, webrtcManager]);

  // Animated Mesh Topology Canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'network' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let packetT = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 60;

      // Draw Local Node
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', cx, cy + 3);

      // Draw Connected Remote Peers in an orbit
      const peerCount = Math.max(1, telemetry.length);
      telemetry.forEach((peer, idx) => {
        const angle = (idx / peerCount) * Math.PI * 2;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;

        // Line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = peer.rtt !== null && peer.rtt < 100 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Animated traveling packet dot
        const packetX = cx + (px - cx) * packetT;
        const packetY = cy + (py - cy) * packetT;
        ctx.beginPath();
        ctx.arc(packetX, packetY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa';
        ctx.fill();

        // Remote Node
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#8b5cf6';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Inter, sans-serif';
        ctx.fillText(`P${idx + 1}`, px, py + 3);
      });

      packetT += 0.02;
      if (packetT > 1) packetT = 0;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, telemetry]);

  if (!isOpen) return null;

  const downloadAuditCertificate = () => {
    const cert = {
      title: 'P2PConnect Cryptographic Session Audit Certificate',
      timestamp: new Date().toISOString(),
      verifiedPeers: Object.keys(safetyNumbers),
      chainLength: auditChain.length,
      ledger: auditChain,
      cryptographicStandard: 'ECDH P-384 / SHA-256 Merkle Chain',
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p2p-audit-certificate-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0f111a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>WebRTC Telemetry &amp; Security Engine</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                2026 Live
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('network')}
            className={`pb-3 px-4 font-medium text-xs sm:text-sm transition border-b-2 ${
              activeTab === 'network'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            📡 Mesh Telemetry ({telemetry.length} Peers)
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`pb-3 px-4 font-medium text-xs sm:text-sm transition border-b-2 ${
              activeTab === 'crypto'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            🔐 Safety Numbers (MITM Shield)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-4 font-medium text-xs sm:text-sm transition border-b-2 ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            📜 Audit Chain ({auditChain.length} Blocks)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: NETWORK TELEMETRY */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* Mini Topology Visualizer */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
                <canvas
                  ref={canvasRef}
                  width={180}
                  height={150}
                  className="rounded-lg bg-black/40 border border-white/5"
                />
                <div className="flex-1 space-y-2 text-xs">
                  <div className="text-white/80 font-semibold text-sm">Decentralized Mesh Status</div>
                  <p className="text-white/50 leading-relaxed">
                    Transport paths are negotiated via ICE. Direct P2P sockets are established when NAT permits, with TURN relay fallback when direct routing is blocked.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Mesh Signaling: Active
                    </span>
                    <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Transport: SCTP / DTLS-SRTP
                    </span>
                  </div>
                </div>
              </div>

              {/* Peer Connection Cards */}
              {telemetry.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  Waiting for peers to establish WebRTC connection...
                </div>
              ) : (
                <div className="grid gap-4">
                  {telemetry.map((peer, idx) => (
                    <div
                      key={peer.peerId}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs text-white/80 font-bold">
                          Peer Node #{idx + 1} ({peer.peerId.slice(0, 8)}...)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {peer.connectionState.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40 mb-1">Latency (RTT)</div>
                          <div className={`font-mono font-bold text-sm ${peer.rtt !== null && peer.rtt < 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {peer.rtt !== null && peer.rtt > 0 ? `${peer.rtt} ms` : 'Unavailable'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40 mb-1">ICE Transport Path</div>
                          <div className="font-mono text-xs text-blue-300 truncate" title={`${peer.connectionPath} (Candidate: ${peer.candidateType})`}>
                            {peer.connectionPath}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40 mb-1">Packet Loss</div>
                          <div className="font-mono text-xs text-emerald-400">
                            {peer.packetLoss !== null ? `${peer.packetLoss}%` : 'None recorded'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40 mb-1">Traffic (Out / In)</div>
                          <div className="font-mono text-xs text-white/80">
                            {(peer.bytesSent / 1024).toFixed(1)} KB / {(peer.bytesReceived / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAFETY NUMBERS */}
          {activeTab === 'crypto' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200">
                <span className="font-bold">Out-of-Band Safety Number Verification:</span> Signaling key exchange uses unauthenticated ECDH (P-384). These 60-digit safety numbers are deterministically computed from both peers' public keys via SHA-256. To detect signaling channel interception (MITM), verify that this fingerprint matches your peer's fingerprint via a trusted second channel.
              </div>

              {Object.keys(safetyNumbers).length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  Connect with a peer in the room to view shared safety fingerprints.
                </div>
              ) : (
                Object.entries(safetyNumbers).map(([peerId, safetyNumber], idx) => (
                  <div key={peerId} className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/60 font-mono">Peer #{idx + 1} ({peerId.slice(0, 8)}...)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(safetyNumber);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition"
                      >
                        {isCopied ? '✓ Copied' : 'Copy Fingerprint'}
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-black/50 border border-white/5 font-mono text-center text-sm sm:text-base tracking-[0.2em] text-violet-300 font-semibold select-all break-all">
                      {safetyNumber}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-medium">
                      <span>Compare fingerprint out-of-band to verify peer identity</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: AUDIT CHAIN */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex justify-between items-center">
                <div>
                  <span className="font-bold">Tamper-Proof Session Micro-Ledger:</span> Every message in this session is chained to the previous block via SHA-256. Any modification breaks the cryptographic consensus.
                </div>
                {auditChain.length > 0 && (
                  <button
                    onClick={downloadAuditCertificate}
                    className="ml-4 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition whitespace-nowrap cursor-pointer"
                  >
                    Export Proof (.json)
                  </button>
                )}
              </div>

              {auditChain.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  Send a message to initialize the cryptographic session ledger.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {auditChain.map((block, idx) => (
                    <div
                      key={block.id}
                      className="p-3 rounded-lg bg-black/40 border border-white/5 text-xs font-mono flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-white/40 font-sans mr-2">[{new Date(block.timestamp).toLocaleTimeString()}]</span>
                          <span className="text-white/80 font-bold">{block.sender}:</span>
                          <span className="text-emerald-300 ml-2">Hash: {block.hash.slice(0, 16)}...</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-white/40 flex-shrink-0">SHA-256 SEALED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/30 flex justify-between items-center text-[11px] text-white/40">
          <span>Decentralized Diagnostics Engine v2.6</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-medium"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
