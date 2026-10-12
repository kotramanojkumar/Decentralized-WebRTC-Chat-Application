/**
 * AdaptiveTransferEngine.ts
 * 
 * Research Engine for P2PConnect WebRTC DataChannel File Transfers.
 * Implements:
 * 1. Fixed Chunking Baseline (16KB static chunks).
 * 2. Adaptive Dynamic Pacing (8KB - 256KB dynamic scaling based on bufferedAmount).
 * 3. Synthetic Benchmark Runner with time-series telemetry and comparative trials.
 */

export type TransferStrategy = 'fixed-16kb' | 'adaptive-dynamic';

export type NetworkProfile = 'lan-unthrottled' | 'broadband-50mbps' | 'throttled-10mbps';

export interface TransferMetricsSnapshot {
  elapsedSeconds: number;
  bytesSent: number;
  totalBytes: number;
  chunkSize: number;
  bufferedAmount: number;
  instantThroughputMbps: number;
  progressPercent: number;
}

export interface BenchmarkTrialResult {
  id: string;
  strategy: TransferStrategy;
  strategyName: string;
  networkProfile: NetworkProfile;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  durationSeconds: number;
  avgThroughputMbps: number;
  peakThroughputMbps: number;
  minChunkSize: number;
  maxChunkSize: number;
  bufferThrottlesCount: number;
  status: 'completed' | 'failed' | 'aborted';
  timestamp: string;
  telemetryHistory: TransferMetricsSnapshot[];
}

export class AdaptiveTransferEngine {
  private isRunning = false;
  private isPaused = false;
  private abortRequested = false;

  // Constants aligned with docs/experiments.md
  public static readonly MIN_CHUNK_SIZE = 8192; // 8KB
  public static readonly INITIAL_CHUNK_SIZE = 16384; // 16KB baseline
  public static readonly MAX_CHUNK_SIZE = 262144; // 256KB
  public static readonly HIGH_WATER_MARK = 1048576; // 1MB buffer limit

  // Callbacks
  public onTick?: (snapshot: TransferMetricsSnapshot) => void;
  public onComplete?: (result: BenchmarkTrialResult) => void;
  public onError?: (error: Error) => void;

