-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_posts_published;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_media_filename;
DROP INDEX IF EXISTS idx_media_created_at;
DROP INDEX IF EXISTS idx_media_hash;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS site_config;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS _migrations;

-- Create migrations table
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    slug TEXT UNIQUE,
    published BOOLEAN DEFAULT false,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create media table
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    hash TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    published_at DATETIME,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create site_config table
CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'refact0r',
    description TEXT NOT NULL DEFAULT 'hey there! i''m a student interested in comp sci, web dev, design, and more.',
    nav_links TEXT DEFAULT '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash);

-- Insert default site config (only if it doesn't exist)
INSERT OR REPLACE INTO site_config (id, title, description, nav_links) 
VALUES (
    1,
    'refact0r',
    'hey there! i''m a student interested in comp sci, web dev, design, and more.',
    '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}'
);

-- Record this migration (only if it hasn't been recorded)
INSERT OR REPLACE INTO _migrations (name) VALUES ('0000_initial');