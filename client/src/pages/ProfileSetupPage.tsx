import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import ThemeToggle from '../components/ThemeToggle';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberShield',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaMesh',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NexusPrime',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NeonVortex'
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    displayName: localStorage.getItem('displayName') || '', 
    about: 'Decentralized P2P Peer', 
    username: localStorage.getItem('username') || '',
    avatarUrl: localStorage.getItem('avatarUrl') || PRESET_AVATARS[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Please upload a photo smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData(prev => ({ ...prev, avatarUrl: base64 }));
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        const res = await fetch(`${API_URL}/user/update-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            username: formData.username,
            displayName: formData.displayName,
            about: formData.about,
            avatarUrl: formData.avatarUrl
          })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update profile');
          setIsLoading(false);
          return;
        }
        if (data.user?.username) localStorage.setItem('username', data.user.username);
        if (data.user?.displayName) localStorage.setItem('displayName', data.user.displayName);
        if (data.user?.avatarUrl) localStorage.setItem('avatarUrl', data.user.avatarUrl);
      }
      
      localStorage.setItem('avatarUrl', formData.avatarUrl);
      localStorage.setItem('about', formData.about);
      navigate('/dashboard');
    } catch (e) {
      setError('An error occurred while saving profile');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-white relative font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Ambient Glowing Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2.5">
          <img src="/assets/p2p_connect_icon.png" alt="P2PConnect" className="w-9 h-9 object-contain" />
          <span className="font-extrabold text-base tracking-tight">P2PConnect Identity</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-lg w-full liquid-glass-card p-8 sm:p-10 rounded-[36px] shadow-2xl relative z-10 mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Set Up Your Profile & Photo
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
            Customize your decentralized appearance before entering encrypted rooms.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-rose-700 dark:text-rose-300 text-xs text-center font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
              {error}
            </div>
          )}

          {/* Profile Photo Uploader & Avatar Picker */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-blue-500/40 shadow-xl bg-white/20 dark:bg-black/20 flex items-center justify-center">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <label 
                htmlFor="avatar-file-input" 
                className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer transition-opacity"
              >
                <span>📷 Upload</span>
              </label>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label 
                htmlFor="avatar-file-input" 
                className="px-4 py-1.5 rounded-full liquid-glass-btn text-xs font-semibold text-blue-600 dark:text-cyan-400 border border-blue-500/30 cursor-pointer shadow-sm hover:scale-105 transition"
              >
                Choose Photo from Device
              </label>
              <input 
                id="avatar-file-input" 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <span className="text-[11px] text-slate-500">Or choose a preset avatar:</span>
            </div>

            {/* Preset Avatars */}
            <div className="flex items-center gap-2 justify-center">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition transform hover:scale-110 cursor-pointer ${
                    formData.avatarUrl === url ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105' : 'border-slate-300 dark:border-white/10 opacity-70'
                  }`}
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Unique Handle / Username
              </label>
              <input
                type="text"
                required
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none"
                placeholder="@username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                About / Security Status
              </label>
              <input
                type="text"
                className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none"
                placeholder="Decentralized P2P Peer"
                value={formData.about}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !formData.username}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
            >
              {isLoading ? 'Saving Identity...' : 'Save & Launch Dashboard →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
