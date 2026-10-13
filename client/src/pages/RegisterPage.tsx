import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import BuddyRobot from '../components/BuddyRobot';
import ThemeToggle from '../components/ThemeToggle';
import { RobotShield3D } from '../components/ThreeDIcons';
import { parrotAudio } from '../utils/parrotAudio';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Modal State for Terms of Service and Privacy Policy
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'terms' | 'privacy'>('terms');

  // Focus & Success state
  const [isFocusEmail, setIsFocusEmail] = useState(false);
  const [isFocusPassword, setIsFocusPassword] = useState(false);
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          password: formData.password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register account');
      }

      setIsRegisterSuccess(true);
      parrotAudio.playCelebrationSound();

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', formData.email.trim());
      localStorage.setItem('displayName', formData.displayName.trim());
      if (data.user.username) localStorage.setItem('username', data.user.username);
      localStorage.setItem('justLoggedIn', 'true');

      setTimeout(() => {
        navigate('/profile-setup');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const emailPrompt = prompt('Enter your Google Account email to link your account:');
    if (!emailPrompt) return;
    const namePrompt = prompt('Enter your Full Name:', emailPrompt.split('@')[0]) || emailPrompt.split('@')[0];

    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailPrompt.trim(),
          displayName: namePrompt.trim(),
          photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(namePrompt)}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-up failed');

      setIsRegisterSuccess(true);
      parrotAudio.playCelebrationSound();

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('displayName', data.user.displayName);
      if (data.user.username) localStorage.setItem('username', data.user.username);
      if (data.user.photo || data.user.avatarUrl) {
        localStorage.setItem('avatarUrl', data.user.photo || data.user.avatarUrl);
      }
      localStorage.setItem('justLoggedIn', 'true');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Google account creation error');
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
            alt="Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption"
            className="w-10 h-10 object-contain rounded-2xl drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white block">Decentralized Real-Time Chat</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-cyan-400 block -mt-0.5">WebRTC with End-to-End Encryption</span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Split Screen Container Card (Liquid Glass Design) */}
      <div className="w-full max-w-5xl rounded-[36px] liquid-glass-card p-6 sm:p-10 lg:p-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mt-12 sm:mt-8">
        
        {/* LEFT COLUMN: 3D Cute Waving Robot Buddy */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <BuddyRobot
            userName={formData.displayName}
            isLoggedInSuccess={isRegisterSuccess}
            isFocusEmail={isFocusEmail}
            isFocusPassword={isFocusPassword}
            isRegister={true}
          />
        </div>

        {/* RIGHT COLUMN: Modern Registration Form */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          
          {/* Top Security Badge */}
          <div className="flex items-center gap-3 mb-4">
            <RobotShield3D className="w-12 h-12 shrink-0" />
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-cyan-400 block">
                Security &amp; Encryption
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                End-to-End Encrypted Mesh Identity
              </span>
            </div>
          </div>

          {/* Headline */}
          <AnimatePresence mode="wait">
            {isRegisterSuccess ? (
              <motion.div
                key="welcome-created"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 text-emerald-800 dark:text-emerald-300"
              >
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Welcome,</span>
                  <span className="text-emerald-600 dark:text-emerald-400 underline decoration-cyan-400 decoration-wavy">
                    {formData.displayName || 'Friend'}!
                  </span>
                  <span>🎉</span>
                </h1>
                <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Account created successfully. Initializing decentralized key pair...</span>
                </p>
              </motion.div>
            ) : (
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex flex-col gap-0.5">
                  <span>Create Account</span>
                  <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                    Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
                  </span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                  Join the decentralized peer-to-peer communication network with end-to-end encryption.
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
            
            {/* 1. Enter your name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                  👤
                </span>
                <input
                  type="text"
                  required
                  className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all shadow-sm"
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
            </div>

            {/* 2. Enter your email */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                  ✉️
                </span>
                <input
                  type="email"
                  required
                  onFocus={() => setIsFocusEmail(true)}
                  onBlur={() => setIsFocusEmail(false)}
                  className="w-full liquid-glass-input rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all shadow-sm"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* 3. Enter your password */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Password
              </label>
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
                  placeholder="Create a strong password (min 6 characters)"
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

            {/* Checkbox: Terms & Privacy (Clickable to view modal) */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reg-terms"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="reg-terms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                I agree to{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setModalTab('terms');
                    setModalOpen(true);
                  }}
                  className="text-blue-600 dark:text-cyan-400 font-medium hover:underline inline cursor-pointer"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setModalTab('privacy');
                    setModalOpen(true);
                  }}
                  className="text-blue-600 dark:text-cyan-400 font-medium hover:underline inline cursor-pointer"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Gradient Blue Sign Up Action Button */}
            <button
              type="submit"
              disabled={isLoading || isRegisterSuccess}
              className="w-full mt-4 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Decentralized Account...</span>
                </>
              ) : isRegisterSuccess ? (
                <span>Welcome, {formData.displayName}! 🎉</span>
              ) : (
                <span>Create Account</span>
              )}
            </button>

            {/* Google Sign Up Integration Option */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                <span className="flex-shrink mx-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Or Fast Register
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading || isRegisterSuccess}
                className="w-full mt-2 py-3 px-4 rounded-2xl liquid-glass-btn border border-slate-300/80 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-white flex items-center justify-center gap-3 transition shadow-sm hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Switcher Link: Already have an account? Sign In */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 dark:text-cyan-400 font-semibold hover:underline">
                  Sign In
                </Link>
              </span>
            </div>

          </form>

        </div>

      </div>

      {/* Footer Return Link */}
      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 relative z-20">
        <Link to="/" className="hover:text-slate-800 dark:hover:text-neutral-200 transition underline">
          ← Return to Home
        </Link>
      </div>

      {/* Interactive Terms & Privacy Policy Modal */}
      <TermsPrivacyModal
        isOpen={modalOpen}
        initialTab={modalTab}
        onClose={() => setModalOpen(false)}
        onAccept={() => {
          setAgreeTerms(true);
          setModalOpen(false);
        }}
      />

    </div>
  );
}
