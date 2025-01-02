CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    slug TEXT UNIQUE,
    published BOOLEAN DEFAULT false,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_slug ON posts(slug);

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_media_filename ON media(filename);
CREATE INDEX idx_media_created_at ON media(created_at);