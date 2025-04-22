export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PicsItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface NavigationItem {
  title: string;
  url: string;
  icon: string;
}

export interface SiteConfig {
  id: number;
  title: string;
  description: string;
  navigation: NavigationItem[];
  updated_at: string;
}

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
}

export interface CreatePicData {
  filename: string;
  size: number;
  mime_type: string;
  url: string;
}

export interface UpdateSiteConfigData {
  title: string;
  description: string;
  navigation: NavigationItem[];
} 