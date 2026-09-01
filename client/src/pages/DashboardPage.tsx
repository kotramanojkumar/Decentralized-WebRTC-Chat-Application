import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import NetworkBackground from '../components/NetworkBackground';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [roomType, setRoomType] = useState('p2p'); // Default to Direct Message
  const [isCreating, setIsCreating] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  // Productivity State
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState(localStorage.getItem('dashboardNotes') || '');
  
  interface Task {
    id: string;
    heading: string;
    note: string;
    date: string;
    time: string;
    done: boolean;
  }
  
  const [tasks, setTasks] = useState<Task[]>(
    JSON.parse(localStorage.getItem('dashboardTasks') || '[]')
  );
  
  // Task Form State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskHeading, setTaskHeading] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboardNotes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const res = await fetch(`${API_URL}/rooms/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, customRoomId, password: roomPassword, scheduledFor, roomType })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create room');
        return;
      }
      if (data.room) {
        // Automatically save password in localStorage temporarily for entry
        if (roomPassword) localStorage.setItem(`room_pass_${data.room.secureInviteCode}`, roomPassword);
        navigate(`/room/${data.room.secureInviteCode}?type=${roomType}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCheckRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinRoomId.trim()) return;

    try {
      const res = await fetch(`${API_URL}/rooms/${joinRoomId.trim()}`);
      const data = await res.json();
      
      if (!res.ok) {
        setJoinError(data.error || 'Room not found');
        return;
      }

      if (data.room.hasPassword) {
        setRequiresPassword(true);
      } else {
        handleJoinRoom();
      }
    } catch (error) {
      setJoinError('Failed to check room');
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError('');
    
    if (joinRoomId.trim()) {
      try {
        const res = await fetch(`http://localhost:5000/api/rooms/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: joinRoomId.trim(), password: joinPassword })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setJoinError(data.error || 'Access denied');
          if (data.requirePassword) setRequiresPassword(true);
          return;
        }

        if (joinPassword) localStorage.setItem(`room_pass_${joinRoomId.trim()}`, joinPassword);
        
        // Use authoritative type from the database verification
        const authoritativeType = data.room?.type || 'group';
        navigate(`/room/${joinRoomId.trim()}?type=${authoritativeType}`);
      } catch (error) {
        setJoinError('Failed to join room');
      }
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskHeading.trim()) {
      const heading = taskHeading.trim();
      let newDate = taskDate;
      let newTime = taskTime;
      
      // If no time is set, default to 1 min from now for easy testing
      if (!newDate || !newTime) {
          const now = new Date(Date.now() + 60000);
          newDate = now.toISOString().split('T')[0];
          newTime = now.toTimeString().slice(0, 5);
      }

      const targetDate = new Date(`${newDate}T${newTime}`);
      
      try {
        const userId = localStorage.getItem('userId');
        const res = await fetch(`${API_URL}/tasks/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            heading,
            note: taskNote.trim(),
            targetDate: targetDate.toISOString()
          })
        });

        if (res.ok) {
          const data = await res.json();
          // Transform DB task to local UI model
          setTasks([...tasks, {
            id: data.task.id,
            heading: data.task.heading,
            note: data.task.note || '',
            date: newDate,
            time: newTime,
            done: false
          }]);
          
          alert(`Task saved! A real email reminder has been scheduled for ${targetDate.toLocaleString()}.\nIt will be sent to the linked email address of this account.`);
        }
      } catch (e) {
        alert('Failed to save task');
      }

      setTaskHeading('');
      setTaskNote('');
      setTaskDate('');
      setTaskTime('');
      setIsAddingTask(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  
  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (e) {
      alert('Failed to delete task');
    }
  };

  const updateTask = async (id: string, updatedHeading: string, updatedNote: string, updatedDate: string, updatedTime: string) => {
    try {
      const targetDate = new Date(`${updatedDate}T${updatedTime}`);
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heading: updatedHeading, note: updatedNote, targetDate: targetDate.toISOString() })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === id ? { ...t, heading: updatedHeading, note: updatedNote, date: updatedDate, time: updatedTime } : t));
        setEditingTaskId(null);
      }
    } catch (e) {
      alert('Failed to update task');
    }
  };

  // Ask for notification permission on mount for the simulation
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const loadTasks = async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const res = await fetch(`${API_URL}/tasks/${userId}`);
          if (res.ok) {
             const data = await res.json();
             const dbTasks = data.tasks.map((t: any) => {
                const td = new Date(t.targetDate);
                return {
                  id: t.id,
                  heading: t.heading,
                  note: t.note || '',
                  date: td.toISOString().split('T')[0],
                  time: td.toTimeString().slice(0, 5),
                  done: t.isCompleted
                }
             });
             setTasks(dbTasks);
          }
        } catch(e) {}
      }
    };
    loadTasks();
    
    // Simulate Welcome Email Notification
    if (localStorage.getItem('justLoggedIn') === 'true') {
      localStorage.removeItem('justLoggedIn');
      setTimeout(() => {
        const emailBody = `Welcome to Decentralized Real-Time Chat!\n\nTo ensure your data remains secure, please remember to verify your devices in the Security Center.\nYour connection is protected by peer-to-peer WebRTC and End-to-End Encryption.`;
        if (Notification.permission === 'granted') {
          new Notification('New Email from Security Team', {
            body: emailBody,
            icon: '/favicon.ico'
          });
        } else {
          alert(`GMAIL NOTIFICATION:\n\nSubject: Welcome to Secure Comms\n\n${emailBody}`);
        }
      }, 2000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-[#0a0f1a] dark:via-[#0d1425] dark:to-[#0f1730] p-8 transition-colors duration-200 relative overflow-hidden">
      
      {/* 3D Animated Network Mesh Decorators */}
      <NetworkBackground />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[45%] h-[45%] rounded-full bg-blue-400/5 dark:bg-blue-600/5 blur-3xl"></div>
        <div className="absolute top-[50%] -right-[15%] w-[40%] h-[50%] rounded-full bg-indigo-400/5 dark:bg-indigo-600/5 blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-10 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-1">
              Welcome, {localStorage.getItem('displayName') || 'User'}
            </h1>
            <div className="text-gray-500 dark:text-gray-400 font-mono text-sm">
              {time.toLocaleDateString()} | {time.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition" onClick={() => {
              const url = window.location.origin;
              navigator.clipboard.writeText(`Join me on Decentralized Chat!\n\nSign up here: ${url}`);
              alert("Referral link copied to clipboard!");
            }}>Invite Friend</button>
            {localStorage.getItem('email') === 'kmk.kmk0789@gmail.com' && (
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition border border-emerald-200 dark:border-emerald-800/50" onClick={() => navigate('/admin')}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Admin
                </span>
              </button>
            )}
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 transition" onClick={() => navigate('/contacts')}>Contacts</button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 transition" onClick={() => navigate('/settings')}>Settings</button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition" onClick={() => navigate('/')}>Logout</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          
          {/* Main Chat Cards (Take up 2 columns) */}
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/50 dark:border-white/10 flex flex-col items-center text-center transition-all hover:shadow-xl hover:scale-[1.01]">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Create New Room</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4 flex-1 text-sm">
                Start a new secure session with end-to-end encryption.
              </p>
              <div className="flex w-full bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setRoomType('p2p')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${roomType === 'p2p' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Direct Message (P2P)
                </button>
                <button
                  onClick={() => setRoomType('group')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${roomType === 'group' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Group Room
                </button>
              </div>
              <input
                type="text"
                placeholder="Custom Room Code (Optional)"
                value={customRoomId}
                onChange={e => setCustomRoomId(e.target.value)}
                autoComplete="off"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="password"
                placeholder="Room Password (Optional)"
                value={roomPassword}
                onChange={e => setRoomPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <div className="w-full mb-4 text-left">
                 <label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 block">Schedule For (Optional)</label>
                 <input
                   type="datetime-local"
                   value={scheduledFor}
                   onChange={e => setScheduledFor(e.target.value)}
                   className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                 />
              </div>
              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/50 dark:border-white/10 flex flex-col items-center text-center transition-all hover:shadow-xl hover:scale-[1.01]">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Join Existing Room</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 flex-1 text-sm">
                Enter a secure invite code to join a session.
              </p>
              <form onSubmit={requiresPassword ? handleJoinRoom : handleCheckRoom} className="w-full flex flex-col gap-3">
                {joinError && <div className="text-red-500 text-sm font-medium">{joinError}</div>}
                
                <input
                  type="text"
                  placeholder="Paste Invite Code..."
                  value={joinRoomId}
                  onChange={e => {
                     setJoinRoomId(e.target.value);
                     setRequiresPassword(false);
                     setJoinError('');
                  }}
                  autoComplete="off"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />

                {requiresPassword && (
                  <input
                    type="password"
                    placeholder="Enter Room Password..."
                    value={joinPassword}
                    onChange={e => setJoinPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  />
                )}

                <button
                  type="submit"
                  disabled={!joinRoomId.trim()}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {requiresPassword ? 'Unlock & Join' : 'Join Room'}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Notes */}
          <div className="bg-amber-50/80 dark:bg-amber-900/10 backdrop-blur-lg p-6 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-amber-200/50 dark:border-amber-800/30 flex flex-col transition-all">
            <h2 className="text-lg font-semibold mb-3 text-amber-900 dark:text-amber-500 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Quick Notes
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Jot down meeting notes or ideas here..."
              className="flex-1 w-full bg-transparent border-none resize-none focus:outline-none text-amber-800 dark:text-amber-200 placeholder-amber-700/50 dark:placeholder-amber-500/50 min-h-[150px]"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Tasks List */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg p-6 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-white/50 dark:border-white/10 transition-all flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                To-Do Tasks & Automated Reminders
              </h2>
              <button 
                onClick={() => setIsAddingTask(!isAddingTask)} 
                className="text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition font-medium"
              >
                {isAddingTask ? 'Cancel' : '+ Add Task'}
              </button>
            </div>
            
            {isAddingTask && (
              <form onSubmit={addTask} className="mb-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col gap-3">
                <input 
                  type="text" 
                  value={taskHeading} 
                  onChange={e => setTaskHeading(e.target.value)} 
                  placeholder="Task Heading" 
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-medium"
                />
                <textarea 
                  value={taskNote} 
                  onChange={e => setTaskNote(e.target.value)} 
                  placeholder="Additional notes..." 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                  rows={2}
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input 
                      type="date" 
                      value={taskDate} 
                      onChange={e => setTaskDate(e.target.value)} 
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="time" 
                      value={taskTime} 
                      onChange={e => setTaskTime(e.target.value)} 
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 mt-1">Save Task & Schedule Email Reminder</button>
              </form>
            )}
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {tasks.map(task => (
                <div key={task.id} className={`p-3 rounded-lg border ${task.done ? 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700' : 'bg-white border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-600'} transition flex gap-3 items-start`}>
                  <input 
                    type="checkbox" 
                    checked={task.done} 
                    onChange={() => toggleTask(task.id)}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  {editingTaskId === task.id ? (
                    <div className="flex-1 min-w-0">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target as HTMLFormElement);
                        updateTask(task.id, formData.get('heading') as string, formData.get('note') as string, formData.get('date') as string, formData.get('time') as string);
                      }} className="flex flex-col gap-2">
                        <input name="heading" defaultValue={task.heading} required className="w-full text-sm border p-1 rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Heading" />
                        <input name="note" defaultValue={task.note} className="w-full text-xs border p-1 rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Notes" />
                        <div className="flex gap-2">
                          <input type="date" name="date" defaultValue={task.date} required className="w-full text-xs border p-1 rounded dark:bg-gray-700 dark:border-gray-600" />
                          <input type="time" name="time" defaultValue={task.time} required className="w-full text-xs border p-1 rounded dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button type="submit" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Save</button>
                          <button type="button" onClick={() => setEditingTaskId(null)} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">Cancel</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm truncate ${task.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {task.heading}
                      </h3>
                      {task.note && (
                        <p className={`text-xs mt-1 ${task.done ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                          {task.note}
                        </p>
                      )}
                      {(task.date || task.time) && (
                        <div className="flex gap-2 mt-2 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 inline-block px-2 py-0.5 rounded">
                          {task.date} {task.time} (Reminder Scheduled)
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setEditingTaskId(task.id)} className="text-gray-400 hover:text-indigo-500 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && !isAddingTask && <p className="text-sm text-gray-500 text-center mt-8">No tasks yet. Click "Add Task" to get started and automatically schedule reminders!</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

