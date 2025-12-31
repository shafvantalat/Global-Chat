import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import { ChatSidebar } from './ChatSidebar';
import { ChatRoom } from './ChatRoom';
import { safeJsonFetch } from '../utils/fetchHelper';

interface Group {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
  created_by: string | null;
}

export const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const socket = useSocket();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadGroups();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [socket]);

  const loadGroups = async () => {
    try {
      const data = await safeJsonFetch('/api/groups') as any[];
      const mappedGroups = data.map((g: any) => ({ ...g, id: String(g._id || g.id) }));
      setGroups(mappedGroups);
      if (mappedGroups.length > 0 && !activeGroup) {
        // Always select the global group first
        const globalGroup = mappedGroups.find((g: any) => g.is_global) || mappedGroups[0];
        const gid = String(globalGroup._id || globalGroup.id);
        setActiveGroup({ ...globalGroup, id: gid });
        joinGroup(gid);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!socket) return () => {};
    
    const onCreated = (group: any) => {
      const g = { ...group, id: String(group._id || group.id) };
      setGroups((prev) => [...prev, g]);
    };
    
    const onDeleted = ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter(g => g.id !== groupId));
      // If the deleted group was active, switch to global
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
        loadGroups();
      }
    };
    
    socket.on('group:created', onCreated);
    socket.on('group:deleted', onDeleted);
    
    return () => {
      socket.off('group:created', onCreated);
      socket.off('group:deleted', onDeleted);
    };
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
      console.error('Failed to upsert group_member:', err);
    }

    if (socket) socket.emit('group:join', { groupId });
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
    try {
      const data = await safeJsonFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, created_by: user.id }),
      }) as any;
      const gid = String(data._id || data.id);
      setActiveGroup({ ...data, id: gid });
      await joinGroup(gid);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter(g => g.id !== groupId));
    if (activeGroup?.id === groupId) {
      // Switch to global group
      const globalGroup = groups.find(g => g.is_global);
      if (globalGroup) {
        setActiveGroup(globalGroup);
        joinGroup(globalGroup.id);
      }
    }
  };

  return (
    <div className="h-screen-safe flex bg-slate-100 dark:bg-neutral-950 overflow-hidden">
      <ChatSidebar
        groups={groups}
        activeGroupId={activeGroup?.id || null}
        onGroupSelect={handleGroupSelect}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
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
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-neutral-400">
          Select a group to start chatting
        </div>
      )}
    </div>
  );
};

