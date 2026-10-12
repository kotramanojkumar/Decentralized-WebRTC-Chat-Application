import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { WebRTCManager } from '../webrtc/WebRTCManager';
import { FileTransferManager } from '../file-transfer/FileTransferManager';
import VideoPlayer from '../components/VideoPlayer';
import NetworkDiagnosticsHUD from '../components/NetworkDiagnosticsHUD';
import AIMeetingNotesModal from '../components/AIMeetingNotesModal';
import AudioFrequencyWave from '../components/AudioFrequencyWave';
import ThemeToggle from '../components/ThemeToggle';
import { MeetingNotesEngine, type MeetingSummaryResult } from '../ai/MeetingNotesEngine';
import { PredictiveTextEngine } from '../ai/PredictiveTextEngine';
import { soundEngine } from '../utils/parrotAudio';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import CallRecorderModal from '../components/CallRecorderModal';

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

  // Voice activity tracking for speaker rings
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState<Record<string, boolean>>({});

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
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
                <span className="text-neutral-500 dark:text-neutral-400">🔒 End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex gap-2 items-center">
          
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Diagnostics HUD Button */}
          <button
            onClick={() => setShowDiagnosticsHUD(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#202c33] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942] transition cursor-pointer"
            title="Connection Diagnostics"
          >
            <span>Diagnostics</span>
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
          >
            {isSummarizing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <span>✨ Notes</span>
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
          >
            <img src="/assets/quick_notes_icon.png" alt="Quick Notes" className="w-7 h-7 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
          </button>

          {/* Media Calling Controls (Visible when call is not yet activated) */}
          {!isCallActive && (
            <div className="flex gap-1.5 ml-1">
              <button
                onClick={toggleVoice}
                className="p-2 rounded-full bg-[#00a884] text-white hover:bg-[#02906f] transition shadow-sm cursor-pointer"
                title="Start Voice Call"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button
                onClick={toggleVideo}
                className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition shadow-sm cursor-pointer"
                title="Start Video Call"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
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
          >
            <span className={isRecordingCall ? 'w-2 h-2 rounded-full bg-white animate-ping inline-block' : 'text-rose-500'}>
              {isRecordingCall ? '' : '⏺️'}
            </span>
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
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full bg-neutral-100 dark:bg-[#202c33] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#2a3942] transition cursor-pointer"
              title="Leave Call"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
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

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full h-full max-w-6xl items-center pb-20">
              
              {/* Local Stream Tile */}
              {(isVideoActive || isVoiceActive) && (
                <div className={`relative flex-1 min-w-[280px] sm:min-w-[340px] max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 flex items-center justify-center bg-[#111b21] ${
                  isLocalSpeaking
                    ? 'border-[#00a884] shadow-[0_0_25px_rgba(0,168,132,0.4)]'
                    : 'border-[#202c33]'
                }`}>
                  {isVideoActive && cameraStream ? (
                    <div className="w-full h-full">
                      <VideoPlayer stream={cameraStream} isLocal={true} />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[#111b21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                        <span>You</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-6">
                      <div className={`w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl mb-4 border-2 border-white/20 transition-transform ${
                        isLocalSpeaking ? 'scale-110 shadow-[0_0_25px_rgba(0,168,132,0.6)] border-emerald-400' : ''
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

              {/* Remote Peer Stream Tiles */}
              {Object.entries(remoteStreams).map(([peerId, stream]) => {
                const hasVideo = stream.getVideoTracks().length > 0;
                const isSpeaking = remoteSpeaking[peerId] || false;

                return (
                  <div
                    key={peerId}
                    className={`relative flex-1 min-w-[280px] sm:min-w-[340px] max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 flex items-center justify-center bg-[#111b21] ${
                      isSpeaking
                        ? 'border-[#00a884] shadow-[0_0_25px_rgba(0,168,132,0.4)]'
                        : 'border-[#202c33]'
                    }`}
                  >
                    <div className={hasVideo ? 'w-full h-full' : 'hidden'}>
                      <VideoPlayer stream={stream} />
                    </div>

                    {!hasVideo && (
                      <div className="flex flex-col items-center p-6">
                        <div className={`w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl mb-4 transition-transform ${
                          isSpeaking ? 'scale-110 shadow-[0_0_25px_rgba(0,168,132,0.6)]' : ''
                        }`}>
                          <span className="text-xl font-bold text-white">Peer</span>
                        </div>
                        <span className="text-xs text-neutral-300 mb-3 font-medium">Participant #{peerId.substring(0, 4)}</span>
                        <AudioFrequencyWave
                          stream={stream}
                          onSpeakingChange={(spk) => setRemoteSpeaking(prev => ({ ...prev, [peerId]: spk }))}
                          width={180}
                          height={36}
                        />
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-[#111b21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00a884]"></span>
                      <span>Peer #{peerId.substring(0, 4)}</span>
                    </div>

                    {hasVideo && (
                      <div className="absolute bottom-3 right-3">
                        <AudioFrequencyWave
                          stream={stream}
                          onSpeakingChange={(spk) => setRemoteSpeaking(prev => ({ ...prev, [peerId]: spk }))}
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

            {/* Floating Call Controls Dock */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3.5 items-center liquid-glass-dock px-6 py-2.5 rounded-full z-30">
              
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isMuted
                    ? 'bg-white text-neutral-900 shadow-md'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? (
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2.2} />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                  !isVideoActive
                    ? 'bg-white text-neutral-900 shadow-md'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isVideoActive ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {!isVideoActive ? (
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2.2} />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* Screen Share Toggle */}
              <button
                onClick={toggleScreenShare}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isScreenSharing
                    ? 'bg-[#00a884] text-white shadow-md'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-white'
                }`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Call Record Toggle Button */}
              <button
                onClick={isRecordingCall ? stopCallRecording : () => startCallRecording(isVideoActive ? 'video' : 'audio')}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                  isRecordingCall
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 animate-pulse'
                    : 'bg-[#202c33] hover:bg-[#2a3942] text-rose-400'
                }`}
                title={isRecordingCall ? 'Stop Call Recording & Save to Computer' : `Record ${isVideoActive ? 'Video' : 'Audio'} Call`}
              >
                {isRecordingCall ? (
                  <div className="w-4 h-4 rounded-sm bg-white" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
                )}
              </button>

              {/* WhatsApp Hang Up Red Button */}
              <button
                onClick={endCall}
                className="bg-[#ea0038] hover:bg-[#d00030] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Hang Up Call"
              >
                <svg className="w-6 h-6 transform rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.43-3.9-6.8-6.72l1.97-1.61c.29-.26.38-.65.25-1.02A11.36 11.36 0 018.76 4c0-.55-.45-1-1-1H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.44c0-.55-.45-1-.99-1z" />
                </svg>
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
                <span>🔒 End-to-End Encrypted Direct Channel</span>
                <span className="text-[10px] text-amber-400/80">({showSecurityDetails ? 'hide details' : 'view details'})</span>
              </div>
              {showSecurityDetails && (
                <div className="p-3 text-xs bg-black/40 text-neutral-300 space-y-1 text-center border-t border-amber-500/20">
                  <p><strong className="text-white">Classification:</strong> {securityPolicy.level}</p>
                  <p><strong className="text-white">Encryption:</strong> WebRTC AES-GCM / ECDH</p>
                  <p><strong className="text-white">TTL:</strong> {securityPolicy.maxTTL > 0 ? `${securityPolicy.maxTTL}s` : 'Permanent'}</p>
                </div>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            
            {/* WhatsApp Yellow Security Disclaimer Pill */}
            <div className="mx-auto my-2 max-w-md bg-[#ffeebd] dark:bg-[#182229] border border-amber-300 dark:border-amber-500/20 px-3.5 py-1.5 rounded-xl text-center text-[11px] text-amber-900 dark:text-[#ffd279] shadow-sm">
              🔒 Messages and calls are end-to-end encrypted. No third party can read or listen to them.
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
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
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
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
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
                      ✨
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
                    <svg
                      className="w-5 h-5 ml-0.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 transform shrink-0 shadow-md bg-[#00a884] hover:bg-[#02906f] text-white active:scale-95 cursor-pointer shadow-emerald-600/30 group"
                    title="Record voice note"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
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
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}?type=${roomType}`);
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 2000);
                    }}
                    className="bg-[#00a884] hover:bg-[#02906f] text-white px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95"
                  >
                    {copiedInvite ? 'Copied! ✓' : 'Copy'}
                  </button>
                </div>
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
