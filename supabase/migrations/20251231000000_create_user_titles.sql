-- Create user titles table
CREATE TABLE IF NOT EXISTS user_titles (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title VARCHAR(50) NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, title)
);

-- Create available titles table
CREATE TABLE IF NOT EXISTS available_titles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default titles
INSERT INTO available_titles (name, display_name, color, price, description) VALUES
  ('owner', 'OWNER', '#ffd700', 0, 'Site owner - Cannot be purchased'),
  ('admin', 'ADMIN', '#ef4444', 0, 'Administrator - Cannot be purchased'),
  ('sponsor', 'SPONSOR', '#8b5cf6', 500, 'Support the platform as a sponsor'),
  ('vip', 'VIP', '#ec4899', 300, 'VIP member with exclusive perks'),
  ('pro', 'PRO', '#3b82f6', 200, 'Professional member'),
  ('supporter', 'SUPPORTER', '#10b981', 100, 'Community supporter');

CREATE INDEX idx_user_titles_user ON user_titles(user_id);
