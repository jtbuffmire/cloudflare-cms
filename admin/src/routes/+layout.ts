import { wsClient } from '$lib/websocket';
import { invalidate } from '$app/navigation';
import { browser } from '$app/environment';

export const ssr = false;

if (browser) {
    wsClient.subscribe('POSTS_UPDATE', async (data) => {
        console.log('📝 Admin: Received posts update:', data);
        // Invalidate the posts data to trigger a refresh
        await invalidate('app:posts');
    });

    wsClient.subscribe('SITE_CONFIG_UPDATE', async (data) => {
        // console.log('⚙️ Admin: Received site config update:', data);
        await invalidate('app:config');
    });
}

export function load() {
    return {
        meta: {
            title: 'Admin',
            description: 'Site administration'
        }
    };
} 