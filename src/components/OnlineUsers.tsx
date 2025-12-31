import React from 'react';
import { Users, X } from 'lucide-react';

interface OnlineUser {
  id: string;
  username: string;
}

interface OnlineUsersProps {
  users: OnlineUser[];
  onClose: () => void;
}

export const OnlineUsers: React.FC<OnlineUsersProps> = ({ users, onClose }) => {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
        onClick={onClose}
      />
      <div className="fixed xl:static right-0 inset-y-0 z-50 w-64 bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800 p-4 xl:border-l">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
            <h3 className="font-semibold text-slate-800 dark:text-neutral-100">
              Online ({users.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors xl:hidden"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
          </button>
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-neutral-400">No users online</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-slate-700 dark:text-neutral-300">{user.username}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
