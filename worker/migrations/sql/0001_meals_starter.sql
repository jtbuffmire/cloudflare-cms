-- Update site config with Meals' content
UPDATE site_config 
SET 
    title = 'mealz on wheels',
    description = 'a travelin girl.',
    nav_links = '{"projects":0,"blog":1,"pics":1,"about":1,"contact":1}',
    about_description = 'Hi! Welcome to my corner of the internet.',
    about_section_headers = '[
        {"title":"I like margaritas","visible":true},
        {"title":"and mai tais","visible":true}
    ]',
    about_section_contents = '[
        {"content":{"text":"When made with pasion.","visible":true}},
        {"content":{"text":"in Maui.","visible":true}}
    ]',
    contact_description = 'I might write back:',
    contact_email = NULL,
    contact_email_visible = 0,
    contact_discord_handle = NULL,
    contact_discord_url = NULL,
    contact_discord_visible = 0,
    contact_instagram_handle = 'mealzonwheels',
    contact_instagram_url = 'https://instagram.com/mealzonwheels',
    contact_instagram_visible = 1,
    pics_description = 'some travel pics.'
WHERE id = 1;

-- Record this migration
INSERT OR REPLACE INTO _migrations (name) VALUES ('0001_meals_starter'); 