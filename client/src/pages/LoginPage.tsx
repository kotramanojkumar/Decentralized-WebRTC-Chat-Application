import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import NetworkBackground from '../components/NetworkBackground';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 sm:p-8 font-sans">
      
      {/* Unique Split-Screen Container */}
      <div className="max-w-[1100px] w-full bg-gray-900/50 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(79,70,229,0.15)] flex flex-col md:flex-row overflow-hidden min-h-[700px]">
        
        {/* Left Panel: Project Branding & 3D Network */}
        <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-indigo-900/80 to-black relative p-12 flex-col justify-between overflow-hidden border-r border-white/5">
          {/* Animated WebRTC Background scoped to this panel */}
          <div className="absolute inset-0 z-0">
            <NetworkBackground />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
          
          <div className="relative z-20">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Decentralized <br/><span className="text-indigo-400">WebRTC.</span>
            </h1>
          </div>

          <div className="relative z-20 space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Experience zero-knowledge architecture with AI-driven adaptive media and dynamic data channel coordination.
            </p>
            <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              <span className="w-8 h-[1px] bg-indigo-500/50"></span>
              Nova AI Engine Active
            </div>
          </div>
        </div>

        {/* Right Panel: Sleek Dark Form */}
        <div className="w-full md:w-[55%] p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#0a0a0c] relative">
          
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm mb-10">Enter your credentials to securely access your node.</p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/20 p-3 rounded-xl">{error}</div>}
              
              <div className="space-y-5">
                {!requires2FA ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Email Address</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                        placeholder="node@network.local"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm tracking-widest"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-indigo-400 transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.058-5.058m1.288-1.288A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.288 3.288M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900" />
                        <label className="text-xs text-gray-500 font-medium">Remember me</label>
                      </div>
                      <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Forgot password?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider text-center block">Secure OTP</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-3xl tracking-[0.5em] font-bold"
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
                className="w-full py-4 rounded-2xl text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 mt-8 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
              >
                {isLoading ? 'Decrypting...' : (requires2FA ? 'Verify Node' : 'Initialize Session')}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </form>

            <div className="mt-10 text-center text-sm text-gray-500">
              <span>Don't have an access key? </span>
              <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline transition-colors">Deploy Node</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
