import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden relative">
      
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-3xl filter"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-3xl filter"></div>
      </div>

      <div className="z-10 text-center max-w-4xl px-4 flex flex-col items-center">
        
        {/* Logo / Icon Placeholder */}
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-xl flex items-center justify-center mb-10 transform rotate-3 hover:rotate-0 transition duration-300">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-6 tracking-tight">
          Decentralized Real-Time Chat
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl leading-relaxed">
          The next generation of secure, peer-to-peer communication. Featuring End-to-End Encryption, WebRTC Audio/Video, and Local AI processing.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-6 w-full sm:w-auto">
          <Link
            to="/register"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-lg shadow-blue-500/30 flex items-center justify-center"
          >
            Sign up for free
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-semibold rounded-xl hover:shadow-md hover:scale-105 transition-all duration-200 text-lg flex items-center justify-center"
          >
            Log in
          </Link>
        </div>

        {/* Feature badges */}
        <div className="mt-20 flex flex-wrap justify-center gap-4 text-sm font-medium">
          <span className="px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 rounded-full border shadow-sm flex items-center gap-2">
            🔒 End-to-End Encrypted
          </span>
          <span className="px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 rounded-full border shadow-sm flex items-center gap-2">
            🤖 Local AI Web Worker
          </span>
          <span className="px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 rounded-full border shadow-sm flex items-center gap-2">
            📡 Peer-to-Peer WebRTC
          </span>
        </div>
      </div>
    </div>
  );
}
