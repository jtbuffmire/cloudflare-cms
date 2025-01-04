// dynamic site config that updates upon web socket events
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { wsClient } from './websocket';
import { invalidate } from '$app/navigation';

function formatNavLinks(config) {
    return {
        ...config,
        nav_links: Object.fromEntries(
            Object.entries(config.nav_links || {}).map(([key, value]) => [
                key,
                // Convert boolean to 1/0 when receiving from API
                typeof value === 'boolean' ? (value ? 1 : 0) : value
            ])
        )
    };
}

// Create a writable store with initial empty values
export const siteConfig = writable({
  title: '',
  description: '',
  navigation: [
    { name: 'projects', path: '/projects' },
    { name: 'blog', path: '/blog' },
    { name: 'pics', path: '/pics' },
    { name: 'about', path: '/about' },
    { name: 'contact', path: '/contact' }
  ],      
  nav_links: {
    projects: 1,
    blog: 1,
    pics: 1,
    about: 1,
    contact: 1
}
});

// Posts store
export const posts = writable([]);

// Only run on the client side
if (browser) {
    // Fetch site config
    console.log('🔄 Fetching initial site config...');
    fetch('http://localhost:8787/api/site/config')
        .then(res => res.json())
        .then(data => {
            console.log('📝 Loaded initial site config:', data);
            siteConfig.set(formatNavLinks(data));
        })
        .catch(err => console.error('❌ Failed to load site config:', err));

    // Fetch posts
    console.log('🔄 Fetching posts...');
    fetch('http://localhost:8787/api/posts')
        .then(res => res.json())
        .then(data => {
            const formattedPosts = (data.posts || [])
                .filter(post => post.published === 1)
                .map(formatPost);
            posts.set(formattedPosts);
        })
        .catch(err => console.error('Failed to load posts:', err));

    console.log('🔌 Setting up WebSocket subscriptions...');
    
    // Subscribe to WebSocket updates
    wsClient.subscribe('POSTS_UPDATE', async (data) => {
        console.log('🔄 Received POSTS_UPDATE:', data);
        if (!data.posts) return;

        const formattedPosts = data.posts
            .filter(post => post.published === 1)
            .map(formatPost);

        console.log('📝 Updating posts store with:', formattedPosts);
        posts.set(formattedPosts);
        await invalidate('app:posts');
    });

    wsClient.subscribe('POST_UPDATE', async (data) => {
        console.log('🔄 Single post update from WebSocket:', data);
        await invalidate('app:posts');
    });

    wsClient.subscribe('POST_CREATE', async (data) => {
        console.log('🔄 New post created from WebSocket:', data);
        await invalidate('app:posts');
    });

    wsClient.subscribe('POST_DELETE', async (data) => {
        console.log('🔄 Post deleted from WebSocket:', data);
        await invalidate('app:posts');
    });

    // Site config subscription
    wsClient.subscribe('SITE_CONFIG_UPDATE', async (data) => {
        console.log('🔄 SITE_CONFIG_UPDATE received in store:', data);
        if (!data.config) {
            console.warn('⚠️ No config in data:', data);
            return;
        }
        const formattedConfig = formatNavLinks(data.config);
        console.log('🔍 Formatted config:', formattedConfig);
        console.log('🔍 Current store value:', get(siteConfig));
        siteConfig.set(formattedConfig);
        console.log('🔍 New store value:', get(siteConfig));
        await invalidate('app:config');
    });
}

function formatPost(post) {
    const metadata = typeof post.metadata === 'string' 
        ? JSON.parse(post.metadata) 
        : post.metadata;
        
    return {
        slug: post.slug,
        name: post.title,
        date: post.created_at,
        description: metadata?.description || 
                   post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
        icon: post.icon || 'ph:pencil-simple',
        published: post.published === 1
    };
}