function formatConfig(config) {
    return {
        title: config.title || 'mealz on wheels',
        description: config.description || "a travelin girl.",
        nav_links: Object.fromEntries(
            Object.entries(config.nav_links || {}).map(([key, value]) => [
                key,
                typeof value === 'boolean' ? (value ? 1 : 0) : value
            ])
        ),
        about_description: config.about_description || null,
        about_section_headers: config.about_section_headers ? 
            (typeof config.about_section_headers === 'string' ? 
                JSON.parse(config.about_section_headers) : config.about_section_headers) 
            : [],
        about_section_contents: config.about_section_contents ? 
            (typeof config.about_section_contents === 'string' ? 
                JSON.parse(config.about_section_contents) : config.about_section_contents) 
            : [],
        contact_description: config.contact_description || null,
        contact_email: config.contact_email || null,
        contact_email_visible: Number(config.contact_email_visible || 0),
        contact_discord_handle: config.contact_discord_handle || null,
        contact_discord_url: config.contact_discord_url || null,
        contact_discord_visible: Number(config.contact_discord_visible || 0),
        contact_instagram_handle: config.contact_instagram_handle || null,
        contact_instagram_url: config.contact_instagram_url || null,
        contact_instagram_visible: Number(config.contact_instagram_visible || 0),
        pics_description: config.pics_description || null
    };
}

function formatPost(post) {
    // First parse metadata if it's a string
    const metadata = typeof post.metadata === 'string' 
        ? JSON.parse(post.metadata) 
        : post.metadata || {};
        
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        name: post.title,
        date: post.published_at || post.created_at,
        description: metadata.description || 
                   post.content?.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
        icon: metadata.icon || 'ph:pencil-simple',
        content: post.content,
        markdown_content: post.markdown_content,
        html_content: post.html_content,
        metadata: metadata,
        published: post.published === 1
    };
}

// Handle WebSocket messages
export function handleMessage(message) {
    // console.log('📨 Received message:', message);
    
    switch (message.type) {
        case 'SITE_CONFIG_UPDATE':
            // Format the config before setting it
            const formattedConfig = formatConfig(message.data.config);
            console.log('📝 Formatted config:', formattedConfig);
            siteConfig.set(formattedConfig);
            break;
            
        case 'POSTS_UPDATE':
            // Ensure posts is an array before formatting
            const postsArray = Array.isArray(message.data.posts) ? message.data.posts : [];
            const formattedPosts = postsArray.map(formatPost);
            console.log('📝 Transformed posts:', formattedPosts);
            posts.set(formattedPosts);
            break;
            
        case 'MEDIA_UPDATE':
            // Ensure media is an array
            const mediaArray = Array.isArray(message.data.media) ? message.data.media : [];
            media.set(mediaArray);
            break;
            
        default:
            console.log('⚠️ Unknown message type:', message.type);
    }
}