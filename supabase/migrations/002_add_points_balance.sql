-- Add points_balance to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
