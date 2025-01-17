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