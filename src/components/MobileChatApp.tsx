import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEME_COLORS, ThemeColor } from '../contexts/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import { safeJsonFetch } from '../utils/fetchHelper';
import { formatDistanceToNow } from '../utils/dateUtils';
import { 
  MessageCircle, Users, Settings, Send, ArrowLeft, 
  Plus, Moon, Sun, LogOut, Hash, Globe, X, 
  Palette, Ban, Star, ChevronRight
} from 'lucide-react';
import { BannedUsernamesManager } from './BannedUsernamesManager';
import { HighlightedUsernamesManager } from './HighlightedUsernamesManager';

interface Group {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
  created_by: string | null;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

interface OnlineUser {
  id: string;
  username: string;
}

interface HighlightedUser {
  username: string;
  highlight_color: string;
}

type MobileView = 'chats' | 'chat' | 'users' | 'settings';

const THEME_COLOR_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
};

const THEME_TEXT_CLASSES: Record<ThemeColor, string> = {
  emerald: 'text-emerald-500',
  blue: 'text-blue-500',
  violet: 'text-violet-500',
  rose: 'text-rose-500',
  amber: 'text-amber-500',
  cyan: 'text-cyan-500',
};

const THEME_BG_LIGHT_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  violet: 'bg-violet-50 dark:bg-violet-900/20',
  rose: 'bg-rose-50 dark:bg-rose-900/20',
  amber: 'bg-amber-50 dark:bg-amber-900/20',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
};

