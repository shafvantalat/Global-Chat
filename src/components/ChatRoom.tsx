import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { Socket } from 'socket.io-client';
import { Menu, Users as UsersIcon } from 'lucide-react';

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
    const channel = setupRealtimeSubscription();

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
        supabase.removeChannel(channel);
      };
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, socket, user]);

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`messages:${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${group.id}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return channel;
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;

    const newMessage = {
      group_id: group.id,
      user_id: user.id,
      username: user.username,
      content,
    };

    const { error } = await supabase
      .from('messages')
      .insert(newMessage);

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-full overflow-hidden">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">{group.name}</h2>
              {group.description && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">{group.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors xl:hidden flex items-center space-x-1 flex-shrink-0"
          >
            <UsersIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{onlineUsers.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Loading messages...
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
        </div>

        <div className={`${showOnlineUsers ? 'block' : 'hidden'} xl:block`}>
          <OnlineUsers users={onlineUsers} onClose={() => setShowOnlineUsers(false)} />
        </div>
      </div>
    </div>
  );
};
