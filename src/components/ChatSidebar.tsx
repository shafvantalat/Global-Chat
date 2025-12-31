import React, { useState } from 'react';
import { Hash, Plus, LogOut, Moon, Sun, X, Ban, Star, Palette, Trash2, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEME_COLORS, ThemeColor } from '../contexts/ThemeContext';
import { BannedUsernamesManager } from './BannedUsernamesManager';
import { HighlightedUsernamesManager } from './HighlightedUsernamesManager';
import { safeJsonFetch } from '../utils/fetchHelper';

interface Group {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
}

interface ChatSidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  onGroupSelect: (groupId: string) => void;
  onCreateGroup: (name: string, description: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const THEME_COLOR_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
};

const THEME_ACTIVE_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-600',
  blue: 'bg-blue-600',
  violet: 'bg-violet-600',
  rose: 'bg-rose-600',
  amber: 'bg-amber-600',
  cyan: 'bg-cyan-600',
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  groups,
  activeGroupId,
  onGroupSelect,
  onCreateGroup,
  onDeleteGroup,
  darkMode,
  toggleDarkMode,
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const { themeColor, setThemeColor } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannedManager, setShowBannedManager] = useState(false);
  const [showHighlightedManager, setShowHighlightedManager] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem('adminSecret') || '');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateModal(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!adminSecret) {
      alert('Please set your Admin Secret first (check .env file for ADMIN_API_SECRET value)');
      return;
    }
    if (!confirm('Are you sure you want to delete this group? All messages will be lost.')) return;
    
    setDeletingGroupId(groupId);
    try {
      await safeJsonFetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': adminSecret,
        },
      });
      onDeleteGroup?.(groupId);
    } catch (err) {
      console.error('Failed to delete group:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      alert(message + ' Check your Admin Secret matches the .env ADMIN_API_SECRET value.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-50 dark:bg-neutral-950 border-r border-slate-200 dark:border-neutral-800
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-neutral-100">Channels</h1>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
                title="Change theme color"
              >
                <Palette className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors lg:hidden"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
              </button>
            </div>
          </div>
          
          {showThemePicker && (
            <div className="mb-4 p-3 bg-slate-100 dark:bg-neutral-900 rounded-lg">
              <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">Theme Color</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(THEME_COLORS) as ThemeColor[]).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setThemeColor(color);
                      setShowThemePicker(false);
                    }}
                    className={`w-8 h-8 rounded-full ${THEME_COLOR_CLASSES[color]} transition-all ${
                      themeColor === color 
                        ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-neutral-200 dark:ring-offset-neutral-900 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    title={THEME_COLORS[color].name}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-900 rounded-lg px-3 py-2">
            <div className={`w-2 h-2 ${THEME_COLOR_CLASSES[themeColor]} rounded-full`}></div>
            <span className="font-medium">{user?.username}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              Groups
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
              title="Create Group"
            >
              <Plus className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
            </button>
          </div>

          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  activeGroupId === group.id
                    ? `${THEME_ACTIVE_CLASSES[themeColor]} text-white shadow-sm`
                    : 'hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}
                onClick={() => onGroupSelect(group.id)}
              >
                {group.is_global ? (
                  <Globe className={`w-5 h-5 flex-shrink-0 ${activeGroupId === group.id ? 'text-white/70' : 'text-slate-400 dark:text-neutral-500'}`} />
                ) : (
                  <Hash className={`w-5 h-5 flex-shrink-0 ${activeGroupId === group.id ? 'text-white/70' : 'text-slate-400 dark:text-neutral-500'}`} />
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    {group.name}
                    {group.is_global && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeGroupId === group.id ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                        MAIN
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <div className={`text-xs truncate ${
                      activeGroupId === group.id ? 'text-white/70' : 'text-slate-500 dark:text-neutral-400'
                    }`}>
                      {group.description}
                    </div>
                  )}
                </div>
                {user?.isAdmin && !group.is_global && (
                  <button
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    disabled={deletingGroupId === group.id}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all ${
                      activeGroupId === group.id 
                        ? 'hover:bg-white/20 text-white/70 hover:text-white' 
                        : 'hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                    }`}
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-neutral-800 space-y-2">
          {user?.isAdmin && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
                  Admin Secret
                </label>
                <input
                  type="text"
                  value={adminSecret}
                  onChange={(e) => {
                    setAdminSecret(e.target.value);
                    localStorage.setItem('adminSecret', e.target.value);
                  }}
                  placeholder="From .env file"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 border border-slate-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-neutral-500 mt-1">
                  Check .env for ADMIN_API_SECRET
                </p>
              </div>
              <button
                onClick={() => setShowHighlightedManager(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800/50"
              >
                <Star className="w-4 h-4" />
                <span className="font-medium text-sm">Highlighted Users</span>
              </button>
              <button
                onClick={() => setShowBannedManager(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors border border-rose-200 dark:border-rose-800/50"
              >
                <Ban className="w-4 h-4" />
                <span className="font-medium text-sm">Banned Names</span>
              </button>
            </>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {showBannedManager && (
        <BannedUsernamesManager onClose={() => setShowBannedManager(false)} />
      )}

      {showHighlightedManager && (
        <HighlightedUsernamesManager onClose={() => setShowHighlightedManager(false)} />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-neutral-100">Create New Channel</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter channel name"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
