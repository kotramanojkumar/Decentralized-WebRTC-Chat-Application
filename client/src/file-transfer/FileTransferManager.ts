import { NetworkMonitor } from '../research/NetworkMonitor';
import type { NetworkMetrics } from '../research/NetworkMonitor';
import { MediaQualityMonitor } from '../research/MediaQualityMonitor';
import type { MediaMetrics } from '../research/MediaQualityMonitor';
import { MediaDataCoordinator } from '../research/MediaDataCoordinator';
import type { CoordinatorPolicy } from '../research/MediaDataCoordinator';

export interface FileTransferMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export type TransferMode = 'BASELINE' | 'ADAPTIVE';

export class FileTransferManager {
  private fileBuffer: ArrayBuffer[] = [];
  private receivedSize = 0;
  private currentMetadata: FileTransferMetadata | null = null;
  
  private isPaused = false;
  private isCancelled = false;
  private currentOffset = 0;
  
  // Research Engines
  private networkMonitor = new NetworkMonitor();
  private mediaMonitor = new MediaQualityMonitor();
  private coordinator = new MediaDataCoordinator();

  // private mode: TransferMode = 'ADAPTIVE';
  private currentPolicy: CoordinatorPolicy = { strategy: 'OPTIMIZING', targetChunkSize: 65536, pacingDelayMs: 0 };

  // Metrics tracking
  private lastProgressTime = 0;
  private lastProgressOffset = 0;

  // Event Callbacks
  public onProgress: (progress: number, transferRateBps: number) => void = () => {};
  public onFileComplete: (blob: Blob, metadata: FileTransferMetadata) => void = () => {};
  public onAdaptivePolicyChanged: (policy: CoordinatorPolicy) => void = () => {};
  public onNetworkMetrics: (metrics: NetworkMetrics) => void = () => {};
  public onMediaMetrics: (metrics: MediaMetrics) => void = () => {};

  constructor() {
    this.networkMonitor.onMetricsUpdate = (m) => this.onNetworkMetrics(m);
    this.mediaMonitor.onMetricsUpdate = (m) => this.onMediaMetrics(m);
  }

  public setMode(mode: TransferMode) {
    // this.mode = mode;
    this.coordinator.setMode(mode === 'BASELINE');
  }

  public async sendFile(
    file: File, 
    pc: RTCPeerConnection,
    dataChannel: RTCDataChannel, 
    sendSecurePayload: (payload: any) => Promise<void>
  ) {
    this.isPaused = false;
    this.isCancelled = false;
    this.currentOffset = 0;
    this.lastProgressTime = Date.now();
    this.lastProgressOffset = 0;

    // Phase 12/13: Start Research Monitors
    this.networkMonitor.start(pc, dataChannel, 1000);
    this.mediaMonitor.start(pc, 1000);

    const fileId = crypto.randomUUID();
    
    // Evaluate initial policy
    this.currentPolicy = this.coordinator.evaluate(
      this.networkMonitor.currentMetrics,
      this.mediaMonitor.currentMetrics,
      dataChannel.bufferedAmount
    );

    const totalChunks = Math.ceil(file.size / this.currentPolicy.targetChunkSize); // Estimate

    const metadata: FileTransferMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks
    };

    // Phase 11: Integrity & Ordering (Metadata prep)
    await sendSecurePayload({ type: 'file-metadata', metadata });

