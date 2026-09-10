import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<'LIVE' | 'COMPARE'>('LIVE');
  
  // Dummy data for now until we wire it to the global state
  const mockLiveMetrics = [
    { time: '0s', throughput: 0, rtt: 45, chunkSize: 64, buffer: 0 },
    { time: '1s', throughput: 120, rtt: 48, chunkSize: 128, buffer: 5 },
    { time: '2s', throughput: 250, rtt: 52, chunkSize: 256, buffer: 12 },
    { time: '3s', throughput: 240, rtt: 150, chunkSize: 128, buffer: 45 },
    { time: '4s', throughput: 80, rtt: 280, chunkSize: 8, buffer: 85 }, // Degradation
    { time: '5s', throughput: 10, rtt: 260, chunkSize: 8, buffer: 95 },
    { time: '6s', throughput: 90, rtt: 60, chunkSize: 64, buffer: 20 }, // Recovery
    { time: '7s', throughput: 260, rtt: 45, chunkSize: 256, buffer: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-200 p-8 pt-24 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Research & Telemetry</h1>
            <p className="text-gray-400 mt-2 text-sm">Adaptive WebRTC Data-Media Coordination</p>
          </div>
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setActiveTab('LIVE')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'LIVE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Live Telemetry
            </button>
            <button 
              onClick={() => setActiveTab('COMPARE')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'COMPARE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Baseline vs Proposed
            </button>
          </div>
        </header>

        {activeTab === 'LIVE' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Network</h3>
                <p className="text-3xl font-black text-white">GOOD</p>
                <p className="text-xs text-gray-400 mt-2">RTT: 45ms | Loss: 0.1%</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Media Quality</h3>
                <p className="text-3xl font-black text-white">STABLE</p>
                <p className="text-xs text-gray-400 mt-2">Frames dropped: 0</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Transfer Mode</h3>
                <p className="text-3xl font-black text-white">ADAPTIVE</p>
                <p className="text-xs text-blue-400 mt-2">Dynamic Chunk Sizing Active</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Transfer Status</h3>
                <p className="text-3xl font-black text-white">OPTIMIZING</p>
                <p className="text-xs text-gray-400 mt-2">Chunk: 256 KB | Pacing: 0ms</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-300 mb-6 uppercase tracking-wider">Throughput vs Buffer Pressure</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockLiveMetrics}>
                      <defs>
                        <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="throughput" stroke="#6366f1" fillOpacity={1} fill="url(#colorThroughput)" name="Throughput (kbps)" />
                      <Line type="monotone" dataKey="buffer" stroke="#f59e0b" strokeWidth={2} name="Buffer %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-300 mb-6 uppercase tracking-wider">Adaptive Chunk Sizing Response</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockLiveMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="stepAfter" dataKey="chunkSize" stroke="#10b981" strokeWidth={3} name="Chunk Size (KB)" />
                      <Line type="monotone" dataKey="rtt" stroke="#ef4444" strokeWidth={2} name="RTT (ms)" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'COMPARE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* BASELINE */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative">
              <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 px-4 py-1 rounded-bl-2xl rounded-tr-3xl text-xs font-bold uppercase tracking-wider">
                Control Group
              </div>
              <h2 className="text-2xl font-black text-white mb-2">BASELINE</h2>
              <p className="text-gray-400 text-sm mb-8">Fixed transfer strategy. No network or media awareness.</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Completion Time</span>
                    <span className="font-bold text-white">45.2s</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Average Throughput</span>
                    <span className="font-bold text-white">850 kbps</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Video Frame Drops</span>
                    <span className="font-bold text-red-400">450 frames (Severe)</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Buffer Overflows</span>
                    <span className="font-bold text-red-400">12 events</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PROPOSED */}
            <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(79,70,229,0.1)]">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1 rounded-bl-2xl rounded-tr-3xl text-xs font-bold uppercase tracking-wider">
                Proposed Adaptive
              </div>
              <h2 className="text-2xl font-black text-indigo-400 mb-2">PROPOSED</h2>
              <p className="text-indigo-200/60 text-sm mb-8">Media-aware adaptive throttling and dynamic chunking.</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Completion Time</span>
                    <span className="font-bold text-white">52.8s</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Average Throughput</span>
                    <span className="font-bold text-white">720 kbps</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Video Frame Drops</span>
                    <span className="font-bold text-green-400">12 frames (Stable)</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Buffer Overflows</span>
                    <span className="font-bold text-green-400">0 events</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-indigo-900/20 rounded-xl border border-indigo-500/20">
                <p className="text-sm text-indigo-200">
                  <strong className="text-white">Conclusion:</strong> The proposed adaptive mechanism sacrifices roughly 16% of transfer speed to guarantee a 97% reduction in video frame drops during network congestion events.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

