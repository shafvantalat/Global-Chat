/*
  # Create banned usernames table

  ## Changes

  1. New Tables
    - `banned_usernames`
      - `id` (uuid, primary key)
      - `username` (text, unique) - The banned username pattern
      - `reason` (text, optional) - Reason for banning
      - `created_at` (timestamp) - When it was added
      - `created_by` (uuid, optional) - Admin who added it

  2. Security
    - Enable RLS on `banned_usernames` table
    - Public can read (needed for signup validation)
    - Only authenticated users can check existence
    - No insert/update/delete via client (must be done via SQL or admin tools)

  ## Notes
  - Usernames are stored in lowercase for case-insensitive matching
  - Supports wildcard patterns using LIKE syntax
*/

CREATE TABLE IF NOT EXISTS banned_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE banned_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read banned usernames for validation"
  ON banned_usernames
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_banned_usernames_username ON banned_usernames(username);

INSERT INTO banned_usernames (username, reason) VALUES
  ('nigger', 'Racial slur'),
  ('nigga', 'Racial slur'),
  ('faggot', 'Homophobic slur'),
  ('retard', 'Ableist slur'),
  ('admin', 'Reserved name'),
  ('moderator', 'Reserved name'),
  ('system', 'Reserved name'),
  ('support', 'Reserved name')
ON CONFLICT (username) DO NOTHING;