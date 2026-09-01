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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden">
      
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/20 blur-3xl filter"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-10">
        <div>
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
             </svg>
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Complete your profile
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">Set up your identity before joining the network.</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center font-medium bg-red-100 p-2 rounded-lg">{error}</div>}
          


          <div className="rounded-md space-y-4">

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Unique Username</label>
              <input
                type="text"
                required
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 transition"
                placeholder="@username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">About / Status</label>
              <input
                type="text"
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 transition"
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
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Saving Profile...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
