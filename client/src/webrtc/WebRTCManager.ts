import { io, Socket } from 'socket.io-client';
import { CryptoManager } from '../crypto/CryptoManager';

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private cryptoManagers: Map<string, CryptoManager> = new Map();
  private localStream: MediaStream | null = null;
  public onMessageReceived: (fromId: string, message: string) => void = () => {};
  public onConnectionStateChange: (peerId: string, state: string) => void = () => {};
  public onTrackReceived: (peerId: string, stream: MediaStream) => void = () => {};

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);
    this.setupSocketListeners();
  }

  public joinRoom(roomId: string) {
    this.socket.emit('join-room', roomId);
  }

  private setupSocketListeners() {
    this.socket.on('user-connected', async (peerId: string) => {
      console.log('User connected:', peerId);
      
      // Initialize crypto for new peer
      const crypto = new CryptoManager();
      await crypto.generateKeyPair();
      this.cryptoManagers.set(peerId, crypto);
      
      const pubKey = await crypto.exportPublicKey();
      this.socket.emit('public-key', { publicKey: pubKey, to: peerId });

      await this.createOffer(peerId);
    });

    this.socket.on('public-key', async (data: { publicKey: string, from: string }) => {
      console.log('Received public key from', data.from);
      let crypto = this.cryptoManagers.get(data.from);
      if (!crypto) {
        crypto = new CryptoManager();
        await crypto.generateKeyPair();
        this.cryptoManagers.set(data.from, crypto);
        
        const myPubKey = await crypto.exportPublicKey();
        this.socket.emit('public-key', { publicKey: myPubKey, to: data.from });
      }
      
      await crypto.deriveSessionKey(data.publicKey);
    });

    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit, from: string }) => {
      console.log('Received offer from', data.from);
      await this.handleOffer(data.from, data.offer);
    });

    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit, from: string }) => {
      console.log('Received answer from', data.from);
      await this.handleAnswer(data.from, data.answer);
    });

    this.socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit, from: string }) => {
      await this.handleIceCandidate(data.from, data.candidate);
    });

    this.socket.on('user-disconnected', (peerId: string) => {
      this.closeConnection(peerId);
    });
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { candidate: event.candidate, to: peerId });
      }
    };

    pc.onconnectionstatechange = () => {
      this.onConnectionStateChange(peerId, pc.connectionState);
    };

    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      this.setupDataChannel(peerId, receiveChannel);
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      
      const notifyReact = () => {
        this.onTrackReceived(peerId, new MediaStream(stream.getTracks()));
      };

      stream.onaddtrack = notifyReact;
      stream.onremovetrack = notifyReact;
      
      notifyReact();
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  public async setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    
    // Add tracks to all existing connections and renegotiate
    for (const [peerId, pc] of this.peerConnections.entries()) {
      const senders = pc.getSenders();
      
      // Remove tracks no longer in the stream
      senders.forEach(sender => {
        if (sender.track && !stream.getTracks().find(t => t.id === sender.track!.id)) {
          pc.removeTrack(sender);
        }
      });

      // Add new tracks
      stream.getTracks().forEach(track => {
        const existingSender = senders.find(s => s.track && s.track.id === track.id);
        if (!existingSender) {
          pc.addTrack(track, stream);
        }
      });
      
      // Renegotiate offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { offer, to: peerId });
      } catch (err) {
        console.error('Error renegotiating stream:', err);
      }
    }
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    channel.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'chat') {
          const crypto = this.cryptoManagers.get(peerId);
          if (crypto && crypto.isReady()) {
            const decryptedText = await crypto.decryptMessage(payload.ciphertext, payload.iv);
            this.onMessageReceived(peerId, decryptedText);
          } else {
            console.warn('Received encrypted message but crypto is not ready');
          }
        }
      } catch (err) {
        console.error('Failed to parse or decrypt message', err);
      }
    };
    channel.onopen = () => {
      console.log(`Data channel with ${peerId} opened`);
    };
    channel.onclose = () => {
      console.log(`Data channel with ${peerId} closed`);
    };
    this.dataChannels.set(peerId, channel);
  }

  private async createOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    const dataChannel = pc.createDataChannel('chat');
    this.setupDataChannel(peerId, dataChannel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('offer', { offer, to: peerId });
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit('answer', { answer, to: peerId });
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  public async sendMessage(peerId: string, message: string) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      const crypto = this.cryptoManagers.get(peerId);
      if (crypto && crypto.isReady()) {
        const { ciphertext, iv } = await crypto.encryptMessage(message);
        channel.send(JSON.stringify({ type: 'chat', ciphertext, iv }));
      } else {
        console.error(`Cannot send secure message. Crypto not ready for ${peerId}`);
      }
    } else {
      console.error(`Cannot send message. Data channel to ${peerId} is not open.`);
    }
  }

  public getDataChannel(peerId: string): RTCDataChannel | undefined {
    return this.dataChannels.get(peerId);
  }

  private closeConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    this.cryptoManagers.delete(peerId);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    for (const peerId of Array.from(this.peerConnections.keys())) {
      this.closeConnection(peerId);
    }
  }

  // --- 2026 Telemetry & Diagnostics API ---
  public getPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peerConnections;
  }

  public getCryptoManagers(): Map<string, CryptoManager> {
    return this.cryptoManagers;
  }

  public getCryptoManager(peerId: string): CryptoManager | undefined {
    return this.cryptoManagers.get(peerId);
  }

  public async getPeerSafetyNumber(peerId: string): Promise<string | null> {
    const crypto = this.cryptoManagers.get(peerId);
    if (!crypto) return null;
    return await crypto.getSafetyNumber();
  }

  public getPeerRemotePublicKey(peerId: string): string | null {
    const crypto = this.cryptoManagers.get(peerId);
    if (!crypto) return null;
    return crypto.getRemotePublicKey();
  }

  private isPrivateOrLocalAddress(addr?: string | null): boolean {
    if (!addr) return false;
    const cleanAddr = addr.replace(/^\[|\]$/g, '').trim();
    // RFC 1918 Private IPv4
    if (/^10\./.test(cleanAddr)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanAddr)) return true;
    if (/^192\.168\./.test(cleanAddr)) return true;
    // Loopback IPv4 & IPv6
    if (/^127\./.test(cleanAddr) || cleanAddr === '::1') return true;
    // IPv6 Link-Local
    if (/^fe80:/i.test(cleanAddr)) return true;
    // mDNS local name (e.g. uuid.local)
    if (cleanAddr.endsWith('.local')) return true;
    return false;
  }

  private isLoopbackAddress(addr?: string | null): boolean {
    if (!addr) return false;
    const cleanAddr = addr.replace(/^\[|\]$/g, '').trim();
    return /^127\./.test(cleanAddr) || cleanAddr === '::1';
  }

  public async getTelemetry(): Promise<Array<PeerTelemetry>> {
    const telemetryList: Array<PeerTelemetry> = [];

    for (const [peerId, pc] of Array.from(this.peerConnections.entries())) {
      let rtt: number | null = null;
      let rawCandidateType = 'unknown';
      let connectionPath = pc.connectionState === 'connected' ? 'Connected (Stats pending)' : 'Negotiating';
      let selectedPairConfirmed = false;
      let bytesSent = 0;
      let bytesReceived = 0;
      let packetLoss: number | null = null;
      let packetsLostTotal = 0;
      let packetsReceivedTotal = 0;

      try {
        const stats = await pc.getStats();
        let selectedCandidatePair: any = null;

        // 1. Browser compatibility check: inspect transport report first for selectedCandidatePairId (Firefox, Chrome standard)
        stats.forEach((report) => {
          if (report.type === 'transport' && report.selectedCandidatePairId) {
            const pair = stats.get(report.selectedCandidatePairId);
            if (pair) {
              selectedCandidatePair = pair;
            }
          }
          if (report.type === 'inbound-rtp') {
            if (typeof report.packetsLost === 'number') {
              packetsLostTotal += report.packetsLost;
            }
            if (typeof report.packetsReceived === 'number') {
              packetsReceivedTotal += report.packetsReceived;
            }
          }
        });

        // 2. Fallback search across candidate-pair reports if not found from transport
        if (!selectedCandidatePair) {
          stats.forEach((report) => {
            if (report.type === 'candidate-pair') {
              if (report.selected === true) {
                selectedCandidatePair = report;
              } else if (report.nominated === true && report.state === 'succeeded') {
                selectedCandidatePair = report;
              } else if (!selectedCandidatePair && report.state === 'succeeded') {
                selectedCandidatePair = report;
              }
            }
          });
        }

        // 3. Extract telemetry from the identified candidate pair
        if (selectedCandidatePair) {
          selectedPairConfirmed = Boolean(
            selectedCandidatePair.selected === true ||
            (selectedCandidatePair.nominated === true && selectedCandidatePair.state === 'succeeded')
          );

          // Handle browser RTT metric differences
          if (typeof selectedCandidatePair.currentRoundTripTime === 'number' && selectedCandidatePair.currentRoundTripTime > 0) {
            rtt = Math.round(selectedCandidatePair.currentRoundTripTime * 1000);
          } else if (typeof selectedCandidatePair.roundTripTime === 'number' && selectedCandidatePair.roundTripTime > 0) {
            rtt = Math.round(selectedCandidatePair.roundTripTime * 1000);
          } else if (
            typeof selectedCandidatePair.totalRoundTripTime === 'number' &&
            typeof selectedCandidatePair.responsesReceived === 'number' &&
            selectedCandidatePair.responsesReceived > 0
          ) {
            rtt = Math.round((selectedCandidatePair.totalRoundTripTime / selectedCandidatePair.responsesReceived) * 1000);
          }

          bytesSent = selectedCandidatePair.bytesSent || 0;
          bytesReceived = selectedCandidatePair.bytesReceived || 0;

          // 4. Resolve candidate type and connection path with strict LAN criteria
          let remoteCandidate: any = null;
          let localCandidate: any = null;

          if (selectedCandidatePair.remoteCandidateId) {
            remoteCandidate = stats.get(selectedCandidatePair.remoteCandidateId);
          }
          if (selectedCandidatePair.localCandidateId) {
            localCandidate = stats.get(selectedCandidatePair.localCandidateId);
          }

          if (remoteCandidate) {
            rawCandidateType = remoteCandidate.candidateType || 'unknown';
            const remoteAddr = remoteCandidate.address || remoteCandidate.ip || '';
            const localAddr = localCandidate?.address || localCandidate?.ip || '';

            if (rawCandidateType === 'host') {
              if (this.isLoopbackAddress(remoteAddr) || this.isLoopbackAddress(localAddr)) {
                connectionPath = 'Direct (Local Loopback)';
              } else if (this.isPrivateOrLocalAddress(remoteAddr) && this.isPrivateOrLocalAddress(localAddr)) {
                connectionPath = 'Direct (Private LAN)';
              } else {
                connectionPath = 'Direct (Host Candidate)';
              }
            } else if (rawCandidateType === 'srflx') {
              connectionPath = 'Direct P2P (STUN Reflexive)';
            } else if (rawCandidateType === 'relay') {
              connectionPath = 'Relayed (TURN Server)';
            } else if (rawCandidateType === 'prflx') {
              connectionPath = 'Direct P2P (Peer Reflexive)';
            } else {
              connectionPath = selectedPairConfirmed ? 'Connected (Selected Pair)' : 'Connected';
            }
          } else if (selectedPairConfirmed) {
            connectionPath = 'Connected (Candidate Details Pending)';
          }
        }

        // Calculate packet loss only when measurable packets exist
        if (packetsReceivedTotal + packetsLostTotal > 0) {
          packetLoss = Math.round((packetsLostTotal / (packetsReceivedTotal + packetsLostTotal)) * 100);
        }
      } catch (e) {
        console.warn('Failed to retrieve WebRTC getStats telemetry:', e);
      }

      telemetryList.push({
        peerId,
        rtt,
        candidateType: rawCandidateType,
        connectionPath,
        selectedPairConfirmed,
        bytesSent,
        bytesReceived,
        packetLoss,
        connectionState: pc.connectionState,
      });
    }

    return telemetryList;
  }
}

export interface PeerTelemetry {
  peerId: string;
  rtt: number | null;
  candidateType: string;
  connectionPath: string;
  selectedPairConfirmed: boolean;
  bytesSent: number;
  bytesReceived: number;
  packetLoss: number | null;
  connectionState: string;
}

