/*
  # Enable Realtime and Add Cleanup Functions

  ## Changes

  1. Enable Realtime for messages table
    - Enables real-time subscriptions for instant message delivery

  2. Add automatic message cleanup function
    - Deletes all messages older than 30 minutes
    - Runs automatically via cron trigger

  3. Add automatic inactive group cleanup function
    - Deletes groups with no activity (no messages) for 30+ minutes
    - Preserves the Global Chat (is_global = true)
    - Runs automatically via cron trigger

  ## Security
  - Maintains existing RLS policies
  - Cleanup functions run with elevated privileges
*/

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Function to cleanup old messages (older than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_messages_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Function to cleanup inactive groups (no messages in 30+ minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_groups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM groups
  WHERE is_global = false
  AND id NOT IN (
    SELECT DISTINCT group_id 
    FROM messages 
    WHERE created_at > NOW() - INTERVAL '30 minutes'
  )
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Create extension for pg_cron if not exists (for scheduled tasks)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every 5 minutes
SELECT cron.schedule(
  'cleanup-old-messages',
  '*/5 * * * *',
  'SELECT cleanup_old_messages_cron();'
);

SELECT cron.schedule(
  'cleanup-inactive-groups',
  '*/5 * * * *',
  'SELECT cleanup_inactive_groups();'
);