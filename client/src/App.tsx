import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';
import RoomPage from './pages/RoomPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ResearchPage from './pages/ResearchPage';
import SceneManager from './components/3d/SceneManager';

function App() {
  useEffect(() => {
    // Global Dark Mode Enforcer
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Force dark mode for cinematic 3D experience
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      {/* Persistent Cinematic 3D Layer */}
      <SceneManager />
      
      {/* React UI Overlay Layer */}
      {/* pointer-events-none allows clicks to pass through to the 3D canvas when clicking empty space.
          Inner components must apply pointer-events-auto to be clickable. */}
      <div className="relative z-10 min-h-screen w-full pointer-events-none">
        <div className="w-full h-full [&>*]:pointer-events-auto">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile-setup" element={<ProfileSetupPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
