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
          body: JSON.stringify({ email: emailFor2FA, otp: formData.otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify OTP');

        const resolvedName = data.user?.displayName || data.user?.username || formData.email.split('@')[0];
        setWelcomeUserName(resolvedName);
        setIsLoggedInSuccess(true);
        parrotAudio.speakWelcome(resolvedName);

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user.username) localStorage.setItem('username', data.user.username);
        localStorage.setItem('justLoggedIn', 'true');

        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to login');

        if (data.requires2FA) {
          setRequires2FA(true);
          setEmailFor2FA(data.email);
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
        localStorage.setItem('justLoggedIn', 'true');

        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c1d] text-white flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Background Ambient Glows & Geometric Rings (from reference design) */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar with P2PConnect Brand & Theme Toggle */}
      <header className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/assets/p2p_connect_icon.png"
            alt="P2PConnect"
            className="w-10 h-10 object-contain rounded-2xl drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">P2PConnect</span>
            <span className="text-[10px] uppercase font-semibold text-cyan-400 block -mt-1">Real-Time Mesh</span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Split Screen Container Card (Liquid Glass Design) */}
      <div className="w-full max-w-5xl rounded-[36px] liquid-glass-card shadow-[0_25px_70px_rgba(2,6,23,0.85)] p-6 sm:p-10 lg:p-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mt-12 sm:mt-8">
        
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
          
          {/* Top Robot Head Badge (from reference image) */}
          <div className="flex items-center gap-3 mb-4">
            <RobotShield3D className="w-12 h-12" />
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 block">
                P2PConnect Security
              </span>
              <span className="text-xs text-neutral-400">
                End-to-End Encrypted Access
              </span>
            </div>
            {welcomeUserName && (
              <button
                type="button"
                onClick={() => parrotAudio.speakWelcome(welcomeUserName)}
                className="ml-auto px-3 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-400/30 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title="Hear greeting aloud"
              >
                <span>🔊</span>
                <span className="hidden sm:inline">Play Voice</span>
              </button>
            )}
          </div>

          {/* Dynamic Headline: "Welcome back, {Name}!" */}
          <AnimatePresence mode="wait">
            {isLoggedInSuccess ? (
              <motion.div
                key="welcome-back"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 text-emerald-300"
              >
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Welcome back,</span>
                  <span className="text-emerald-400 underline decoration-cyan-400 decoration-wavy">
                    {welcomeUserName || 'Friend'}!
                  </span>
                  <span>🎉</span>
                </h1>
                <p className="text-xs text-emerald-200/90 mt-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Authenticated successfully. Buddy is opening your rooms...</span>
                </p>
              </motion.div>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center gap-1.5">
                  <span>Welcome to</span>
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    Sign In Buddy!
                  </span>
                </h1>
                <p className="text-xs text-neutral-400 mt-1.5">
                  {welcomeUserName
                    ? `Welcome back, ${welcomeUserName}! Enter your credentials to sign in.`
                    : 'Sign in to access your decentralized peer-to-peer rooms.'}
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-2xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                {/* Email / Username Input with Icon (exact from reference) */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                      ✉️
                    </span>
                    <input
                      type="text"
                      required
                      onFocus={() => setIsFocusEmail(true)}
                      onBlur={() => setIsFocusEmail(false)}
                      className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none transition-all shadow-inner"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password Input with Lock Icon & Toggle (exact from reference) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
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
                            body: JSON.stringify({ email: formData.email })
                          });
                          const data = await res.json();
                          alert(data.message || 'Check your email for reset instructions.');
                        } catch (e) {
                          alert('Failed to send reset email.');
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      onFocus={() => setIsFocusPassword(true)}
                      onBlur={() => setIsFocusPassword(false)}
                      className="w-full liquid-glass-input rounded-2xl pl-11 pr-12 py-3.5 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none transition-all shadow-inner"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Checkbox: I agree to Terms & Conditions (exact from reference) */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#131d3d] border-blue-500/30 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-neutral-400 cursor-pointer">
                    I agree to{' '}
                    <span className="text-cyan-400 hover:underline">Terms of Conditions</span> and{' '}
                    <span className="text-cyan-400 hover:underline">Privacy of Policy</span>
                  </label>
                </div>
              </>
            ) : (
              /* OTP Verification Step */
              <div className="space-y-3 py-2">
                <label className="text-xs font-semibold text-neutral-300 block text-center">
                  Enter 6-Digit Email Verification Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full liquid-glass-input rounded-2xl px-4 py-3.5 text-white placeholder-neutral-500 focus:outline-none text-center text-2xl tracking-[0.5em] font-mono font-bold shadow-inner"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.otp}
                  onChange={e => setFormData({ ...formData, otp: e.target.value })}
                />
              </div>
            )}

            {/* Vibrant Blue Gradient Action Button (exact from reference) */}
            <button
              type="submit"
              disabled={isLoading || isLoggedInSuccess}
              className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : isLoggedInSuccess ? (
                <span>Welcome back, {welcomeUserName}! 🎉</span>
              ) : (
                <span>{requires2FA ? 'Verify Code' : 'Sign In'}</span>
              )}
            </button>

            {/* Switcher Text Link: "Already have an account? Sign Up" */}
            <div className="text-center pt-2">
              <span className="text-xs text-neutral-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline">
                  Sign Up
                </Link>
              </span>
            </div>

            {/* Social / Alternative Continue With Row (exact from reference) */}
            <div className="pt-3">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10" />
                <span className="flex-shrink mx-4 text-[11px] text-neutral-500 font-medium">Or continue with</span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => alert('Demo Google sign-in is ready for custom OAuth.')}
                  className="py-2.5 px-4 rounded-xl bg-[#131d3d] hover:bg-[#192752] border border-blue-500/20 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition"
                >
                  <span className="text-sm">🌐</span>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Demo Passkey sign-in is ready for WebAuthn.')}
                  className="py-2.5 px-4 rounded-xl bg-[#131d3d] hover:bg-[#192752] border border-blue-500/20 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition"
                >
                  <span className="text-sm">🔑</span>
                  <span>Passkey</span>
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>

      {/* Footer Return Link */}
      <div className="mt-8 text-center text-xs text-neutral-500 relative z-20">
        <Link to="/" className="hover:text-neutral-300 transition underline">
          ← Return to P2PConnect Home
        </Link>
      </div>

    </div>
  );
}
