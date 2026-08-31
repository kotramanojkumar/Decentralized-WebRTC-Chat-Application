import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    displayName: 'Loading...',
    email: 'loading...',
    about: 'Hey there! I am using Decentralized Chat.',
    photo: '' // Base64
  });
  
  const [preferences, setPreferences] = useState({
    darkMode: false,
    chatBackground: 'default',
    disappearingMessages: '0'
  });
  
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('displayName') || 'Secure User';
    const storedEmail = localStorage.getItem('email') || 'user@example.com';
    const storedAbout = localStorage.getItem('about') || 'Hey there! I am using Decentralized Chat.';
    const storedPhoto = localStorage.getItem('profilePhoto') || '';
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    const storedBg = localStorage.getItem('chatBackground') || 'default';
    const storedDisappearing = localStorage.getItem('disappearingMessages') || '0';
    
    setProfile(prev => ({
      ...prev,
      displayName: storedName,
      email: storedEmail,
      about: storedAbout,
      photo: storedPhoto
    }));

    setPreferences({
      darkMode: storedDarkMode,
      chatBackground: storedBg,
      disappearingMessages: storedDisappearing
    });

    if (storedDarkMode) document.documentElement.classList.add('dark');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('displayName', profile.displayName);
    localStorage.setItem('email', profile.email);
    localStorage.setItem('about', profile.about);
    if (profile.photo) localStorage.setItem('profilePhoto', profile.photo);
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "WARNING: This will permanently delete your account, contacts, messages, and all data. This action cannot be undone.\n\nAre you sure you want to proceed?"
    );
    if (!confirmDelete) return;

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        alert("Your account has been successfully deleted.");
        localStorage.clear();
        navigate('/');
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting your account.");
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value.toString());
    
    if (key === 'darkMode') {
      if (value) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfile(prev => ({ ...prev, photo: base64String }));
        localStorage.setItem('profilePhoto', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`min-h-screen flex ${preferences.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`w-1/3 max-w-sm border-r flex flex-col h-screen ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <header className={`px-6 py-4 flex items-center border-b h-16 ${preferences.darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <button 
            className="flex items-center font-medium hover:opacity-70 transition" 
            onClick={() => navigate('/dashboard')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className={`p-6 text-center border-b ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div 
              className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-4xl mb-4 shadow-inner relative group cursor-pointer overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {profile.photo ? (
                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{profile.displayName.charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <svg className="w-6 h-6 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-white text-xs font-medium">Change Photo</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            <h2 className="text-2xl font-semibold">{profile.displayName}</h2>
            <p className={`mt-1 text-sm ${preferences.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{profile.about}</p>
          </div>
          
          <div className={`divide-y ${preferences.darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            <div className={`p-4 flex items-center gap-4 cursor-pointer ${preferences.darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="font-medium">Profile & Appearance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto">
        <header className={`px-8 py-4 border-b h-16 flex items-center ${preferences.darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <h1 className="text-xl font-semibold">Settings</h1>
        </header>

        <div className="p-8 max-w-2xl mx-auto space-y-8">
          
          {/* Appearance Section */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-6 border-b ${preferences.darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className="text-lg font-medium">Appearance</h3>
            </div>
            <div className="p-6 space-y-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className={`text-xs ${preferences.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Switch between light and dark themes.</div>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" checked={preferences.darkMode} onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                  <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${preferences.darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
                </div>
              </label>

              <div>
                <div className="font-medium mb-2">Chat Background</div>
                <select 
                  value={preferences.chatBackground}
                  onChange={(e) => handlePreferenceChange('chatBackground', e.target.value)}
                  className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white border'}`}
                >
                  <option value="default">Default Chat Background</option>
                  <option value="solid-dark">Solid Dark</option>
                  <option value="gradient">Blue Gradient</option>
                </select>
              </div>

              <div>
                <div className="font-medium mb-2">Disappearing Messages</div>
                <div className={`text-xs mb-2 ${preferences.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Automatically delete sent messages after a certain time.</div>
                <select 
                  value={preferences.disappearingMessages}
                  onChange={(e) => handlePreferenceChange('disappearingMessages', e.target.value)}
                  className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white border'}`}
                >
                  <option value="0">Keep for the session</option>
                  <option value="10">10 Seconds</option>
                  <option value="60">1 Minute</option>
                  <option value="3600">1 Hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${preferences.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${preferences.darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className="text-lg font-medium">Personal Information</h3>
              <button onClick={() => setIsEditing(!isEditing)} className="text-blue-500 font-medium hover:text-blue-400 px-3 py-1 rounded transition">
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-1 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Your Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={e => setProfile({...profile, displayName: e.target.value})}
                    className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border border-gray-300 bg-white'}`}
                    required
                  />
                ) : (
                  <div className="py-2">{profile.displayName}</div>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-700'}`}>About</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.about}
                    onChange={e => setProfile({...profile, about: e.target.value})}
                    className={`w-full rounded-lg px-4 py-2 outline-none ${preferences.darkMode ? 'bg-gray-700 text-white' : 'border border-gray-300 bg-white'}`}
                  />
                ) : (
                  <div className="py-2">{profile.about}</div>
                )}
              </div>

              {isEditing && (
                <div className="pt-4 flex justify-end">
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          <div className={`mt-8 rounded-xl shadow-sm border overflow-hidden ${preferences.darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
            <div className={`p-6 border-b ${preferences.darkMode ? 'border-red-800/50' : 'border-red-100'}`}>
              <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
            </div>
            <div className="p-6">
              <p className={`text-sm mb-4 ${preferences.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Permanently delete your account, remove all contacts, delete all scheduled tasks, and erase your profile data. This action cannot be undone.
              </p>
              <button 
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </div>
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #2563EB; }
        .toggle-checkbox { right: 1.5rem; border-color: #D1D5DB; transition: all 0.2s; }
      `}</style>
    </div>
  );
}
