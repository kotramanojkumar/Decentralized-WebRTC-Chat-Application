import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFor2FA, setEmailFor2FA] = useState('');

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
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user.username) localStorage.setItem('username', data.user.username);
        localStorage.setItem('justLoggedIn', 'true');
        navigate('/dashboard');
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
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('email', data.user.email);
        if (data.user.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user.username) localStorage.setItem('username', data.user.username);
        localStorage.setItem('justLoggedIn', 'true');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div>
          <h2 className="text-2xl font-bold text-white text-center">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-white/50 text-center mt-2">
            {requires2FA ? 'Enter the OTP sent to your email.' : 'Sign in to access your secure rooms.'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!requires2FA ? (
              <>
                <div>
                  <label className="text-sm font-medium text-white/70 block mb-1">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="you@example.com or @username"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-white/70 block mb-1">
                    Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <label className="text-sm font-medium text-white/70 block mb-1">
                  Enter OTP sent to your email
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-center text-2xl tracking-[0.5em] font-bold"
                  placeholder="000000"
                  maxLength={6}
                  value={formData.otp}
                  onChange={e => setFormData({ ...formData, otp: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Decrypting Keychain...' : (requires2FA ? 'Verify OTP' : 'Sign In')}
            </button>
          </div>

          <div className="text-center text-sm flex flex-col gap-2">
            {!requires2FA && (
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
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                Forgot your password?
              </button>
            )}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
