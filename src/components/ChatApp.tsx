import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { ChatSidebar } from './ChatSidebar';
import { ChatRoom } from './ChatRoom';

interface Group {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
  created_by: string | null;
}

export const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    loadGroups();
    setupRealtimeSubscription();
  }, []);

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('is_global', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setGroups(data);
      if (data.length > 0 && !activeGroup) {
        const globalGroup = data.find((g) => g.is_global) || data[0];
        setActiveGroup(globalGroup);
        joinGroup(globalGroup.id);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('groups')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'groups',
        },
        (payload) => {
          const newGroup = payload.new as Group;
          setGroups((prev) => [...prev, newGroup]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    const { data: existingMembership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMembership) {
      await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        is_online: true,
      });
    } else {
      await supabase
        .from('group_members')
        .update({ is_online: true })
        .eq('id', existingMembership.id);
    }

    if (socket) {
      socket.emit('group:join', { groupId });
    }
  };

  const handleGroupSelect = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      if (activeGroup && socket) {
        socket.emit('group:leave', { groupId: activeGroup.id });
      }
      setActiveGroup(group);
      joinGroup(groupId);
      setSidebarOpen(false);
    }
  };

  const handleCreateGroup = async (name: string, description: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      await supabase.from('group_members').insert({
        group_id: data.id,
        user_id: user.id,
        is_online: true,
      });

      setActiveGroup(data);
      if (socket) {
        socket.emit('group:join', { groupId: data.id });
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <ChatSidebar
        groups={groups}
        activeGroupId={activeGroup?.id || null}
        onGroupSelect={handleGroupSelect}
        onCreateGroup={handleCreateGroup}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {activeGroup ? (
        <ChatRoom
          group={activeGroup}
          socket={socket}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Select a group to start chatting
        </div>
      )}
    </div>
  );
};
