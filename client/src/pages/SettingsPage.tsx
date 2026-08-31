import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function SettingsPage() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // --- Profile State ---
  const [profile, setProfile] = useState({
    displayName: 'Loading...', email: 'loading...', username: '', about: 'Available'
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- Preferences State ---
  const [preferences, setPreferences] = useState({
    darkMode: false, 
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
  const [privacy, setPrivacy] = useState({ showOnline: true, allowInvites: true, twoFactorEnabled: localStorage.getItem('twoFactorEnabled') === 'true' });

  useEffect(() => {
    // Load local info
    setProfile({
      displayName: localStorage.getItem('displayName') || 'User',
      email: localStorage.getItem('email') || '',
      username: localStorage.getItem('username') || '',
      about: localStorage.getItem('about') || 'Available'
    });

    const isDark = localStorage.getItem('darkMode') === 'true';
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
    if (isDark) document.documentElement.classList.add('dark');

    // Fetch sessions
    const userId = localStorage.getItem('userId');
    if (userId) {
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
          body: JSON.stringify({ userId, username: profile.username, displayName: profile.displayName })
        });
        if (res.ok) {
           const data = await res.json();
           if (data.user.username) {
             localStorage.setItem('username', data.user.username);
             setProfile(p => ({...p, username: data.user.username}));
           }
           if (data.user.displayName) {
             localStorage.setItem('displayName', data.user.displayName);
             setProfile(p => ({...p, displayName: data.user.displayName}));
           }
        } else {
           const errData = await res.json();
           alert(errData.error || 'Failed to update profile on server.');
           return; // Stop execution on error
        }
      } catch (e) {
        console.error(e);
        alert('Network error while updating profile.');
        return; // Stop execution on error
      }
    }

    localStorage.setItem('displayName', profile.displayName);
    localStorage.setItem('about', profile.about);
    
    setIsEditingProfile(false);
    alert('Profile saved successfully!');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return alert("Passwords don't match");
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`${API_URL}/user/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword: passwords.current, newPassword: passwords.new })
      });
      if (res.ok) {
        alert('Password updated successfully');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update password');
      }
    } catch(e) {
      alert('Error updating password');
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
        alert('Session revoked. That device has been logged out.');
      }
    } catch(e) {}
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
      setFeedback({ category: 'bug', message: '' });
      setTimeout(() => setFeedbackStatus(''), 3000);
    } catch(e) {
      setFeedbackStatus('Failed to send feedback.');
    }
  };

  const handlePrefChange = (k: string, v: any) => {
    setPreferences(p => ({...p, [k]: v}));
    localStorage.setItem(k, String(v));
    if (k === 'darkMode') {
      if (v) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
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
      } else {
        await fetch(`${API_URL}/user/update-privacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, privacySettings: newPriv })
        });
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
        alert("Account deleted.");
        localStorage.clear();
        navigate('/');
      }
    } catch (err) {}
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'security', label: 'Security & Logins' },
    { id: 'help', label: 'Help & Feedback' }
  ];

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button
      type="button"
      className={`${checked ? 'bg-blue-600' : (preferences.darkMode ? 'bg-gray-600' : 'bg-gray-300')} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
      onClick={() => onChange(!checked)}
    >
      <span className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
  );

  return (
    <div className={`min-h-screen ${preferences.darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} pb-12`}>
      <header className={`px-6 py-4 border-b ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} sticky top-0 z-10 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full ${preferences.darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto mt-8 px-4 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="md:w-64 flex-shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${activeTab === tab.id ? 'bg-blue-600 text-white' : (preferences.darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-700')}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
             <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-gray-800">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{profile.displayName}</h3>
                  <p className="text-gray-500">@{profile.username}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input type="text" value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} disabled={!isEditingProfile} className={`w-full rounded-lg px-4 py-2 outline-none transition-all ${!isEditingProfile ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-transparent' : (preferences.darkMode ? 'bg-gray-700 text-white border-blue-500 ring-2 ring-blue-500/30' : 'border border-blue-500 bg-white ring-2 ring-blue-500/20')}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unique Username</label>
                  <input type="text" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} disabled={!isEditingProfile} placeholder="@username" className={`w-full rounded-lg px-4 py-2 outline-none transition-all ${!isEditingProfile ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-transparent' : (preferences.darkMode ? 'bg-gray-700 text-white border-blue-500 ring-2 ring-blue-500/30' : 'border border-blue-500 bg-white ring-2 ring-blue-500/20')}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">About</label>
                  <input type="text" value={profile.about} onChange={e => setProfile({...profile, about: e.target.value})} disabled={!isEditingProfile} className={`w-full rounded-lg px-4 py-2 outline-none transition-all ${!isEditingProfile ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-transparent' : (preferences.darkMode ? 'bg-gray-700 text-white border-blue-500 ring-2 ring-blue-500/30' : 'border border-blue-500 bg-white ring-2 ring-blue-500/20')}`} />
                </div>
                <div className="pt-4">
                  {isEditingProfile ? 
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Save Profile</button> :
                    <button type="button" onClick={(e) => { e.preventDefault(); setIsEditingProfile(true); }} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">Edit Profile</button>
                  }
                </div>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
             <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-6">App Preferences</h2>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span>Dark Mode</span>
                    <ToggleSwitch checked={preferences.darkMode} onChange={val => handlePrefChange('darkMode', val)} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span>Browser Notifications</span>
                    <ToggleSwitch checked={preferences.browserNotifications} onChange={val => handlePrefChange('browserNotifications', val)} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span>Enable Sound Notifications</span>
                    <ToggleSwitch checked={preferences.soundEnabled} onChange={val => handlePrefChange('soundEnabled', val)} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span>Show Typing Indicators</span>
                    <ToggleSwitch checked={preferences.showTypingIndicator} onChange={val => handlePrefChange('showTypingIndicator', val)} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span>Press Enter to Send Message</span>
                    <ToggleSwitch checked={preferences.enterToSend} onChange={val => handlePrefChange('enterToSend', val)} />
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span>Compact Chat View</span>
                    <ToggleSwitch checked={preferences.compactView} onChange={val => handlePrefChange('compactView', val)} />
                  </div>
                </div>
             </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
             <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-6">Privacy Controls</h2>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between">
                    <span>Show my Online Status</span>
                    <ToggleSwitch checked={privacy.showOnline} onChange={val => handlePrivacyChange('showOnline', val)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allow anyone to add me as contact</span>
                    <ToggleSwitch checked={privacy.allowInvites} onChange={val => handlePrivacyChange('allowInvites', val)} />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div>
                      <h4 className="font-medium text-lg">Two-Step Verification</h4>
                      <p className="text-sm text-gray-500">Require an OTP when logging in from a new device.</p>
                    </div>
                    <ToggleSwitch checked={privacy.twoFactorEnabled} onChange={val => handlePrivacyChange('twoFactorEnabled', val)} />
                  </div>
                </div>

                <div className={`p-4 rounded-xl text-sm ${preferences.darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'}`}>
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    How we secure your chat
                  </h3>
                  <p className="mb-3">
                    All communications are strictly peer-to-peer (WebRTC) and secured with End-to-End Encryption (AES-GCM/ECDH). 
                    We do not store your message history on our servers.
                  </p>
                  <button onClick={() => setShowPolicyModal(true)} className="font-medium underline hover:text-blue-500">Read our full Security & Privacy Policy</button>
                </div>
             </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-4">Change Password</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <input type="password" placeholder="Current Password" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border bg-white'}`} />
                  <input type="password" placeholder="New Password" required value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border bg-white'}`} />
                  <input type="password" placeholder="Confirm New Password" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border bg-white'}`} />
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Update Password</button>
                </form>
              </div>

              <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-4">Active Logins</h2>
                <div className="space-y-4">
                  {sessions.map(s => (
                    <div key={s.id} className={`p-4 rounded-lg flex items-center justify-between ${preferences.darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div>
                        <div className="font-medium text-sm">{s.deviceInfo}</div>
                        <div className="text-xs opacity-70">Active since: {new Date(s.lastSeen).toLocaleString()}</div>
                      </div>
                      <button onClick={() => handleRevokeSession(s.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Revoke</button>
                    </div>
                  ))}
                  {sessions.length === 0 && <div className="text-sm opacity-70">No other active sessions.</div>}
                </div>
              </div>


              <div className="p-6 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-2xl">
                <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
                <p className="text-sm my-2">Permanently delete your account and all data.</p>
                <button onClick={handleDeleteAccount} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700">Delete Account</button>
              </div>

            </div>
          )}

          {/* HELP & FEEDBACK TAB */}
          {activeTab === 'help' && (
             <div className={`rounded-2xl p-6 border ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-4">Help & Feedback</h2>
                <p className="mb-6 opacity-80 text-sm">Have a suggestion or found a bug? Let us know!</p>
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <select value={feedback.category} onChange={e => setFeedback({...feedback, category: e.target.value})} className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border bg-white'}`}>
                    <option value="bug">Report a Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea required rows={4} value={feedback.message} onChange={e => setFeedback({...feedback, message: e.target.value})} placeholder="Describe your issue or idea..." className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border bg-white'}`}></textarea>
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Submit Feedback</button>
                  {feedbackStatus && <p className="text-green-600 font-medium text-sm">{feedbackStatus}</p>}
                </form>
             </div>
          )}

        </div>
      </div>

      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8 ${preferences.darkMode ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Security & Privacy Policy</h2>
              <button onClick={() => setShowPolicyModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-6 text-sm leading-relaxed">
              <section>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> 1. End-to-End Encryption (E2EE)</h3>
                <p className="opacity-80">All Direct Messages and Group Chats on this platform are secured using zero-knowledge End-to-End Encryption. Messages are encrypted locally on your device before they are transmitted. The server never sees the plain text of your messages.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> 2. Peer-to-Peer Architecture (WebRTC)</h3>
                <p className="opacity-80">Video, Audio, and Direct Text communications are routed directly between peers using WebRTC technology. The central server is only used for initial signaling. Once connected, data flows directly from your device to the recipient's device.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> 3. No Message Retention (Zero-Log Policy)</h3>
                <p className="opacity-80">We do not store your message history in any central database. Messages only exist in the volatile memory (RAM) of your active browser session. If you close the application or refresh the page, the messages are permanently destroyed.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> 4. Account Data & Active Logins</h3>
                <p className="opacity-80">The only data we store is your hashed password, display name, unique username, and active login tokens. You can permanently delete your account and all associated data at any time from the Settings menu.</p>
              </section>
            </div>
            
            <div className="mt-8 text-center">
              <button onClick={() => setShowPolicyModal(false)} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700">Understood</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
