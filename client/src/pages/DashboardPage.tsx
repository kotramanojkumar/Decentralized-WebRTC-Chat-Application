import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import ThemeToggle from '../components/ThemeToggle';
import NamaskarGreeting from '../components/NamaskarGreeting';
import QuantumEntropyShield from '../components/QuantumEntropyShield';

interface Task {
  id: string;
  heading: string;
  note: string;
  date: string;
  time: string;
  done: boolean;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [roomType, setRoomType] = useState('p2p'); // 'p2p' = Direct Call, 'group' = Group Call
  const [isCreating, setIsCreating] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  // Productivity State
  const [notes, setNotes] = useState(localStorage.getItem('dashboardNotes') || '');
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

  // My Rooms
  const [myRooms, setMyRooms] = useState<any[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Notes sync
  useEffect(() => {
    localStorage.setItem('dashboardNotes', notes);
  }, [notes]);

  // Check if redirected from closed call room
  useEffect(() => {
    const exitNotice = sessionStorage.getItem('roomExitNotice');
    if (exitNotice) {
      showToast(exitNotice);
      sessionStorage.removeItem('roomExitNotice');
    }
  }, []);

  // Tasks sync
  useEffect(() => {
    localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
  }, [tasks]);

  // Fetch rooms
  useEffect(() => {
    const fetchMyRooms = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/rooms/my-rooms/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setMyRooms(data.rooms || []);
        }
      } catch (e) {}
    };
    fetchMyRooms();
    const interval = setInterval(fetchMyRooms, 15000);
    return () => clearInterval(interval);
  }, []);

  // Create room
  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        showToast(data.error || 'Failed to create room');
        return;
      }
      if (data.room) {
        if (roomPassword) localStorage.setItem(`room_pass_${data.room.secureInviteCode}`, roomPassword);
        navigate(`/room/${data.room.secureInviteCode}?type=${roomType}`);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  // Close room - Smoothly closed without disruptive browser popups
  const closeRoomFromDashboard = async (inviteCode: string) => {
    try {
      const res = await fetch(`${API_URL}/rooms/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, userId: localStorage.getItem('userId') })
      });
      if (res.ok) {
        setMyRooms(prev => prev.filter(r => r.secureInviteCode !== inviteCode));
        showToast('Room ended successfully.');
      } else {
        showToast('Unable to end room at this time.');
      }
    } catch (e) {
      showToast('Failed to close room');
    }
  };

  // Check room
  const handleCheckRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinRoomId.trim()) return;

    try {
      const res = await fetch(`${API_URL}/rooms/${encodeURIComponent(joinRoomId.trim())}`);
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

  // Join room
  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError('');
    
    if (joinRoomId.trim()) {
      try {
        const res = await fetch(`${API_URL}/rooms/verify`, {
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
        
        const authoritativeType = data.room?.type || 'group';
        navigate(`/room/${joinRoomId.trim()}?type=${authoritativeType}`);
      } catch (error) {
        setJoinError('Failed to join room');
      }
    }
  };

  // Task handlers
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskHeading.trim()) {
      const heading = taskHeading.trim();
      let newDate = taskDate;
      let newTime = taskTime;
      
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
          setTasks([...tasks, {
            id: data.task.id,
            heading: data.task.heading,
            note: data.task.note || '',
            date: newDate,
            time: newTime,
            done: false
          }]);
          
          showToast(`Task saved! Reminder scheduled for ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
        }
      } catch (e) {
        showToast('Failed to save task');
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
        showToast('Task removed.');
      }
    } catch (e) {
      showToast('Failed to delete task');
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
        showToast('Task updated successfully.');
      }
    } catch (e) {
      showToast('Failed to update task');
    }
  };

  // Notifications & initial task loading
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
              };
            });
            setTasks(dbTasks);
          }
        } catch(e) {}
      }
    };
    loadTasks();
    
    if (localStorage.getItem('justLoggedIn') === 'true') {
      localStorage.removeItem('justLoggedIn');
    }
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-neutral-100 dark:bg-[#070a12] text-neutral-900 dark:text-neutral-100 transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 blur-[140px] pointer-events-none -z-0" />
      <div className="fixed bottom-10 right-10 w-[500px] h-[350px] bg-emerald-500/10 dark:bg-emerald-600/10 blur-[140px] pointer-events-none -z-0" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Top Header Command Bar (Liquid Glass Pill) */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 liquid-glass rounded-[28px] p-4 sm:px-7 sm:py-4 shadow-xl"
        >
          {/* Brand & Connection State */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/p2p_connect_icon.png"
              alt="P2PConnect"
              className="w-11 h-11 object-contain rounded-2xl drop-shadow-md hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
                  P2PConnect
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                End-to-End Encrypted Calling & Chat
              </p>
            </div>
          </div>

          {/* Action Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const url = window.location.origin;
                navigator.clipboard.writeText(`Join me on P2PConnect: ${url}`);
                showToast("Invite link copied to clipboard!");
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 shadow-md transition active:scale-95 cursor-pointer"
            >
              Share Invite
            </button>

            {localStorage.getItem('email') === 'kmk.kmk0789@gmail.com' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition border border-emerald-300 dark:border-emerald-500/30 active:scale-95"
              >
                Admin
              </button>
            )}

            <button
              onClick={() => navigate('/contacts')}
              className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 liquid-glass-btn transition active:scale-95 cursor-pointer"
            >
              Contacts
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full liquid-glass-btn hover:scale-105 transition cursor-pointer"
              title="Profile & Settings"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                {localStorage.getItem('avatarUrl') ? (
                  <img src={localStorage.getItem('avatarUrl')!} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (localStorage.getItem('displayName') || localStorage.getItem('username') || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hidden sm:inline">
                {localStorage.getItem('displayName') || localStorage.getItem('username') || 'Profile'}
              </span>
            </button>

            {/* Quantum Entropy & E2EE Shield (Novelty Feature) */}
            <QuantumEntropyShield />

            {/* Light / Dark Mode Toggle Button */}
            <ThemeToggle />

            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                navigate('/login', { replace: true });
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-300 liquid-glass-btn border-rose-400/30 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer shadow-sm"
            >
              Logout
            </button>
          </div>
        </motion.header>

        {/* Main Organized 2-Column Dashboard Layout */}
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Left Column: Namaskar Greeting + Quick Scratchpad Notes */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Indian Namaskar Welcome Avatar */}
            <NamaskarGreeting />

            {/* Quick Notes Scratchpad (Liquid Glass) */}
            <div className="liquid-glass-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                    <img
                      src="/assets/quick_notes_icon.png"
                      alt="Quick Notes"
                      className="w-8 h-8 object-contain rounded-xl drop-shadow-md inline-block shrink-0"
                    />
                    <span>Quick Notes</span>
                  </h2>
                  <span className="text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/10 px-2.5 py-0.5 rounded-full">
                    Auto-saved
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  Jot down meeting points, room codes, or reminders.
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Type temporary notes here..."
                  className="w-full liquid-glass-input rounded-2xl p-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none resize-none min-h-[190px] font-sans"
                />
              </div>
              <div className="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500 font-medium flex items-center gap-1.5">
                <span>🔒</span> Saved locally in your browser
              </div>
            </div>

          </div>

          {/* Right Column: Actions (Create & Join Calls), Active Rooms, Tasks */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Row of Two Primary Action Cards: Start Call & Join Call */}
            <div className="grid sm:grid-cols-2 gap-6">
              
              {/* Create a Room Card */}
              <motion.div
                id="create-call-card"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="liquid-glass-card p-6 flex flex-col justify-between shadow-2xl"
              >
                <div>
                  <div className="mb-4 flex items-center">
                    <img
                      src="/assets/create_room_icon.png"
                      alt="Create a Room"
                      className="w-14 h-14 object-contain rounded-2xl drop-shadow-md hover:scale-105 transition-transform"
                    />
                  </div>
                  <h2 className="text-base font-bold mb-1 text-neutral-900 dark:text-white">
                    Create a Room
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4 text-xs">
                    Start an instant encrypted video or audio room.
                  </p>

                  {/* Room Type Switcher */}
                  <div className="flex w-full bg-neutral-100 dark:bg-neutral-900/80 p-1 rounded-full mb-4 border border-neutral-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setRoomType('p2p')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition ${
                        roomType === 'p2p'
                          ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Direct Call (P2P)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomType('group')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition ${
                        roomType === 'group'
                          ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Group Call
                    </button>
                  </div>

                  <form onSubmit={handleCreateRoom} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Custom Room Code (Optional)"
                      value={customRoomId}
                      onChange={e => setCustomRoomId(e.target.value)}
                      className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Room Password (Optional)"
                      value={roomPassword}
                      onChange={e => setRoomPassword(e.target.value)}
                      className="w-full liquid-glass-input rounded-2xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                    />
                    <div>
                      <label className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block mb-1">
                        Schedule Date & Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={e => setScheduledFor(e.target.value)}
                        className="w-full liquid-glass-input rounded-2xl px-4 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white py-3 rounded-full font-semibold shadow-lg shadow-blue-500/25 transition text-xs tracking-wide disabled:opacity-50 cursor-pointer transform active:scale-[0.98]"
                    >
                      {isCreating ? 'Creating Room...' : 'Create Room Now'}
                    </button>
                  </form>
                </div>
              </motion.div>

              {/* Join a Room Card */}
              <motion.div
                id="join-call-card"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="liquid-glass-card p-6 flex flex-col justify-between shadow-2xl"
              >
                <div>
                  <div className="mb-4 flex items-center">
                    <img
                      src="/assets/join_room_icon.png"
                      alt="Join a Room"
                      className="w-24 h-14 object-contain rounded-xl drop-shadow-md hover:scale-105 transition-transform"
                    />
                  </div>
                  <h2 className="text-base font-bold mb-1 text-neutral-900 dark:text-white">
                    Join a Room
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-xs">
                    Enter the invite code to join an ongoing call or chat room.
                  </p>

                  <form onSubmit={requiresPassword ? handleJoinRoom : handleCheckRoom} className="space-y-3">
                    {joinError && (
                      <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                        {joinError}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Paste Room Invite Code..."
                      value={joinRoomId}
                      onChange={e => {
                        setJoinRoomId(e.target.value);
                        setRequiresPassword(false);
                        setJoinError('');
                      }}
                      className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none font-mono"
                    />

                    {requiresPassword && (
                      <input
                        type="password"
                        placeholder="Enter Room Password..."
                        value={joinPassword}
                        onChange={e => setJoinPassword(e.target.value)}
                        required
                        className="w-full liquid-glass-input rounded-2xl px-4 py-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                      />
                    )}

                    <button
                      type="submit"
                      disabled={!joinRoomId.trim()}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white py-3 rounded-full font-semibold shadow-lg shadow-emerald-500/25 transition text-xs tracking-wide disabled:opacity-50 cursor-pointer transform active:scale-[0.98]"
                    >
                      {requiresPassword ? 'Verify Password & Join' : 'Join Room Now'}
                    </button>
                  </form>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                    <img src="/assets/p2p_connect_icon.png" alt="P2P" className="w-4 h-4 object-contain inline-block" />
                    <span>WebRTC Direct P2P Channel</span>
                  </span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              </motion.div>

            </div>

            {/* Active Rooms Section */}
            {myRooms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass-card p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Calls
                  </h2>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/30 px-3 py-1 rounded-full">
                    {myRooms.length} Active
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {myRooms.map(room => (
                    <div
                      key={room.id}
                      className="p-4 rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition flex flex-col justify-between"
                    >
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {room.secureInviteCode}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                            {room.type === 'p2p' ? (
                              <>
                                <img src="/assets/p2p_connect_icon.png" alt="P2P" className="w-3.5 h-3.5 object-contain inline-block" />
                                <span>Direct P2P</span>
                              </>
                            ) : (
                              <span>Group Call</span>
                            )}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                          {room.hasPassword ? '🔒 Protected' : '🔓 Open Link'}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate(`/room/${room.secureInviteCode}?type=${room.type}`)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs transition cursor-pointer"
                        >
                          Re-join
                        </button>
                        <button 
                          onClick={() => closeRoomFromDashboard(room.secureInviteCode)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-500/30 rounded-xl font-medium text-xs transition cursor-pointer"
                          title="End Call"
                        >
                          End
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tasks & Email Reminders */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="liquid-glass-card p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
                    <img
                      src="/assets/meeting_tasks_icon.png"
                      alt="Meeting Tasks & Email Reminders"
                      className="w-8 h-8 object-contain rounded-lg drop-shadow-md inline-block shrink-0"
                    />
                    <span>Meeting Tasks & Email Reminders</span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Schedule call reminders delivered to your email.
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddingTask(!isAddingTask)} 
                  className="text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3.5 py-1.5 rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer"
                >
                  {isAddingTask ? 'Cancel' : '+ Add Task'}
                </button>
              </div>

              <AnimatePresence>
                {isAddingTask && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={addTask}
                    className="mb-4 liquid-glass p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 space-y-3"
                  >
                    <input 
                      type="text" 
                      value={taskHeading} 
                      onChange={e => setTaskHeading(e.target.value)} 
                      placeholder="Meeting Topic or Task Heading" 
                      required
                      className="w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
                    />
                    <textarea 
                      value={taskNote} 
                      onChange={e => setTaskNote(e.target.value)} 
                      placeholder="Agenda details or meeting link..." 
                      className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" 
                        value={taskDate} 
                        onChange={e => setTaskDate(e.target.value)} 
                        className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                      <input 
                        type="time" 
                        value={taskTime} 
                        onChange={e => setTaskTime(e.target.value)} 
                        className="w-full liquid-glass-input rounded-xl px-3.5 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white py-2.5 rounded-xl text-xs font-semibold tracking-wide transition shadow-lg shadow-blue-500/25 cursor-pointer"
                    >
                      Save Task & Schedule Reminder
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border ${
                      task.done
                        ? 'bg-neutral-100/60 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 opacity-60'
                        : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    } transition flex items-start gap-3`}
                  >
                    <input 
                      type="checkbox" 
                      checked={task.done} 
                      onChange={() => toggleTask(task.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                    />
                    
                    {editingTaskId === task.id ? (
                      <div className="flex-1">
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target as HTMLFormElement);
                          updateTask(task.id, formData.get('heading') as string, formData.get('note') as string, formData.get('date') as string, formData.get('time') as string);
                        }} className="space-y-2">
                          <input name="heading" defaultValue={task.heading} required className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl text-neutral-900 dark:text-white" />
                          <input name="note" defaultValue={task.note} className="w-full text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl text-neutral-900 dark:text-white" />
                          <div className="flex gap-2">
                            <input type="date" name="date" defaultValue={task.date} required className="text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl text-neutral-900 dark:text-white flex-1" />
                            <input type="time" name="time" defaultValue={task.time} required className="text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl text-neutral-900 dark:text-white flex-1" />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer">Save</button>
                            <button type="button" onClick={() => setEditingTaskId(null)} className="text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl cursor-pointer">Cancel</button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-xs sm:text-sm truncate ${task.done ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                          {task.heading}
                        </h3>
                        {task.note && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                            {task.note}
                          </p>
                        )}
                        {(task.date || task.time) && (
                          <div className="mt-2 text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/20 inline-block px-2.5 py-0.5 rounded-full">
                            📅 {task.date} {task.time}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingTaskId(task.id)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 text-xs cursor-pointer">
                        ✏️
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 text-xs cursor-pointer">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && !isAddingTask && (
                  <p className="text-xs text-neutral-400 text-center py-6">
                    No active tasks. Click "+ Add Task" to set up meeting schedules.
                  </p>
                )}
              </div>
            </motion.div>

          </div>

        </div>

      </div>

      {/* Modern Liquid Glass Toast Notification (Zero intrusive popups) */}
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
