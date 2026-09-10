export type NetworkState = 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';

export interface NetworkMetrics {
    rtt: number; // ms
    packetLoss: number; // %
    jitter: number; // ms
    throughputRx: number; // bps
    throughputTx: number; // bps
    state: NetworkState;
    timestamp: number;
}

export class NetworkMonitor {
    private pc: RTCPeerConnection | null = null;
    // private dataChannel: RTCDataChannel | null = null;
    private intervalId: number | null = null;
    
    private lastBytesReceived = 0;
    private lastBytesSent = 0;
    private lastTimestamp = 0;

    public currentMetrics: NetworkMetrics = {
        rtt: 0,
        packetLoss: 0,
        jitter: 0,
        throughputRx: 0,
        throughputTx: 0,
        state: 'GOOD',
        timestamp: Date.now()
    };

    public onMetricsUpdate: (metrics: NetworkMetrics) => void = () => {};

    public start(pc: RTCPeerConnection, _dc: RTCDataChannel | null, intervalMs: number = 1000) {
        this.pc = pc;
        // this.dataChannel = dc;
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
            let rtt = 0;
            let packetsLost = 0;
            let packetsReceived = 0;
            let jitter = 0;
            let currentBytesReceived = 0;
            let currentBytesSent = 0;
            
            stats.forEach(report => {
                // RTT can be found in remote-inbound-rtp or candidate-pair
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    if (report.currentRoundTripTime !== undefined) {
                        rtt = report.currentRoundTripTime * 1000; // convert to ms
                    }
                }
                
                // Packets lost & jitter
                if (report.type === 'inbound-rtp') {
                    if (report.packetsLost) packetsLost += report.packetsLost;
                    if (report.packetsReceived) packetsReceived += report.packetsReceived;
                    if (report.jitter) jitter = Math.max(jitter, report.jitter * 1000); // ms
                }

                // Data throughput
                if (report.type === 'data-channel') {
                    if (report.bytesReceived) currentBytesReceived += report.bytesReceived;
                    if (report.bytesSent) currentBytesSent += report.bytesSent;
                }
            });

            // Calculate Throughput
            const now = Date.now();
            const timeDiff = (now - this.lastTimestamp) / 1000; // seconds
            
            let throughputRx = 0;
            let throughputTx = 0;
            if (timeDiff > 0) {
                throughputRx = ((currentBytesReceived - this.lastBytesReceived) * 8) / timeDiff; // bps
                throughputTx = ((currentBytesSent - this.lastBytesSent) * 8) / timeDiff; // bps
            }

            this.lastBytesReceived = currentBytesReceived;
            this.lastBytesSent = currentBytesSent;
            this.lastTimestamp = now;

            // Calculate Packet Loss %
            let packetLossPercent = 0;
            const totalPackets = packetsReceived + packetsLost;
            if (totalPackets > 0) {
                packetLossPercent = (packetsLost / totalPackets) * 100;
            }

            // Determine State
            const state = this.determineState(rtt, packetLossPercent, jitter);

            this.currentMetrics = {
                rtt,
                packetLoss: packetLossPercent,
                jitter,
                throughputRx,
                throughputTx,
                state,
                timestamp: now
            };

            this.onMetricsUpdate(this.currentMetrics);

        } catch (err) {
            console.error("NetworkMonitor: Error collecting stats", err);
        }
    }

    private determineState(rtt: number, loss: number, jitter: number): NetworkState {
        // Thresholds based on general WebRTC standards
        if (loss > 10 || rtt > 500) return 'CRITICAL';
        if (loss > 5 || rtt > 250 || jitter > 50) return 'POOR';
        if (loss > 1 || rtt > 100 || jitter > 20) return 'MODERATE';
        return 'GOOD';
    }
}


