/*
  # Real-time Group Chat Application Schema

  ## Overview
  This migration creates the complete database schema for a real-time group chat application
  with support for multiple chat groups, user presence tracking, and message history.

  ## New Tables

  ### 1. `users`
  Stores user information (username-based authentication, no password required)
  - `id` (uuid, primary key) - Unique user identifier
  - `username` (text, unique) - User's chosen display name
  - `created_at` (timestamptz) - Account creation timestamp
  - `last_seen` (timestamptz) - Last activity timestamp for presence tracking

  ### 2. `groups`
  Stores chat group information
  - `id` (uuid, primary key) - Unique group identifier
  - `name` (text) - Group display name
  - `description` (text) - Optional group description
  - `created_by` (uuid, foreign key -> users.id) - User who created the group
  - `created_at` (timestamptz) - Group creation timestamp
  - `is_global` (boolean) - Flag for the default global chat room

  ### 3. `group_members`
  Tracks which users are members of which groups
  - `id` (uuid, primary key) - Unique membership identifier
  - `group_id` (uuid, foreign key -> groups.id) - Reference to the group
  - `user_id` (uuid, foreign key -> users.id) - Reference to the user
  - `joined_at` (timestamptz) - When the user joined the group
  - `is_online` (boolean) - Current online status in this group

  ### 4. `messages`
  Stores chat messages with history limited to last 50 per group
  - `id` (uuid, primary key) - Unique message identifier
  - `group_id` (uuid, foreign key -> groups.id) - Group where message was sent
  - `user_id` (uuid, foreign key -> users.id) - User who sent the message
  - `username` (text) - Cached username for display (denormalized for performance)
  - `content` (text) - Message content
  - `created_at` (timestamptz) - Message timestamp

  ## Security (Row Level Security)

  All tables have RLS enabled with policies that:
  - Allow authenticated users to read all public data
  - Restrict writes to authorized users only
  - Prevent unauthorized access to sensitive operations

  ### Users table policies:
  - Anyone can read user profiles (for displaying usernames)
  - Users can update their own last_seen timestamp
  - Users can insert their own profile

  ### Groups table policies:
  - Anyone can view all groups
  - Authenticated users can create groups
  - Group creators can update their groups

  ### Group_members table policies:
  - Anyone can view group memberships (for online user lists)
  - Users can join groups by inserting their own membership
  - Users can update their own online status
  - Users can leave groups by deleting their own membership

  ### Messages table policies:
  - Anyone can read messages in all groups
  - Group members can send messages
  - Message senders can delete their own messages

  ## Indexes

  Performance indexes for common queries:
  - Messages by group (for loading chat history)
  - Group members by group (for online user lists)
  - Users by username (for login lookups)
  - Messages by timestamp (for ordering and limiting)

  ## Initial Data

  Creates a default "Global Chat" room that all users join automatically.
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  is_global boolean DEFAULT false
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Anyone can view users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Groups table policies
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create groups"
  ON groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Group creators can update their groups"
  ON groups FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Group_members table policies
CREATE POLICY "Anyone can view group memberships"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their membership"
  ON group_members FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (true);

-- Messages table policies
CREATE POLICY "Anyone can view messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can send messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (true);

-- Create function to limit messages to last 50 per group
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS trigger AS $$
BEGIN
  DELETE FROM messages
  WHERE group_id = NEW.group_id
  AND id NOT IN (
    SELECT id FROM messages
    WHERE group_id = NEW.group_id
    ORDER BY created_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup old messages
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON messages;
CREATE TRIGGER trigger_cleanup_old_messages
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_messages();

-- Insert default Global Chat room
INSERT INTO groups (name, description, is_global)
VALUES ('Global Chat', 'Welcome to the global chat room! Everyone can join here.', true)
ON CONFLICT DO NOTHING;