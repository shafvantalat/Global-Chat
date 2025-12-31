import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Star, Plus, Trash2, X } from 'lucide-react';
import { safeJsonFetch } from '../utils/fetchHelper';

interface HighlightedUsername {
  id: string;
  username: string;
  highlight_color: string;
  created_at: string;
}

interface HighlightedUsernamesManagerProps {
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { value: '#ffd700', label: 'Gold', class: 'bg-yellow-400' },
  { value: '#ff6b6b', label: 'Red', class: 'bg-red-400' },
  { value: '#4ecdc4', label: 'Teal', class: 'bg-teal-400' },
  { value: '#a855f7', label: 'Purple', class: 'bg-purple-400' },
  { value: '#3b82f6', label: 'Blue', class: 'bg-blue-400' },
  { value: '#22c55e', label: 'Green', class: 'bg-green-400' },
  { value: '#f97316', label: 'Orange', class: 'bg-orange-400' },
  { value: '#ec4899', label: 'Pink', class: 'bg-pink-400' },
];

export const HighlightedUsernamesManager: React.FC<HighlightedUsernamesManagerProps> = ({ onClose }) => {
  const [highlightedUsernames, setHighlightedUsernames] = useState<HighlightedUsername[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newColor, setNewColor] = useState('#ffd700');
  const { user } = useAuth();
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHighlightedUsernames();
  }, []);

  const loadHighlightedUsernames = async () => {
    try {
      const data = await safeJsonFetch('/api/highlighted_usernames') as HighlightedUsername[];
      setHighlightedUsernames(data);
    } catch (err) {
      console.error('Failed to load highlighted usernames:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!newPassword.trim()) {
      setError('Password is required to reserve this username');
      setLoading(false);
      return;
    }

    try {
      const body = { 
        username: newUsername.trim().toLowerCase(), 
        password: newPassword,
        highlight_color: newColor 
      };
      const headers: any = { 'Content-Type': 'application/json' };
      if (adminSecret) headers['x-admin-secret'] = adminSecret;

      await safeJsonFetch('/admin/highlight', { method: 'POST', headers, body: JSON.stringify(body) });
      setNewUsername('');
      setNewPassword('');
      setNewColor('#ffd700');
      await loadHighlightedUsernames();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to add highlighted username');
      console.error('Unexpected error adding highlighted username:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this highlighted username?')) {
      return;
    }

    try {
      const headers: any = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      await safeJsonFetch(`/api/highlighted_usernames/${id}`, { method: 'DELETE', headers });
      await loadHighlightedUsernames();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Failed to delete highlighted username:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-neutral-800">
        <div className="p-6 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-neutral-100">
              Highlighted Usernames
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200 dark:border-neutral-800">
          <p className="text-sm text-slate-600 dark:text-neutral-400 mb-4">
            Reserved usernames require a password to log in. Their messages will be displayed with a special highlight.
          </p>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Username to Highlight
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  placeholder="e.g., vip_user"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Password (required)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password to reserve username"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                Highlight Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewColor(color.value)}
                    className={`w-8 h-8 rounded-full ${color.class} transition-all ${
                      newColor === color.value ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-neutral-200 scale-110' : 'hover:scale-105'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {user?.isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Admin Secret
                </label>
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter admin secret"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newUsername.trim() || !newPassword.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>{loading ? 'Adding...' : 'Add Highlighted Username'}</span>
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 mb-4 uppercase tracking-wider">
            Highlighted Usernames ({highlightedUsernames.length})
          </h3>

          {highlightedUsernames.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-neutral-400 py-8">
              No highlighted usernames yet
            </div>
          ) : (
            <ul className="space-y-2">
              {highlightedUsernames.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-neutral-950/50 rounded-lg border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-950 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm"
                      style={{ backgroundColor: item.highlight_color }}
                    />
                    <span className="font-medium text-slate-800 dark:text-neutral-100">
                      {item.username}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-neutral-400 bg-slate-200 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      protected
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
