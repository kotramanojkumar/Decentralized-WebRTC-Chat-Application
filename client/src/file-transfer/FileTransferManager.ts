export interface FileTransferMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export class FileTransferManager {
  private fileBuffer: ArrayBuffer[] = [];
  private receivedSize = 0;
  private currentMetadata: FileTransferMetadata | null = null;
  private isPaused = false;
  
  public onProgress: (progress: number) => void = () => {};
  public onFileComplete: (blob: Blob, metadata: FileTransferMetadata) => void = () => {};
  public onAdaptiveChunkSizeChanged: (size: number) => void = () => {};

  // Adaptive parameters
  private currentChunkSize = 16384; // 16KB start
  private readonly MIN_CHUNK_SIZE = 8192; // 8KB
  private readonly MAX_CHUNK_SIZE = 262144; // 256KB
  private readonly HIGH_WATER_MARK = 1048576; // 1MB buffer

  public sendFile(
    file: File, 
    dataChannel: RTCDataChannel, 
    sendSecurePayload: (payload: any) => Promise<void>
  ) {
    const fileId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / this.currentChunkSize);

    const metadata: FileTransferMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks
    };

    // Send metadata first
    sendSecurePayload({ type: 'file-metadata', metadata });

    let offset = 0;

    const readNextChunk = async () => {
      if (this.isPaused) return;

      // Adaptive Check: wait if buffer is too full
      if (dataChannel.bufferedAmount > this.HIGH_WATER_MARK) {
        // Drop chunk size slightly due to congestion
        this.currentChunkSize = Math.max(this.MIN_CHUNK_SIZE, this.currentChunkSize / 2);
        this.onAdaptiveChunkSizeChanged(this.currentChunkSize);
        
        // Wait for buffer to drain
        dataChannel.onbufferedamountlow = () => {
          dataChannel.onbufferedamountlow = null;
          readNextChunk();
        };
        return;
      }

      // Increase chunk size if network is smooth
      if (dataChannel.bufferedAmount === 0 && this.currentChunkSize < this.MAX_CHUNK_SIZE) {
        this.currentChunkSize = Math.min(this.MAX_CHUNK_SIZE, this.currentChunkSize * 2);
        this.onAdaptiveChunkSizeChanged(this.currentChunkSize);
      }

      const slice = file.slice(offset, offset + this.currentChunkSize);
      const buffer = await slice.arrayBuffer();
      const base64Chunk = this.arrayBufferToBase64(buffer);

      await sendSecurePayload({
        type: 'file-chunk',
        fileId,
        chunk: base64Chunk,
        offset
      });

      offset += buffer.byteLength;
      this.onProgress((offset / file.size) * 100);

      if (offset < file.size) {
        // Process next chunk asynchronously to avoid blocking UI
        setTimeout(readNextChunk, 0);
      } else {
        await sendSecurePayload({ type: 'file-complete', fileId });
      }
    };

    readNextChunk();
  }

  public handleMetadata(metadata: FileTransferMetadata) {
    this.currentMetadata = metadata;
    this.fileBuffer = [];
    this.receivedSize = 0;
    this.onProgress(0);
  }

  public handleChunk(chunkBase64: string, _offset: number) {
    if (!this.currentMetadata) return;

    const buffer = this.base64ToArrayBuffer(chunkBase64);
    this.fileBuffer.push(buffer);
    this.receivedSize += buffer.byteLength;
    this.onProgress((this.receivedSize / this.currentMetadata.size) * 100);
  }

  public handleComplete(fileId: string) {
    if (!this.currentMetadata || this.currentMetadata.id !== fileId) return;

    const blob = new Blob(this.fileBuffer, { type: this.currentMetadata.type });
    this.onFileComplete(blob, this.currentMetadata);
    
    // Reset
    this.currentMetadata = null;
    this.fileBuffer = [];
    this.receivedSize = 0;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume(_dataChannel: RTCDataChannel, _sendSecurePayload: (p: any) => Promise<void>) {
    this.isPaused = false;
    // Real implementation would resume from last offset.
    // This requires the receiver to send an ack of bytes received.
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
