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
DROP TABLE IF EXISTS animations;
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
    published BOOLEAN DEFAULT 0,
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
    published BOOLEAN DEFAULT 0,
    show_in_blog BOOLEAN DEFAULT 0,
    show_in_pics BOOLEAN DEFAULT 0,
    text_description TEXT,
    text_description_visible INTEGER DEFAULT 0,
    
    -- Basic image formats
    avif_url TEXT,
    webp_url TEXT,
    original_url TEXT,
    
    -- Dimensions
    width INTEGER,
    height INTEGER,
    aspect_ratio REAL,
    
    -- EXIF data
    camera_make TEXT,
    camera_model TEXT,
    focal_length TEXT,
    exposure TEXT,
    aperture TEXT,
    iso TEXT,
    taken_at DATETIME,
    gps_latitude REAL,
    gps_longitude REAL,
    gps_altitude REAL,
    
    -- Color information
    dominant_color TEXT,        -- Hex color code
    color_palette TEXT,         -- JSON array of hex colors
    
    -- Technical metadata
    file_size INTEGER,         -- in bytes
    compression_ratio REAL,    -- original/compressed size
    quality INTEGER,           -- compression quality used
    
    -- Organization
    tags TEXT,                 -- JSON array of tags
    category TEXT,             -- e.g., 'landscape', 'portrait'
    sequence_order INTEGER,    -- for manual ordering
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Create and populate animations table
CREATE TABLE IF NOT EXISTS animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    r2_key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for animations
CREATE INDEX IF NOT EXISTS idx_animations_name ON animations(name);
CREATE INDEX IF NOT EXISTS idx_animations_r2_key ON animations(r2_key);

-- Insert all default animations
INSERT INTO animations (name, r2_key) VALUES 
    ('default-pin', 'animations/default-pin.json');

-- Create site_config table with default animation reference
CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    nav_links JSON DEFAULT '{}',
    lottie_animation TEXT,        -- Store the selected animation name
    lottie_animation_r2_key TEXT, -- Store the R2 key for the selected animation
    about_description TEXT,
    about_section_headers JSON DEFAULT '[]',  -- Array of section headers
    about_section_contents JSON DEFAULT '[]',  -- Array of matching section contents
    contact_description TEXT,
    contact_email TEXT,
    contact_email_visible INTEGER DEFAULT 0,
    contact_discord_handle TEXT,
    contact_discord_url TEXT,
    contact_discord_visible INTEGER DEFAULT 0,
    contact_instagram_handle TEXT,
    contact_instagram_url TEXT,
    contact_instagram_visible INTEGER DEFAULT 0,
    pics_description TEXT,
    FOREIGN KEY (lottie_animation) REFERENCES animations(name) ON DELETE SET NULL
);

-- Insert default site config with animation reference
INSERT OR REPLACE INTO site_config (
    id, 
    title, 
    description, 
    nav_links,
    lottie_animation,
    lottie_animation_r2_key,
    about_description,
    about_section_headers,
    about_section_contents,
    contact_description,
    contact_email,
    contact_email_visible,
    contact_discord_handle,
    contact_discord_url,
    contact_discord_visible,
    contact_instagram_handle,
    contact_instagram_url,
    contact_instagram_visible,
    pics_description
) VALUES (
    1,
    'Your Site Title',
    'A brief description of what you do',
    '{"projects":0,"blog":1,"pics":1,"about":1,"contact":1}',
    'default-pin',
    'animations/default-pin.json',
    'Welcome to my about page! Here''s where you can share your story.',
    '[{"title":"About Me","visible":true},{"title":"What I Do","visible":true}]',
    '[
        {"content":{"text":"Tell your visitors about yourself...","visible":true}},
        {"content":{"text":"Share your passions and interests...","visible":true}}
    ]',
    'Get in touch! Here''s where you can find me:',
    'your.email@example.com',
    1,
    'username#1234',
    'https://discord.gg/example',
    1,
    'username',
    'https://instagram.com/username',
    1,
    'A collection of captured moments and memories.'
);

-- Create a new table for picture descriptions
CREATE TABLE IF NOT EXISTS media_metadata (
    media_id INTEGER PRIMARY KEY,
    description TEXT,
    show_description INTEGER DEFAULT 0,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
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

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_media_taken_at ON media(taken_at);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media(tags);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0000_initial');