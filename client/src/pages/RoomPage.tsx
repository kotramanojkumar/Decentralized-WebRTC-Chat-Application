import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { WebRTCManager } from '../webrtc/WebRTCManager';
import { FileTransferManager } from '../file-transfer/FileTransferManager';
import VideoPlayer from '../components/VideoPlayer';

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
}

export default function RoomPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  
  const [roomType, setRoomType] = useState(searchParams.get('type') || 'group');
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
  
  const [ephemeralTTL, setEphemeralTTL] = useState<number>(0);
  
  const [fileProgress, setFileProgress] = useState<number>(0);
  const [_currentChunkSize, setCurrentChunkSize] = useState<number>(16384);
  
  const [securityPolicy, setSecurityPolicy] = useState<any>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['😀','😂','🥰','😎','😭','🥺','😡','👍','👎','❤️','🔥','✨','🎉','👀','🙌','🤔','💀','💯','✅','❌', '🙏', '👏', '💔', '🌟'];
  
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

  const [, setTick] = useState(0);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  useEffect(() => {
    // Dynamic import to avoid SSR issues if any, and initialize security engine
    import('../security/SecurityEngine').then(({ SecurityEngine }) => {
      const engine = new SecurityEngine();
      engine.onPolicyChanged = (policy) => {
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
  }, []);

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
          // If the other peer clicked end call, we stop our cameras too and show an alert
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
          alert('The other person ended the voice/video call. You are still in the chat room.');
        } else {
          const now = new Date();
          setMessages(prev => [
            ...prev, 
            { 
              id: crypto.randomUUID(), 
              sender: fromId,
              senderName: payload.senderName,
              text: payload.text || decryptedString,
              timestamp: now,
              expiresAt: payload.ttl ? new Date(now.getTime() + payload.ttl * 1000) : null
            }
          ]);
        }
      } catch (e) {
        setMessages(prev => [
          ...prev, 
          { id: crypto.randomUUID(), sender: fromId, text: decryptedString, timestamp: new Date() }
        ]);
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

  const [isMuted, setIsMuted] = useState(false);

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
      // If we turn off video, maybe we want to keep voice active?
      // For simplicity, let's just turn off the camera track and keep audio if voice is active.
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
    
    // Tell other peers to also end their media
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
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !webrtcManagerRef.current) return;

    if (securityEngineRef.current) {
      await securityEngineRef.current.evaluateMessage(inputMsg);
    }

    let ttlToUse = parseInt(localStorage.getItem('disappearingMessages') || '0', 10);
    if (securityEngineRef.current?.currentPolicy.maxTTL > 0) {
      if (ttlToUse === 0 || securityEngineRef.current.currentPolicy.maxTTL < ttlToUse) {
        ttlToUse = securityEngineRef.current.currentPolicy.maxTTL;
      }
    }

    const senderName = localStorage.getItem('displayName') || 'Unknown';
    
    const msgPayload = JSON.stringify({ 
      text: inputMsg, 
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
        text: inputMsg, 
        timestamp: now,
        expiresAt: ttlToUse ? new Date(now.getTime() + ttlToUse * 1000) : null 
      }
    ]);
    setInputMsg('');
  };

  const [aiSummary, setAiSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  const handleSummarize = async () => {
    if (!securityEngineRef.current || messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const fullText = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const summary = await securityEngineRef.current.askAISummarize(fullText);
      setAiSummary("✨ Local AI Summary\n\n" + summary + "\n\n🔒 Processed locally on this device");
    } catch (e) {
      console.error(e);
      setAiSummary("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExtractActions = async () => {
    if (!securityEngineRef.current || messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const fullText = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      // Hacky prompt override since SecurityEngine just summarizes currently
      const originalPrompt = securityEngineRef.current.summarizerString;
      securityEngineRef.current.summarizerString = `Extract bullet point action items, decisions, and deadlines from the following conversation:\n\n\${text}`;
      const summary = await securityEngineRef.current.askAISummarize(fullText);
      securityEngineRef.current.summarizerString = originalPrompt;
      setAiSummary("✨ Local AI Action Items\n\n" + summary + "\n\n🔒 Processed locally on this device");
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

    const verifyRoomAccess = async () => {
      try {
        const password = localStorage.getItem(`room_pass_${roomId}`) || '';
        const res = await fetch(`${API_URL}/rooms/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: roomId, password })
        });
        const data = await res.json();
        
        if (!res.ok) {
          alert(`Access Denied: ${data.error}`);
          navigate('/dashboard');
          return false;
        }
        
        if (data.room?.type) {
          setRoomType(data.room.type);
        }
        
        const currentUserId = localStorage.getItem('userId');
        if (data.room?.createdById && currentUserId === data.room.createdById) {
          setIsCreator(true);
        }
        
        return true;
      } catch (err) {
        console.error('Room verification failed', err);
        navigate('/dashboard');
        return false;
      }
    };

    verifyRoomAccess().then(hasAccess => {
      if (!hasAccess || !active) return;
      
      const socketIo = io(SOCKET_URL || window.location.origin, {
        auth: { token: localStorage.getItem('token') }
      });
      setSocket(socketIo);

      socketIo.on('connect', () => {
        socketIo.emit('join-room', { roomId, userId: 'user-' + Math.random().toString(36).substr(2, 9) });
      });

      socketIo.on('room-full', (data: { message: string; detail?: string; type?: string }) => {
        const title = data.message || '🔒 Access Denied';
        const detail = data.detail || 'This room is already full.';
        alert(`${title}\n\n${detail}\n\nYou will be redirected to the Dashboard.`);
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
        alert('The call has been ended by another participant.');
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

  const [preferences, setPreferences] = useState({
    darkMode: false,
    chatBackground: 'default'
  });

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    const bg = localStorage.getItem('chatBackground') || 'default';
    setPreferences({ darkMode: isDark, chatBackground: bg });
  }, []);

  const getBackgroundStyle = () => {
    if (preferences.chatBackground === 'solid-dark') return 'bg-gray-800';
    if (preferences.chatBackground === 'gradient') return 'bg-gradient-to-br from-blue-900 to-purple-900';
    return preferences.darkMode ? 'bg-[#0b141a]' : 'bg-[#efeae2]';
  };

  return (
    <div className={`flex flex-col h-screen ${preferences.darkMode ? 'text-white' : 'text-gray-900'} ${getBackgroundStyle()}`}>
      <header className={`shadow-sm px-6 py-4 flex items-center justify-between border-b relative ${preferences.darkMode ? 'bg-[#202c33] border-gray-700' : 'bg-[#f0f2f5] border-gray-200'}`}>
        <div>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowGroupInfo(true)}>
            <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-xl overflow-hidden shadow-sm border border-gray-600">
               {roomType === 'p2p' ? '👤' : '👥'}
            </div>
            <div>
              <h1 className="text-lg font-semibold group-hover:underline">
                {roomType === 'p2p' ? `Direct Chat` : `Group Conversation`}
              </h1>
              {roomType === 'p2p' ? (
                <div className="text-xs font-medium text-[#00a884] flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                  {Object.keys(peers).length > 0 ? 'Online' : 'Waiting for peer...'}
                </div>
              ) : (
                <div className="text-xs font-medium text-[#00a884] flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                  {Object.keys(peers).length + 1} members online
                </div>
              )}
            </div>
          </div>
          <div 
            className="flex items-center gap-4 mt-2 text-[11px] font-medium cursor-pointer hover:opacity-80 transition"
            onClick={() => setShowConnectionDetails(!showConnectionDetails)}
          >
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> P2P Connected
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">🔐 Encrypted</span>
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">✨ AI Local</span>
          </div>
        </div>

        {showConnectionDetails && (
          <div className={`absolute top-full left-6 mt-2 z-50 p-4 rounded-xl shadow-2xl border w-64 ${preferences.darkMode ? 'bg-[#2a3942] border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'}`}>
             <h3 className="font-semibold mb-3 border-b border-gray-700 pb-2">Connection Details</h3>
             <div className="space-y-2 text-sm">
                <div><span className="opacity-70">WebRTC:</span> <span className="float-right text-green-500 font-medium">Connected</span></div>
                <div><span className="opacity-70">Route:</span> <span className="float-right font-medium">Direct P2P</span></div>
                <div><span className="opacity-70">Encryption:</span> <span className="float-right text-blue-500 font-medium">Active</span></div>
                <div><span className="opacity-70">AI Processing:</span> <span className="float-right text-purple-500 font-medium">Local Device</span></div>
             </div>
          </div>
        )}
        <div className="flex gap-3 items-center">
          <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-full transition ${showNotes ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : (preferences.darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200')}`} title="Quick Notes">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          {!(isVideoActive || isVoiceActive || isScreenSharing) && (
            <>
              <button onClick={toggleVoice} className={`p-2 rounded-full transition ${preferences.darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`} title="Voice Call">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
              <button onClick={toggleVideo} className={`p-2 rounded-full transition ${preferences.darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`} title="Video Call">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
              <button onClick={toggleScreenShare} className={`p-2 rounded-full transition ${preferences.darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`} title="Screen Share">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </button>
            </>
          )}

          {/* Close Room - Only visible to creator */}
          {isCreator && (
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to close this room? All participants will be disconnected.')) return;
                try {
                  const res = await fetch(`${API_URL}/rooms/close`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inviteCode: roomId, userId: localStorage.getItem('userId') })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    if (socket) socket.emit('close-room', roomId);
                    alert('Room closed successfully.');
                    navigate('/dashboard');
                  } else {
                    alert(data.error || 'Failed to close room');
                  }
                } catch (err) {
                  alert('Failed to close room');
                }
              }}
              className="p-2 rounded-full transition bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
              title="Close Room (Creator Only)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex relative">
        
        {showNotes && (
          <div className={`absolute top-0 right-0 z-50 w-80 m-4 p-4 rounded-xl shadow-2xl border flex flex-col ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`font-semibold flex items-center gap-2 ${preferences.darkMode ? 'text-amber-500' : 'text-amber-900'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Quick Notes
              </h3>
              <button onClick={() => setShowNotes(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Copy and paste info for the future here..."
              className={`w-full bg-transparent border-none resize-none focus:outline-none h-64 text-sm ${preferences.darkMode ? 'text-amber-200 placeholder-amber-700/50' : 'text-amber-800 placeholder-amber-700/50'}`}
            />
          </div>
        )}

        {(isVideoActive || isVoiceActive || isScreenSharing || Object.keys(remoteStreams).length > 0) && (
          <div className="flex-[2.5] bg-[#111b21] p-8 flex flex-col items-center justify-center relative shadow-2xl z-20 overflow-y-auto">
            
            <div className="flex flex-wrap justify-center gap-6 w-full h-full max-w-7xl items-center">
              
              {/* Local Stream */}
              {(isVideoActive || isVoiceActive) && (
                <div className="relative flex-1 min-w-[350px] max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center">
                  {!cameraStream ? (
                    <div className="flex flex-col items-center animate-pulse">
                      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                         <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <span className="text-white mt-4 font-medium">You (Audio Only)</span>
                    </div>
                  ) : (
                    <>
                      <div className={isVideoActive ? 'w-full h-full' : 'hidden'}>
                        <VideoPlayer stream={cameraStream} isLocal={true} />
                      </div>
                      
                      {!isVideoActive && (
                        <div className="flex flex-col items-center animate-pulse">
                          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                             <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <span className="text-white mt-4 font-medium">You (Audio Only)</span>
                        </div>
                      )}

                      {isVideoActive && (
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-sm px-3 py-1.5 rounded-lg shadow backdrop-blur-sm">You (Camera)</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Screen Share Stream */}
              {isScreenSharing && (
                <div className="relative flex-1 min-w-[350px] max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center">
                  <VideoPlayer stream={screenStream} isLocal={true} />
                  <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg shadow backdrop-blur-sm">You (Screen)</div>
                </div>
              )}
              
              {/* Remote Streams */}
              {Object.entries(remoteStreams).map(([peerId, stream]) => {
                const hasVideo = stream.getVideoTracks().length > 0;
                return (
                  <div key={peerId} className="relative flex-1 min-w-[350px] max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex items-center justify-center">
                    
                    {/* Always render the player so audio works! We just hide it visually if no video */}
                    <div className={hasVideo ? 'w-full h-full' : 'hidden'}>
                      <VideoPlayer stream={stream} />
                    </div>

                    {!hasVideo && (
                      <div className="flex flex-col items-center animate-pulse">
                        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                           <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <span className="text-white mt-4 font-medium">Peer {peerId.substring(0,4)}</span>
                      </div>
                    )}
                    
                    {hasVideo && (
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-sm px-3 py-1.5 rounded-lg shadow backdrop-blur-sm">Peer {peerId.substring(0, 4)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Call Controls Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center bg-[#202c33] bg-opacity-90 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-gray-700">
               
               {/* Mute Button */}
               <button onClick={toggleMute} className={`p-3 rounded-full transition transform hover:scale-110 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`} title={isMuted ? 'Unmute' : 'Mute'}>
                 {isMuted ? (
                   // Muted Mic SVG
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                     <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2}/>
                   </svg>
                 ) : (
                   // Mic SVG
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                   </svg>
                 )}
               </button>

               {/* Video Button */}
               <button onClick={toggleVideo} className={`p-3 rounded-full transition transform hover:scale-110 ${!isVideoActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`} title={isVideoActive ? 'Turn off camera' : 'Turn on camera'}>
                 {!isVideoActive ? (
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2}/>
                   </svg>
                 ) : (
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                 )}
               </button>

               {/* Screen Share Button */}
               <button onClick={toggleScreenShare} className={`p-3 rounded-full transition transform hover:scale-110 ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`} title="Screen Share">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
               </button>

               {/* End Call Button */}
               <button onClick={endCall} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 ml-4 shadow-lg transition transform hover:scale-110" title="End Call">
                 <svg className="w-6 h-6 transform rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
               </button>
            </div>
          </div>
        )}

        <div className={`flex-1 flex flex-col border-l relative min-w-[300px] ${preferences.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          
          {securityPolicy && (
            <div className={`p-3 text-center text-xs shadow-sm z-10 border-b cursor-pointer hover:opacity-90 ${securityPolicy.level === 'HIGHLY_CONFIDENTIAL' ? 'bg-red-100 text-red-900 border-red-200' : securityPolicy.level === 'CONFIDENTIAL' ? 'bg-yellow-100 text-yellow-900 border-yellow-200' : 'bg-[#ffeecd] text-gray-700 border-[#eeddbe]'}`} onClick={() => alert(`Security Analysis\n\nClassification: ${securityPolicy.level}\nWhy? Sensitivity score analyzed locally.\n\nApplied Policy:\n✓ Local AI Only\n✓ Ephemeral TTL: ${securityPolicy.maxTTL > 0 ? securityPolicy.maxTTL + 's' : 'Off'}`)}>
              <div className="font-bold tracking-wide uppercase flex items-center justify-center gap-1 mb-0.5">
                🛡 {securityPolicy.level.replace('_', ' ')}
              </div>
              <div className="opacity-80 font-medium">Enhanced privacy policy active</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map(msg => {
              const isMe = msg.sender === 'Me';
              return (
                <div key={msg.id} className={`flex max-w-[85%] gap-2 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1 bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {isMe ? 'Me' : (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'P')}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div 
                      className={`px-3 py-2 rounded-lg shadow-sm text-sm relative 
                      ${isMe 
                        ? (preferences.darkMode ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none') 
                        : (preferences.darkMode ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none' : 'bg-white text-[#111b21] rounded-tl-none')
                      }`}
                    >
                      {!isMe && <span className="text-xs font-semibold block mb-0.5 text-[#00a884]">{msg.senderName || `Peer ${msg.sender.substring(0, 4)}`}</span>}
                      
                      {msg.isFile && msg.fileUrl ? (
                        <a href={msg.fileUrl} download={msg.fileName} className="underline font-medium break-all flex items-center gap-2">
                          📎 {msg.fileName}
                        </a>
                      ) : (
                        <span className="break-words whitespace-pre-wrap">{msg.text}</span>
                      )}
                      
                      <div className="flex justify-between items-end mt-1 gap-4">
                        {msg.expiresAt ? (
                          <div className={`text-[10px] font-medium flex items-center gap-1 ${preferences.darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            ⏱ Disappears in {Math.max(0, Math.ceil((msg.expiresAt.getTime() - Date.now()) / 1000))}s
                          </div>
                        ) : <div></div>}
                        <div className="text-[10px] text-right opacity-70 whitespace-nowrap">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {aiSummary && (
            <div className={`mx-4 mb-2 p-3 text-sm border rounded-lg shadow-sm ${preferences.darkMode ? 'bg-[#202c33] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-blue-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI Summary
                </span>
                <button onClick={() => setAiSummary('')} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="opacity-90">{aiSummary}</p>
            </div>
          )}

          <div className={`p-3 flex flex-col gap-2 ${preferences.darkMode ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
            
            {fileProgress > 0 && (
              <div className={`p-3 rounded-lg border shadow-sm mb-2 text-sm ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between font-medium mb-2">
                  <span className="flex items-center gap-1.5">
                     <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     Secure File Transfer
                  </span>
                  <span className="text-[#00a884]">{Math.round(fileProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div className="bg-[#00a884] h-full rounded-full transition-all duration-300 relative" style={{ width: `${fileProgress}%` }}>
                     <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-[11px] opacity-70 flex justify-between">
                   <span>Adaptive transfer enabled</span>
                   <span>E2E Encrypted</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowAiMenu(!showAiMenu)}
                  disabled={isSummarizing || messages.length === 0}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 border ${preferences.darkMode ? 'bg-gray-800 hover:bg-gray-700 text-purple-400 border-gray-600' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'}`}
                >
                  {isSummarizing ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : '✨ AI'}
                </button>
                
                {showAiMenu && (
                  <div className={`absolute bottom-full mb-2 left-0 p-1 rounded-lg shadow-xl border w-48 z-50 ${preferences.darkMode ? 'bg-[#202c33] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <button type="button" onClick={() => { handleSummarize(); setShowAiMenu(false); }} className={`w-full text-left px-3 py-2 rounded text-sm transition ${preferences.darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Summarize conversation</button>
                    <button type="button" onClick={() => { handleExtractActions(); setShowAiMenu(false); }} className={`w-full text-left px-3 py-2 rounded text-sm transition ${preferences.darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Extract action items</button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full transition ${preferences.darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                
                {showEmojiPicker && (
                  <div className={`absolute bottom-full mb-2 left-0 p-3 rounded-lg shadow-xl border w-64 z-50 ${preferences.darkMode ? 'bg-[#202c33] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="grid grid-cols-6 gap-2">
                      {emojis.map((emoji, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setInputMsg(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded text-xl transition transform hover:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label className={`p-2 rounded-full cursor-pointer transition ${preferences.darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <input type="file" className="hidden" onChange={handleFileSelect} />
              </label>

              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputMsg.trim()) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Type a message"
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none shadow-sm ${preferences.darkMode ? 'bg-[#2a3942] text-[#d1d7db] placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-500'}`}
              />
              
              <button
                type="submit"
                disabled={!inputMsg.trim()}
                className={`p-2 rounded-full transition flex items-center justify-center ${inputMsg.trim() ? 'bg-[#00a884] text-white hover:bg-[#008f6f] shadow-md' : (preferences.darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400')}`}
              >
                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
        {showGroupInfo && (
          <div className={`w-80 flex flex-col border-l shadow-2xl z-30 ${preferences.darkMode ? 'bg-[#111b21] border-gray-700 text-[#e9edef]' : 'bg-[#f0f2f5] border-gray-200 text-gray-900'}`}>
            <div className={`p-4 flex items-center gap-4 font-semibold text-lg border-b ${preferences.darkMode ? 'bg-[#202c33] border-gray-700' : 'bg-white border-gray-200'}`}>
               <button onClick={() => setShowGroupInfo(false)} className="hover:opacity-70">✕</button>
               {roomType === 'p2p' ? 'Contact Info' : 'Group Info'}
            </div>
            
            <div className={`flex-1 overflow-y-auto ${preferences.darkMode ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>
              {/* Group Profile Photo & Name */}
              <div className={`p-6 flex flex-col items-center justify-center border-b mb-2 shadow-sm ${preferences.darkMode ? 'bg-[#111b21] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="w-40 h-40 rounded-full bg-gray-500 mb-4 flex items-center justify-center text-4xl overflow-hidden shadow-lg border-4 border-[#00a884]">
                   {roomType === 'p2p' ? '👤' : '👥'}
                </div>
                <h2 className="text-xl font-medium">{roomType === 'p2p' ? 'Direct Contact' : 'Group Conversation'}</h2>
                <p className="text-sm opacity-60 mt-1">{roomType === 'p2p' ? 'Direct Peer Connection' : `Group • ${Object.keys(peers).length + 1} participants`}</p>
              </div>

              {/* Description & Invite */}
              <div className={`p-4 border-b mb-2 shadow-sm ${preferences.darkMode ? 'bg-[#111b21] border-gray-800' : 'bg-white border-gray-200'}`}>
                 <h3 className="text-[#00a884] text-sm font-semibold mb-2">Secure Invite Link</h3>
                 <div className="flex gap-2">
                   <input type="text" readOnly value={`${window.location.origin}/room/${roomId}?type=${roomType}`} className={`flex-1 p-2 rounded text-xs border ${preferences.darkMode ? 'bg-[#2a3942] border-gray-700' : 'bg-gray-100 border-gray-300'}`} />
                   <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}?type=${roomType}`)} className="bg-[#00a884] text-white px-3 py-1 rounded text-sm hover:bg-[#008f6f]">Copy</button>
                 </div>
              </div>

              {/* Participants */}
              <div className={`p-4 shadow-sm ${preferences.darkMode ? 'bg-[#111b21]' : 'bg-white'}`}>
                 <h3 className="text-[#00a884] text-sm font-semibold mb-3">
                   {roomType === 'p2p' ? 'Connection Status' : `${Object.keys(peers).length + 1} participants`}
                 </h3>
                 <div className="flex flex-col gap-4">
                   
                   {/* Self */}
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">👤</div>
                     <div className="flex-1">
                       <div className="font-medium">You</div>
                       <div className="text-xs opacity-60">Admin</div>
                     </div>
                     <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-green-600 dark:text-green-400 font-bold border border-green-200 dark:border-green-800">Verified Device</span>
                   </div>

                   {/* Peers */}
                   {Object.keys(peers).map(peerId => (
                     <div key={peerId} className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">👤</div>
                       <div className="flex-1">
                         <div className="font-medium">Peer {peerId.substring(0, 4)}</div>
                         <div className="text-xs opacity-60">Participant</div>
                       </div>
                       {peers[peerId] === 'connected' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                     </div>
                   ))}

                 </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


