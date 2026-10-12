import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { WebRTCManager, type PeerTelemetry } from '../webrtc/WebRTCManager';
import { FileTransferManager } from '../file-transfer/FileTransferManager';
import VideoPlayer from '../components/VideoPlayer';
import NetworkDiagnosticsHUD from '../components/NetworkDiagnosticsHUD';
import AIMeetingNotesModal from '../components/AIMeetingNotesModal';
import AudioFrequencyWave from '../components/AudioFrequencyWave';
import ThemeToggle from '../components/ThemeToggle';
import NetworkTopology3D, { type PeerNodeData } from '../components/NetworkTopology3D';
import ErrorBoundary from '../components/ErrorBoundary';
import P2PTrustMapModal, { type TrustMapPeerData } from '../components/P2PTrustMapModal';
import { MeetingNotesEngine, type MeetingSummaryResult } from '../ai/MeetingNotesEngine';
import { PredictiveTextEngine } from '../ai/PredictiveTextEngine';
import { soundEngine } from '../utils/parrotAudio';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import CallRecorderModal from '../components/CallRecorderModal';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneCall,
  PhoneOff,
  Radio,
  Activity,
  Paperclip,
  Smile,
  Send,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  LogOut,
  Sparkles,
  FileText,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  senderName?: string;
  senderPhoto?: string;
  text: string;
  timestamp: Date;
  expiresAt?: Date | null;
  isFile?: boolean;
  fileUrl?: string;
  fileName?: string;
  isVoice?: boolean;
  voiceUrl?: string;
  voiceDuration?: number;
}

interface AuditRecord {
  id: string;
  sender: string;
  hash: string;
  timestamp: number;
}

