import { writable, type Writable } from 'svelte/store';
import { WebSocketClient } from './websocket';
import { WS_BASE } from './config';

const isBrowser = typeof window !== 'undefined';

// Define interfaces for our data structures
interface AboutSection {
  title: string;
  visible: boolean;
  content: { text: string };
}

export interface SiteConfig {
  id?: number;
  domain: string;
  site_domain: string;
  title: string;
  description: string;
  nav_links: Record<string, boolean>;
  lottie_animation: string;
  lottie_animation_r2_key?: string | null;
  scale_factor?: number;
  about_description: string;
  about_sections: Array<{
    title: string;
    visible: boolean;
    content: string;
  }>;
  pics_description: string;
  contact_description: string;
  contact_email: string;
  contact_discord_handle: string;
  contact_discord_url: string;
  contact_instagram_url: string;
  contact_instagram_handle: string;
  web3forms_key: string;
  show_email: boolean;
  show_discord: boolean;
  show_instagram: boolean;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  metadata: string | {
    description?: string;
    [key: string]: any;
  };
  domain: string;
  show_date?: boolean;
}

export interface PicsItem {
  id: string;
  url: string;
  avif_url?: string;
  webp_url?: string;
  width: number;
  height: number;
  published: boolean;
  show_in_pics: boolean;
  text_description?: string;
  text_description_visible?: boolean;
  domain: string;
}

export interface Animation {
  id: string;
  name: string;
  data: any;
  domain: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AnimationsResponse {
  animations: Animation[];
}

// Update the WebSocketClient interface to match our implementation
interface WebSocketMessage {
    type: string;
    data: any;
    domain?: string;
    sessionCount?: number;
}

// Create base stores with proper types
export const domain: Writable<string> = writable('');
export const siteConfig = writable<SiteConfig>({
  domain: '',
  site_domain: '',
  title: '',
  description: '',
  nav_links: {
    projects: false,
    blog: true,
    pics: false,
    about: true,
    contact: true
  },
  lottie_animation: 'default',
  lottie_animation_r2_key: null,
  about_description: '',
  about_sections: [],
  pics_description: '',
  contact_description: '',
  contact_email: '',
  contact_discord_handle: '',
  contact_discord_url: '',
  contact_instagram_url: '',
  contact_instagram_handle: '',
  web3forms_key: '',
  show_email: false,
  show_discord: false,
  show_instagram: false
});
export const posts: Writable<Post[]> = writable([]);
export const pics: Writable<PicsItem[]> = writable([]);
export const animations: Writable<Animation[]> = writable([]);

export interface Project {
    id?: number;
    domain?: string;
    name: string;
    description: string;
    thumbnail: string;
    images: string[];
    github?: string;
    website?: string;
    content: string;
    published: boolean;
    slug: string;
    created_at?: string;
}

// Add to the existing store or create a new one
export const projects = writable<Project[]>([]);

// Store manager to handle initialization and updates
class StoreManager {
  private ws: WebSocketClient | null = null;
  private initialized = false;
  private currentDomain = '';

  constructor() {
    if (isBrowser && !this.initialized) {
      this.currentDomain = window.location.hostname;
      domain.set(this.currentDomain);
      this.initWebSocket();
      this.initialized = true;
    }
  }

  init(initialData?: {
    siteConfig?: SiteConfig;
    posts?: PostsResponse;
    pics?: PicsItem[];
    animations?: AnimationsResponse;
  }): void {
    if (!initialData) return;

    // Set initial data immediately
    if (initialData.siteConfig) {
      siteConfig.set(initialData.siteConfig);
    }
    if (initialData.posts?.posts) {
      posts.set(initialData.posts.posts);
    }
    if (initialData.pics) {
      pics.set(initialData.pics);
    }
    if (initialData.animations?.animations) {
      animations.set(initialData.animations.animations);
    }
  }

