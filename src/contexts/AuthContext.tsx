import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeJsonFetch } from '../utils/fetchHelper';

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  isHighlighted?: boolean;
  highlightColor?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('chat_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      updateLastSeen(userData.id);
    }
    setLoading(false);
  }, []);

  const updateLastSeen = async (userId: string) => {
    try {
      await safeJsonFetch(`/api/users/${userId}/last_seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Failed to update last seen:', err);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const login = async (username: string, password?: string) => {
    if (!username.trim()) {
      throw new Error('Username cannot be empty');
    }

    // Force all usernames to lowercase
    const trimmedUsername = username.trim().toLowerCase();
    const isAdminLogin = trimmedUsername === 'admin';

    if (isAdminLogin && !password) {
      throw new Error('Admin password is required');
    }

    // Use server-side login endpoint which persists users in MongoDB
    try {
      const result = await safeJsonFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      }) as any;

      const userData: User = {
        id: result.id,
        username: result.username,
        isAdmin: !!result.isAdmin,
        isHighlighted: !!result.isHighlighted,
        highlightColor: result.highlightColor || null,
      };

      localStorage.setItem('chat_user', JSON.stringify(userData));
      setUser(userData);
      try { await updateLastSeen(userData.id); } catch (_) {}
    } catch (err) {
      throw err instanceof Error ? err : new Error('Login failed');
    }
  };

  const logout = async () => {
    // For now just clear local state. Server group_members will be updated on disconnect via socket.
    localStorage.removeItem('chat_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
