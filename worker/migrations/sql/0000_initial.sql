-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_posts_published;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_media_filename;
DROP INDEX IF EXISTS idx_media_created_at;
DROP INDEX IF EXISTS idx_media_hash;
DROP INDEX IF EXISTS idx_post_images_post_id;
DROP INDEX IF EXISTS idx_post_images_r2_key;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS site_config;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS _migrations;

-- Create migrations table
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table with rich text support
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    markdown_content TEXT,
    html_content TEXT,
    metadata JSON,
    slug TEXT UNIQUE,
    published BOOLEAN DEFAULT false,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create post_images table for tracking images within posts
CREATE TABLE IF NOT EXISTS post_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    hash TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create media table
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    r2_key TEXT UNIQUE,
    content_type TEXT,
    hash TEXT UNIQUE,
    mime_type TEXT,
    size INTEGER,
    published BOOLEAN DEFAULT FALSE,
    show_in_blog BOOLEAN DEFAULT FALSE,
    show_in_pics BOOLEAN DEFAULT FALSE,
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash);
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_r2_key ON post_images(r2_key);

-- Add index for hash lookups
CREATE INDEX IF NOT EXISTS idx_post_images_hash ON post_images(hash);

-- Insert default site config
INSERT OR REPLACE INTO site_config (id, title, description, nav_links) 
VALUES (
    1,
    'refact0r',
    'hey there! i''m a student interested in comp sci, web dev, design, and more.',
    '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}'
);

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0000_initial');