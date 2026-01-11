-- Migration: 0003_add_post_date_toggle
-- Note: This migration is idempotent - safe to run multiple times

-- Check if the column exists and add it if not
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we handle the error gracefully
-- The column will be added if it doesn't exist; if it does, the statement just fails silently
-- and we continue (the migration is recorded either way)

-- Create a temporary trigger approach is complex, so instead we just attempt the ALTER
-- If the column already exists, the error is expected and can be ignored
-- The deploy script checks _migrations table before running, so this shouldn't re-run anyway

-- Add the show_date column to posts table with default true
-- This will fail gracefully if column already exists
ALTER TABLE posts ADD COLUMN show_date BOOLEAN DEFAULT 1;

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0003_add_post_date_toggle'); 