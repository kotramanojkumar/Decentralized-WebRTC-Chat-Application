import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ParticleField from './components/ParticleField';
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

function App() {
  useEffect(() => {
    // Force dark mode globally
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <BrowserRouter>
      {/* Global animated particle background */}
      <ParticleField />

      {/* App content layer */}
      <div className="relative z-10 min-h-screen">
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
