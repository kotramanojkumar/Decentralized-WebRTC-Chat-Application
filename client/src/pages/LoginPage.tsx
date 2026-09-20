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
        localStorage.setItem('displayName', data.user.displayName);
        localStorage.setItem('role', data.user.role);
        
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
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userId', data.user.id);
          localStorage.setItem('displayName', data.user.displayName);
          localStorage.setItem('role', data.user.role);
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-8 font-sans">
      
      {/* Main Split Container */}
      <div className="max-w-[1000px] w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden min-h-[650px]">
        
        {/* Left Panel: Nova AI Bot (Black) */}
        <div className="hidden md:flex md:w-1/2 bg-black flex-col items-center justify-center relative p-8">
          <style>
            {`
              @keyframes floatY {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-15px); }
              }
              .animate-float { animation: floatY 4s ease-in-out infinite; }
            `}
          </style>
          
          <div className="flex flex-col items-center">
            {/* The Robot Graphic */}
            <div className="relative animate-float z-10">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Antenna */}
                <path d="M70 70 L60 50 M60 50 L75 40" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="75" cy="40" r="6" fill="white" />
                
                {/* Ears */}
                <rect x="30" y="90" width="15" height="30" rx="4" fill="#e5e7eb" />
                <rect x="155" y="90" width="15" height="30" rx="4" fill="#e5e7eb" />
                
                {/* Main Head Shape (Octagon-ish) */}
                <path d="M60 70 L140 70 L170 95 L170 125 L140 150 L60 150 L30 125 L30 95 Z" fill="#f3f4f6" stroke="white" strokeWidth="4" strokeLinejoin="round"/>
                
                {/* Screen / Visor */}
                <path d="M65 85 L135 85 L155 102 L155 118 L135 135 L65 135 L45 118 L45 102 Z" fill="#111827" />
                
                {/* Left Eye (X) */}
                <path d="M75 100 L95 120 M95 100 L75 120" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                
                {/* Right Eye (Square) */}
                <rect x="115" y="105" width="12" height="12" fill="white" transform="rotate(15 115 105)" />
              </svg>
            </div>
            
            {/* Soft Shadow below robot */}
            <div className="w-40 h-6 bg-white/10 rounded-[100%] mt-8 blur-xl"></div>
          </div>
        </div>

        {/* Right Panel: Clean White Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          
          {/* User Avatar Top */}
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome back!</h2>
          <p className="text-gray-500 text-center text-sm mb-10">Enter your login details</p>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</div>}
            
            <div className="space-y-5">
              {!requires2FA ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow text-sm shadow-inner"
                      placeholder="name@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow text-sm shadow-inner tracking-widest"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.058-5.058m1.288-1.288A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.288 3.288M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                      <label className="text-xs text-gray-600 font-medium">Remember me</label>
                    </div>
                    <button type="button" className="text-xs text-gray-500 hover:text-black font-medium transition-colors">
                      Forgot password?
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 text-center block">Secure OTP</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow text-center text-3xl tracking-[0.5em] font-bold shadow-inner"
                    placeholder="000000"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full text-white font-medium bg-black hover:bg-gray-800 transition-all disabled:opacity-50 mt-8 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2"
            >
              {isLoading ? 'Processing...' : (requires2FA ? 'Verify' : 'Log in')}
            </button>
          </form>

          {!requires2FA && (
            <>
              <div className="relative mt-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-white text-gray-400">Or</span>
                </div>
              </div>

              {/* Mock Social Logins */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <span className="text-xs font-medium text-gray-600">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <span className="text-xs font-medium text-gray-600">Apple</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <span className="text-xs font-medium text-gray-600">X</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-8 text-center text-xs text-gray-500">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-black font-semibold hover:underline">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