export default function RoomPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();

  const [roomType] = useState(searchParams.get('type') || 'group');
  const [isCreator, setIsCreator] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [peers, setPeers] = useState<Record<string, string>>({});

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [ephemeralTTL, setEphemeralTTL] = useState<number>(0);
  const [fileProgress, setFileProgress] = useState<number>(0);
  const [, setCurrentChunkSize] = useState<number>(16384);
  const [securityPolicy, setSecurityPolicy] = useState<any>(null);

  // Diagnostic HUD & AI Meeting Notes state
  const [showDiagnosticsHUD, setShowDiagnosticsHUD] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummaryResult | null>(null);
  const [auditChain, setAuditChain] = useState<AuditRecord[]>([]);

  // P2P TrustMap & Safety Fingerprint State
  const [showTrustMapModal, setShowTrustMapModal] = useState(false);
  const [selectedTrustMapPeerId, setSelectedTrustMapPeerId] = useState<string | null>(null);
  const [peerSafetyNumbers, setPeerSafetyNumbers] = useState<Record<string, string>>({});
  const [peerPublicKeys, setPeerPublicKeys] = useState<Record<string, string>>({});
  const [verifiedPeers, setVerifiedPeers] = useState<Record<string, boolean>>({});
  const [keyChangeWarnings, setKeyChangeWarnings] = useState<Record<string, boolean>>({});

  // Voice activity tracking for speaker rings
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState<Record<string, boolean>>({});

  // 3D Mesh Topology & Live WebRTC Telemetry State
  const [show3DMeshTopology, setShow3DMeshTopology] = useState(false);
  const [peerTelemetry, setPeerTelemetry] = useState<PeerTelemetry[]>([]);

  // Periodically poll WebRTC telemetry & crypto keys when room or call is active
  useEffect(() => {
    if (!webrtcManagerRef.current) return;
    const fetchTelemetryAndCrypto = async () => {
      try {
        const stats = await webrtcManagerRef.current?.getTelemetry();
        if (stats) setPeerTelemetry(stats);

        const cryptoMap = webrtcManagerRef.current?.getCryptoManagers();
        if (cryptoMap) {
          const newSafetyNumbers: Record<string, string> = {};
          const newPublicKeys: Record<string, string> = {};
          const newWarnings: Record<string, boolean> = {};

          for (const [pId, crypto] of cryptoMap.entries()) {
            try {
              const sn = await crypto.getSafetyNumber();
              if (sn) newSafetyNumbers[pId] = sn;

              const pubKey = crypto.getRemotePublicKey();
              if (pubKey) {
                newPublicKeys[pId] = pubKey;
                // Detect public key change against stored verified key
                const storedKey = localStorage.getItem(`peer_key_${pId}`);
                if (storedKey && storedKey !== pubKey) {
                  newWarnings[pId] = true;
                } else if (!storedKey) {
                  localStorage.setItem(`peer_key_${pId}`, pubKey);
                }
              }
            } catch (_) {}
          }
          setPeerSafetyNumbers(newSafetyNumbers);
          setPeerPublicKeys(newPublicKeys);
          if (Object.keys(newWarnings).length > 0) {
            setKeyChangeWarnings((prev) => ({ ...prev, ...newWarnings }));
          }
        }
      } catch (_) {}
    };

    fetchTelemetryAndCrypto();
    const interval = setInterval(fetchTelemetryAndCrypto, 2000);
    return () => clearInterval(interval);
  }, [peers]);

  // Sync verified peers from localStorage
  useEffect(() => {
    const nextVerified: Record<string, boolean> = {};
    for (const [pId, pubKey] of Object.entries(peerPublicKeys)) {
      try {
        const isVer = localStorage.getItem(`verified_peer_${pubKey}`) === 'true';
        nextVerified[pId] = isVer;
      } catch (_) {
        nextVerified[pId] = false;
      }
    }
    setVerifiedPeers(nextVerified);
  }, [peerPublicKeys]);

  const handleToggleVerifyPeer = (peerId: string, currentVerified: boolean) => {
    const pubKey = peerPublicKeys[peerId];
    const newVerified = !currentVerified;
    setVerifiedPeers((prev) => ({ ...prev, [peerId]: newVerified }));
    if (pubKey) {
      try {
        if (newVerified) {
          localStorage.setItem(`verified_peer_${pubKey}`, 'true');
          localStorage.setItem(`peer_key_${peerId}`, pubKey);
          setKeyChangeWarnings((prev) => ({ ...prev, [peerId]: false }));
        } else {
          localStorage.removeItem(`verified_peer_${pubKey}`);
        }
      } catch (err) {
        console.warn('Storage unavailable for peer verification:', err);
      }
    }
  };

  const trustMapPeersList: TrustMapPeerData[] = useMemo(() => {
    return Object.keys(peers).map((peerId) => {
      const telem = peerTelemetry.find((t) => t.peerId === peerId);
      return {
        peerId,
        displayName: `Peer #${peerId.slice(0, 6)}`,
        telemetry: telem,
        safetyNumber: peerSafetyNumbers[peerId] || null,
        remotePublicKey: peerPublicKeys[peerId] || null,
        isVerified: verifiedPeers[peerId] || false,
        hasKeyChanged: keyChangeWarnings[peerId] || false,
      };
    });
  }, [peers, peerTelemetry, peerSafetyNumbers, peerPublicKeys, verifiedPeers, keyChangeWarnings]);

  const activePeerNodes: PeerNodeData[] = useMemo(() => {
    return Object.keys(peers).map((peerId) => {
      const telem = peerTelemetry.find((t) => t.peerId === peerId);
      return {
        peerId,
        displayName: `Peer #${peerId.slice(0, 6)}`,
        connectionState: peers[peerId] || telem?.connectionState || 'connecting',
        isSpeaking: remoteSpeaking[peerId] || false,
        rtt: telem?.rtt,
        candidateType: telem?.candidateType,
        connectionPath: telem?.connectionPath,
        selectedPairConfirmed: telem?.selectedPairConfirmed,
        hasAudio: !!remoteStreams[peerId]?.getAudioTracks().length,
        hasVideo: !!remoteStreams[peerId]?.getVideoTracks().length,
      };
    });
  }, [peers, peerTelemetry, remoteSpeaking, remoteStreams]);

  const localUserData = useMemo(() => ({
    id: localStorage.getItem('userId') || 'local-user',
    displayName: localStorage.getItem('displayName') || 'You (Host)',
    isSpeaking: isLocalSpeaking,
    isMuted,
    isVideoActive,
  }), [isLocalSpeaking, isMuted, isVideoActive]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteCopyError, setInviteCopyError] = useState(false);

  const handleCopyInviteLink = async () => {
    const url = `${window.location.origin}/room/${roomId}?type=${roomType}`;
    setInviteCopyError(false);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch (_) {
      try {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        const success = document.execCommand('copy');
        document.body.removeChild(input);
        if (success) {
          setCopiedInvite(true);
          setTimeout(() => setCopiedInvite(false), 2000);
        } else {
          setInviteCopyError(true);
          setTimeout(() => setInviteCopyError(false), 3000);
        }
      } catch {
        setInviteCopyError(true);
        setTimeout(() => setInviteCopyError(false), 3000);
      }
    }
  };

  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const emojis = ['😀', '😂', '🥰', '😎', '😭', '🥺', '😡', '👍', '👎', '❤️', '🔥', '✨', '🎉', '👀', '🙌', '🤔', '💯', '✅', '❌', '🙏', '👏', '🤝', '☕', '💡'];

  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(localStorage.getItem('dashboardNotes') || '');

  useEffect(() => {
    if (notes !== localStorage.getItem('dashboardNotes')) {
      localStorage.setItem('dashboardNotes', notes);
    }
  }, [notes]);

  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const fileTransferRef = useRef<FileTransferManager>(new FileTransferManager());
  const securityEngineRef = useRef<any>(null);

  // Voice note recording state & refs
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState(0);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);

  // Call recording (video/audio) state & refs with local PC save
  const [isRecordingCall, setIsRecordingCall] = useState(false);
  const [callRecordType, setCallRecordType] = useState<'video' | 'audio'>('video');
  const [callRecordSeconds, setCallRecordSeconds] = useState(0);
  const [recordedCallBlob, setRecordedCallBlob] = useState<Blob | null>(null);
  const [showCallRecorderModal, setShowCallRecorderModal] = useState(false);
  const callRecorderRef = useRef<MediaRecorder | null>(null);
  const callChunksRef = useRef<Blob[]>([]);
  const callTimerRef = useRef<any>(null);

  const [, setTick] = useState(0);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Helper to append records to cryptographic audit chain
  const appendAuditRecord = async (sender: string, content: string) => {
    try {
      const enc = new TextEncoder().encode(content);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      const hash = Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);

      setAuditChain(prev => [
        ...prev.slice(-49),
        {
          id: crypto.randomUUID(),
          sender,
          hash: `0x${hash}`,
          timestamp: Date.now()
        }
      ]);
    } catch (_) {}
  };

  useEffect(() => {
    import('../security/SecurityEngine').then(({ SecurityEngine }) => {
      const engine = new SecurityEngine();
      engine.onPolicyChanged = (policy: any) => {
        setSecurityPolicy(policy);
        if (policy.maxTTL > 0 && (ephemeralTTL === 0 || ephemeralTTL > policy.maxTTL)) {
          setEphemeralTTL(policy.maxTTL);
        }
      };
      setSecurityPolicy(engine.currentPolicy);
      securityEngineRef.current = engine;
    });

    const timer = setInterval(() => {
      const now = new Date();
      setTick(t => t + 1);
      setMessages(prev => prev.filter(msg => !msg.expiresAt || msg.expiresAt > now));
    }, 1000);

    return () => clearInterval(timer);
  }, [ephemeralTTL]);

  useEffect(() => {
    if (!roomId) return;

    const manager = new WebRTCManager(SOCKET_URL || window.location.origin);
    webrtcManagerRef.current = manager;

    manager.onConnectionStateChange = (peerId, state) => {
      setPeers(prev => ({ ...prev, [peerId]: state }));
    };

    manager.onMessageReceived = (fromId, decryptedString) => {
      try {
        const payload = JSON.parse(decryptedString);

        if (payload.type === 'file-metadata') {
          fileTransferRef.current.handleMetadata(payload.metadata);
        } else if (payload.type === 'file-chunk') {
          fileTransferRef.current.handleChunk(payload.chunk, payload.offset);
        } else if (payload.type === 'file-complete') {
          fileTransferRef.current.handleComplete(payload.fileId);
        } else if (payload.type === 'end-call') {
          setCameraStream(prev => {
            if (prev) prev.getTracks().forEach(t => t.stop());
            return null;
          });
          setScreenStream(prev => {
            if (prev) prev.getTracks().forEach(t => t.stop());
            return null;
          });
          setIsVideoActive(false);
          setIsVoiceActive(false);
          setIsScreenSharing(false);
          setIsMuted(false);
        } else if (payload.type === 'voice-note') {
          soundEngine.playMessagePop();
          const now = new Date();
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: fromId,
              senderName: payload.senderName || `Peer #${fromId.substring(0, 4)}`,
              text: 'Voice note',
              timestamp: now,
              isVoice: true,
              voiceUrl: payload.audioData,
              voiceDuration: payload.duration || 0,
              expiresAt: payload.ttl ? new Date(now.getTime() + payload.ttl * 1000) : null
            }
          ]);
          appendAuditRecord(payload.senderName || `Peer-${fromId.slice(0, 4)}`, `Voice note (${payload.duration || 0}s)`);
        } else {
          soundEngine.playMessagePop();
          const now = new Date();
          const messageText = payload.text || decryptedString;
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: fromId,
              senderName: payload.senderName,
              text: messageText,
              timestamp: now,
              expiresAt: payload.ttl ? new Date(now.getTime() + payload.ttl * 1000) : null
            }
          ]);
          appendAuditRecord(payload.senderName || `Peer-${fromId.slice(0, 4)}`, messageText);
        }
      } catch (e) {
        soundEngine.playMessagePop();
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), sender: fromId, text: decryptedString, timestamp: new Date() }
        ]);
        appendAuditRecord(`Peer-${fromId.slice(0, 4)}`, decryptedString);
      }
    };

    manager.onTrackReceived = (peerId, stream) => {
      setRemoteStreams(prev => {
        if (stream.getTracks().length === 0) {
          const next = { ...prev };
          delete next[peerId];
          return next;
        }
        return { ...prev, [peerId]: stream };
      });
    };

    fileTransferRef.current.onProgress = (progress) => {
      setFileProgress(progress);
    };

    fileTransferRef.current.onAdaptiveChunkSizeChanged = (size) => {
      setCurrentChunkSize(size);
    };

    fileTransferRef.current.onFileComplete = (blob, metadata) => {
      setFileProgress(0);
      const fileUrl = URL.createObjectURL(blob);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'Peer',
          text: `File received: ${metadata.name}`,
          timestamp: new Date(),
          isFile: true,
          fileUrl,
          fileName: metadata.name
        }
      ]);
      appendAuditRecord('P2P File Transfer', `Received ${metadata.name} (${metadata.size}B)`);
    };

    manager.joinRoom(roomId);

    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      manager.disconnect();
    };
  }, [roomId]);

  // Sync streams to WebRTCManager whenever they change
  useEffect(() => {
    if (!webrtcManagerRef.current) return;
    const combined = new MediaStream();
    if (cameraStream) cameraStream.getTracks().forEach(t => combined.addTrack(t));
    if (screenStream) screenStream.getTracks().forEach(t => combined.addTrack(t));
    webrtcManagerRef.current.setLocalStream(combined);
  }, [cameraStream, screenStream]);

  const toggleVoice = async () => {
    if (!isVoiceActive && !isVideoActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setCameraStream(stream);
        setIsVoiceActive(true);
        setIsMuted(false);
      } catch (e) {
        console.error('Error accessing microphone', e);
      }
    } else if (isVoiceActive && !isVideoActive) {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setIsVoiceActive(false);
      setIsMuted(false);
    }
  };

  const toggleVideo = async () => {
    if (!isVideoActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        if (isMuted) {
          stream.getAudioTracks().forEach(t => t.enabled = false);
        }
        setCameraStream(stream);
        setIsVideoActive(true);
        setIsVoiceActive(true);
      } catch (e) {
        console.error('Error accessing media devices', e);
      }
    } else {
      if (cameraStream) {
        cameraStream.getVideoTracks().forEach(t => t.stop());
        const newStream = new MediaStream(cameraStream.getAudioTracks());
        setCameraStream(newStream);
        setIsVideoActive(false);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } catch (e) {
        console.error('Error accessing screen share', e);
      }
    } else {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  const toggleMute = () => {
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const willMute = audioTracks[0].enabled;
        audioTracks.forEach(t => t.enabled = !willMute);
        setIsMuted(willMute);
      }
    }
  };

  const endCall = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setScreenStream(null);
    setIsVideoActive(false);
    setIsVoiceActive(false);
    setIsScreenSharing(false);
    setIsMuted(false);

    Object.keys(peers).forEach(peerId => {
      if (peers[peerId] === 'connected') {
        const channel = webrtcManagerRef.current?.getDataChannel(peerId);
        if (channel && channel.readyState === 'open') {
          webrtcManagerRef.current?.sendMessage(peerId, JSON.stringify({ type: 'end-call' }));
        }
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !webrtcManagerRef.current) return;

    const MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds the 20GB limit.');
      return;
    }

    Object.keys(peers).forEach(peerId => {
      if (peers[peerId] === 'connected') {
        const sendSecurePayload = async (payload: any) => {
          await webrtcManagerRef.current?.sendMessage(peerId, JSON.stringify(payload));
        };
        const channel = webrtcManagerRef.current?.getDataChannel(peerId);
        if (channel) {
          fileTransferRef.current.sendFile(file, channel, sendSecurePayload);
        }
      }
    });
    appendAuditRecord('Me', `Transferred file: ${file.name} (${file.size}B)`);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : inputMsg).trim();
    if (!textToSend || !webrtcManagerRef.current) return;

    if (securityEngineRef.current) {
      await securityEngineRef.current.evaluateMessage(textToSend);
    }

    let ttlToUse = parseInt(localStorage.getItem('disappearingMessages') || '0', 10);
    if (securityEngineRef.current?.currentPolicy.maxTTL > 0) {
      if (ttlToUse === 0 || securityEngineRef.current.currentPolicy.maxTTL < ttlToUse) {
        ttlToUse = securityEngineRef.current.currentPolicy.maxTTL;
      }
    }

    const senderName = localStorage.getItem('displayName') || 'Me';

    const msgPayload = JSON.stringify({
      text: textToSend,
      ttl: ttlToUse,
      senderName
    });

    Object.keys(peers).forEach(peerId => {
      if (peers[peerId] === 'connected') {
        webrtcManagerRef.current?.sendMessage(peerId, msgPayload);
      }
    });

    const now = new Date();
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'Me',
        senderName: 'Me',
        text: textToSend,
        timestamp: now,
        expiresAt: ttlToUse ? new Date(now.getTime() + ttlToUse * 1000) : null
      }
    ]);
    soundEngine.playMessagePop();
    appendAuditRecord('Me', textToSend);
    setInputMsg('');
  };

  // 1. Voice Note Recording in Chat
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceMediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setVoiceRecordSeconds(0);
      soundEngine.playRecordStart();

      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone for voice note', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      voiceMediaRecorderRef.current.stop();
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(t => t.stop());
      voiceStreamRef.current = null;
    }
    voiceChunksRef.current = [];
    setIsRecordingVoice(false);
    setVoiceRecordSeconds(0);
  };

  const sendVoiceRecording = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    const recorder = voiceMediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const durationToSend = voiceRecordSeconds;

    recorder.onstop = () => {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(t => t.stop());
        voiceStreamRef.current = null;
      }

      const audioBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
      const localBlobUrl = URL.createObjectURL(audioBlob);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        const senderName = localStorage.getItem('displayName') || 'Me';

        const payload = JSON.stringify({
          type: 'voice-note',
          audioData: base64Audio,
          duration: durationToSend,
          senderName
        });

        Object.keys(peers).forEach(peerId => {
          if (peers[peerId] === 'connected') {
            webrtcManagerRef.current?.sendMessage(peerId, payload);
          }
        });

        const now = new Date();
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: 'Me',
            senderName: 'Me',
            text: 'Voice note',
            timestamp: now,
            isVoice: true,
            voiceUrl: localBlobUrl,
            voiceDuration: durationToSend
          }
        ]);
        soundEngine.playMessagePop();
        appendAuditRecord('Me', `Recorded voice note (${durationToSend}s)`);
      };
      reader.readAsDataURL(audioBlob);

      setIsRecordingVoice(false);
      setVoiceRecordSeconds(0);
    };

    recorder.stop();
  };

  // 2. Video & Audio Call Recording with Local PC Export
  const startCallRecording = async (type: 'video' | 'audio' = isVideoActive ? 'video' : 'audio') => {
    try {
      let streamToRecord: MediaStream | null = null;

      if (type === 'video') {
        if (screenStream && screenStream.getVideoTracks().length > 0) {
          streamToRecord = new MediaStream();
          screenStream.getVideoTracks().forEach(t => streamToRecord!.addTrack(t));
        } else if (cameraStream && cameraStream.getVideoTracks().length > 0) {
          streamToRecord = new MediaStream();
          cameraStream.getVideoTracks().forEach(t => streamToRecord!.addTrack(t));
        } else {
          const fresh = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setCameraStream(fresh);
          setIsVideoActive(true);
          setIsVoiceActive(true);
          streamToRecord = fresh;
        }

        if (cameraStream) {
          cameraStream.getAudioTracks().forEach(t => {
            if (!streamToRecord!.getAudioTracks().some(at => at.id === t.id)) {
              streamToRecord!.addTrack(t);
            }
          });
        }
      } else {
        if (cameraStream && cameraStream.getAudioTracks().length > 0) {
          streamToRecord = new MediaStream(cameraStream.getAudioTracks());
        } else {
          const fresh = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCameraStream(fresh);
          setIsVoiceActive(true);
          streamToRecord = fresh;
        }
      }

      // Mix local + remote audio tracks
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const dest = audioCtx.createMediaStreamDestination();

          if (cameraStream && cameraStream.getAudioTracks().length > 0) {
            const localSource = audioCtx.createMediaStreamSource(new MediaStream(cameraStream.getAudioTracks()));
            localSource.connect(dest);
          }

          Object.values(remoteStreams).forEach(rem => {
            if (rem && rem.getAudioTracks().length > 0) {
              try {
                const remSource = audioCtx.createMediaStreamSource(new MediaStream(rem.getAudioTracks()));
                remSource.connect(dest);
              } catch (_) {}
            }
          });

          const mixedAudioTrack = dest.stream.getAudioTracks()[0];
          if (mixedAudioTrack) {
            streamToRecord.getAudioTracks().forEach(t => streamToRecord!.removeTrack(t));
            streamToRecord.addTrack(mixedAudioTrack);
          }
        }
      } catch (_) {}

      let mimeType = type === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = new MediaRecorder(streamToRecord, mimeType ? { mimeType } : undefined);
      callRecorderRef.current = recorder;
      callChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          callChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(callChunksRef.current, {
          type: type === 'video' ? 'video/webm' : 'audio/webm'
        });
        setRecordedCallBlob(finalBlob);
        setShowCallRecorderModal(true);
        setIsRecordingCall(false);
        soundEngine.playRecordStop();
      };

      recorder.start(1000);
      setIsRecordingCall(true);
      setCallRecordType(type);
      setCallRecordSeconds(0);
      soundEngine.playRecordStart();

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start call recording:', err);
      alert('Could not start call recording. Please ensure camera/microphone permissions are granted.');
    }
  };

  const stopCallRecording = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (callRecorderRef.current && callRecorderRef.current.state !== 'inactive') {
      callRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
        voiceMediaRecorderRef.current.stop();
      }
      if (callRecorderRef.current && callRecorderRef.current.state !== 'inactive') {
        callRecorderRef.current.stop();
      }
    };
  }, []);

  const [aiSummary, setAiSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const handleSummarize = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const summaryResult = MeetingNotesEngine.generateNotes(messages);
      setMeetingSummary(summaryResult);
      setShowNotesModal(true);
      setAiSummary("Meeting Summary Generated:\n\n" + summaryResult.executiveSummary);
    } catch (e) {
      console.error(e);
      setAiSummary("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExtractActions = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const summaryResult = MeetingNotesEngine.generateNotes(messages);
      setMeetingSummary(summaryResult);
      setShowNotesModal(true);
    } catch (e) {
      console.error(e);
      setAiSummary("Failed to generate action items.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // WebSocket connection & Backend Validation
  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/rooms/${encodeURIComponent(roomId || '')}`)
      .then(r => r.json())
      .then(d => {
        if (!active) return;
        if (d && d.room) {
          const userId = localStorage.getItem('userId');
          if (userId && d.room.creatorId === userId) {
            setIsCreator(true);
          }
        }
      })
      .catch(() => {});

    const socketIo = io(SOCKET_URL || window.location.origin);
    setSocket(socketIo);

    socketIo.on('connect', () => {
      const storedPass = localStorage.getItem(`room_pass_${roomId}`);
      socketIo.emit('join-room', {
        roomId,
        userId: localStorage.getItem('userId') || 'anon',
        password: storedPass
      });

      socketIo.on('join-denied', ({ reason }: { reason: string }) => {
        let title = 'Access Denied';
        let detail = 'You could not join the room.';
        if (reason === 'SCHEDULED_FOR_FUTURE') {
          title = 'Call Scheduled for Later';
          detail = 'This call has not started yet. Please return at the scheduled time.';
        } else if (reason === 'ROOM_FULL') {
          title = 'Room Full';
          detail = 'This room has reached maximum capacity.';
        } else if (reason === 'INVALID_PASSWORD') {
          title = 'Incorrect Password';
          detail = 'The password entered for this room is incorrect.';
        }
        sessionStorage.setItem('roomExitNotice', detail || title);
        navigate('/dashboard');
      });

      socketIo.on('peer-joined', ({ peerId }: { peerId: string }) => {
        setPeers(prev => ({ ...prev, [peerId]: 'connecting' }));
      });

      socketIo.on('user-disconnected', (peerId: string) => {
        setPeers(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      });

      socketIo.on('room-closed', () => {
        sessionStorage.setItem('roomExitNotice', 'The call was concluded.');
        navigate('/dashboard');
      });

      socketIo.on('receive-message', (data: any) => {
        setMessages(prev => [...prev, data]);
      });
    });

    return () => {
      active = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomId, navigate]);

  // Predictive Smart Chips calculation
  const lastPeerMessage = messages.slice().reverse().find(m => m.sender !== 'Me')?.text;
  const smartChips = PredictiveTextEngine.getContextualChips(lastPeerMessage);
  const inlineGhost = PredictiveTextEngine.getInlinePrediction(inputMsg);

  const isCallActive = isVideoActive || isVoiceActive || isScreenSharing || Object.keys(remoteStreams).length > 0;

  return (
    <div className="flex flex-col h-screen text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-[#0b141a] relative overflow-hidden select-none transition-colors duration-300">
      
      {/* Liquid Glass Professional Header */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between liquid-glass relative z-30 shadow-md">
        <div className="flex items-center gap-3">
          
          {/* Back button to dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#202c33] transition cursor-pointer"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Room Title & Encryption Badge */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setShowGroupInfo(true)}
          >
            <div className="w-10 h-10 rounded-full bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30 flex items-center justify-center text-lg font-bold overflow-hidden shadow-sm">
              {roomType === 'p2p' ? (
                <img src="/assets/p2p_connect_icon.png" alt="P2P" className="w-9 h-9 object-contain rounded-full shadow" />
              ) : (
                '👥'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-[#00a884] transition-colors">
                  {roomType === 'p2p' ? 'Direct P2P Call' : 'Group Call Room'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300">
                  #{roomId?.slice(0, 8)}
                </span>
              </div>
              <div className="text-[11px] text-[#00a884] flex items-center gap-1.5 mt-0.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                {Object.keys(peers).length > 0 ? (
                  <span>{Object.keys(peers).length} participant{Object.keys(peers).length > 1 ? 's' : ''} connected</span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-400">Waiting for others to join...</span>
                )}
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span
                  className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1 cursor-help"
                  title="Media streams use WebRTC DTLS-SRTP transport encryption. Chat text and files use AES-GCM-256 over DataChannels via ephemeral ECDH (P-384). Key exchange over signaling is unauthenticated unless safety numbers are verified out-of-band."
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400 inline" /> DTLS-SRTP Media | AES-GCM DataChannel
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex gap-2 items-center">
          
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* P2P TrustMap & Safety Fingerprint Header Button */}
          <button
            onClick={() => {
              setSelectedTrustMapPeerId(Object.keys(peers)[0] || null);
              setShowTrustMapModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm ${
              Object.values(keyChangeWarnings).some(Boolean)
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : Object.keys(peers).length > 0 && Object.values(verifiedPeers).every(Boolean)
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-neutral-100 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942]'
            }`}
            title="P2P TrustMap: View ICE candidate paths and verify safety numbers"
            aria-label="P2P TrustMap: View ICE candidate paths and verify safety numbers"
          >
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">TrustMap</span>
            {Object.values(keyChangeWarnings).some(Boolean) ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            ) : Object.keys(peers).length > 0 && Object.values(verifiedPeers).every(Boolean) ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            ) : null}
          </button>

          {/* 3D Peer Mesh Topology Toggle */}
          <button
            onClick={() => setShow3DMeshTopology(!show3DMeshTopology)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm ${
              show3DMeshTopology
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 ring-2 ring-cyan-400/20'
                : 'bg-neutral-100 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942]'
            }`}
            title={show3DMeshTopology ? 'Hide 3D Peer Mesh' : 'View Live 3D Peer Network Topology'}
            aria-label={show3DMeshTopology ? 'Hide 3D Peer Mesh' : 'View Live 3D Peer Network Topology'}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">3D Mesh</span>
          </button>

          {/* Diagnostics HUD Button */}
          <button
            onClick={() => setShowDiagnosticsHUD(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942] transition cursor-pointer shadow-sm"
            title="Connection Diagnostics"
            aria-label="Connection Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>

          {/* AI Meeting Notes Button */}
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || messages.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              messages.length > 0
                ? 'bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30 hover:bg-[#00a884]/25'
                : 'bg-neutral-100 dark:bg-[#202c33] text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
            }`}
            title="Generate Meeting Notes"
            aria-label="Generate Meeting Notes"
          >
            {isSummarizing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Notes</span>
              </>
            )}
          </button>

          {/* Quick Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded-full transition cursor-pointer flex items-center justify-center ${
              showNotes
                ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-400'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Quick Notes"
            aria-label="Quick Notes"
          >
            <FileText className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </button>

          {/* Media Calling Controls (Visible when call is not yet activated) */}
          {!isCallActive && (
            <div className="flex gap-1.5 ml-1">
              <button
                onClick={toggleVoice}
                className="p-2 rounded-full bg-[#00a884] text-white hover:bg-[#02906f] transition shadow-sm cursor-pointer"
                title="Start Voice Call"
                aria-label="Start Voice Call"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
              <button
                onClick={toggleVideo}
                className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition shadow-sm cursor-pointer"
                title="Start Video Call"
                aria-label="Start Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dedicated Call Recording Button in Header */}
          <button
            onClick={isRecordingCall ? stopCallRecording : () => startCallRecording(isVideoActive ? 'video' : 'audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm ${
              isRecordingCall
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                : 'bg-neutral-100 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942]'
            }`}
            title={isRecordingCall ? 'Stop Call Recording & Save to Computer' : `Record ${isVideoActive ? 'Video' : 'Audio'} Call to Computer`}
            aria-label={isRecordingCall ? 'Stop Call Recording & Save to Computer' : `Record ${isVideoActive ? 'Video' : 'Audio'} Call to Computer`}
          >
            {isRecordingCall ? (
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span>
              {isRecordingCall
                ? `REC ${Math.floor(callRecordSeconds / 60)}:${String(callRecordSeconds % 60).padStart(2, '0')}`
                : 'Record Call'}
            </span>
          </button>

          {/* Close Room / Leave */}
          {isCreator ? (
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${API_URL}/rooms/close`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inviteCode: roomId, userId: localStorage.getItem('userId') })
                  });
                  if (res.ok) {
                    if (socket) socket.emit('close-room', roomId);
                  }
                } catch (err) {}
                navigate('/dashboard');
              }}
              className="p-2 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
              title="End Call For All"
              aria-label="End Call For All"
            >
              <PhoneOff className="w-4 h-4 text-rose-500" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full bg-neutral-100 dark:bg-[#202c33] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942] transition cursor-pointer"
              title="Leave Call"
              aria-label="Leave Call"
            >
              <LogOut className="w-4 h-4 text-neutral-400 hover:text-neutral-200" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace: Split View for WhatsApp Video Area & WhatsApp Chat */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-20">
        
        {/* Floating Scratchpad Notes */}
        {showNotes && (
          <div className="absolute top-4 right-4 z-50 w-80 p-4 rounded-3xl shadow-2xl liquid-glass-card flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <img src="/assets/quick_notes_icon.png" alt="Quick Notes" className="w-5 h-5 object-contain drop-shadow" />
                <span>Quick Notes</span>
              </h3>
              <button onClick={() => setShowNotes(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-xs cursor-pointer">✕</button>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Private notes saved locally..."
              className="w-full bg-neutral-50 dark:bg-[#202c33] border border-neutral-200 dark:border-white/10 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 h-60 text-xs text-neutral-800 dark:text-neutral-200 resize-none placeholder-neutral-400"
            />
          </div>
        )}

        {/* Interactive 3D Peer Mesh Stage (when no call is active and 3D view is toggled) */}
        {show3DMeshTopology && !isCallActive && (
          <div className="w-full bg-[#0c1317] p-4 sm:p-6 border-b border-[#202c33] flex flex-col items-center animate-fade-in relative z-20">
            <div className="w-full max-w-5xl flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white tracking-wide font-mono uppercase">
                  Live 3D Peer Network Topology
                </span>
                <span className="text-[10px] text-cyan-300 font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                  {activePeerNodes.length + 1} Nodes Connected
                </span>
              </div>
              <button
                onClick={() => setShow3DMeshTopology(false)}
                className="text-xs text-neutral-400 hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                ✕ Close 3D View
              </button>
            </div>
            <div className="w-full max-w-5xl">
              <ErrorBoundary isWebGL fallbackTitle="3D Peer Network Offline" fallbackDescription="The 3D WebGL renderer encountered an error. 2D fallback mode active.">
                <NetworkTopology3D
                  localUser={localUserData}
                  peers={activePeerNodes}
                  onSelectPeer={() => setShowDiagnosticsHUD(true)}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* WhatsApp Call Stage (Active Media Panel) */}
        {isCallActive && (
          <div className="flex-[2.5] bg-[#0c1317] p-4 sm:p-6 flex flex-col items-center justify-center relative shadow-2xl z-20 overflow-y-auto max-h-[50vh] md:max-h-none border-b md:border-b-0 md:border-r border-[#202c33]">
            
            {/* Call Recording Active Pill Banner */}
            {isRecordingCall && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl px-4 py-1.5 rounded-full shadow-2xl text-white text-xs font-semibold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>REC {Math.floor(callRecordSeconds / 60)}:{String(callRecordSeconds % 60).padStart(2, '0')}</span>
                <span className="opacity-75">({callRecordType === 'video' ? 'Video' : 'Audio'})</span>
                <button
                  type="button"
                  onClick={stopCallRecording}
                  className="ml-2 px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white transition cursor-pointer"
                >
                  Stop & Save
                </button>
              </div>
            )}

            {/* Real Interactive 3D Mesh Topology in Call Stage */}
            {show3DMeshTopology && (
              <div className="w-full max-w-5xl mb-6 relative z-10 animate-fade-in">
                <ErrorBoundary isWebGL fallbackTitle="3D Call Stage Mesh Offline" fallbackDescription="The 3D WebGL renderer encountered an error. 2D fallback mode active.">
                  <NetworkTopology3D
                    localUser={localUserData}
                    peers={activePeerNodes}
                    onSelectPeer={() => setShowDiagnosticsHUD(true)}
                  />
                </ErrorBoundary>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full h-full max-w-6xl items-center pb-20">
              
              {/* Local Stream Tile */}
              {(isVideoActive || isVoiceActive) && (
                <div className={`relative flex-1 min-w-[280px] sm:min-w-[340px] max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 flex items-center justify-center bg-[#111b21] ${
                  isLocalSpeaking
                    ? 'border-[#00a884] shadow-[0_0_30px_rgba(0,168,132,0.45)] ring-2 ring-emerald-500/20'
                    : 'border-[#202c33]'
                }`}>
                  {/* Top HUD Overlay for Local User */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1 shadow-sm">
                      <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                      <span>Local Peer Node</span>
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm ${
                      isMuted
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isMuted ? <MicOff className="w-2.5 h-2.5 text-rose-400" /> : <Mic className="w-2.5 h-2.5 text-emerald-400" />}
                      <span>{isMuted ? 'Muted' : 'Mic Active'}</span>
                    </span>
                  </div>

                  {/* Audio-Reactive Glowing Rings */}
                  {isLocalSpeaking && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-emerald-400/30 animate-ping opacity-40" />
                      <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-cyan-400/25 animate-pulse opacity-50" />
                    </div>
                  )}

                  {isVideoActive && cameraStream ? (
                    <div className="w-full h-full">
                      <VideoPlayer stream={cameraStream} isLocal={true} />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[#111b21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                        <span>You (Host)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-6 relative z-10">
                      <div className={`w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl mb-4 border-2 transition-transform duration-300 relative z-10 ${
                        isLocalSpeaking ? 'scale-110 shadow-[0_0_30px_rgba(0,168,132,0.7)] border-emerald-400 ring-4 ring-emerald-500/30' : 'border-white/20'
                      }`}>
                        {localStorage.getItem('avatarUrl') ? (
                          <img src={localStorage.getItem('avatarUrl')!} alt="You" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-white">You</span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-300 mb-3 font-medium">Microphone On</span>
                      <AudioFrequencyWave
                        stream={cameraStream}
                        isMuted={isMuted}
                        onSpeakingChange={setIsLocalSpeaking}
                        width={180}
                        height={36}
                      />
                    </div>
                  )}

                  {/* Audio Frequency Wave overlay in bottom right */}
                  {isVideoActive && (
                    <div className="absolute bottom-3 right-3">
                      <AudioFrequencyWave
                        stream={cameraStream}
                        isMuted={isMuted}
                        onSpeakingChange={setIsLocalSpeaking}
                        width={100}
                        height={24}
                        barCount={14}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Screen Share Tile */}
              {isScreenSharing && screenStream && (
                <div className="relative flex-1 min-w-[280px] sm:min-w-[340px] max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-blue-500/40 bg-black flex items-center justify-center">
                  <VideoPlayer stream={screenStream} isLocal={true} />
                  <div className="absolute bottom-3 left-3 bg-[#111b21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    <span>Your Screen</span>
                  </div>
                </div>
              )}

              {/* Remote Peer Stream Tiles with P2P TrustMap & Audio Indicators */}
              {Object.keys(peers).map((peerId) => {
                const stream = remoteStreams[peerId];
                const hasVideo = stream ? stream.getVideoTracks().length > 0 : false;
                const isSpeaking = remoteSpeaking[peerId] || false;
                const telem = peerTelemetry.find((t) => t.peerId === peerId);
                const isDirect = telem?.connectionPath.toLowerCase().includes('direct');
                const isRelayed = telem?.connectionPath.toLowerCase().includes('relay');
                const isVerified = verifiedPeers[peerId];
                const hasKeyChanged = keyChangeWarnings[peerId];

                return (
                  <div
                    key={peerId}
                    className={`relative flex-1 min-w-[280px] sm:min-w-[340px] max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 flex items-center justify-center bg-[#111b21] ${
                      isSpeaking
                        ? 'border-[#00a884] shadow-[0_0_30px_rgba(0,168,132,0.45)] ring-2 ring-emerald-500/20'
                        : hasKeyChanged
                        ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                        : isVerified
                        ? 'border-emerald-500/40'
                        : 'border-[#202c33]'
                    }`}
                  >
                    {/* Top HUD Overlay: Transport & TrustMap Verification Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm ${
                            isDirect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isRelayed
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          <span>{isDirect ? 'Direct P2P' : isRelayed ? 'Relayed (TURN)' : 'P2P Active'}</span>
                        </span>
                        {telem?.rtt !== null && telem?.rtt !== undefined && telem.rtt > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-emerald-400 border border-white/10 backdrop-blur-md shadow-sm">
                            {telem.rtt} ms
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrustMapPeerId(peerId);
                          setShowTrustMapModal(true);
                        }}
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 transition cursor-pointer shadow-sm ${
                          hasKeyChanged
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 animate-pulse'
                            : isVerified
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/35'
                            : 'bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:bg-amber-500/35'
                        }`}
                        title="P2P TrustMap: Verify peer identity fingerprint"
                        aria-label="P2P TrustMap: Verify peer identity fingerprint"
                      >
                        {hasKeyChanged ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>Key Changed!</span>
                          </>
                        ) : isVerified ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-3 h-3 text-amber-400" />
                            <span>Verify Safety</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Audio-Reactive Glowing Rings */}
                    {isSpeaking && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-emerald-400/30 animate-ping opacity-40" />
                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-cyan-400/25 animate-pulse opacity-50" />
                      </div>
                    )}

                    {/* Video / Audio Content */}
                    {hasVideo && stream ? (
                      <div className="w-full h-full">
                        <VideoPlayer stream={stream} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center p-6 relative z-10">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl mb-4 transition-transform duration-300 relative z-10 border-2 ${
                          isSpeaking
                            ? 'scale-110 shadow-[0_0_30px_rgba(16,185,129,0.7)] border-emerald-400 ring-4 ring-emerald-500/30'
                            : 'border-white/20'
                        }`}>
                          <span className="text-xl font-bold text-white">Peer</span>
                        </div>
                        <span className="text-xs text-neutral-300 mb-3 font-medium">Participant #{peerId.substring(0, 4)}</span>
                        {stream ? (
                          <AudioFrequencyWave
                            stream={stream}
                            onSpeakingChange={(spk) => setRemoteSpeaking((prev) => ({ ...prev, [peerId]: spk }))}
                            width={180}
                            height={36}
                          />
                        ) : (
                          <span className="text-[11px] text-neutral-500">Connected via P2P DataChannel</span>
                        )}
                      </div>
                    )}

                    {/* Bottom Pill: Peer Name */}
                    <div className="absolute bottom-3 left-3 bg-[#111b21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></span>
                      <span>Peer #{peerId.substring(0, 4)}</span>
                    </div>

                    {hasVideo && stream && (
                      <div className="absolute bottom-3 right-3">
                        <AudioFrequencyWave
                          stream={stream}
                          onSpeakingChange={(spk) => setRemoteSpeaking((prev) => ({ ...prev, [peerId]: spk }))}
                          width={100}
                          height={24}
                          barCount={14}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Futuristic Floating HUD Call Controls Dock */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 sm:gap-3.5 items-center liquid-glass-dock px-4 sm:px-6 py-2.5 rounded-full z-30 shadow-2xl border border-cyan-500/30">
              
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5 text-emerald-400" />}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  !isVideoActive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isVideoActive ? 'Turn Off Camera' : 'Turn On Camera'}
                aria-label={isVideoActive ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {!isVideoActive ? <VideoOff className="w-5 h-5 text-rose-400" /> : <Video className="w-5 h-5 text-blue-400" />}
              </button>

              {/* Screen Share Toggle */}
              <button
                onClick={toggleScreenShare}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  isScreenSharing
                    ? 'bg-[#00a884] text-white shadow-md ring-2 ring-[#00a884]/40'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <Monitor className={`w-5 h-5 ${isScreenSharing ? 'text-white' : 'text-cyan-400'}`} />
              </button>

              {/* P2P TrustMap & Safety Fingerprint Dock Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTrustMapPeerId(Object.keys(peers)[0] || null);
                  setShowTrustMapModal(true);
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md bg-[#202c33] hover:bg-[#2a3942] text-amber-400 border border-amber-500/30 relative"
                title="P2P TrustMap & Safety Fingerprint Verification"
                aria-label="P2P TrustMap & Safety Fingerprint Verification"
              >
                <Fingerprint className="w-5 h-5 text-amber-300" />
                {Object.values(keyChangeWarnings).some(Boolean) ? (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                ) : Object.keys(peers).length > 0 && Object.values(verifiedPeers).every(Boolean) ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                ) : null}
              </button>

              {/* 3D Peer Mesh Topology Toggle */}
              <button
                onClick={() => setShow3DMeshTopology(!show3DMeshTopology)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  show3DMeshTopology
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] ring-2 ring-cyan-400/30'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-cyan-400'
                }`}
                title={show3DMeshTopology ? 'Hide 3D Peer Mesh' : 'View 3D Peer Network Topology'}
                aria-label={show3DMeshTopology ? 'Hide 3D Peer Mesh' : 'View 3D Peer Network Topology'}
              >
                <Activity className="w-5 h-5 text-cyan-300" />
              </button>

              {/* Call Record Toggle Button */}
              <button
                onClick={isRecordingCall ? stopCallRecording : () => startCallRecording(isVideoActive ? 'video' : 'audio')}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  isRecordingCall
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 animate-pulse'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-rose-400'
                }`}
                title={isRecordingCall ? 'Stop Call Recording & Save to Computer' : `Record ${isVideoActive ? 'Video' : 'Audio'} Call`}
                aria-label={isRecordingCall ? 'Stop Call Recording & Save to Computer' : `Record ${isVideoActive ? 'Video' : 'Audio'} Call`}
              >
                <Radio className={`w-5 h-5 ${isRecordingCall ? 'text-white' : 'text-rose-400'}`} />
              </button>

              {/* Hang Up Red Button */}
              <button
                onClick={endCall}
                className="bg-[#ea0038] hover:bg-[#d00030] text-white rounded-full w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Hang Up Call"
                aria-label="Hang Up Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* WhatsApp Chat Area */}
        <div className="flex-1 flex flex-col relative min-w-0 md:min-w-[340px] bg-neutral-100 dark:bg-[#0b141a]">
          
          {/* Security Policy Banner if active */}
          {securityPolicy && (
            <div className="border-b border-[#202c33] bg-[#182229]">
              <div
                className="p-2 text-center text-xs font-medium text-amber-300 cursor-pointer hover:bg-white/5 transition flex items-center justify-center gap-1.5"
                onClick={() => setShowSecurityDetails(!showSecurityDetails)}
              >
                <span>🔒 Encrypted Transport &amp; Data Channels</span>
                <span className="text-[10px] text-amber-400/80">({showSecurityDetails ? 'hide details' : 'view details'})</span>
              </div>
              {showSecurityDetails && (
                <div className="p-3 text-xs bg-black/40 text-neutral-300 space-y-1 text-center border-t border-amber-500/20">
                  <p><strong className="text-white">Classification:</strong> {securityPolicy.level}</p>
                  <p><strong className="text-white">Media Transport:</strong> DTLS-SRTP (WebRTC Standard)</p>
                  <p><strong className="text-white">DataChannel Payloads:</strong> AES-GCM-256 via Ephemeral ECDH (P-384)</p>
                  <p><strong className="text-white">Signaling Key Exchange:</strong> Unauthenticated ECDH (Verify Safety Numbers out-of-band for MITM defense)</p>
                  <p><strong className="text-white">TTL:</strong> {securityPolicy.maxTTL > 0 ? `${securityPolicy.maxTTL}s` : 'Permanent'}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            
            {/* WhatsApp Yellow Security Disclaimer Pill */}
            <div className="mx-auto my-2 max-w-md bg-[#ffeebd] dark:bg-[#182229] border border-amber-300 dark:border-amber-500/20 px-3.5 py-1.5 rounded-xl text-center text-[11px] text-amber-900 dark:text-[#ffd279] shadow-sm">
              🔒 Media uses DTLS-SRTP transport encryption. Chat text/files use AES-GCM-256 over DataChannel. Verify Safety Numbers independently to confirm peer identity.
            </div>

            {messages.length === 0 && (
              <div className="my-auto text-center p-6 text-neutral-400 dark:text-neutral-500 text-xs">
                <img
                  src="/assets/p2p_connect_icon.png"
                  alt="P2PConnect"
                  className="w-14 h-14 mx-auto mb-3 object-contain drop-shadow-md hover:scale-105 transition-transform"
                />
                <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Direct Encrypted P2P Chat</p>
                <p className="text-[11px]">Type a message below to start chatting directly via WebRTC.</p>
              </div>
            )}

            {messages.map(msg => {
              const isMe = msg.sender === 'Me';
              return (
                <div key={msg.id} className={`flex max-w-[82%] gap-2 ${isMe ? 'self-end' : 'self-start'}`}>
                  
                  <div className="flex flex-col min-w-0">
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs relative shadow-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-neutral-900 dark:text-white rounded-tr-none'
                          : 'bg-white dark:bg-[#202c33] text-neutral-900 dark:text-white rounded-tl-none border border-neutral-200 dark:border-transparent'
                      }`}
                    >
                      {!isMe && (
                        <span className="text-[11px] font-bold block mb-0.5 text-[#53bdeb]">
                          {msg.senderName || `Peer #${msg.sender.substring(0, 4)}`}
                        </span>
                      )}

                      {msg.isFile && msg.fileUrl ? (
                        <a
                          href={msg.fileUrl}
                          download={msg.fileName}
                          className="font-medium text-[#00a884] dark:text-[#53bdeb] underline break-all flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-black/20"
                        >
                          <span>📎</span>
                          <span>{msg.fileName}</span>
                          <span className="text-[10px] uppercase font-bold ml-auto">Download</span>
                        </a>
                      ) : msg.isVoice && msg.voiceUrl ? (
                        <VoiceMessagePlayer audioUrl={msg.voiceUrl} duration={msg.voiceDuration} isMe={isMe} />
                      ) : (
                        <span className="break-words whitespace-pre-wrap">{msg.text}</span>
                      )}

                      <div className="flex justify-end items-center mt-1 gap-1.5 text-[10px] text-neutral-500 dark:text-white/60">
                        {msg.expiresAt && (
                          <span className="text-amber-500 dark:text-amber-300 flex items-center gap-0.5 mr-1 font-semibold">
                            ⏱ {Math.max(0, Math.ceil((msg.expiresAt.getTime() - Date.now()) / 1000))}s
                          </span>
                        )}
                        <span>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-[#53bdeb] font-bold">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Summary Banner */}
          {aiSummary && (
            <div className="mx-4 mb-2 p-3 text-xs border rounded-2xl shadow-lg bg-white dark:bg-[#1f2c34] border-neutral-200 dark:border-white/10 text-neutral-800 dark:text-neutral-200 animate-fade-in">
              <div className="flex justify-between items-center mb-1 text-[#00a884] font-bold">
                <span className="flex items-center gap-1.5">
                  <span>✨</span> Meeting Summary
                </span>
                <button onClick={() => setAiSummary('')} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer">✕</button>
              </div>
              <p className="whitespace-pre-wrap text-xs">{aiSummary}</p>
            </div>
          )}

          {/* Contextual Smart Quick Reply Chips */}
          {smartChips.length > 0 && (
            <div className="px-4 py-1.5 flex gap-2 overflow-x-auto no-scrollbar">
              {smartChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(undefined, chip)}
                  className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-[#202c33] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-[#00a884]/10 hover:border-[#00a884] transition shadow-sm cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* WhatsApp-Style Input & Action Bar */}
          <div className="p-2.5 bg-white dark:bg-[#202c33] border-t border-neutral-200 dark:border-[#111b21] flex flex-col gap-2">
            
            {/* File Transfer Progress Bar */}
            {fileProgress > 0 && (
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-[#111b21] border border-neutral-200 dark:border-white/10 text-xs">
                <div className="flex justify-between font-semibold mb-1 text-neutral-800 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00a884] animate-ping"></span>
                    Direct File Transfer
                  </span>
                  <span className="text-[#00a884]">{Math.round(fileProgress)}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#00a884] h-full rounded-full transition-all duration-200"
                    style={{ width: `${fileProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isRecordingVoice ? (
              <div className="flex items-center justify-between gap-3 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 rounded-full px-4 py-2 text-xs w-full shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Recording Voice Note...</span>
                  <span className="font-mono text-neutral-900 dark:text-white px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                    {Math.floor(voiceRecordSeconds / 60)}:{String(voiceRecordSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Pulsing Animated Waveform */}
                <div className="flex items-center gap-1 h-5 flex-1 max-w-[140px] justify-center overflow-hidden">
                  {[40, 75, 50, 90, 60, 100, 35, 80, 55, 95, 45, 70].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="px-3 py-1.5 rounded-full text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition cursor-pointer font-medium"
                    title="Cancel recording"
                  >
                    Cancel
                  </button>

                  {/* Send Voice Note Button */}
                  <button
                    type="button"
                    onClick={sendVoiceRecording}
                    className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center transition shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                    title="Send Voice Note"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={e => handleSend(e)} className="flex items-center gap-2">
                
                {/* WhatsApp Rounded Input Capsule */}
                <div className="flex-1 flex items-center gap-2 bg-neutral-100 dark:bg-[#2a3942] rounded-full px-3.5 py-1.5 shadow-sm border border-neutral-200 dark:border-transparent focus-within:ring-2 focus-within:ring-[#00a884]/40">
                  
                  {/* Emoji Picker Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 text-neutral-500 dark:text-[#8696a0] hover:text-neutral-700 dark:hover:text-white transition cursor-pointer"
                      title="Insert Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-2 left-0 p-3 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-64 z-50 bg-white dark:bg-[#111b21] animate-fade-in">
                        <div className="grid grid-cols-6 gap-2">
                          {emojis.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setInputMsg(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="hover:bg-neutral-100 dark:hover:bg-[#202c33] p-1 rounded-lg text-lg transition transform hover:scale-110 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct P2P File Attachment */}
                  <label className="p-1 cursor-pointer text-neutral-500 dark:text-[#8696a0] hover:text-[#00a884] transition" title="Attach File">
                    <Paperclip className="w-5 h-5" />
                    <input type="file" className="hidden" onChange={handleFileSelect} />
                  </label>

                  {/* Text Input with Ghost Predictive Autocomplete */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && inlineGhost) {
                          e.preventDefault();
                          setInputMsg(inputMsg + inlineGhost);
                        } else if (e.key === 'Enter' && inputMsg.trim()) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full bg-transparent border-0 px-1 py-1 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-[#8696a0] focus:outline-none"
                    />

                    {inlineGhost && inputMsg.length > 0 && (
                      <div
                        onClick={() => setInputMsg(inputMsg + inlineGhost)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded cursor-pointer hidden sm:block"
                      >
                        Tab: <span>{inlineGhost.slice(0, 14)}...</span>
                      </div>
                    )}
                  </div>

                  {/* AI Dropdown Action Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAiMenu(!showAiMenu)}
                      disabled={isSummarizing || messages.length === 0}
                      className={`p-1 text-xs transition flex items-center justify-center cursor-pointer ${
                        messages.length > 0
                          ? 'text-[#00a884] hover:scale-110'
                          : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-40'
                      }`}
                      title="AI Notes & Actions"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    {showAiMenu && (
                      <div className="absolute bottom-full mb-2 right-0 p-1.5 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-48 z-50 bg-white dark:bg-[#111b21] text-xs animate-fade-in">
                        <button
                          type="button"
                          onClick={() => { handleSummarize(); setShowAiMenu(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#202c33] text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                        >
                          Summarize Conversation
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExtractActions(); setShowAiMenu(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#202c33] text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                        >
                          Extract Action Items
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* WhatsApp Iconic Circular Send / Mic Button */}
                {inputMsg.trim() ? (
                  <button
                    type="submit"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 transform shrink-0 shadow-md bg-[#00a884] hover:bg-[#02906f] text-white active:scale-95 cursor-pointer shadow-emerald-600/30"
                    title="Send message"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 transform shrink-0 shadow-md bg-[#00a884] hover:bg-[#02906f] text-white active:scale-95 cursor-pointer shadow-emerald-600/30 group"
                    title="Record voice note"
                  >
                    <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Room Info Drawer */}
        {showGroupInfo && (
          <div className="w-80 flex flex-col border-l border-neutral-200 dark:border-[#202c33] bg-white dark:bg-[#111b21] shadow-2xl z-30 animate-fade-in">
            <div className="p-4 flex items-center justify-between border-b border-neutral-200 dark:border-[#202c33]">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {roomType === 'p2p' ? 'Direct Call Details' : 'Group Call Details'}
              </h2>
              <button onClick={() => setShowGroupInfo(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-xs cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202c33] border border-neutral-200 dark:border-transparent flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center text-3xl mb-3">
                  {roomType === 'p2p' ? '📞' : '👥'}
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">{roomType === 'p2p' ? 'Direct Call' : 'Group Room'}</h3>
                <p className="text-xs text-[#00a884] mt-1 font-medium">
                  {Object.keys(peers).length + 1} participant{Object.keys(peers).length > 0 ? 's' : ''} in room
                </p>
              </div>

              {/* Secure Invite Link */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#202c33] border border-neutral-200 dark:border-transparent">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 block mb-2 font-semibold">Share Invite Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/room/${roomId}?type=${roomType}`}
                    className="flex-1 p-2 rounded-xl text-xs bg-white dark:bg-[#111b21] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 font-mono"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95 ${
                      inviteCopyError
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#00a884] hover:bg-[#02906f] text-white'
                    }`}
                  >
                    {copiedInvite ? 'Copied! ✓' : inviteCopyError ? 'Failed!' : 'Copy'}
                  </button>
                </div>
                {inviteCopyError && (
                  <p className="text-[10px] text-rose-400 mt-1">Clipboard denied. Select and copy the text field above.</p>
                )}
              </div>

              {/* Connected Peers List */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#202c33] border border-neutral-200 dark:border-transparent space-y-3">
                <h4 className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-bold">Participants</h4>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold">
                    You
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">You (Host)</p>
                    <p className="text-[10px] text-[#00a884]">Connected</p>
                  </div>
                </div>

                {Object.keys(peers).map(peerId => (
                  <div key={peerId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      P
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">Peer #{peerId.substring(0, 4)}</p>
                      <p className="text-[10px] text-neutral-500">{peers[peerId]}</p>
                    </div>
                    {peers[peerId] === 'connected' && (
                      <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Network Diagnostics HUD Modal */}
      <NetworkDiagnosticsHUD
        webrtcManager={webrtcManagerRef.current}
        isOpen={showDiagnosticsHUD}
        onClose={() => setShowDiagnosticsHUD(false)}
        auditChain={auditChain}
      />

      {/* P2P Cryptographic TrustMap Modal */}
      <P2PTrustMapModal
        isOpen={showTrustMapModal}
        onClose={() => setShowTrustMapModal(false)}
        peers={trustMapPeersList}
        selectedPeerId={selectedTrustMapPeerId}
        onSelectPeer={(id) => setSelectedTrustMapPeerId(id)}
        onToggleVerify={handleToggleVerifyPeer}
      />

      {/* AI Meeting Notes & Action Items Modal */}
      <AIMeetingNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        summary={meetingSummary}
      />

      {/* Call Recorder Export Modal (Save to Computer Anywhere) */}
      {showCallRecorderModal && (
        <CallRecorderModal
          recordedBlob={recordedCallBlob}
          recordingType={callRecordType}
          durationSeconds={callRecordSeconds}
          onClose={() => {
            setShowCallRecorderModal(false);
            setRecordedCallBlob(null);
          }}
        />
      )}
    </div>
  );
}
