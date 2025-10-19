import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Ban, Plus, Trash2, X } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBannedUsernames();
  }, []);

  const loadBannedUsernames = async () => {
    const { data, error } = await supabase
      .from('banned_usernames')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBannedUsernames(data);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('banned_usernames')
        .insert({
          username: newUsername.trim().toLowerCase(),
          reason: newReason.trim() || null,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This username is already banned');
        } else {
          throw insertError;
        }
      } else {
        setNewUsername('');
        setNewReason('');
        await loadBannedUsernames();
      }
    } catch (err) {
      setError('Failed to add banned username');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this banned username?')) {
      return;
    }

    const { error } = await supabase
      .from('banned_usernames')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadBannedUsernames();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Manage Banned Usernames
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username to Ban
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g., badword"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g., Offensive language"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Adding...' : 'Add to Ban List'}</span>
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
            Banned Usernames ({bannedUsernames.length})
          </h3>
          {bannedUsernames.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No banned usernames yet
            </p>
          ) : (
            <div className="space-y-2">
              {bannedUsernames.map((banned) => (
                <div
                  key={banned.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {banned.username}
                    </div>
                    {banned.reason && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {banned.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(banned.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors ml-2"
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
