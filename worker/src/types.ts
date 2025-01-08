export interface Env {
    DB: D1Database;
    MEDIA_BUCKET: R2Bucket;
    POST_IMAGES: R2Bucket;
    ENVIRONMENT: string;
    CLOUDFLARE_DOMAIN: string;
    JWT_SECRET: string;
    ADMIN_USERNAME: string;
    ADMIN_PASSWORD: string;
    WEBSOCKET_HANDLER: DurableObjectNamespace;
  }

export type SiteConfigHandler = {
  getSiteConfig(request: Request, env: Env): Promise<Response>;
  updateSiteConfig(request: Request, env: Env): Promise<Response>;
} 


interface SiteConfig {
  title: string;
  description: string;
  nav_links: Record<string, number>;
  about_description: string | null;
  about_sections: Array<{
    title: string;
    visible: number;
    content: any;
  }>;
  about_section_headers: string[];
  about_section_contents: string[];
  contact_description: string | null;
  contact_email: string | null;
  contact_email_visible: number;
  contact_discord_handle: string | null;
  contact_discord_url: string | null;
  contact_discord_visible: number;
  contact_instagram_handle: string | null;
  contact_instagram_url: string | null;
  contact_instagram_visible: number;
  pics_description: string | null;
}

interface MediaMetadata {
  description: string | null;
  show_description: number;
}

export interface Media {
    id: number;
    filename: string;
    r2_key: string;
    content_type: string;
    hash: string;
    mime_type: string;
    size: number;
    published: boolean;
    show_in_blog: boolean;
    show_in_pics: boolean;
    text_description: string | null;
    text_description_visible: number;
    
    // Image formats
    avif_url: string | null;
    webp_url: string | null;
    original_url: string | null;
    
    // Dimensions
    width: number | null;
    height: number | null;
    aspect_ratio: number | null;
    
    // EXIF data
    camera_make: string | null;
    camera_model: string | null;
    focal_length: string | null;
    exposure: string | null;
    aperture: string | null;
    iso: string | null;
    taken_at: string | null;
    gps_latitude: number | null;
    gps_longitude: number | null;
    gps_altitude: number | null;
    
    created_at: string;
}

export interface MediaInput {
    // ... existing fields ...
    text_description?: string | null;
    text_description_visible?: number;
} 