import React, { useState } from 'react';
import { Hash, Plus, LogOut, Users, Moon, Sun, X, Ban } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BannedUsernamesManager } from './BannedUsernamesManager';

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
  darkMode: boolean;
  toggleDarkMode: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  groups,
  activeGroupId,
  onGroupSelect,
  onCreateGroup,
  darkMode,
  toggleDarkMode,
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBannedManager, setShowBannedManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateModal(false);
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
        w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Chat Rooms</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="font-medium">{user?.username}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Groups
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Create Group"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onGroupSelect(group.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeGroupId === group.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Hash className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{group.name}</div>
                  {group.description && (
                    <div className={`text-xs truncate ${
                      activeGroupId === group.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {group.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {user?.username === 'admin' && (
            <button
              onClick={() => setShowBannedManager(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <Ban className="w-4 h-4" />
              <span className="font-medium">Manage Banned Names</span>
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {showBannedManager && (
        <BannedUsernamesManager onClose={() => setShowBannedManager(false)} />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
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