  public abort() {
    this.abortRequested = true;
    this.isRunning = false;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  public getIsRunning() {
    return this.isRunning;
  }

  /**
   * Runs a controlled benchmark trial on either synthetic data or a user file.
   */
  public async runTrial(
    strategy: TransferStrategy,
    fileSizeBytes: number,
    networkProfile: NetworkProfile,
    fileName = 'synthetic-benchmark.bin'
  ): Promise<BenchmarkTrialResult> {
    this.isRunning = true;
    this.isPaused = false;
    this.abortRequested = false;

    const startTime = performance.now();
    let currentChunkSize = strategy === 'fixed-16kb' 
      ? AdaptiveTransferEngine.INITIAL_CHUNK_SIZE 
      : AdaptiveTransferEngine.INITIAL_CHUNK_SIZE;

    let bytesSent = 0;
    let minChunkObserved = currentChunkSize;
    let maxChunkObserved = currentChunkSize;
    let bufferThrottlesCount = 0;
    let peakThroughputMbps = 0;

    let simulatedBufferedAmount = 0;
    const telemetryHistory: TransferMetricsSnapshot[] = [];

    // Drainage rates based on network profile (bytes per millisecond)
    // 10Mbps = ~1,250 bytes/ms, 50Mbps = ~6,250 bytes/ms, LAN = ~25,000 bytes/ms
    const drainRatePerMs = networkProfile === 'throttled-10mbps'
      ? 1250
      : networkProfile === 'broadband-50mbps'
      ? 6250
      : 25000;

    let lastTickTime = performance.now();
    let bytesSinceLastTick = 0;

    while (bytesSent < fileSizeBytes && !this.abortRequested) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const loopStart = performance.now();

      // Drain buffer according to network profile
      const elapsedMsSinceLastChunk = Math.max(1, loopStart - lastTickTime);
      const drained = elapsedMsSinceLastChunk * drainRatePerMs;
      simulatedBufferedAmount = Math.max(0, simulatedBufferedAmount - drained);

      // --- ADAPTIVE VS FIXED LOGIC ---
      if (strategy === 'adaptive-dynamic') {
        if (simulatedBufferedAmount > AdaptiveTransferEngine.HIGH_WATER_MARK) {
          // Congestion detected: halve chunk size and wait for buffer drain
          currentChunkSize = Math.max(
            AdaptiveTransferEngine.MIN_CHUNK_SIZE,
            Math.floor(currentChunkSize / 2)
          );
          bufferThrottlesCount++;
          // Pacing backoff delay
          await new Promise((r) => setTimeout(r, 25));
        } else if (simulatedBufferedAmount < AdaptiveTransferEngine.HIGH_WATER_MARK / 4) {
          // Buffer clear: aggressively increase chunk size up to 256KB
          currentChunkSize = Math.min(
            AdaptiveTransferEngine.MAX_CHUNK_SIZE,
            currentChunkSize * 2
          );
        }
      } else {
        // Fixed 16KB Strategy: Always 16KB
        currentChunkSize = AdaptiveTransferEngine.INITIAL_CHUNK_SIZE;
        if (simulatedBufferedAmount > AdaptiveTransferEngine.HIGH_WATER_MARK) {
          // Fixed strategy stall under heavy backpressure
          bufferThrottlesCount++;
          await new Promise((r) => setTimeout(r, 35));
        }
      }

      minChunkObserved = Math.min(minChunkObserved, currentChunkSize);
      maxChunkObserved = Math.max(maxChunkObserved, currentChunkSize);

      // Slicing chunk
      const chunkSizeToSend = Math.min(currentChunkSize, fileSizeBytes - bytesSent);
      bytesSent += chunkSizeToSend;
      bytesSinceLastTick += chunkSizeToSend;
      simulatedBufferedAmount += chunkSizeToSend;

      const now = performance.now();
      const tickDelta = (now - lastTickTime) / 1000; // seconds

      // Capture telemetry roughly every 100ms
      if (tickDelta >= 0.1 || bytesSent >= fileSizeBytes) {
        const instantThroughputMbps = (bytesSinceLastTick * 8) / (tickDelta * 1_000_000);
        peakThroughputMbps = Math.max(peakThroughputMbps, instantThroughputMbps);

        const totalElapsedSeconds = (now - startTime) / 1000;
        const snapshot: TransferMetricsSnapshot = {
          elapsedSeconds: Number(totalElapsedSeconds.toFixed(2)),
          bytesSent,
          totalBytes: fileSizeBytes,
          chunkSize: currentChunkSize,
          bufferedAmount: simulatedBufferedAmount,
          instantThroughputMbps: Number(instantThroughputMbps.toFixed(2)),
          progressPercent: Number(((bytesSent / fileSizeBytes) * 100).toFixed(1)),
        };

        telemetryHistory.push(snapshot);
        if (this.onTick) this.onTick(snapshot);

        lastTickTime = now;
        bytesSinceLastTick = 0;
      }

      // Small async yield to prevent thread locking
      await new Promise((r) => setTimeout(r, 4));
    }

    const totalDurationSeconds = Math.max(0.01, (performance.now() - startTime) / 1000);
    const avgThroughputMbps = Number(((bytesSent * 8) / (totalDurationSeconds * 1_000_000)).toFixed(2));

    const result: BenchmarkTrialResult = {
      id: crypto.randomUUID(),
      strategy,
      strategyName: strategy === 'adaptive-dynamic' ? 'Adaptive Dynamic Pacing (8K-256K)' : 'Fixed 16KB Baseline',
      networkProfile,
      fileName,
      fileSizeBytes,
      fileSizeFormatted: this.formatBytes(fileSizeBytes),
      durationSeconds: Number(totalDurationSeconds.toFixed(2)),
      avgThroughputMbps,
      peakThroughputMbps: Number(peakThroughputMbps.toFixed(2)),
      minChunkSize: minChunkObserved,
      maxChunkSize: maxChunkObserved,
      bufferThrottlesCount,
      status: this.abortRequested ? 'aborted' : 'completed',
      timestamp: new Date().toISOString(),
      telemetryHistory,
    };

    this.isRunning = false;
    if (this.onComplete && !this.abortRequested) {
      this.onComplete(result);
    }

    return result;
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Generates formatted CSV string for academic report benchmarking.
   */
  public static exportToCSV(results: BenchmarkTrialResult[]): string {
    const headers = [
      'Trial ID',
      'Strategy',
      'Network Profile',
      'File Size (Bytes)',
      'Duration (s)',
      'Avg Throughput (Mbps)',
      'Peak Throughput (Mbps)',
      'Min Chunk (Bytes)',
      'Max Chunk (Bytes)',
      'Buffer Stalls Count',
      'Status',
      'Timestamp',
    ];

    const rows = results.map((r) => [
      r.id,
      `"${r.strategyName}"`,
      r.networkProfile,
      r.fileSizeBytes,
      r.durationSeconds,
      r.avgThroughputMbps,
      r.peakThroughputMbps,
      r.minChunkSize,
      r.maxChunkSize,
      r.bufferThrottlesCount,
      r.status,
      r.timestamp,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Generates JSON export with full time-series snapshots.
   */
  public static exportToJSON(results: BenchmarkTrialResult[]): string {
    return JSON.stringify(results, null, 2);
  }
}
