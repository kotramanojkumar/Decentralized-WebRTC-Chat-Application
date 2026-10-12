import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import BuddyRobot from '../components/BuddyRobot';
import ThemeToggle from '../components/ThemeToggle';
import { RobotShield3D } from '../components/ThreeDIcons';
import { parrotAudio } from '../utils/parrotAudio';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [require2FAOption, setRequire2FAOption] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFor2FA, setEmailFor2FA] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Personalized Welcome Back State
  const [welcomeUserName, setWelcomeUserName] = useState<string>('');
  const [isLoggedInSuccess, setIsLoggedInSuccess] = useState(false);

  // Focus tracking for Buddy's interactive reactions
  const [isFocusEmail, setIsFocusEmail] = useState(false);
  const [isFocusPassword, setIsFocusPassword] = useState(false);

  // Check if user previously logged in on this machine
  useEffect(() => {
    const savedName = localStorage.getItem('displayName') || localStorage.getItem('username');
    if (savedName) {
      setWelcomeUserName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (requires2FA) {
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailFor2FA, otp: formData.otp.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify OTP code');

        const resolvedName = data.user?.displayName || data.user?.username || formData.email.split('@')[0];
        setWelcomeUserName(resolvedName);
        setIsLoggedInSuccess(true);
        parrotAudio.speakWelcome(resolvedName);

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('email', data.user.email);
        if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user.username) localStorage.setItem('username', data.user.username);
        if (data.user.photo || data.user.avatarUrl) {
          localStorage.setItem('avatarUrl', data.user.photo || data.user.avatarUrl);
        }
        localStorage.setItem('justLoggedIn', 'true');

        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email.trim(), 
            password: formData.password,
            require2FA: require2FAOption 
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to login');

        if (data.requires2FA) {
          setRequires2FA(true);
          setEmailFor2FA(data.email || formData.email.trim());
          setIsLoading(false);
          return;
        }

        const resolvedName = data.user?.displayName || data.user?.username || formData.email.split('@')[0];
        setWelcomeUserName(resolvedName);
        setIsLoggedInSuccess(true);
        parrotAudio.speakWelcome(resolvedName);

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('email', data.user.email);
        if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user.username) localStorage.setItem('username', data.user.username);
        if (data.user.photo || data.user.avatarUrl) {
          localStorage.setItem('avatarUrl', data.user.photo || data.user.avatarUrl);
        }
        localStorage.setItem('justLoggedIn', 'true');

        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Background Ambient Fluid Glowing Mesh Orbs (Apple VisionOS / iOS style) */}
      <div className="absolute top-10 left-10 w-[420px] h-[420px] bg-blue-500/20 dark:bg-blue-600/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[420px] h-[420px] bg-purple-500/20 dark:bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-400/15 dark:bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar with P2PConnect Brand & Theme Toggle */}
      <header className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/assets/p2p_connect_icon.png"
            alt="P2PConnect"
            className="w-10 h-10 object-contain rounded-2xl drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white block">P2PConnect</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-cyan-400 block -mt-1">Real-Time Mesh</span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Split Screen Container Card (Liquid Glass Design) */}
      <div className="w-full max-w-5xl rounded-[36px] liquid-glass-card p-6 sm:p-10 lg:p-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mt-12 sm:mt-8">
        
        {/* LEFT COLUMN: 3D Cute Waving Robot Buddy + Interactive Dialog Speech Bubbles */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <BuddyRobot
            userName={welcomeUserName}
            isLoggedInSuccess={isLoggedInSuccess}
            isFocusEmail={isFocusEmail}
            isFocusPassword={isFocusPassword}
            isRegister={false}
          />
        </div>

        {/* RIGHT COLUMN: Modern Form with Avatar Badge & Dynamic "Welcome back" greeting */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          
          {/* Top Security Badge */}
          <div className="flex items-center gap-3 mb-4">
            <RobotShield3D className="w-12 h-12 shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-cyan-400 block">
                P2PConnect Security
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                End-to-End Encrypted WebRTC Access
              </span>
            </div>
            {welcomeUserName && (
              <button
                type="button"
                onClick={() => parrotAudio.speakWelcome(welcomeUserName)}
                className="ml-auto px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs font-semibold text-blue-700 dark:text-cyan-300 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title="Hear greeting aloud"
              >
                <span>🔊</span>
                <span className="hidden sm:inline">Play Voice</span>
              </button>
            )}
          </div>

          {/* Dynamic Headline */}
          <AnimatePresence mode="wait">
            {isLoggedInSuccess ? (
              <motion.div
                key="welcome-back"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 text-emerald-800 dark:text-emerald-300"
              >
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Welcome back,</span>
                  <span className="text-emerald-600 dark:text-emerald-400 underline decoration-cyan-400 decoration-wavy">
                    {welcomeUserName || 'Friend'}!
                  </span>
                  <span>🎉</span>
                </h1>
                <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Authenticated successfully. Opening decentralized peer mesh...</span>
                </p>
              </motion.div>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                  <span>Welcome to</span>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                    P2PConnect
                  </span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                  {welcomeUserName
                    ? `Welcome back, ${welcomeUserName}! Enter your credentials to access the secure mesh.`
                    : 'Sign in to access your decentralized peer-to-peer rooms & end-to-end encrypted messaging.'}
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 shadow-sm">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                {/* Email / Username Input with Icon */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                      ✉️
                    </span>
                    <input
                      type="text"
                      required
                      onFocus={() => setIsFocusEmail(true)}
                      onBlur={() => setIsFocusEmail(false)}
                      className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all shadow-sm"
                      placeholder="Enter your email or @username"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password Input with Lock Icon & Toggle */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.email) {
                          alert('Please enter your email address first.');
                          return;
                        }
                        try {
                          const res = await fetch(`${API_URL}/auth/forgot-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: formData.email.trim() })
                          });
                          const data = await res.json();
                          alert(data.message || 'Check your email for reset instructions.');
                        } catch (e) {
                          alert('Failed to send reset email.');
                        }
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      onFocus={() => setIsFocusPassword(true)}
                      onBlur={() => setIsFocusPassword(false)}
                      className="w-full liquid-glass-input rounded-2xl pl-11 pr-12 py-3.5 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all shadow-sm"
                      placeholder="Enter your account password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-medium cursor-pointer"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Two-Step Verification Checkbox */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="twoStepOption"
                      checked={require2FAOption}
                      onChange={e => setRequire2FAOption(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="twoStepOption" className="text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                      🛡️ Require 2-Step Email Verification Code (OTP)
                    </label>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-cyan-400">High Security</span>
                </div>

                {/* Checkbox: Terms & Privacy */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    I agree to{' '}
                    <span className="text-blue-600 dark:text-cyan-400 font-medium hover:underline">Terms of Service</span> and{' '}
                    <span className="text-blue-600 dark:text-cyan-400 font-medium hover:underline">Privacy Policy</span>
                  </label>
                </div>
              </>
            ) : (
              /* OTP Verification Step */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center">
                  <div className="text-2xl mb-1">📬</div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security Verification Required</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    We sent a 6-digit one-time code to <strong className="text-blue-600 dark:text-cyan-400">{emailFor2FA}</strong>. Enter it below to unlock your account:
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block text-center mb-1.5">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full liquid-glass-input rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-center text-2xl tracking-[0.4em] font-mono font-bold shadow-inner"
                    placeholder="000000"
                    maxLength={6}
                    value={formData.otp}
                    onChange={e => setFormData({ ...formData, otp: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setError('');
                    }}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                  >
                    ← Back to credentials
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        const res = await fetch(`${API_URL}/auth/login`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: emailFor2FA, password: formData.password, require2FA: true })
                        });
                        const d = await res.json();
                        alert(d.message || 'New OTP sent to your email.');
                      } catch (err) {
                        alert('Failed to resend code.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-blue-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            )}

            {/* Blue Gradient Action Button */}
            <button
              type="submit"
              disabled={isLoading || isLoggedInSuccess || (!agreeTerms && !requires2FA)}
              className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{requires2FA ? 'Verifying Code...' : 'Authenticating...'}</span>
                </>
              ) : isLoggedInSuccess ? (
                <span>Welcome back, {welcomeUserName}! 🎉</span>
              ) : (
                <span>{requires2FA ? 'Verify Code & Enter Mesh' : 'Sign In'}</span>
              )}
            </button>

            {/* Switcher Text Link: Don't have an account? Sign Up */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 dark:text-cyan-400 font-semibold hover:underline">
                  Create P2P Account
                </Link>
              </span>
            </div>

          </form>

        </div>

      </div>

      {/* Footer Return Link */}
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 relative z-20">
        <Link to="/" className="hover:text-slate-800 dark:hover:text-neutral-200 transition underline">
          ← Return to P2PConnect Home
        </Link>
      </div>

    </div>
  );
}
