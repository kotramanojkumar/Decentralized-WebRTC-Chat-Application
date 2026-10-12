import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      alert('Password reset successful! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 text-slate-900 dark:text-white font-sans">
        <div className="max-w-md w-full liquid-glass-card p-8 rounded-3xl shadow-2xl text-center text-rose-600 dark:text-rose-400">
          Invalid or expired password reset link.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative text-slate-900 dark:text-white font-sans">
      <div className="max-w-md w-full space-y-8 liquid-glass-card p-8 rounded-3xl shadow-2xl z-10">
        <div>
          <h2 className="text-center text-2xl font-black text-slate-900 dark:text-white">
            Reset Password
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mt-2 text-sm">Enter your new password below to regain access.</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-rose-600 dark:text-rose-400 text-sm text-center font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">{error}</div>}
          
          <div className="space-y-4">
            <div className="relative">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="relative">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
