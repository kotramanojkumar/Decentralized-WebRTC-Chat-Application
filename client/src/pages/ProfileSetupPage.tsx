import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ displayName: '', about: '', username: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userId = localStorage.getItem('userId');
      if (formData.username && userId) {
        const res = await fetch(`${API_URL}/user/update-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, username: formData.username })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update username');
          setIsLoading(false);
          return;
        }
        if (data.user?.username) {
           localStorage.setItem('username', data.user.username);
        }
      }
      
      localStorage.setItem('about', formData.about);
      navigate('/dashboard');
    } catch (e) {
      setError('An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8 text-white relative">
      <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl z-10">
        <div>
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6 border border-white/10">
             <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
             </svg>
          </div>
          <h2 className="text-center text-2xl font-bold text-white">
            Complete your profile
          </h2>
          <p className="text-center text-white/50 mt-2 text-sm">Set up your identity before joining the network.</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1">Unique Username</label>
              <input
                type="text"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition sm:text-sm"
                placeholder="@username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 block mb-1">About / Status</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition sm:text-sm"
                placeholder="Available"
                value={formData.about}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !formData.username}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isLoading ? 'Saving Profile...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
