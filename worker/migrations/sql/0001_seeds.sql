-- Insert initial tenant users
INSERT INTO users (id, email, password, domain, role) 
VALUES 
    ('usr_default_buffmire', 'jameson@buffmire.com', 'badpassword', 'buffmire.com', 'admin'),
    ('usr_default_mealsonwheels', 'ameliaqc@gmail.com', 'lovesmustard', 'mealsonwheels.com', 'admin');

-- Insert tenant animations
INSERT INTO animations (domain, name, r2_key) VALUES 
    ('buffmire.com', 'default-pin', 'animations/default-pin.json'),
    ('mealsonwheels.com', 'default-pin', 'animations/default-pin.json');

-- Insert tenant site configs
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
    pics_description
) VALUES 
-- Buffmire.com config
(
    'buffmire.com',
    'Buffmire',
    'A brief description of what you do',
    '{"projects":true,"blog":true,"pics":true,"about":true,"contact":true}',
    'default-pin',
    'animations/default-pin.json',
    'Welcome to my about page! Here''s where you can share your story.',
    '[{"title":"About Me","visible":true},{"title":"What I Do","visible":true}]',
    '[
        {"content":{"text":"Tell your visitors about yourself...","visible":true}},
        {"content":{"text":"Share your passions and interests...","visible":true}}
    ]',
    'Get in touch! Here''s where you can find me:',
    'jameson@buffmire.com',
    1,
    'buffmire#1234',
    'https://discord.gg/buffmire',
    1,
    'buffmire',
    'https://instagram.com/buffmire',
    1,
    'A collection of captured moments and memories.'
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
    'See the impact we make every day.'
);

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0001_seeds'); 