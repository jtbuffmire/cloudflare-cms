-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_posts_published;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_pics_filename;
DROP INDEX IF EXISTS idx_pics_created_at;
DROP INDEX IF EXISTS idx_pics_hash;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS site_config;
DROP TABLE IF EXISTS pics;
DROP TABLE IF EXISTS pics_metadata;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS animations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS _migrations;

-- Create migrations table
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for multi-tenancy
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    domain TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, domain)
);

-- Create posts table with rich text support
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    markdown_content TEXT,
    html_content TEXT,
    metadata JSON,
    slug TEXT,
    published BOOLEAN DEFAULT false,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, slug)
);

-- Create pics table
CREATE TABLE IF NOT EXISTS pics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT,
    content_type TEXT,
    hash TEXT,
    mime_type TEXT,
    size INTEGER,
    published BOOLEAN DEFAULT false,
    show_in_blog BOOLEAN DEFAULT false,
    show_in_pics BOOLEAN DEFAULT false,
    text_description TEXT,
    text_description_visible INTEGER DEFAULT false,
    
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
    updated_at DATETIME,
    UNIQUE(domain, r2_key),
    UNIQUE(domain, hash)
);

-- Create and populate animations table
CREATE TABLE IF NOT EXISTS animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    scale_factor INTEGER DEFAULT 100,
    size_bytes INTEGER,
    hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, name),
    UNIQUE(domain, r2_key),
    UNIQUE(domain, hash)
);

-- Create site_config table with default animation reference
CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
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
    contact_email_visible BOOLEAN DEFAULT false,
    contact_discord_handle TEXT,
    contact_discord_url TEXT,
    contact_discord_visible BOOLEAN DEFAULT false,
    contact_instagram_handle TEXT,
    contact_instagram_url TEXT,
    contact_instagram_visible BOOLEAN DEFAULT false,
    pics_description TEXT,
    web3forms_key TEXT,
    FOREIGN KEY (domain, lottie_animation) REFERENCES animations(domain, name) ON DELETE SET NULL
);

-- Create a new table for picture descriptions
CREATE TABLE IF NOT EXISTS pics_metadata (
    pics_id INTEGER PRIMARY KEY,
    domain TEXT NOT NULL,
    description TEXT,
    show_description INTEGER DEFAULT false,
    FOREIGN KEY (pics_id) REFERENCES pics(id) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email_domain ON users(email, domain);
CREATE INDEX IF NOT EXISTS idx_posts_domain ON posts(domain);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(domain, published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(domain, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(domain, slug);
CREATE INDEX IF NOT EXISTS idx_pics_domain ON pics(domain);
CREATE INDEX IF NOT EXISTS idx_pics_filename ON pics(domain, filename);
CREATE INDEX IF NOT EXISTS idx_pics_created_at ON pics(domain, created_at);
CREATE INDEX IF NOT EXISTS idx_pics_hash ON pics(domain, hash);
CREATE INDEX IF NOT EXISTS idx_animations_domain ON animations(domain);
CREATE INDEX IF NOT EXISTS idx_animations_name ON animations(domain, name);
CREATE INDEX IF NOT EXISTS idx_animations_r2_key ON animations(domain, r2_key);
CREATE INDEX IF NOT EXISTS idx_animations_hash ON animations(domain, hash);
CREATE INDEX IF NOT EXISTS idx_pics_taken_at ON pics(domain, taken_at);
CREATE INDEX IF NOT EXISTS idx_pics_tags ON pics(domain, tags);
CREATE INDEX IF NOT EXISTS idx_pics_category ON pics(domain, category);

-- Insert default users
INSERT INTO users (id, email, password, domain, role) 
VALUES 
    ('usr_default_localhost', 'admin@localhost', 'password', 'localhost', 'admin'),
    ('usr_default_buffmire', 'admin@buffmire.com', 'CHANGE_THIS_PASSWORD', 'buffmire.com', 'admin'),
    ('usr_default_mealsonwheels', 'admin@mealsonwheels.com', 'CHANGE_THIS_PASSWORD', 'mealsonwheels.com', 'admin');

-- Insert default animations for each domain
INSERT INTO animations (domain, name, r2_key, scale_factor) VALUES 
    ('buffmire.com', 'default-pin', 'animations/default-pin.json', 100),
    ('mealsonwheels.com', 'default-pin', 'animations/default-pin.json', 100),
    ('localhost', 'default-pin', 'animations/default-pin.json', 100);

-- Insert default site config for each domain
INSERT INTO site_config (
    domain,
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
    pics_description,
    web3forms_key
) VALUES 
-- Localhost config
(
    'localhost',
    'Local Development Site',
    'Development and testing environment',
    '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}',
    'default-pin',
    'animations/default-pin.json',
    'Welcome to the development site',
    '[{"title":"Test Section 1","visible":true},{"title":"Test Section 2","visible":true}]',
    '[
        {"content":{"text":"Test content 1","visible":true}},
        {"content":{"text":"Test content 2","visible":true}}
    ]',
    'Development contact section',
    'admin@localhost',
    1,
    'test#1234',
    'https://discord.gg/test',
    1,
    'test',
    'https://instagram.com/test',
    1,
    'Development Picture gallery',
    ''
),
-- Buffmire.com config
(
    'buffmire.com',
    'Buffmire',
    'A brief description of what you do',
    '{"projects":false,"blog":true,"pics":false,"about":true,"contact":true}',
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
    'A collection of captured moments and memories.',
    ''
),
-- Meals on Wheels config
(
    'mealsonwheels.com',
    'Meals on Wheels',
    'Delivering meals and hope',
    '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}',
    'default-pin',
    'animations/default-pin.json',
    'Welcome to Meals on Wheels! Here''s our story.',
    '[{"title":"About Us","visible":true},{"title":"Our Mission","visible":true}]',
    '[
        {"content":{"text":"We are dedicated to serving our community...","visible":true}},
        {"content":{"text":"Our mission is to ensure no one goes hungry...","visible":true}}
    ]',
    'Get in touch! Here''s how you can reach us:',
    'contact@mealsonwheels.com',
    1,
    'mealsonwheels#1234',
    'https://discord.gg/mealsonwheels',
    1,
    'mealsonwheels',
    'https://instagram.com/mealsonwheels',
    1,
    'See the impact we make every day.',
    ''
);

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0000_initial');