import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
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
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
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

    const trimmedUsername = username.trim();
    const isAdminLogin = trimmedUsername.toLowerCase() === 'admin';

    if (isAdminLogin && !password) {
      throw new Error('Admin password is required');
    }

    const trimmedUsernameLower = trimmedUsername.toLowerCase();

    const { data: bannedCheck } = await supabase
      .from('banned_usernames')
      .select('username, reason')
      .eq('username', trimmedUsernameLower)
      .maybeSingle();

    if (bannedCheck && !isAdminLogin) {
      throw new Error('This username is not allowed. Please choose a different one.');
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', trimmedUsername)
      .maybeSingle();

    let userData: User;

    if (existingUser) {
      if (existingUser.is_admin && password) {
        const passwordHash = await hashPassword(password);
        if (existingUser.admin_password_hash !== passwordHash) {
          throw new Error('Invalid admin password');
        }
      } else if (existingUser.is_admin && !password) {
        throw new Error('Admin password is required');
      }

      userData = {
        id: existingUser.id,
        username: existingUser.username,
        isAdmin: existingUser.is_admin || false,
      };
      await updateLastSeen(existingUser.id);
    } else {
      if (isAdminLogin && password) {
        const passwordHash = await hashPassword(password);
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            username: trimmedUsername,
            is_admin: true,
            admin_password_hash: passwordHash,
          })
          .select()
          .single();

        if (error) throw error;

        userData = {
          id: newUser.id,
          username: newUser.username,
          isAdmin: true,
        };
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({ username: trimmedUsername })
          .select()
          .single();

        if (error) throw error;

        userData = {
          id: newUser.id,
          username: newUser.username,
          isAdmin: false,
        };
      }

      const { data: globalGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('is_global', true)
        .single();

      if (globalGroup) {
        await supabase.from('group_members').insert({
          group_id: globalGroup.id,
          user_id: userData.id,
          is_online: true,
        });
      }
    }

    localStorage.setItem('chat_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    if (user) {
      await supabase
        .from('group_members')
        .update({ is_online: false })
        .eq('user_id', user.id);
    }

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
