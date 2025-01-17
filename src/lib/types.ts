export interface SiteConfig {
  id: number;
  title: string;
  description: string;
  nav_links: {
    projects: boolean;
    blog: boolean;
    pics: boolean;
    about: boolean;
    contact: boolean;
  };
  about_description: string | null;
  about_sections: Array<{
    title: string;
    content: string;
  }>;
  contact_description: string | null;
  contact_email: string | null;
  contact_discord_handle: string | null;
  contact_instagram_handle: string | null;
  show_contact_email: boolean;
  show_contact_discord: boolean;
  show_contact_instagram: boolean;
  pics_description: string | null;
  updated_at: string;
} 