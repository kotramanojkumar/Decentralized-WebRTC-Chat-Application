import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const checkRes = await fetch(`${API_URL}/admin/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!checkRes.ok) {
          navigate('/dashboard');
          return;
        }
        setIsAdmin(true);

        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        } else {
          setError('Failed to load users');
        }
      } catch (e) {
        setError('Network error loading users');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadUsers();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert('Failed to delete user');
      }
    } catch (e) {
      alert('Error deleting user');
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      } else {
        alert('Failed to update user role');
      }
    } catch (e) {
      alert('Error updating user role');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Server Data...</div>;
  if (!isAdmin) return <div className="min-h-screen bg-gray-900 text-red-500 flex flex-col items-center justify-center"><h1 className="text-3xl font-bold mb-4">Access Denied</h1><p>You do not have permission to view this page, or the server is still booting up.</p><button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-400">Go back to Dashboard</button></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button onClick={() => navigate('/dashboard')} className="text-blue-500 hover:underline">
            &larr; Back to App
          </button>
        </div>

        {error && <div className="bg-red-500/20 text-red-500 p-4 rounded mb-6">{error}</div>}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Send Global Email Announcement
          </h2>
          <div className="space-y-4">
            <input 
              id="broadcastSubject"
              type="text" 
              placeholder="Email Subject"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea 
              id="broadcastMessage"
              placeholder="Type your message to all users here..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button 
              onClick={async () => {
                const subject = (document.getElementById('broadcastSubject') as HTMLInputElement).value;
                const message = (document.getElementById('broadcastMessage') as HTMLTextAreaElement).value;
                if (!subject || !message) return alert('Subject and message required');
                if (!confirm('Are you sure you want to email EVERY user?')) return;
                
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API_URL}/admin/broadcast`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject, message })
                  });
                  if (res.ok) {
                    alert('Broadcast sent to all users!');
                    (document.getElementById('broadcastSubject') as HTMLInputElement).value = '';
                    (document.getElementById('broadcastMessage') as HTMLTextAreaElement).value = '';
                  } else {
                    alert('Failed to send broadcast');
                  }
                } catch (e) {
                  alert('Error sending broadcast');
                }
              }}
              className="bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
            >
              Send to All Users
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold">User</th>
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold">Username</th>
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold">Email</th>
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold">Role</th>
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold">Joined</th>
                  <th className="p-4 border-b border-gray-200 dark:border-gray-600 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="p-4 font-medium">{user.displayName}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">@{user.username || 'none'}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="p-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm focus:outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:text-red-700 font-medium text-sm transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">No users found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
