import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { Socket } from 'socket.io-client';
import { Menu, Users as UsersIcon } from 'lucide-react';
import { safeJsonFetch } from '../utils/fetchHelper';

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

interface Group {
  id: string;
  name: string;
  description: string;
}

interface ChatRoomProps {
  group: Group;
  socket: Socket | null;
  onToggleSidebar: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ group, socket, onToggleSidebar }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  useEffect(() => {
    loadMessages();
    const cleanupChannel = setupRealtimeSubscription();

    if (socket && user) {
      socket.emit('user:join', {
        userId: user.id,
        username: user.username,
        groupId: group.id,
      });

      socket.on('users:update', ({ groupId, users }) => {
        console.log('Users update received:', { groupId, users, currentGroupId: group.id });
        if (groupId === group.id) {
          setOnlineUsers(users);
        }
      });

      socket.on('user:joined', ({ groupId, username }) => {
        if (groupId === group.id) {
          const joinMessage: Message = {
            id: `system-${Date.now()}`,
            group_id: group.id,
            user_id: 'system',
            username: 'System',
            content: `${username} joined the group`,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, joinMessage]);
        }
      });

      return () => {
        socket.emit('group:leave', { groupId: group.id });
        socket.off('users:update');
        socket.off('user:joined');
        if (cleanupChannel && typeof cleanupChannel === 'function') cleanupChannel();
      };
    }

    return () => {
      if (cleanupChannel && typeof cleanupChannel === 'function') cleanupChannel();
    };
  }, [group.id, socket, user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await safeJsonFetch(`/api/messages?groupId=${encodeURIComponent(group.id)}`) as any[];
      setMessages(data.map((m: any) => ({ id: String(m._id || m.id), group_id: m.group_id, user_id: m.user_id, username: m.username, content: m.content, created_at: m.created_at })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    if (!socket) return () => {};
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
      if (newMessage.group_id === group.id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    };
    socket.on('message:new', onMessage);
    socket.on('message:warning', (w: any) => {
      // show warning as a system message
      if (w && w.reason) {
        const sys: Message = { id: `warn-${Date.now()}`, group_id: group.id, user_id: 'system', username: 'System', content: w.reason, created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, sys]);
      }
    });
    socket.on('message:blocked', (b: any) => {
      const sys: Message = { id: `block-${Date.now()}`, group_id: group.id, user_id: 'system', username: 'System', content: b.reason || 'You are muted', created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, sys]);
    });

    return () => {
      socket.off('message:new', onMessage);
      socket.off('message:warning');
      socket.off('message:blocked');
    };
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    const newMessage = { groupId: group.id, userId: user.id, username: user.username, content };
    if (socket) socket.emit('message:send', newMessage);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-neutral-950 min-h-0 overflow-hidden">
      <div className="bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors lg:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-neutral-400" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-neutral-100 truncate">{group.name}</h2>
              {group.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5 truncate">{group.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors flex items-center space-x-1.5 flex-shrink-0 bg-slate-100 dark:bg-neutral-800"
          >
            <UsersIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{onlineUsers.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-neutral-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Loading messages...</span>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}

          {/* Ensure the input area doesn't get pushed off-screen by the message list */}
          <div className="flex-shrink-0">
            <MessageInput onSendMessage={handleSendMessage} disabled={loading || !user} />
          </div>
        </div>

        <div className={`${showOnlineUsers ? 'block' : 'hidden'} xl:block`}>
          <OnlineUsers users={onlineUsers} onClose={() => setShowOnlineUsers(false)} />
        </div>
      </div>
    </div>
  );
};