    const readNextChunk = async () => {
      if (this.isCancelled) {
        this.cleanup();
        return;
      }
      if (this.isPaused) {
        setTimeout(readNextChunk, 500);
        return;
      }

      // Phase 6 & 8: Coordinator Evaluation
      this.currentPolicy = this.coordinator.evaluate(
        this.networkMonitor.currentMetrics,
        this.mediaMonitor.currentMetrics,
        dataChannel.bufferedAmount
      );
      this.onAdaptivePolicyChanged(this.currentPolicy);

      // Phase 10: Back-pressure Handling
      if (dataChannel.bufferedAmount > 1048576) { // 1MB Hard limit safety
        setTimeout(readNextChunk, 100);
        return;
      }

      // Phase 9: Dynamic Chunk Sizing
      const sliceSize = this.currentPolicy.targetChunkSize;
      const slice = file.slice(this.currentOffset, this.currentOffset + sliceSize);
      const buffer = await slice.arrayBuffer();
      const base64Chunk = this.arrayBufferToBase64(buffer);

      await sendSecurePayload({
        type: 'file-chunk',
        fileId,
        chunk: base64Chunk,
        offset: this.currentOffset
      });

      this.currentOffset += buffer.byteLength;
      
      // Calculate Transfer Rate
      const now = Date.now();
      const timeDiff = (now - this.lastProgressTime) / 1000;
      let transferRateBps = 0;
      if (timeDiff >= 0.5) { // update rate every 500ms
          transferRateBps = ((this.currentOffset - this.lastProgressOffset) * 8) / timeDiff;
          this.lastProgressTime = now;
          this.lastProgressOffset = this.currentOffset;
      }

      this.onProgress((this.currentOffset / file.size) * 100, transferRateBps);

      if (this.currentOffset < file.size) {
        // Phase 8: Adaptive Pacing
        if (this.currentPolicy.pacingDelayMs > 0) {
            setTimeout(readNextChunk, this.currentPolicy.pacingDelayMs);
        } else {
            setTimeout(readNextChunk, 0); // Event loop yield
        }
      } else {
        await sendSecurePayload({ type: 'file-complete', fileId });
        this.cleanup();
      }
    };

    readNextChunk();
  }

  // --- Receiving Methods ---
  public handleMetadata(metadata: FileTransferMetadata) {
    this.currentMetadata = metadata;
    this.fileBuffer = [];
    this.receivedSize = 0;
    this.currentOffset = 0;
    this.onProgress(0, 0);
  }

  public handleChunk(chunkBase64: string, _offset: number) {
    if (!this.currentMetadata) return;

    // Phase 11: Chunk Ordering & Integrity (basic offset handling)
    // Note: In a fully robust TCP-like system, we would buffer out-of-order chunks.
    // WebRTC DataChannels in 'reliable' mode guarantee order, so we append directly.
    const buffer = this.base64ToArrayBuffer(chunkBase64);
    this.fileBuffer.push(buffer);
    this.receivedSize += buffer.byteLength;
    this.currentOffset = this.receivedSize;

    this.onProgress((this.receivedSize / this.currentMetadata.size) * 100, 0);
  }

  public handleComplete(fileId: string) {
    if (!this.currentMetadata || this.currentMetadata.id !== fileId) return;

    // Phase 11: Integrity Check
    if (this.receivedSize !== this.currentMetadata.size) {
        console.error(`Integrity Error: Received ${this.receivedSize} bytes, expected ${this.currentMetadata.size}`);
        // Handle error/retry in real UI
        return;
    }

    const blob = new Blob(this.fileBuffer, { type: this.currentMetadata.type });
    this.onFileComplete(blob, this.currentMetadata);
    
    // Reset
    this.currentMetadata = null;
    this.fileBuffer = [];
    this.receivedSize = 0;
  }

  // --- Transfer Controls (Phase 11: Resume/Pause/Cancel) ---
  public pause() {
    this.isPaused = true;
    this.currentPolicy.strategy = 'PAUSED';
    this.onAdaptivePolicyChanged(this.currentPolicy);
  }

  public resume() {
    this.isPaused = false;
    this.currentPolicy.strategy = 'OPTIMIZING';
    this.onAdaptivePolicyChanged(this.currentPolicy);
  }

  public cancel() {
    this.isCancelled = true;
    this.cleanup();
  }

  private cleanup() {
    this.networkMonitor.stop();
    this.mediaMonitor.stop();
  }

  // --- Utils ---
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

