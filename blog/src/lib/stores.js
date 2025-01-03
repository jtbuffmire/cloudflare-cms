// dynamic site config that updates upon web socket events
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { wsClient } from './websocket';

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
    projects: true,
    blog: true,
    pics: true,
    about: true,
    contact: true
}
});

// Posts store
export const posts = writable([]);

// Only run on the client side
if (browser) {
    console.log('🔄 Fetching initial site config...');
    fetch('http://localhost:8787/api/site/config')
        .then(res => res.json())
        .then(data => {
            console.log('📝 Loaded initial site config:', data);
            siteConfig.set(data);
        })
        .catch(err => console.error('❌ Failed to load site config:', err));

    console.log('🔄 Fetching posts from API...');
    fetch('http://localhost:8787/api/posts')
        .then(res => {
            console.log('📝 API Response status:', res.status);
            return res.json();
        })
        .then(response => {
            console.log('🗄️ Raw API response:', response);
            console.log('🗄️ Response type:', typeof response);
            console.log('🗄️ Has posts?', 'posts' in response);
            
            const data = response.posts || [];
            console.log('📝 Posts array:', data);
            
            const formattedPosts = data.map(post => ({
                slug: post.slug,
                name: post.title,
                date: post.created_at,
                description: post.content.substring(0, 150) + '...',
                icon: post.icon || 'ph:pencil-simple',
                published: Boolean(post.published)
            }));
            console.log('📝 Formatted posts:', formattedPosts);
            posts.set(formattedPosts);
        })
        .catch(err => console.error('❌ Failed to load posts:', err));

    // Subscribe to WebSocket updates
    wsClient.subscribe('SITE_CONFIG_UPDATE', (data) => {
        console.log('🔄 Updating site config from WebSocket:', data);
        siteConfig.set(data);
    });

    // Subscribe to WebSocket updates
    wsClient.subscribe('POSTS_UPDATE', (data) => {
        console.log('🔄 Updating posts from WebSocket:', data);
        const formattedPosts = (data.posts || []).map(post => ({
            slug: post.slug,
            name: post.title,
            date: post.created_at,
            description: post.content.substring(0, 150) + '...',
            icon: post.icon || 'ph:pencil-simple',
            published: Boolean(post.published)
        }));
        posts.set(formattedPosts);
    });
}