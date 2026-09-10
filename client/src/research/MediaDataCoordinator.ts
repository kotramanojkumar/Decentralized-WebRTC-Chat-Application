import type { NetworkMetrics } from './NetworkMonitor';
import type { MediaMetrics } from './MediaQualityMonitor';

export type AdaptiveStrategy = 'OPTIMIZING' | 'THROTTLED' | 'PAUSED' | 'RECOVERING' | 'BASELINE';

export interface CoordinatorPolicy {
    strategy: AdaptiveStrategy;
    targetChunkSize: number;
    pacingDelayMs: number; // Delay between chunk sends
}

export class MediaDataCoordinator {
    private readonly MIN_CHUNK_SIZE = 8192; // 8KB
    private readonly MAX_CHUNK_SIZE = 262144; // 256KB
    
    private currentChunkSize = 65536; // Start at 64KB
    // private currentStrategy: AdaptiveStrategy = 'OPTIMIZING';
    
    private isBaselineMode = false;

    public setMode(baseline: boolean) {
        this.isBaselineMode = baseline;
    }

    public evaluate(
        network: NetworkMetrics, 
        media: MediaMetrics, 
        bufferAmount: number,
        highWaterMark: number = 1048576 // 1MB
    ): CoordinatorPolicy {
        
        if (this.isBaselineMode) {
            return {
                strategy: 'BASELINE',
                targetChunkSize: 65536, // Fixed 64KB
                pacingDelayMs: 0
            };
        }

        let strategy: AdaptiveStrategy = 'OPTIMIZING';
        let pacingDelayMs = 0;

        // 1. Buffer Pressure (Immediate local back-pressure)
        if (bufferAmount > highWaterMark) {
            strategy = 'THROTTLED';
            this.currentChunkSize = Math.max(this.MIN_CHUNK_SIZE, this.currentChunkSize * 0.5);
            pacingDelayMs = 50; // Add small delay to drain buffer
        } 
        else if (bufferAmount > highWaterMark * 0.5) {
            // Buffer filling up, hold steady
            strategy = 'OPTIMIZING';
        }

        // 2. Network & Media Coordination
        if (network.state === 'CRITICAL' || media.state === 'POOR') {
            strategy = 'THROTTLED'; // Deeply throttle to protect media
            this.currentChunkSize = this.MIN_CHUNK_SIZE;
            pacingDelayMs = 100; 
        } 
        else if (network.state === 'POOR' || media.state === 'DEGRADING') {
            strategy = 'THROTTLED';
            this.currentChunkSize = Math.max(this.MIN_CHUNK_SIZE, this.currentChunkSize * 0.75);
            pacingDelayMs = 25;
        } 
        else if (media.state === 'RECOVERING') {
            strategy = 'RECOVERING';
            // Keep chunk size small, wait for STABLE
            pacingDelayMs = 10;
        } 
        else if (network.state === 'GOOD' && media.state === 'STABLE') {
            if (strategy !== 'THROTTLED') {
                strategy = 'OPTIMIZING';
                // Increase aggressively if buffer is low
                if (bufferAmount < highWaterMark * 0.2) {
                    this.currentChunkSize = Math.min(this.MAX_CHUNK_SIZE, this.currentChunkSize * 1.5);
                }
            }
        }

        // this.currentStrategy = strategy;

        return {
            strategy,
            targetChunkSize: Math.round(this.currentChunkSize),
            pacingDelayMs
        };
    }
}

