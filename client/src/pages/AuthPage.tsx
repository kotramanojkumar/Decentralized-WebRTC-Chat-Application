import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  
  // Update URL without reloading when switching modes
  useEffect(() => {
    window.history.pushState(null, '', isLogin ? '/login' : '/register');
  }, [isLogin]);

  // Form State
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (requires2FA) {
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp: formData.otp })
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to register');

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('displayName', data.user.displayName);
      localStorage.setItem('role', data.user.role);
      
      navigate('/profile-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden bg-[#090b16] text-[#f4f3ff]">
      
      {/* Background Orbs & 3D Environment (Inspired by Orbit) */}
      <style>
        {`
          @keyframes floatOrb {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-28px) rotate(8deg); }
          }
          .animate-float-orb { animation: floatOrb 10s ease-in-out infinite; }
          .bg-radial-grid {
            background-image: linear-gradient(#ffffff18 1px, transparent 1px), linear-gradient(90deg, #ffffff18 1px, transparent 1px);
            background-size: 64px 64px;
            mask-image: radial-gradient(ellipse, black, transparent 75%);
          }
        `}
      </style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at 15% 15%, #33235a66, transparent 45%), radial-gradient(ellipse at 90% 85%, #17445255, transparent 45%)' }}>
        <div className="absolute inset-0 opacity-[0.18] bg-radial-grid"></div>
        {/* Orb One */}
        <div className="absolute w-[240px] h-[240px] top-[10%] left-[calc(50%-430px)] rounded-full animate-float-orb" 
             style={{ background: 'radial-gradient(circle at 30% 25%, #e5d2ff, #8c59e8 35%, #22113f 75%)', boxShadow: 'inset -20px -20px 40px #0007, 0 0 100px #8255e82b' }}></div>
        {/* Orb Two */}
        <div className="absolute w-[140px] h-[140px] right-[calc(50%-340px)] bottom-[12%] rounded-full animate-float-orb" 
             style={{ background: 'radial-gradient(circle at 30% 25%, #cafff2, #47baa8 35%, #102d38 75%)', animationDelay: '-5s' }}></div>
        {/* 3D Ring */}
        <div className="absolute w-[210px] h-[210px] top-[16%] right-[12%] border-[18px] border-[#b7a2ff] rounded-full opacity-25"
             style={{ transform: 'rotateX(65deg) rotateY(-25deg)', boxShadow: '0 0 35px #a78bfa44, inset 0 0 25px #a78bfa44' }}></div>
      </div>

      <main className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
        
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-6 font-bold text-2xl tracking-tight">
          <div className="w-7 h-7 border-[6px] border-[#b7a2ff] rounded-full shadow-[5px_-3px_0_-2px_#75dfcb] transform -rotate-[25deg]"></div>
          Decentralized WebRTC
        </div>

        {/* Switcher Toggle */}
        <div className="flex w-[258px] mb-8 p-1.5 border border-white/10 rounded-2xl bg-white/5 relative">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${isLogin ? 'text-white bg-white/10 shadow-[0_3px_12px_rgba(0,0,0,0.3)]' : 'text-[#a6aac5] hover:text-white'}`}
          >
            Log in
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setRequires2FA(false); }}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${!isLogin ? 'text-white bg-white/10 shadow-[0_3px_12px_rgba(0,0,0,0.3)]' : 'text-[#a6aac5] hover:text-white'}`}
          >
            Sign up
          </button>
        </div>

        {/* 3D Flip Scene Container */}
        <div className="w-full" style={{ perspective: '1500px' }}>
          
          <div 
            className="relative w-full h-[580px] duration-[850ms] [transform-style:preserve-3d]" 
            style={{ 
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              transform: isLogin ? 'rotateY(0deg)' : 'rotateY(180deg)'
            }}
          >
            
            {/* FRONT FACE: LOGIN */}
            <div 
              className={`absolute inset-0 p-8 border border-white/20 rounded-[28px] [backface-visibility:hidden] shadow-[0_30px_80px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col ${!isLogin ? 'pointer-events-none' : ''}`}
              style={{ background: 'linear-gradient(145deg, #25243aec, #101421f5)' }}
            >
              <p className="mb-3 text-[#c4b5fd] text-[10px] font-bold tracking-[0.2em] uppercase">Secure Node Entry</p>
              <h1 className="text-[32px] font-bold leading-tight mb-2 tracking-tight">Welcome back.</h1>
              <p className="text-[#a6aac5] text-sm mb-8">Access your decentralized workspace.</p>

              <form onSubmit={handleLoginSubmit} className="flex-1 flex flex-col">
                {error && <div className="text-red-400 text-xs text-center bg-red-900/20 border border-red-500/20 p-2 rounded-lg mb-4">{error}</div>}
                
                <div className="space-y-4">
                  {!requires2FA ? (
                    <>
                      <div>
                        <label className="block mb-2 text-[#dedff0] text-xs font-semibold">Email address</label>
                        <input
                          type="email"
                          required
                          placeholder="you@network.local"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full h-[49px] px-4 border border-white/10 rounded-xl bg-[#080b1666] text-white placeholder-[#787f9e] focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-sm"
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-[#dedff0] text-xs font-semibold">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full h-[49px] pl-4 pr-16 border border-white/10 rounded-xl bg-[#080b1666] text-white placeholder-[#787f9e] focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-sm tracking-wide"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[#b7b8d1] text-xs hover:text-white transition-colors"
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block mb-2 text-[#dedff0] text-xs font-semibold text-center">Secure OTP</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="000000"
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                        className="w-full h-[60px] px-4 border border-white/10 rounded-xl bg-[#080b1666] text-white focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-center text-3xl tracking-[0.5em] font-bold"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[49px] flex items-center justify-between px-5 rounded-xl text-[#1b1431] font-bold text-sm bg-gradient-to-br from-[#c4b5fd] to-[#a992f5] shadow-[0_6px_0_#69549a,0_12px_25px_rgba(167,139,250,0.2)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#69549a] transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Decrypting...' : (requires2FA ? 'Verify Identity' : 'Log in to Network')}
                    <span className="text-lg">â†—</span>
                  </button>

                  {!requires2FA && (
                    <p className="text-center text-[#a6aac5] text-xs mt-6">
                      New to the network?{' '}
                      <button type="button" onClick={() => { setIsLogin(false); setError(''); }} className="text-[#c4b5fd] font-semibold hover:underline">
                        Deploy a node
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* BACK FACE: SIGNUP */}
            <div 
              className={`absolute inset-0 p-8 border border-white/20 rounded-[28px] [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-[0_30px_80px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col ${isLogin ? 'pointer-events-none' : ''}`}
              style={{ background: 'linear-gradient(145deg, #25243aec, #101421f5)' }}
            >
              <p className="mb-3 text-[#c4b5fd] text-[10px] font-bold tracking-[0.2em] uppercase">Initialize Identity</p>
              <h2 className="text-[32px] font-bold leading-tight mb-2 tracking-tight">Start your orbit.</h2>
              <p className="text-[#a6aac5] text-sm mb-8">Deploy your first zero-knowledge node.</p>

              <form onSubmit={handleRegisterSubmit} className="flex-1 flex flex-col">
                {error && <div className="text-red-400 text-xs text-center bg-red-900/20 border border-red-500/20 p-2 rounded-lg mb-4">{error}</div>}
                
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-[#dedff0] text-xs font-semibold">Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full h-[49px] px-4 border border-white/10 rounded-xl bg-[#080b1666] text-white placeholder-[#787f9e] focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[#dedff0] text-xs font-semibold">Email address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@network.local"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-[49px] px-4 border border-white/10 rounded-xl bg-[#080b1666] text-white placeholder-[#787f9e] focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[#dedff0] text-xs font-semibold">Master Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-[49px] pl-4 pr-16 border border-white/10 rounded-xl bg-[#080b1666] text-white placeholder-[#787f9e] focus:outline-none focus:border-[#b7a2ff] focus:shadow-[0_0_0_3px_#b7a2ff18] transition-all text-sm tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[#b7b8d1] text-xs hover:text-white transition-colors"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[#a6aac5] text-[11px] mt-2 ml-1">Use at least 8 characters.</p>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[49px] flex items-center justify-between px-5 rounded-xl text-[#1b1431] font-bold text-sm bg-gradient-to-br from-[#c4b5fd] to-[#a992f5] shadow-[0_6px_0_#69549a,0_12px_25px_rgba(167,139,250,0.2)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#69549a] transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Generating Keypair...' : 'Create Account'}
                    <span className="text-lg">â†—</span>
                  </button>

                  <p className="text-center text-[#a6aac5] text-xs mt-6">
                    Already in orbit?{' '}
                    <button type="button" onClick={() => { setIsLogin(true); setError(''); }} className="text-[#c4b5fd] font-semibold hover:underline">
                      Log in
                    </button>
                  </p>
                </div>
              </form>
            </div>

          </div>
        </div>
        
        <p className="mt-8 text-center text-[#7e85a2] text-[11px] tracking-wider uppercase">Secure WebRTC Encrypted Channel</p>
      </main>
    </div>
  );
}

