import { writable } from 'svelte/store';
import { WebSocketClient } from './websocket';

const isBrowser = typeof window !== 'undefined';

// Create base stores
export const siteConfig = writable({});
export const posts = writable([]);
export const media = writable([]);
export const animations = writable([]);

// Add a subscribe to log changes
siteConfig.subscribe(value => {
    // console.log('💾 Store value updated:', value);
});

// Store manager to handle initialization and updates
class StoreManager {
    constructor() {
        this.initialized = false;
        this.ws = null;
    }

    init(initialData) {
        if (this.initialized) {
            console.log('🔄 Store already initialized, skipping');
            return;
        }

        // Set initial data
        if (initialData.siteConfig) {
            siteConfig.set(initialData.siteConfig);
        }
        if (initialData.media) {
            media.set(initialData.media);
        }
        if (initialData.posts?.posts) {
            posts.set(initialData.posts.posts);
        }
        if (initialData.animations) {
            animations.set(initialData.animations);
        }

        // Only initialize WebSocket in browser
        if (isBrowser) {
            this.initWebSocket();
        }
        
        this.initialized = true;
    }

    initWebSocket() {
        if (!isBrowser) return;
        console.log('🔌 Initializing WebSocket');
        this.ws = new WebSocketClient();
        
        this.ws.subscribe('SITE_CONFIG_UPDATE', message => {
            // Parse the message if it's a string
            const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
            // console.log('📡 Received config update:', parsedMessage);
            
            // Check for the nested data structure
            if (parsedMessage?.data) {
                const newData = parsedMessage.data;
                console.log('📡 Setting new config with transformed about sections');
                siteConfig.set({
                    ...newData,
                    about_sections: newData.about_sections?.map(s => ({
                        title: s.title,
                        visible: s.visible,
                        content: { text: s.content }
                    })) || []
                });
            } else if (parsedMessage) {
                // Fallback for direct config updates
                const newData = parsedMessage;
                console.log('📡 New config');
                siteConfig.set({
                    ...newData,
                    about_sections: newData.about_sections?.map(s => ({
                        title: s.title,
                        visible: s.visible,
                        content: { text: s.content }
                    })) || []
                });
            }
        });

        this.ws.subscribe('POSTS_UPDATE', ({ posts: newPosts }) => {
            console.log('📨 Received posts update:', newPosts);
            posts.set(newPosts);
        });

        // MEDIA CRUD
        this.ws.subscribe('MEDIA_UPDATE', updatedItem => {
            console.log('📡 Received MEDIA_UPDATE:', updatedItem);
            media.update(files => 
                files.map(f => f.id === updatedItem.id ? updatedItem : f)
            );
        });
        this.ws.subscribe('MEDIA_DELETE', deleted => {
            media.update(files => 
                files.filter(f => f.id !== deleted.id)
            );
        });
        this.ws.subscribe('MEDIA_CREATE', newItem => {
            console.log('📡 Received MEDIA_CREATE:', newItem);
            media.update(files => {
                const newFiles = [...files, newItem];
                // console.log('📡 Updated media store with new item:', newFiles);
                return newFiles;
            });
        });
  

        this.ws.subscribe('ANIMATIONS_UPDATE', ({ animations: newAnimations }) => {
            animations.set(newAnimations);
        });

        // Add a debug subscription to the media store
        media.subscribe(value => {
            // console.log('💾 Media store updated:', value);
        });
    }
}

export const storeManager = new StoreManager();


