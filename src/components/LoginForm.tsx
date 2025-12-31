import React, { useState, useEffect } from 'react';
import { LogIn, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeColor } from '../contexts/ThemeContext';
import { safeJsonFetch } from '../utils/fetchHelper';

interface HighlightedUser {
  username: string;
  highlight_color: string;
}

const THEME_BUTTON_CLASSES: Record<ThemeColor, string> = {
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
  rose: 'bg-rose-600 hover:bg-rose-700',
  amber: 'bg-amber-600 hover:bg-amber-700',
  cyan: 'bg-cyan-600 hover:bg-cyan-700',
};

const THEME_GRADIENT_CLASSES: Record<ThemeColor, string> = {
  emerald: 'from-emerald-500 to-emerald-600',
  blue: 'from-blue-500 to-blue-600',
  violet: 'from-violet-500 to-violet-600',
  rose: 'from-rose-500 to-rose-600',
  amber: 'from-amber-500 to-amber-600',
  cyan: 'from-cyan-500 to-cyan-600',
};

const THEME_RING_CLASSES: Record<ThemeColor, string> = {
  emerald: 'focus:ring-emerald-500 focus:border-emerald-500',
  blue: 'focus:ring-blue-500 focus:border-blue-500',
  violet: 'focus:ring-violet-500 focus:border-violet-500',
  rose: 'focus:ring-rose-500 focus:border-rose-500',
  amber: 'focus:ring-amber-500 focus:border-amber-500',
  cyan: 'focus:ring-cyan-500 focus:border-cyan-500',
};

export const LoginForm: React.FC = () => {
  const { themeColor } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightedUsernames, setHighlightedUsernames] = useState<Set<string>>(new Set());
  const { login } = useAuth();

  // Privacy / age gate configuration
  // Paste the URL to redirect minors (under 18) here:
  // Example: const MINOR_REDIRECT_URL = 'https://example.com/under-18-info';
  const MINOR_REDIRECT_URL = 'https://www.youtube.com/watch?v=e_04ZrNroTo';
  // Paste your privacy policy URL here (showed on the entry notice)
  const PRIVACY_POLICY_URL = 'PASTE_PRIVACY_POLICY_LINK_HERE';

  const [ageVerified, setAgeVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('age_verified') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Load highlighted usernames on mount
  useEffect(() => {
    const loadHighlighted = async () => {
      try {
        const data = await safeJsonFetch('/api/highlighted_usernames') as HighlightedUser[];
        setHighlightedUsernames(new Set(data.map(h => h.username.toLowerCase())));
      } catch (err) {
        console.error('Failed to load highlighted usernames:', err);
      }
    };
    loadHighlighted();
  }, []);

  const isAdminLogin = username.toLowerCase() === 'admin';
  const isHighlightedLogin = highlightedUsernames.has(username.toLowerCase());
  const requiresPassword = isAdminLogin || isHighlightedLogin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!ageVerified) {
      setError('Please confirm you are 18+ to join the chat');
      setLoading(false);
      return;
    }

    try {
      await login(username, password || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // nothing else; age gate handled on mount
  }, []);

  return (
    <div className="h-screen-safe bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4 overflow-auto">
      {/* Age gate modal shown when user hasn't verified age */}
      {!ageVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-neutral-800">
            <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-neutral-100">Age Verification</h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400 mb-4 leading-relaxed">
              This site contains user-generated chat content. By continuing you confirm you are 18 years of age or older. Please review our{' '}
              <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Privacy Policy
              </a>.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  window.location.href = MINOR_REDIRECT_URL;
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
              >
                I am under 18
              </button>
              <button
                onClick={() => {
                  try { localStorage.setItem('age_verified', 'true'); } catch (e) {}
                  setAgeVerified(true);
                }}
                className={`px-4 py-2 rounded-lg ${THEME_BUTTON_CLASSES[themeColor]} text-white transition-colors`}
              >
                I am 18+
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 dark:border-neutral-800">
        <div className="flex items-center justify-center mb-6">
          <div className={`bg-gradient-to-br ${THEME_GRADIENT_CLASSES[themeColor]} p-4 rounded-2xl shadow-lg`}>
            <User className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-2 text-slate-800 dark:text-neutral-100">
          Welcome Back
        </h1>
        <p className="text-center text-slate-500 dark:text-neutral-400 mb-8 text-sm">
          Enter your username to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 ${THEME_RING_CLASSES[themeColor]} focus:bg-white dark:focus:bg-neutral-900 transition-all lowercase placeholder-slate-400 dark:placeholder-neutral-500`}
              required
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
              Usernames are lowercase only
            </p>
          </div>

          {requiresPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
                {isAdminLogin ? 'Admin Password' : 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAdminLogin ? 'Enter admin password' : 'Enter password for this reserved username'}
                className={`w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 focus:ring-2 ${THEME_RING_CLASSES[themeColor]} focus:bg-white dark:focus:bg-neutral-900 transition-all placeholder-slate-400 dark:placeholder-neutral-500`}
                required={requiresPassword}
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
                {isAdminLogin 
                  ? 'Enter your Admin password that dev team provided.' 
                  : 'This username is reserved. Enter the password to use it.'}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${THEME_BUTTON_CLASSES[themeColor]} text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Joining...' : 'Continue'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
