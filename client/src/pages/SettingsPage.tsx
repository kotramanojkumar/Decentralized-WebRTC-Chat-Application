import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import ThemeToggle from '../components/ThemeToggle';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // --- Profile State ---
  const [profile, setProfile] = useState({
    displayName: 'Loading...', 
    email: 'loading...', 
    username: '', 
    about: 'Available',
    avatarUrl: localStorage.getItem('avatarUrl') || ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- Preferences State ---
  const [preferences, setPreferences] = useState({
    darkMode: true, 
    chatBackground: 'default', 
    disappearingMessages: '0',
    soundEnabled: true,
    enterToSend: true,
    compactView: false,
    showTypingIndicator: true,
    browserNotifications: false
  });

  // --- Security State ---
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [sessions, setSessions] = useState<any[]>([]);

  // --- Feedback State ---
  const [feedback, setFeedback] = useState({ category: 'bug', message: '' });
  const [feedbackStatus, setFeedbackStatus] = useState('');

  // --- Privacy State ---
  const [privacy, setPrivacy] = useState({
    showOnline: true,
    allowInvites: true,
    twoFactorEnabled: localStorage.getItem('twoFactorEnabled') === 'true'
  });

  useEffect(() => {
    // Load local info
    setProfile({
      displayName: localStorage.getItem('displayName') || 'User',
      email: localStorage.getItem('email') || '',
      username: localStorage.getItem('username') || '',
      about: localStorage.getItem('about') || 'Available',
      avatarUrl: localStorage.getItem('avatarUrl') || ''
    });

    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme !== 'light';

    setPreferences({
      darkMode: isDark,
      chatBackground: localStorage.getItem('chatBackground') || 'default',
      disappearingMessages: localStorage.getItem('disappearingMessages') || '0',
      soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
      enterToSend: localStorage.getItem('enterToSend') !== 'false',
      compactView: localStorage.getItem('compactView') === 'true',
      showTypingIndicator: localStorage.getItem('showTypingIndicator') !== 'false',
      browserNotifications: localStorage.getItem('browserNotifications') === 'true'
    });

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Fetch active profile & 2FA status from database
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`${API_URL}/user/${userId}/profile`)
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            if (data.user.twoFactorEnabled !== undefined) {
              setPrivacy(p => ({ ...p, twoFactorEnabled: data.user.twoFactorEnabled }));
              localStorage.setItem('twoFactorEnabled', String(data.user.twoFactorEnabled));
            }
            if (data.user.displayName) setProfile(p => ({ ...p, displayName: data.user.displayName }));
            if (data.user.email) setProfile(p => ({ ...p, email: data.user.email }));
            if (data.user.username) setProfile(p => ({ ...p, username: data.user.username }));
            if (data.user.about) setProfile(p => ({ ...p, about: data.user.about }));
          }
        }).catch(e => console.error('Failed to load user profile:', e));

      fetch(`${API_URL}/user/${userId}/sessions`)
        .then(r => r.json())
        .then(data => {
          if (data.activeSessions) setSessions(data.activeSessions);
        }).catch(e => console.error(e));
    }
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        const res = await fetch(`${API_URL}/user/update-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            username: profile.username, 
            displayName: profile.displayName,
            about: profile.about,
            avatarUrl: profile.avatarUrl 
          })
        });
        if (res.ok) {
           const data = await res.json();
           if (data.user?.username) {
             localStorage.setItem('username', data.user.username);
             setProfile(p => ({...p, username: data.user.username}));
           }
           if (data.user?.displayName) {
             localStorage.setItem('displayName', data.user.displayName);
             setProfile(p => ({...p, displayName: data.user.displayName}));
           }
           if (data.user?.avatarUrl) {
             localStorage.setItem('avatarUrl', data.user.avatarUrl);
             setProfile(p => ({...p, avatarUrl: data.user.avatarUrl}));
           }
        } else {
           const errData = await res.json();
           showToast(errData.error || 'Failed to update profile.');
           return;
        }
      } catch (e) {
        console.error(e);
        showToast('Network error while updating profile.');
        return;
      }
    }

    localStorage.setItem('displayName', profile.displayName);
    localStorage.setItem('about', profile.about);
    if (profile.avatarUrl) localStorage.setItem('avatarUrl', profile.avatarUrl);
    
    setIsEditingProfile(false);
    showToast('Profile updated successfully! ✨');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setProfile(p => ({ ...p, avatarUrl: base64 }));
        localStorage.setItem('avatarUrl', base64);
        showToast('Profile photo updated locally! Click Save Profile to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      showToast("Passwords do not match");
      return;
    }
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`${API_URL}/user/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword: passwords.current, newPassword: passwords.new })
      });
      if (res.ok) {
        showToast('Password updated successfully 🔒');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update password');
      }
    } catch(e) {
      showToast('Error updating password');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`${API_URL}/user/revoke-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId })
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        showToast('Session revoked successfully.');
      }
    } catch(e) {
      showToast('Failed to revoke session');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('Submitting...');
    const userId = localStorage.getItem('userId');
    try {
      await fetch(`${API_URL}/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...feedback })
      });
      setFeedbackStatus('Feedback sent successfully! Thank you.');
      showToast('Thank you for your feedback! 🚀');
      setFeedback({ category: 'bug', message: '' });
      setTimeout(() => setFeedbackStatus(''), 3000);
    } catch(e) {
      setFeedbackStatus('Failed to send feedback.');
      showToast('Failed to submit feedback.');
    }
  };

  const handlePrefChange = (k: string, v: any) => {
    setPreferences(p => ({...p, [k]: v}));
    localStorage.setItem(k, String(v));
    if (k === 'darkMode') {
      if (v) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('darkMode', 'false');
      }
    }
  };

  const handlePrivacyChange = async (k: string, v: boolean) => {
    const newPriv = { ...privacy, [k]: v };
    setPrivacy(newPriv);
    const userId = localStorage.getItem('userId');
    try {
      if (k === 'twoFactorEnabled') {
        localStorage.setItem('twoFactorEnabled', String(v));
        await fetch(`${API_URL}/user/update-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, enabled: v })
        });
        showToast(v ? 'Two-Factor Authentication Enabled 🛡️' : 'Two-Factor Authentication Disabled');
      } else {
        await fetch(`${API_URL}/user/update-privacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, privacySettings: newPriv })
        });
        showToast('Privacy preferences updated');
      }
    } catch(e) {}
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This permanently deletes your account and data. Proceed?")) return;
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        localStorage.clear();
        navigate('/');
      }
    } catch (err) {}
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'security', label: 'Security & Logins', icon: '🔒' },
    { id: 'help', label: 'Help & Feedback', icon: '💬' }
  ];

  // Liquid Glass Toggle Switch
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button
      type="button"
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-all duration-300 backdrop-blur-xl focus:outline-none ${
        checked
          ? 'bg-emerald-500/80 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
          : 'bg-black/10 dark:bg-white/10 border-black/10 dark:border-white/10 shadow-inner'
      }`}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 my-0.5 rounded-full bg-white shadow-md transition-all duration-300 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen text-neutral-900 dark:text-white pb-16 relative overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Sticky Liquid Glass Header */}
      <header className="px-4 sm:px-8 py-4 liquid-glass sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition text-neutral-800 dark:text-neutral-200 cursor-pointer"
            title="Go Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Settings</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <img src="/assets/p2p_connect_icon.png" alt="P2P" className="w-3.5 h-3.5 object-contain" />
                <span>P2PConnect</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Account security & system preferences</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto mt-6 sm:mt-8 px-4 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* Sidebar Nav (Liquid Glass Pills) */}
        <div className="md:w-64 shrink-0 flex md:flex-col overflow-x-auto gap-2 md:gap-1.5 pb-2 md:pb-0 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap md:whitespace-normal md:w-full text-left px-4 py-3 rounded-2xl font-semibold transition-all duration-200 text-xs sm:text-sm flex items-center gap-2.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-[1.02]'
                  : 'bg-white/40 dark:bg-neutral-900/40 hover:bg-white/80 dark:hover:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200/50 dark:border-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              navigate('/login', { replace: true });
            }}
            className="whitespace-nowrap md:whitespace-normal md:w-full text-left px-4 py-3 rounded-2xl font-semibold transition-all duration-200 text-xs sm:text-sm flex items-center gap-2.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer md:mt-4 shadow-sm"
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Profile Settings</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Verified Identity
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profile.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <label
                    htmlFor="settings-avatar-input"
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-opacity"
                    title="Change Photo"
                  >
                    Change
                  </label>
                  <input
                    id="settings-avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold leading-tight">{profile.displayName}</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">@{profile.username || 'username'}</p>
                      <p className="text-xs text-neutral-400 mt-1">{profile.email}</p>
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <label
                        htmlFor="settings-avatar-input"
                        className="px-3 py-1.5 rounded-full liquid-glass-btn text-xs font-semibold text-blue-600 dark:text-cyan-400 border border-blue-500/30 cursor-pointer shadow-sm hover:scale-105 transition"
                      >
                        Upload Photo
                      </label>
                      {profile.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfile(p => ({ ...p, avatarUrl: '' }));
                            localStorage.removeItem('avatarUrl');
                            showToast('Photo removed. Save profile to confirm.');
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset 3D Cyber Avatars */}
                  <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <span className="text-[11px] text-neutral-400 font-medium">Presets:</span>
                    {[
                      'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum1',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=CyberShield',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaMesh',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=NexusPrime',
                      'https://api.dicebear.com/7.x/bottts/svg?seed=NeonVortex'
                    ].map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setProfile(p => ({ ...p, avatarUrl: url }));
                          localStorage.setItem('avatarUrl', url);
                          showToast('Preset avatar selected!');
                        }}
                        className={`w-7 h-7 rounded-full overflow-hidden border transition hover:scale-110 cursor-pointer ${
                          profile.avatarUrl === url ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-neutral-300 dark:border-white/10 opacity-70'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={e => setProfile({...profile, displayName: e.target.value})}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
                      !isEditingProfile
                        ? 'opacity-80 cursor-not-allowed bg-black/5 dark:bg-white/5 border border-transparent'
                        : 'bg-white dark:bg-neutral-900 border border-emerald-500/50 ring-2 ring-emerald-500/20'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Unique Username
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={e => setProfile({...profile, username: e.target.value})}
                    disabled={!isEditingProfile}
                    placeholder="@username"
                    className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
                      !isEditingProfile
                        ? 'opacity-80 cursor-not-allowed bg-black/5 dark:bg-white/5 border border-transparent'
                        : 'bg-white dark:bg-neutral-900 border border-emerald-500/50 ring-2 ring-emerald-500/20'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Status / About
                  </label>
                  <input
                    type="text"
                    value={profile.about}
                    onChange={e => setProfile({...profile, about: e.target.value})}
                    disabled={!isEditingProfile}
                    className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
                      !isEditingProfile
                        ? 'opacity-80 cursor-not-allowed bg-black/5 dark:bg-white/5 border border-transparent'
                        : 'bg-white dark:bg-neutral-900 border border-emerald-500/50 ring-2 ring-emerald-500/20'
                    }`}
                  />
                </div>
                <div className="pt-2 flex items-center gap-3">
                  {isEditingProfile ? (
                    <>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full font-semibold text-xs transition shadow-sm active:scale-95 cursor-pointer"
                      >
                        Save Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-5 py-2.5 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setIsEditingProfile(true); }}
                      className="px-6 py-2.5 rounded-full text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition shadow-sm active:scale-95 cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl transition-all">
              <h2 className="text-xl font-bold tracking-tight mb-6">App Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Dark Mode</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Toggle dark cyberpunk or clean light theme</span>
                  </div>
                  <ToggleSwitch checked={preferences.darkMode} onChange={val => handlePrefChange('darkMode', val)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Browser Notifications</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Receive alerts when calls or messages arrive</span>
                  </div>
                  <ToggleSwitch checked={preferences.browserNotifications} onChange={val => handlePrefChange('browserNotifications', val)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Enable Audio SFX & Chimes</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Play interactive tones for calls and mascots</span>
                  </div>
                  <ToggleSwitch checked={preferences.soundEnabled} onChange={val => handlePrefChange('soundEnabled', val)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Show Typing Indicators</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Broadcast your real-time typing status</span>
                  </div>
                  <ToggleSwitch checked={preferences.showTypingIndicator} onChange={val => handlePrefChange('showTypingIndicator', val)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Press Enter to Send Message</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Send instantly on enter key press</span>
                  </div>
                  <ToggleSwitch checked={preferences.enterToSend} onChange={val => handlePrefChange('enterToSend', val)} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-semibold text-sm block">Compact Room View</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Optimize layout for smaller screens</span>
                  </div>
                  <ToggleSwitch checked={preferences.compactView} onChange={val => handlePrefChange('compactView', val)} />
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl transition-all">
              <h2 className="text-xl font-bold tracking-tight mb-6">Privacy Controls</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Online Presence</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Show online badge to peers in call rooms</span>
                  </div>
                  <ToggleSwitch checked={privacy.showOnline} onChange={val => handlePrivacyChange('showOnline', val)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <span className="font-semibold text-sm block">Direct Call Invites</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Allow users with your link to join without approval</span>
                  </div>
                  <ToggleSwitch checked={privacy.allowInvites} onChange={val => handlePrivacyChange('allowInvites', val)} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-semibold text-sm block">Two-Step Verification (OTP)</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Require email OTP security verification at login</span>
                  </div>
                  <ToggleSwitch checked={privacy.twoFactorEnabled} onChange={val => handlePrivacyChange('twoFactorEnabled', val)} />
                </div>
              </div>

              {/* Security Pill Card */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <span>🔒</span>
                  <span>P2PConnect Cryptographic Guarantee</span>
                </h3>
                <p className="mb-3 opacity-90">
                  All peer-to-peer audio, video, and text streams in P2PConnect are secured with military-grade End-to-End Encryption (AES-GCM / WebRTC DTLS-SRTP). No intermediary server can intercept or decrypt your live streams.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-200 cursor-pointer"
                >
                  Read full P2PConnect Security & Architecture Policy →
                </button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Dedicated Two-Step Verification Card in Security Tab */}
              <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-2xl shrink-0">
                      🛡️
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                          Two-Step Verification (OTP Authentication)
                        </h2>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          privacy.twoFactorEnabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30'
                        }`}>
                          {privacy.twoFactorEnabled ? 'ACTIVE / ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed max-w-xl">
                        Add an extra layer of security. When enabled, signing into your account requires a 6-digit One-Time Passcode (OTP) delivered to your registered email address (<span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">{profile.email}</span>). When disabled, you can log in using only your password.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={privacy.twoFactorEnabled}
                    onChange={val => handlePrivacyChange('twoFactorEnabled', val)}
                  />
                </div>
              </div>

              <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl">
                <h2 className="text-xl font-bold tracking-tight mb-4">Change Password</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={passwords.current}
                      onChange={e => setPasswords({...passwords, current: e.target.value})}
                      className="w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm outline-none bg-black/5 dark:bg-neutral-900 border border-black/10 dark:border-white/10 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={passwords.new}
                      onChange={e => setPasswords({...passwords, new: e.target.value})}
                      className="w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm outline-none bg-black/5 dark:bg-neutral-900 border border-black/10 dark:border-white/10 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-neutral-600 dark:text-neutral-400">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={passwords.confirm}
                      onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                      className="w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm outline-none bg-black/5 dark:bg-neutral-900 border border-black/10 dark:border-white/10 focus:border-emerald-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              <div className="backdrop-blur-2xl bg-white/80 dark:bg-neutral-950/80 p-6 sm:p-8 rounded-[32px] border border-neutral-200/80 dark:border-white/10 shadow-xl">
                <h2 className="text-xl font-bold tracking-tight mb-4">Active Logins & Devices</h2>
                <div className="space-y-3">
                  {sessions.map(s => (
                    <div key={s.id} className="p-4 rounded-2xl flex items-center justify-between bg-black/5 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                      <div>
                        <div className="font-semibold text-xs sm:text-sm">{s.deviceInfo || 'Authorized Browser'}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Active since: {new Date(s.lastSeen).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold text-xs px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-xs text-neutral-500 py-3 text-center">No other active sessions detected.</div>
                  )}
                </div>
              </div>

              <div className="p-6 border border-rose-500/20 bg-rose-500/5 rounded-[32px]">
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Danger Zone</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 my-2">Permanently delete your account and all associated cryptographic keys.</p>
                <button
                  onClick={handleDeleteAccount}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm"
                >
                  Delete Account
                </button>
              </div>

            </div>
          )}

          {/* HELP & FEEDBACK TAB */}
          {activeTab === 'help' && (
            <div className="liquid-glass-card p-6 sm:p-8 rounded-[32px] shadow-2xl transition-all">
              <h2 className="text-xl font-bold tracking-tight mb-2">Help & Feedback</h2>
              <p className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">Have a suggestion or found an issue? Help us refine P2PConnect.</p>
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Category</label>
                  <select
                    value={feedback.category}
                    onChange={e => setFeedback({...feedback, category: e.target.value})}
                    className="w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm outline-none bg-black/5 dark:bg-neutral-900 border border-black/10 dark:border-white/10"
                  >
                    <option value="bug">Report a Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">General Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={feedback.message}
                    onChange={e => setFeedback({...feedback, message: e.target.value})}
                    placeholder="Describe your suggestion or experience..."
                    className="w-full rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none bg-black/5 dark:bg-neutral-900 border border-black/10 dark:border-white/10"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Submit Feedback
                </button>
                {feedbackStatus && <p className="text-emerald-500 font-semibold text-xs mt-2">{feedbackStatus}</p>}
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Comprehensive Security & Privacy Policy Modal */}
      <TermsPrivacyModal
        isOpen={showPolicyModal}
        initialTab="terms"
        onClose={() => setShowPolicyModal(false)}
      />

      {/* Modern Liquid Glass Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 backdrop-blur-2xl border border-white/20 dark:border-black/20 text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2 pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
