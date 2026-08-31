import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const API = API_URL;

type Status = 'online' | 'away' | 'offline' | 'in-call';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  about?: string;
  avatarUrl?: string;
  status?: Status;
}

interface ContactEntry {
  id: string;
  target: UserProfile;
  createdAt: string;
}

interface ContactRequest {
  id: string;
  requester: UserProfile;
  requested: UserProfile;
  requesterId: string;
  requestedId: string;
  status: string;
}

type Tab = 'contacts' | 'search' | 'requests';

const StatusDot = ({ status }: { status?: Status }) => {
  const map: Record<Status, { color: string; label: string }> = {
    online: { color: 'bg-green-500', label: '● Online' },
    away: { color: 'bg-yellow-400', label: '◐ Away' },
    offline: { color: 'bg-gray-400', label: '○ Offline' },
    'in-call': { color: 'bg-blue-500', label: '● In Call' },
  };
  const s = status ?? 'offline';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${map[s].color} mr-1`} title={map[s].label} />
  );
};

const Avatar = ({ user, size = 'md' }: { user: UserProfile; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-16 h-16 text-2xl' };
  const initials = user.displayName?.slice(0, 2).toUpperCase() || '??';
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
      ) : initials}
    </div>
  );
};

export default function ContactsPage() {
  const navigate = useNavigate();
  const myId = localStorage.getItem('userId') || '';

  const [tab, setTab] = useState<Tab>('contacts');
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectState, setConnectState] = useState('');
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load contacts
  const loadContacts = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/contacts/${myId}`);
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts || []);
        setPendingRequests(data.pendingRequests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API}/contacts/search?q=${encodeURIComponent(searchQuery)}&requesterId=${myId}`);
        const data = await res.json();
        if (res.ok) setSearchResults(data.users || []);
      } catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, myId]);

  // Send contact request
  const sendRequest = async (targetId: string) => {
    try {
      const res = await fetch(`${API}/contacts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: myId, requestedId: targetId })
      });
      const data = await res.json();
      if (res.ok) {
        setRequestSent(prev => new Set([...prev, targetId]));
      } else {
        alert(data.error || 'Failed to send request');
      }
    } catch (e) { alert('Error sending request'); }
  };

  // Respond to request
  const respondRequest = async (reqId: string, action: 'accept' | 'decline') => {
    try {
      await fetch(`${API}/contacts/request/${reqId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: myId })
      });
      loadContacts();
    } catch (e) { console.error(e); }
  };

  // Start P2P chat (creates a new P2P room and navigates to it)
  const startP2PChat = async (targetUser: UserProfile) => {
    setConnectingTo(targetUser.id);
    setConnectState('Requesting connection...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setConnectState('Connecting...');

      const res = await fetch(`${API}/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, roomType: 'p2p' })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setConnectState('Establishing P2P connection...');
      await new Promise(r => setTimeout(r, 500));
      setConnectState('● P2P Connected');
      await new Promise(r => setTimeout(r, 400));

      navigate(`/room/${data.room.secureInviteCode}?type=p2p`);
    } catch (e: any) {
      alert(e.message || 'Failed to start chat');
      setConnectingTo(null);
      setConnectState('');
    }
  };

  const receivedRequests = pendingRequests.filter(r => r.requestedId === myId);
  const sentRequests = pendingRequests.filter(r => r.requesterId === myId);
  const incomingCount = receivedRequests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-[#0a0f1a] dark:via-[#0d1425] dark:to-[#0f1730] relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[35%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/40 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-600 dark:text-gray-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">Contacts</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Discover users &amp; start secure P2P conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {incomingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{incomingCount} request{incomingCount > 1 ? 's' : ''}</span>
            )}
            <button
              onClick={() => { setTab('search'); setSearchQuery(''); }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
            >
              Find Users
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-xl p-1 border border-white/40 dark:border-white/10 w-fit">
          {([
            { key: 'contacts', label: 'My Contacts', icon: '👥' },
            { key: 'search', label: 'Find Users', icon: '🔍' },
            { key: 'requests', label: `Requests${incomingCount > 0 ? ` (${incomingCount})` : ''}`, icon: '📩' },
          ] as { key: Tab; label: string; icon: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* SEARCH TAB */}
            {tab === 'search' && (
              <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/50 dark:border-white/10 shadow-lg">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-blue-500">🔍</span> Search Users
                </h2>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or User ID..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                />

                {isSearching && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                )}

                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <span className="text-4xl block mb-2">🔍</span>
                    No users found for "<strong>{searchQuery}</strong>"
                  </div>
                )}

                {searchResults.map(user => {
                  const isSentOrContact = requestSent.has(user.id) || contacts.some(c => c.target.id === user.id);
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedProfile(user)}>
                      <Avatar user={user} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">{user.displayName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">ID: {user.id.slice(0, 12)}...</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); sendRequest(user.id); }}
                          disabled={isSentOrContact}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${isSentOrContact ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}
                        >
                          {contacts.some(c => c.target.id === user.id) ? '✓ Contact' : requestSent.has(user.id) ? '✓ Sent' : '+ Add'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); startP2PChat(user); }}
                          disabled={connectingTo === user.id}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                        >
                          {connectingTo === user.id ? connectState : '💬 Chat'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!searchQuery && (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <span className="text-5xl block mb-3">🔐</span>
                    <p className="font-medium">Search for a user</p>
                    <p className="text-sm mt-1">Find by name, email, or unique User ID</p>
                  </div>
                )}
              </div>
            )}

            {/* CONTACTS TAB */}
            {tab === 'contacts' && (
              <div className="space-y-3">
                {loading && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading contacts...
                  </div>
                )}

                {!loading && contacts.length === 0 && (
                  <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/50 dark:border-white/10 shadow-lg text-center">
                    <span className="text-6xl block mb-4">👥</span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No contacts yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Search for a user to start a secure P2P conversation.</p>
                    <button onClick={() => setTab('search')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition">
                      Find Users
                    </button>
                  </div>
                )}

                {contacts.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
                      All Contacts ({contacts.length})
                    </div>
                    {contacts.map(c => (
                      <div
                        key={c.id}
                        className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/50 dark:border-white/10 shadow-sm flex items-center gap-3 hover:shadow-md hover:scale-[1.005] transition-all cursor-pointer"
                        onClick={() => setSelectedProfile(c.target)}
                      >
                        <div className="relative">
                          <Avatar user={c.target} />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-400 border-2 border-white dark:border-gray-800" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{c.target.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.target.about || 'Available'}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); startP2PChat(c.target); }}
                            disabled={connectingTo === c.target.id}
                            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                            title="Start P2P Chat"
                          >
                            {connectingTo === c.target.id
                              ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                          </button>
                          <button className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 transition" title="Voice Call">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </button>
                          <button className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition" title="Video Call">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* REQUESTS TAB */}
            {tab === 'requests' && (
              <div className="space-y-4">
                {receivedRequests.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
                      Incoming Requests ({receivedRequests.length})
                    </div>
                    {receivedRequests.map(req => (
                      <div key={req.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/50 dark:border-white/10 shadow-sm flex items-center gap-3 mb-3">
                        <Avatar user={req.requester} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">{req.requester.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{req.requester.email}</div>
                          <div className="text-xs text-blue-500 mt-0.5">Wants to connect with you</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => respondRequest(req.id, 'accept')} className="px-3 py-1.5 text-xs rounded-lg font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition">Accept</button>
                          <button onClick={() => respondRequest(req.id, 'decline')} className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
                      Sent Requests ({sentRequests.length})
                    </div>
                    {sentRequests.map(req => (
                      <div key={req.id} className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/50 dark:border-white/10 shadow-sm flex items-center gap-3 mb-3">
                        <Avatar user={req.requested} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">{req.requested.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{req.requested.email}</div>
                        </div>
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-lg">Pending</span>
                      </div>
                    ))}
                  </div>
                )}

                {receivedRequests.length === 0 && sentRequests.length === 0 && (
                  <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/50 dark:border-white/10 shadow-lg text-center">
                    <span className="text-5xl block mb-3">📩</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pending requests</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Contact requests will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Side Panel */}
          <div className="space-y-4">
            {selectedProfile ? (
              <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/50 dark:border-white/10 shadow-lg">
                <button onClick={() => setSelectedProfile(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mb-4 text-sm flex items-center gap-1 transition">
                  ← Back
                </button>
                <div className="text-center mb-6">
                  <Avatar user={selectedProfile} size="lg" />
                  <div className="mt-3">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{selectedProfile.displayName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProfile.email}</p>
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">ID: {selectedProfile.id.slice(0, 16)}...</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1"><StatusDot status="offline" /> Offline</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">About</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{selectedProfile.about || 'Available'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">P2P</span>
                    <span className="text-sm text-green-600 dark:text-green-400">Available</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => startP2PChat(selectedProfile)}
                    disabled={connectingTo === selectedProfile.id}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition text-sm"
                  >
                    {connectingTo === selectedProfile.id ? connectState : '💬 Start P2P Chat'}
                  </button>
                  <button className="w-full py-2.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium hover:bg-green-100 transition text-sm">
                    📞 Voice Call
                  </button>
                  <button className="w-full py-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl font-medium hover:bg-purple-100 transition text-sm">
                    📹 Video Call
                  </button>
                  {!contacts.some(c => c.target.id === selectedProfile.id) && (
                    <button
                      onClick={() => sendRequest(selectedProfile.id)}
                      disabled={requestSent.has(selectedProfile.id)}
                      className="w-full py-2.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition text-sm"
                    >
                      {requestSent.has(selectedProfile.id) ? '✓ Request Sent' : '+ Add to Contacts'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/50 dark:border-white/10 shadow-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>🔐</span> P2P Flow
                </h3>
                <div className="space-y-2 text-sm">
                  {['Find User', 'Add Contact', 'Start P2P Chat', 'Signaling', 'WebRTC', 'Secure Chat'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      {step}
                      {i < 5 && <span className="ml-auto text-gray-300 dark:text-gray-600">↓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Architecture info */}
            <div className="bg-blue-50/80 dark:bg-blue-900/10 backdrop-blur-lg rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">🔒 Privacy Architecture</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Contacts are for user discovery only. No messages are stored. All communication is peer-to-peer via WebRTC with E2EE.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