  private initWebSocket(): void {
    const wsUrl = `${WS_BASE}/ws?domain=${this.currentDomain}`;
    console.log('🔌 Initializing WebSocket with URL:', wsUrl);
    
    this.ws = new WebSocketClient(wsUrl);
    
    // Handle incoming WebSocket messages and update stores
    this.ws.onMessage = (message: WebSocketMessage) => {
      console.log('📨 WebSocket message received:', message.type, message);
      
      switch (message.type) {
        case 'connected':
          console.log('✅ WebSocket connected, session count:', message.sessionCount);
          break;
          
        case 'pong':
          // Heartbeat response, no action needed
          break;
          
        case 'SITE_CONFIG_UPDATE':
          console.log('🔄 Updating site config from WebSocket');
          if (message.data) {
            siteConfig.set(message.data);
          }
          break;
          
        case 'BASIC_INFO_UPDATE':
          console.log('🔄 Updating basic info from WebSocket');
          if (message.data) {
            siteConfig.update(config => ({
              ...config,
              title: message.data.title ?? config.title,
              description: message.data.description ?? config.description
            }));
          }
          break;
          
        case 'ANIMATION_SCALE_UPDATE':
          console.log('🔄 Updating animation scale from WebSocket');
          if (message.data?.scale_factor !== undefined) {
            siteConfig.update(config => ({
              ...config,
              scale_factor: message.data.scale_factor
            }));
          }
          break;
          
        case 'POSTS_UPDATE':
          console.log('🔄 Updating posts from WebSocket');
          if (message.data?.posts) {
            posts.set(message.data.posts);
          }
          break;
          
        case 'POST_UPDATE':
          console.log('🔄 Updating single post from WebSocket');
          if (message.data) {
            posts.update(currentPosts => {
              const index = currentPosts.findIndex(p => p.id === message.data.id);
              if (index >= 0) {
                currentPosts[index] = message.data;
                return [...currentPosts];
              }
              return currentPosts;
            });
          }
          break;
          
        case 'POST_CREATE':
          console.log('🔄 Adding new post from WebSocket');
          if (message.data) {
            posts.update(currentPosts => [message.data, ...currentPosts]);
          }
          break;
          
        case 'POST_DELETE':
          console.log('🔄 Deleting post from WebSocket');
          if (message.data?.id) {
            posts.update(currentPosts => 
              currentPosts.filter(p => p.id !== message.data.id)
            );
          }
          break;
          
        case 'PICS_UPDATE':
          console.log('🔄 Updating pics from WebSocket');
          if (message.data?.pics) {
            pics.set(message.data.pics);
          }
          break;
          
        case 'PICS_CREATE':
          console.log('🔄 Adding new pic from WebSocket');
          if (message.data) {
            pics.update(currentPics => [message.data, ...currentPics]);
          }
          break;
          
        case 'PICS_DELETE':
          console.log('🔄 Deleting pic from WebSocket');
          if (message.data?.id) {
            pics.update(currentPics => 
              currentPics.filter(p => p.id !== message.data.id)
            );
          }
          break;
          
        case 'PICS_METADATA_UPDATE':
          console.log('🔄 Updating pic metadata from WebSocket');
          if (message.data?.id) {
            pics.update(currentPics => {
              const index = currentPics.findIndex(p => p.id === message.data.id);
              if (index >= 0) {
                currentPics[index] = { ...currentPics[index], ...message.data };
                return [...currentPics];
              }
              return currentPics;
            });
          }
          break;
          
        case 'PICS_CLEANUP':
          // Cleanup message - just log it
          console.log('🧹 Pics cleanup notification:', message.data);
          break;
          
        case 'ANIMATIONS_UPDATE':
          console.log('🔄 Updating animations from WebSocket');
          if (message.data?.animations) {
            animations.set(message.data.animations);
          }
          break;
          
        case 'project_created':
          console.log('🔄 Adding new project from WebSocket');
          if (message.data) {
            projects.update(currentProjects => [message.data, ...currentProjects]);
          }
          break;
          
        case 'project_updated':
          console.log('🔄 Updating project from WebSocket');
          if (message.data) {
            projects.update(currentProjects => {
              const index = currentProjects.findIndex(p => p.id === message.data.id);
              if (index >= 0) {
                currentProjects[index] = message.data;
                return [...currentProjects];
              }
              return currentProjects;
            });
          }
          break;
          
        case 'project_deleted':
          console.log('🔄 Deleting project from WebSocket');
          if (message.data?.id) {
            projects.update(currentProjects => 
              currentProjects.filter(p => p.id !== message.data.id)
            );
          }
          break;
          
        case 'error':
          console.error('❌ WebSocket server error:', message.data);
          break;
          
        default:
          console.log('📨 Unknown WebSocket message type:', message.type);
      }
    };
    
    this.ws.connect();
  }
}

// Create and export store manager instance
export const storeManager = new StoreManager(); 