export const MobileChatApp: React.FC = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  const socket = useSocket();
  
  const [currentView, setCurrentView] = useState<MobileView>('chats');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [showBannedManager, setShowBannedManager] = useState(false);
  const [showHighlightedManager, setShowHighlightedManager] = useState(false);
  const [highlightedUsers, setHighlightedUsers] = useState<Map<string, string>>(new Map());
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem('adminSecret') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load groups
  useEffect(() => {
    loadGroups();
  }, []);

  // Load highlighted users
  useEffect(() => {
    const loadHighlightedUsers = async () => {
      try {
        const data = await safeJsonFetch('/api/highlighted_usernames') as HighlightedUser[];
        const map = new Map<string, string>();
        data.forEach(h => map.set(h.username.toLowerCase(), h.highlight_color));
        setHighlightedUsers(map);
      } catch (err) {
        console.error('Failed to load highlighted users:', err);
      }
    };
    loadHighlightedUsers();
  }, []);

  // Socket setup
  useEffect(() => {
    if (!socket) return;

    const onGroupCreated = (group: any) => {
      const g = { ...group, id: String(group._id || group.id) };
      setGroups((prev) => [...prev, g]);
    };

    const onGroupDeleted = ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter(g => g.id !== groupId));
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
        setCurrentView('chats');
      }
    };

    const onMessage = (payload: any) => {
      if (!payload) return;
      const newMessage: Message = {
        id: String(payload._id || payload.id || `msg-${Date.now()}`),
        group_id: payload.group_id || payload.groupId,
        user_id: payload.user_id || payload.userId,
        username: payload.username,
        content: payload.content,
        created_at: payload.created_at || new Date().toISOString(),
      };
      console.log('[Mobile] New message received:', newMessage);
      if (activeGroup && newMessage.group_id === activeGroup.id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          console.log('[Mobile] Adding message to state');
          return [...prev, newMessage];
        });
      }
    };

    const onUsersUpdate = ({ groupId, users }: { groupId: string; users: OnlineUser[] }) => {
      if (activeGroup && groupId === activeGroup.id) {
        setOnlineUsers(users);
      }
    };

    const onWarning = (w: any) => {
      if (w && w.reason && activeGroup) {
        const sys: Message = {
          id: `warn-${Date.now()}`,
          group_id: activeGroup.id,
          user_id: 'system',
          username: 'System',
          content: w.reason,
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, sys]);
      }
    };

    const onBlocked = (b: any) => {
      if (activeGroup) {
        const sys: Message = {
          id: `block-${Date.now()}`,
          group_id: activeGroup.id,
          user_id: 'system',
          username: 'System',
          content: b.reason || 'You are muted',
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, sys]);
      }
    };

    socket.on('group:created', onGroupCreated);
    socket.on('group:deleted', onGroupDeleted);
    socket.on('message:new', onMessage);
    socket.on('users:update', onUsersUpdate);
    socket.on('message:warning', onWarning);
    socket.on('message:blocked', onBlocked);

    return () => {
      socket.off('group:created', onGroupCreated);
      socket.off('group:deleted', onGroupDeleted);
      socket.off('message:new', onMessage);
      socket.off('users:update', onUsersUpdate);
      socket.off('message:warning', onWarning);
      socket.off('message:blocked', onBlocked);
    };
  }, [socket, activeGroup]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroups = async () => {
    try {
      const data = await safeJsonFetch('/api/groups') as any[];
      const mappedGroups = data.map((g: any) => ({ ...g, id: String(g._id || g.id) }));
      setGroups(mappedGroups);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const loadMessages = async (groupId: string) => {
    setLoading(true);
    try {
      const data = await safeJsonFetch(`/api/messages?groupId=${encodeURIComponent(groupId)}`) as any[];
      console.log(`[Mobile] Loaded ${data.length} messages for group ${groupId}`);
      setMessages(data.map((m: any) => ({
        id: String(m._id || m.id),
        group_id: m.group_id,
        user_id: m.user_id,
        username: m.username,
        content: m.content,
        created_at: m.created_at
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      await safeJsonFetch('/api/group_members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: user.id, is_online: true }),
      });
    } catch (err) {
      console.error('Failed to join group:', err);
    }

    if (socket) {
      socket.emit('group:join', { groupId });
      socket.emit('user:join', { userId: user.id, username: user.username, groupId });
    }
  };

  const handleSelectGroup = (group: Group) => {
    if (activeGroup && socket) {
      socket.emit('group:leave', { groupId: activeGroup.id });
    }
    setActiveGroup(group);
    setCurrentView('chat');
    loadMessages(group.id);
    joinGroup(group.id);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !user || !activeGroup || !socket) return;
    socket.emit('message:send', {
      groupId: activeGroup.id,
      userId: user.id,
      username: user.username,
      content: messageInput.trim()
    });
    setMessageInput('');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    try {
      const data = await safeJsonFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDescription, created_by: user.id }),
      }) as any;
      const gid = String(data._id || data.id);
      const newGroup = { ...data, id: gid };
      setActiveGroup(newGroup);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroup(false);
      setCurrentView('chat');
      loadMessages(gid);
      joinGroup(gid);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!adminSecret) {
      alert('Please set your Admin Secret in Settings first');
      setCurrentView('settings');
      return;
    }
    if (!confirm('Delete this group and all messages?')) return;
    try {
      await safeJsonFetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': adminSecret },
      });
      // Remove from local state
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
        setCurrentView('chats');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      alert(message + '. Check your Admin Secret in Settings.');
    }
  };

  const getHighlightColor = (username: string) => {
    if (username.toLowerCase() === 'admin') return '#ef4444';
    return highlightedUsers.get(username.toLowerCase()) || null;
  };

  // CHATS VIEW
  const renderChatsView = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Chats</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {groups.length} group{groups.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {groups.map((group) => (
          <div
            key={group.id}
            className="flex items-center p-4 mb-2 rounded-2xl bg-white dark:bg-neutral-900 active:scale-[0.98] transition-transform"
          >
            <div 
              onClick={() => handleSelectGroup(group)}
              className="flex items-center flex-1 min-w-0"
            >
              <div className={`w-12 h-12 rounded-full ${THEME_BG_LIGHT_CLASSES[themeColor]} flex items-center justify-center mr-3 flex-shrink-0`}>
                {group.is_global ? (
                  <Globe className={`w-6 h-6 ${THEME_TEXT_CLASSES[themeColor]}`} />
                ) : (
                  <Hash className={`w-6 h-6 ${THEME_TEXT_CLASSES[themeColor]}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white truncate">
                    {group.name}
                  </span>
                  {group.is_global && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${THEME_COLOR_CLASSES[themeColor]} text-white`}>
                      MAIN
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            {user?.isAdmin && !group.is_global && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group.id);
                }}
                className="p-2 ml-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <ChevronRight className="w-5 h-5 text-neutral-400 ml-2" />
          </div>
        ))}

        {/* Create Group Button */}
        <button
          onClick={() => setShowCreateGroup(true)}
          className={`w-full flex items-center justify-center p-4 mt-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 ${THEME_TEXT_CLASSES[themeColor]} active:scale-[0.98] transition-transform`}
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-medium">Create New Group</span>
        </button>
      </div>
    </div>
  );

  // CHAT VIEW
  const renderChatView = () => (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => {
            if (activeGroup && socket) {
              socket.emit('group:leave', { groupId: activeGroup.id });
            }
            setCurrentView('chats');
          }}
          className="p-2 -ml-2 mr-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-900 dark:text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-neutral-900 dark:text-white truncate">
            {activeGroup?.name}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {onlineUsers.length} online
          </p>
        </div>
        <button
          onClick={() => setCurrentView('users')}
          className={`p-2 rounded-full ${THEME_BG_LIGHT_CLASSES[themeColor]}`}
        >
          <Users className={`w-5 h-5 ${THEME_TEXT_CLASSES[themeColor]}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 dark:bg-neutral-950">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 ${THEME_COLOR_CLASSES[themeColor]} border-t-transparent rounded-full animate-spin`} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
            <p className="text-xs mt-2">Active Group: {activeGroup?.name}</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user_id === user?.id;
            const isSystem = message.user_id === 'system';
            const highlightColor = getHighlightColor(message.username);

            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <span className="px-3 py-1 text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                    {message.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? `${THEME_COLOR_CLASSES[themeColor]} text-white`
                      : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white'
                  }`}
                  style={!isOwn && highlightColor ? {
                    borderLeft: `3px solid ${highlightColor}`,
                    backgroundColor: `${highlightColor}10`
                  } : undefined}
                >
                  {!isOwn && (
                    <div 
                      className="text-xs font-semibold mb-1"
                      style={{ color: highlightColor || THEME_COLORS[themeColor].hex }}
                    >
                      {message.username}
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed break-words">{message.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {formatDistanceToNow(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900"
            style={{ '--tw-ring-color': THEME_COLORS[themeColor].hex } as React.CSSProperties}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className={`p-3 rounded-full ${THEME_COLOR_CLASSES[themeColor]} text-white disabled:opacity-50 active:scale-95 transition-transform`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // USERS VIEW
  const renderUsersView = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setCurrentView('chat')}
          className="p-2 -ml-2 mr-2 rounded-full active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-900 dark:text-white" />
        </button>
        <h2 className="font-semibold text-neutral-900 dark:text-white">
          Online Users ({onlineUsers.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {onlineUsers.length === 0 ? (
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            No users online
          </p>
        ) : (
          onlineUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center p-3 mb-2 rounded-xl bg-white dark:bg-neutral-900"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {u.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="font-medium text-neutral-900 dark:text-white">{u.username}</span>
              <div className={`ml-auto w-2.5 h-2.5 rounded-full ${THEME_COLOR_CLASSES[themeColor]}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );

  // SETTINGS VIEW
  const renderSettingsView = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* User Info */}
        <div className="p-4 mb-4 rounded-2xl bg-white dark:bg-neutral-900">
          <div className="flex items-center">
            <div className={`w-14 h-14 rounded-full ${THEME_COLOR_CLASSES[themeColor]} flex items-center justify-center mr-4`}>
              <span className="text-xl font-bold text-white">
                {user?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg text-neutral-900 dark:text-white">{user?.username}</p>
              {user?.isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Theme Color */}
        <div className="p-4 mb-4 rounded-2xl bg-white dark:bg-neutral-900">
          <div className="flex items-center mb-3">
            <Palette className="w-5 h-5 text-neutral-500 mr-3" />
            <span className="font-medium text-neutral-900 dark:text-white">Theme Color</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(THEME_COLORS) as ThemeColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className={`w-10 h-10 rounded-full ${THEME_COLOR_CLASSES[color]} ${
                  themeColor === color ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ring-neutral-900 dark:ring-white scale-110' : ''
                } transition-transform active:scale-95`}
              />
            ))}
          </div>
        </div>

        {/* Dark Mode */}
        <div 
          onClick={toggleDarkMode}
          className="flex items-center justify-between p-4 mb-4 rounded-2xl bg-white dark:bg-neutral-900 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center">
            {darkMode ? (
              <Moon className="w-5 h-5 text-neutral-500 mr-3" />
            ) : (
              <Sun className="w-5 h-5 text-neutral-500 mr-3" />
            )}
            <span className="font-medium text-neutral-900 dark:text-white">Dark Mode</span>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${darkMode ? THEME_COLOR_CLASSES[themeColor] : 'bg-neutral-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
          </div>
        </div>

        {/* Admin Options */}
        {user?.isAdmin && (
          <>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 mt-6">Admin</p>
            
            {/* Admin Secret Input */}
            <div className="p-4 mb-4 rounded-2xl bg-white dark:bg-neutral-900">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Admin Secret
              </label>
              <input
                type="text"
                value={adminSecret}
                onChange={(e) => {
                  setAdminSecret(e.target.value);
                  localStorage.setItem('adminSecret', e.target.value);
                }}
                placeholder="Enter your admin secret"
                className="w-full px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': THEME_COLORS[themeColor].hex } as React.CSSProperties}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Required to delete groups and manage users. Check your .env file for ADMIN_API_SECRET value.
              </p>
            </div>

            <button
              onClick={() => setShowHighlightedManager(true)}
              className="w-full flex items-center justify-between p-4 mb-2 rounded-2xl bg-white dark:bg-neutral-900 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center">
                <Star className="w-5 h-5 text-amber-500 mr-3" />
                <span className="font-medium text-neutral-900 dark:text-white">Highlighted Users</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>

            <button
              onClick={() => setShowBannedManager(true)}
              className="w-full flex items-center justify-between p-4 mb-2 rounded-2xl bg-white dark:bg-neutral-900 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center">
                <Ban className="w-5 h-5 text-rose-500 mr-3" />
                <span className="font-medium text-neutral-900 dark:text-white">Banned Usernames</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center p-4 mt-6 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  // BOTTOM NAVIGATION
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-2 safe-area-pb">
      <div className="flex justify-around">
        <button
          onClick={() => setCurrentView('chats')}
          className={`flex flex-col items-center py-2 px-4 rounded-xl ${
            currentView === 'chats' ? THEME_TEXT_CLASSES[themeColor] : 'text-neutral-500'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs mt-1 font-medium">Chats</span>
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center py-2 px-4 rounded-xl ${
            currentView === 'settings' ? THEME_TEXT_CLASSES[themeColor] : 'text-neutral-500'
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs mt-1 font-medium">Settings</span>
        </button>
      </div>
    </div>
  );

  // CREATE GROUP MODAL
  const renderCreateGroupModal = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">New Group</h2>
          <button
            onClick={() => setShowCreateGroup(false)}
            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': THEME_COLORS[themeColor].hex } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': THEME_COLORS[themeColor].hex } as React.CSSProperties}
            />
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            className={`w-full py-4 rounded-xl ${THEME_COLOR_CLASSES[themeColor]} text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform`}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen-safe bg-neutral-100 dark:bg-neutral-950 flex flex-col">
      <div className="flex-1 overflow-hidden">
        {currentView === 'chats' && renderChatsView()}
        {currentView === 'chat' && renderChatView()}
        {currentView === 'users' && renderUsersView()}
        {currentView === 'settings' && renderSettingsView()}
      </div>

      {(currentView === 'chats' || currentView === 'settings') && renderBottomNav()}

      {showCreateGroup && renderCreateGroupModal()}
      {showBannedManager && <BannedUsernamesManager onClose={() => setShowBannedManager(false)} />}
      {showHighlightedManager && <HighlightedUsernamesManager onClose={() => setShowHighlightedManager(false)} />}
    </div>
  );
};
