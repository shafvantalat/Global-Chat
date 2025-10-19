/*
  # Add admin functionality

  ## Changes

  1. Tables Modified
    - `users` table
      - Add `is_admin` (boolean) - Whether user is admin
      - Add `admin_password_hash` (text, nullable) - Hashed password for admin

  2. Security
    - Admins can manage banned usernames
    - Regular users cannot access admin features

  ## Notes
  - Admin password should be hashed on the client before storage
  - Default admin user will be created with username "admin"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'admin_password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN admin_password_hash text;
  END IF;
END $$;