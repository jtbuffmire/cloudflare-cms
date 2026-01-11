-- Migration: 0001_add_projects_table

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  url TEXT,
  github_url TEXT,
  tech_stack TEXT,
  published INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(domain, created_at);

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0002_add_projects_table');