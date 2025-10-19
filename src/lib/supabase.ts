import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          created_at: string;
          last_seen: string;
        };
        Insert: {
          id?: string;
          username: string;
          created_at?: string;
          last_seen?: string;
        };
        Update: {
          id?: string;
          username?: string;
          created_at?: string;
          last_seen?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_by: string | null;
          created_at: string;
          is_global: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_by?: string | null;
          created_at?: string;
          is_global?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_by?: string | null;
          created_at?: string;
          is_global?: boolean;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
          is_online: boolean;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          joined_at?: string;
          is_online?: boolean;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          joined_at?: string;
          is_online?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          username: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          username: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          username?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
  };
};
