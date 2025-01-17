import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { WebSocketMessage } from './websocket';
import { websocket } from './websocket';
import type { SiteConfig, Post, PicsItem } from './types';

// Create base stores with proper types
export const siteConfig = writable<SiteConfig | null>(null);
export const posts: Writable<Post[]> = writable([]);
export const pics: Writable<PicsItem[]> = writable([]);

// Store manager to handle initialization and updates
class StoreManager {
  private initialized = false;

  constructor() {
    // Don't initialize in constructor to avoid SSR issues
  }

  init(): void {
    if (!browser) return;

//    if (this.initialized) {
//      console.log('🔄 Store already initialized, skipping');
//      return;
//    }

    this.initWebSocket();
    this.initialized = true;
  }

  private initWebSocket(): void {
    if (!browser) return;
    
    // Use the singleton websocket instance
    websocket.onMessage = (message: WebSocketMessage) => {
      // Only handle store-related messages
      switch (message.type) {
        case 'SITE_CONFIG_UPDATE':
          this.handleSiteConfigUpdate(message.data);
          break;
        case 'POSTS_UPDATE':
          this.handlePostsUpdate(message.data);
          break;
        case 'POST_CREATE':
          this.handlePostCreate(message.data);
          break;
        case 'PICS_UPDATE':
          this.handlePicsUpdate(message.data);
          break;
        case 'PICS_DELETE':
          this.handlePicsDelete(message.data);
          break;
        case 'ANIMATION_SCALE_UPDATE':
          this.handleAnimationScaleUpdate(message.data);
          break;
      }
    };

    // Connect using the singleton instance
    websocket.connect();
  }

  private handleSiteConfigUpdate(data: SiteConfig): void {
    siteConfig.set(data);
  }

  private handleAnimationScaleUpdate(data: { scale_factor: number }): void {
    siteConfig.update(config => {
      if (config) {
        return {
          ...config,
          lottie_animation_scale: data.scale_factor
        };
      }
      return config;
    });
  }

  private handlePostsUpdate(data: { posts: Post[] }): void {
    posts.set(data.posts);
  }

  private handlePostCreate(data: Post): void {
    posts.update(currentPosts => [data, ...currentPosts]);
  }

  private handlePicsUpdate(data: { pics: PicsItem[] }): void {
    pics.set(data.pics);
  }

  private handlePicsDelete(data: { id: string }): void {
    pics.update(items => items.filter(item => item.id !== data.id));
  }
}

// Create and export store manager instance
export const storeManager = new StoreManager(); 