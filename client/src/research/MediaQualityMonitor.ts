export type MediaState = 'STABLE' | 'DEGRADING' | 'POOR' | 'RECOVERING';

export interface MediaMetrics {
    audioBitrate: number; // bps
    videoBitrate: number; // bps
    audioLoss: number; // %
    videoLoss: number; // %
    framesReceived: number;
    framesDropped: number;
    frameRate: number; // fps
    jitter: number; // ms
    state: MediaState;
    timestamp: number;
}

export class MediaQualityMonitor {
    private pc: RTCPeerConnection | null = null;
    private intervalId: number | null = null;
    
    private lastAudioBytes = 0;
    private lastVideoBytes = 0;
    private lastTimestamp = 0;

    // For state tracking
    private previousState: MediaState = 'STABLE';
    private poorCount = 0;

    public currentMetrics: MediaMetrics = {
        audioBitrate: 0,
        videoBitrate: 0,
        audioLoss: 0,
        videoLoss: 0,
        framesReceived: 0,
        framesDropped: 0,
        frameRate: 0,
        jitter: 0,
        state: 'STABLE',
        timestamp: Date.now()
    };

    public onMetricsUpdate: (metrics: MediaMetrics) => void = () => {};

    public start(pc: RTCPeerConnection, intervalMs: number = 1000) {
        this.pc = pc;
        this.lastTimestamp = Date.now();
        
        if (this.intervalId) window.clearInterval(this.intervalId);
        this.intervalId = window.setInterval(() => this.collectStats(), intervalMs);
    }

    public stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async collectStats() {
        if (!this.pc) return;

        try {
            const stats = await this.pc.getStats();
            let audioPacketsLost = 0;
            let audioPacketsReceived = 0;
            let videoPacketsLost = 0;
            let videoPacketsReceived = 0;
            let framesReceived = 0;
            let framesDropped = 0;
            let frameRate = 0;
            let jitter = 0;
            
            let currentAudioBytes = 0;
            let currentVideoBytes = 0;
            
            stats.forEach(report => {
                if (report.type === 'inbound-rtp') {
                    if (report.kind === 'audio') {
                        if (report.bytesReceived) currentAudioBytes += report.bytesReceived;
                        if (report.packetsLost) audioPacketsLost += report.packetsLost;
                        if (report.packetsReceived) audioPacketsReceived += report.packetsReceived;
                        if (report.jitter) jitter = Math.max(jitter, report.jitter * 1000);
                    } else if (report.kind === 'video') {
                        if (report.bytesReceived) currentVideoBytes += report.bytesReceived;
                        if (report.packetsLost) videoPacketsLost += report.packetsLost;
                        if (report.packetsReceived) videoPacketsReceived += report.packetsReceived;
                        if (report.framesReceived) framesReceived += report.framesReceived;
                        if (report.framesDropped) framesDropped += report.framesDropped;
                        if (report.framesPerSecond) frameRate = report.framesPerSecond;
                        if (report.jitter) jitter = Math.max(jitter, report.jitter * 1000);
                    }
                }
            });

            const now = Date.now();
            const timeDiff = (now - this.lastTimestamp) / 1000;
            
            let audioBitrate = 0;
            let videoBitrate = 0;
            
            if (timeDiff > 0) {
                audioBitrate = ((currentAudioBytes - this.lastAudioBytes) * 8) / timeDiff;
                videoBitrate = ((currentVideoBytes - this.lastVideoBytes) * 8) / timeDiff;
            }

            this.lastAudioBytes = currentAudioBytes;
            this.lastVideoBytes = currentVideoBytes;
            this.lastTimestamp = now;

            const totalAudioPackets = audioPacketsReceived + audioPacketsLost;
            const audioLoss = totalAudioPackets > 0 ? (audioPacketsLost / totalAudioPackets) * 100 : 0;
            
            const totalVideoPackets = videoPacketsReceived + videoPacketsLost;
            const videoLoss = totalVideoPackets > 0 ? (videoPacketsLost / totalVideoPackets) * 100 : 0;

            const state = this.determineState(audioLoss, videoLoss, framesDropped, jitter);

            this.currentMetrics = {
                audioBitrate,
                videoBitrate,
                audioLoss,
                videoLoss,
                framesReceived,
                framesDropped,
                frameRate,
                jitter,
                state,
                timestamp: now
            };

            this.onMetricsUpdate(this.currentMetrics);

        } catch (err) {
            console.error("MediaQualityMonitor: Error collecting stats", err);
        }
    }

    private determineState(audioLoss: number, videoLoss: number, framesDropped: number, jitter: number): MediaState {
        const isCurrentlyPoor = audioLoss > 5 || videoLoss > 5 || framesDropped > 30 || jitter > 100;
        const isCurrentlyDegrading = audioLoss > 2 || videoLoss > 2 || framesDropped > 10 || jitter > 50;

        let newState: MediaState = 'STABLE';

        if (isCurrentlyPoor) {
            newState = 'POOR';
            this.poorCount++;
        } else if (isCurrentlyDegrading) {
            newState = 'DEGRADING';
            this.poorCount = 0;
        } else {
            // If it was poor/degrading recently but is now fine, we are in RECOVERING state
            if (this.previousState === 'POOR' || this.previousState === 'DEGRADING' || this.previousState === 'RECOVERING') {
                if (this.poorCount > 0) {
                    this.poorCount--; // Takes a few cycles to fully recover to STABLE
                    newState = 'RECOVERING';
                } else {
                    newState = 'STABLE';
                }
            } else {
                newState = 'STABLE';
            }
        }

        if (newState !== 'RECOVERING') {
            this.previousState = newState;
        }
        
        // Setup initial poorCount for recovery timeout
        if (newState === 'POOR' || newState === 'DEGRADING') {
            this.poorCount = 3; // require 3 clean cycles to reach STABLE
        }

        return newState;
    }
}
