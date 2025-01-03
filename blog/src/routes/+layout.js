import { WebSocketClient } from '$lib/websocket';
import { invalidate } from '$app/navigation';

export const ssr = true;
export const prerender = true;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8787/ws';

export const load = ({ url }) => {
    const { pathname } = url;

    // Initialize WebSocket client (only in browser)
    let wsClient;
    if (typeof window !== 'undefined') {
        wsClient = new WebSocketClient(WS_URL, (data) => {
            if (data.type === 'MEDIA_UPDATE' || 
                data.type === 'POST_UPDATE' || 
                data.type === 'POST_CREATE' || 
                data.type === 'POST_DELETE') {
                // Invalidate relevant data
                invalidate('media');
                invalidate('posts');
            }
        });
    }

    return {
        pathname,
        meta: {
            title: 'blog',
            description: 'my website/portfolio/blog.'
        },
        wsClient
    };
};