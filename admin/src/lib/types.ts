export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  markdown_content?: string;
  html_content?: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  domain?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    coverImage?: string;
    icon?: string;
    [key: string]: any;
  };
}

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
}

export interface PicsItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
  published: boolean;
  show_in_pics: boolean;
  show_in_blog: boolean;
  text_description?: string;
  text_description_visible?: boolean;
  avif_url?: string;
  webp_url?: string;
  width?: number;
  height?: number;
}

export interface CreatePicData {
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  published: boolean;
  show_in_pics: boolean;
  show_in_blog: boolean;
}

export interface SiteConfig {
  domain: string;
  title: string;
  description: string;
  nav_links: {
    projects: boolean;
    blog: boolean;
    pics: boolean;
    about: boolean;
    contact: boolean;
  };
  about_sections: Array<{
    title: string;
    content: string;
    visible: boolean;
  }>;
  about_description: string;
  contact_description: string;
  contact_email: string;
  contact_discord_handle: string;
  contact_discord_url: string;
  contact_instagram_handle: string;
  contact_instagram_url: string;
  contact_email_visible: boolean;
  contact_discord_visible: boolean;
  contact_instagram_visible: boolean;
  pics_description: string;
  lottie_animation: string;
  lottie_animation_r2_key: string | null;
  scale_factor: number;
  web3forms_key: string;
  show_email: boolean;
  show_discord: boolean;
  show_instagram: boolean;
}

export interface UpdateSiteConfigData {
  title: string;
  description: string;
  navigation: {
    projects: boolean;
    blog: boolean;
    pics: boolean;
    about: boolean;
    contact: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
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