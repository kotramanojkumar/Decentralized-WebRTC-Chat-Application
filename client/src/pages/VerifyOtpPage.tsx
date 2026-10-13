import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import ThemeToggle from '../components/ThemeToggle';
import { RobotShield3D } from '../components/ThreeDIcons';
import { parrotAudio } from '../utils/parrotAudio';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve pending email from router state or session storage
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(45); // 45s resend cooldown timer
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'Two-Step Verification | Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption';

    const stateEmail = (location.state as any)?.email;
    const sessionEmail = sessionStorage.getItem('pending2FAEmail');
    const resolvedEmail = stateEmail || sessionEmail;

    if (!resolvedEmail) {
      // No pending login session found, redirect to login
      navigate('/login', { replace: true });
    } else {
      setEmail(resolvedEmail);
    }
  }, [location, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskEmail = (val: string) => {
    if (!val || !val.includes('@')) return val;
    const [name, domain] = val.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      setIsSuccess(true);
      setSuccessMsg('Verification successful! Accessing your decentralized mesh...');
      
      const resolvedName = data.user?.displayName || data.user?.username || email.split('@')[0];
      parrotAudio.speakWelcome(resolvedName);

      // Store fully authenticated credentials
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
      if (data.user.username) localStorage.setItem('username', data.user.username);
      if (data.user.photo || data.user.avatarUrl) {
        localStorage.setItem('avatarUrl', data.user.photo || data.user.avatarUrl);
      }
      localStorage.setItem('twoFactorEnabled', String(data.user.twoFactorEnabled ?? true));
      localStorage.setItem('justLoggedIn', 'true');

      // Clear pending session storage
      sessionStorage.removeItem('pending2FAEmail');
      sessionStorage.removeItem('pending2FAName');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1400);

    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setSuccessMsg('A new 6-digit OTP code has been dispatched to your email.');
      setCooldown(45); // Reset cooldown to 45s
    } catch (err: any) {
      setError(err.message || 'Failed to deliver OTP. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Background Ambient Fluid Glowing Mesh Orbs */}
      <div className="absolute top-10 left-10 w-[420px] h-[420px] bg-blue-500/20 dark:bg-blue-600/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[420px] h-[420px] bg-purple-500/20 dark:bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-400/15 dark:bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/assets/p2p_connect_icon.png"
            alt="Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption"
            className="w-10 h-10 object-contain rounded-2xl drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white block">
              Decentralized Real-Time Chat
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-cyan-400 block -mt-0.5">
              WebRTC with End-to-End Encryption
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main OTP Verification Card (Liquid Glass) */}
      <div className="w-full max-w-md rounded-[36px] liquid-glass-card p-6 sm:p-10 relative z-10 shadow-2xl mt-12 sm:mt-8">
        
        {/* Shield Icon & Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <RobotShield3D className="w-16 h-16 mb-3 drop-shadow-lg" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-cyan-400 mb-1">
            Account Protection
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Two-Step Verification
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            An OTP has been sent to your registered email address:{' '}
            <strong className="text-blue-600 dark:text-cyan-400 font-mono font-semibold">
              {maskEmail(email)}
            </strong>
          </p>
        </div>

        {/* Notifications & Status Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 shadow-sm"
            >
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 shadow-sm"
            >
              <span className="text-base shrink-0">✅</span>
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block text-center mb-2">
              Enter OTP
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                maxLength={6}
                value={otp}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, ''); // Numbers only
                  setOtp(val);
                }}
                disabled={isLoading || isSuccess}
                className="w-full liquid-glass-input rounded-2xl px-4 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-center text-3xl tracking-[0.45em] font-mono font-bold shadow-inner"
                placeholder="••••••"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2">
              Enter the 6-digit verification code from your inbox
            </p>
          </div>

          {/* Verify OTP Button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess || otp.length < 6}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Validating OTP Code...</span>
              </>
            ) : isSuccess ? (
              <span>Authenticated! Welcome 🎉</span>
            ) : (
              <span>Verify OTP</span>
            )}
          </button>

          {/* Resend OTP with Cooldown Timer */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('pending2FAEmail');
                navigate('/login', { replace: true });
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>←</span>
              <span>Back to Sign In</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending || isSuccess}
              className={`font-semibold cursor-pointer transition ${
                cooldown > 0 || isResending
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'text-blue-600 dark:text-cyan-400 hover:underline'
              }`}
            >
              {isResending ? (
                <span>Sending...</span>
              ) : cooldown > 0 ? (
                <span>Resend OTP in {cooldown}s</span>
              ) : (
                <span>Resend OTP</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Project Tag */}
        <div className="mt-8 pt-4 border-t border-black/5 dark:border-white/10 text-center">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
            Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
          </p>
        </div>

      </div>

    </div>
  );
}
