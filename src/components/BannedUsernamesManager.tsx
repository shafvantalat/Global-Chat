import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Ban, Plus, Trash2, X } from 'lucide-react';
import { safeJsonFetch } from '../utils/fetchHelper';

interface BannedUsername {
  id: string;
  username: string;
  reason: string | null;
  created_at: string;
}

interface BannedUsernamesManagerProps {
  onClose: () => void;
}

export const BannedUsernamesManager: React.FC<BannedUsernamesManagerProps> = ({ onClose }) => {
  const [bannedUsernames, setBannedUsernames] = useState<BannedUsername[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newReason, setNewReason] = useState('');
  const { user } = useAuth();
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBannedUsernames();
  }, []);

  const loadBannedUsernames = async () => {
    try {
      const data = await safeJsonFetch('/api/banned_usernames') as any[];
      setBannedUsernames(data.map((d: any) => ({ id: String(d._id || d.id), username: d.username, reason: d.reason || null, created_at: d.created_at })));
    } catch (err) {
      console.error('Failed to load banned usernames:', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = { username: newUsername.trim().toLowerCase(), reason: newReason.trim() || null };
      const headers: any = { 'Content-Type': 'application/json' };
      if (adminSecret) headers['x-admin-secret'] = adminSecret;

      await safeJsonFetch('/admin/ban', { method: 'POST', headers, body: JSON.stringify(body) });
      setNewUsername('');
      setNewReason('');
      await loadBannedUsernames();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to add banned username');
      console.error('Unexpected error adding banned username:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this banned username?')) {
      return;
    }

    try {
      const headers: any = {};
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      await safeJsonFetch(`/api/banned_usernames/${id}`, { method: 'DELETE', headers });
      await loadBannedUsernames();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Failed to delete banned username:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-neutral-800">
        <div className="p-6 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-neutral-100">
              Banned Usernames
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
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Username to Ban
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g., badword"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g., Offensive language"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                  disabled={loading}
                />
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
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder-slate-400 dark:placeholder-neutral-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Adding...' : 'Add to Ban List'}</span>
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 mb-4 uppercase tracking-wider">
            Banned Usernames ({bannedUsernames.length})
          </h3>
          {bannedUsernames.length === 0 ? (
            <p className="text-slate-500 dark:text-neutral-400 text-center py-8">
              No banned usernames yet
            </p>
          ) : (
            <div className="space-y-2">
              {bannedUsernames.map((banned) => (
                <div
                  key={banned.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-neutral-950/50 hover:bg-slate-100 dark:hover:bg-neutral-950 transition-colors border border-slate-200 dark:border-neutral-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 dark:text-neutral-100">
                      {banned.username}
                    </div>
                    {banned.reason && (
                      <div className="text-sm text-slate-500 dark:text-neutral-400 truncate">
                        {banned.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(banned.id)}
                    className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition-colors ml-2"
                    title="Remove from ban list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
