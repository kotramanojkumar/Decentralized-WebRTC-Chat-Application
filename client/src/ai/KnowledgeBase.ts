export interface Intent {
  keywords: string[];
  response: string;
  action?: 'CREATE_ROOM' | 'EXPLAIN_METRICS' | 'NAVIGATE';
  actionPayload?: any;
}

export const ProjectKnowledgeBase: Intent[] = [
  {
    keywords: ['what is this project', 'what is this app', 'explain this platform', 'what can you do', 'who are you', 'capabilities'],
    response: "I am Nova, your AI assistant for this Decentralized WebRTC Chat Application. This platform provides secure peer-to-peer communication, featuring real-time audio/video calls, E2E encrypted messaging, zero-knowledge security policies, and an advanced Adaptive File Transfer system designed for research."
  },
  {
    keywords: ['adaptive', 'coordinator', 'file transfer', 'research', 'dynamic chunking', 'backpressure', 'buffer', 'experiment'],
    response: "The core research of this platform is the Media-Data Coordinator. When you send a large file during a video call, the Coordinator monitors your WebRTC stats (RTT, Jitter, Packet Loss). If video quality degrades, it dynamically shrinks the file transfer chunk size (down to 8KB) and adds pacing delays to prevent buffer overflow. This ensures your video call remains stable!"
  },
  {
    keywords: ['security', 'policy', 'zero knowledge', 'confidential', 'ephemeral', 'privacy'],
    response: "Security is paramount. The platform features an AI-driven Zero-Knowledge Security Engine. It classifies your chat messages in real-time. If it detects highly confidential info (like passwords or SSNs), it automatically drops message TTL to 10 seconds and disables downloading/copying to protect your privacy."
  },
  {
    keywords: ['network', 'metrics', 'stats', 'rtt', 'jitter', 'loss', 'telemetry', 'explain my network', 'how is my connection'],
    response: "I can read your live WebRTC telemetry.",
    action: 'EXPLAIN_METRICS'
  },
  {
    keywords: ['create room', 'start meeting', 'new call', 'call someone', 'host a meeting'],
    response: "I can help you host a secure meeting. Navigating to the room creation dashboard...",
    action: 'CREATE_ROOM'
  },
  {
    keywords: ['dashboard', 'research dashboard', 'show me charts', 'graphs', 'baseline vs proposed', 'telemetry ui', 'experiment ui'],
    response: "I am taking you to the Research Dashboard where you can view live telemetry and compare the Baseline vs Proposed adaptive strategies.",
    action: 'NAVIGATE',
    actionPayload: '/research'
  },
  {
    keywords: ['admin', 'admin panel', 'server logs', 'manage users'],
    response: "Navigating to the Admin Dashboard.",
    action: 'NAVIGATE',
    actionPayload: '/admin'
  },
  {
    keywords: ['contacts', 'friends', 'add a contact', 'contact requests'],
    response: "Taking you to your Contacts page where you can manage your peer-to-peer network.",
    action: 'NAVIGATE',
    actionPayload: '/contacts'
  },
  {
    keywords: ['task', 'to do', 'todo', 'reminders'],
    response: "You can manage your tasks directly on the main Dashboard. Navigating there now.",
    action: 'NAVIGATE',
    actionPayload: '/dashboard'
  },
  {
    keywords: ['settings', 'preferences', 'dark mode', 'change password', 'profile'],
    response: "Let's go to your Settings page.",
    action: 'NAVIGATE',
    actionPayload: '/settings'
  }
];

export function findBestResponse(query: string): Intent | null {
  const lowerQuery = query.toLowerCase();
  
  let bestMatch: Intent | null = null;
  let highestScore = 0;

  for (const intent of ProjectKnowledgeBase) {
    let score = 0;
    for (const keyword of intent.keywords) {
      if (lowerQuery.includes(keyword)) {
        score += keyword.length; // Longer keyword matches get higher weight
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = intent;
    }
  }

  return highestScore > 0 ? bestMatch : null;
}
