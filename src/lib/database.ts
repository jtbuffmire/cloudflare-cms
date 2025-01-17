import type { D1Database } from '@cloudflare/workers-types';
import type { SiteConfig } from '$lib/types';

export class Database {
  constructor(private db: D1Database) {}

  async getSiteConfig(): Promise<SiteConfig | null> {
    try {
      const result = await this.db.prepare('SELECT * FROM site_config LIMIT 1').first();
      if (!result) return null;

      return {
        ...result,
        nav_links: JSON.parse(result.nav_links as string),
        about_sections: JSON.parse(result.about_sections as string)
      } as SiteConfig;
    } catch (error) {
      console.error('Error getting site config:', error);
      return null;
    }
  }

  async updateSiteConfig(config: Omit<SiteConfig, 'id' | 'updated_at'>): Promise<boolean> {
    try {
      const { nav_links, about_sections, ...rest } = config;
      
      await this.db.prepare(`
        UPDATE site_config SET 
        title = ?, description = ?, nav_links = ?, about_description = ?, 
        about_sections = ?, contact_description = ?, contact_email = ?,
        contact_discord_handle = ?, contact_instagram_handle = ?,
        show_contact_email = ?, show_contact_discord = ?, show_contact_instagram = ?,
        pics_description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).bind(
        rest.title, rest.description, JSON.stringify(nav_links), rest.about_description,
        JSON.stringify(about_sections), rest.contact_description, rest.contact_email,
        rest.contact_discord_handle, rest.contact_instagram_handle,
        rest.show_contact_email, rest.show_contact_discord, rest.show_contact_instagram,
        rest.pics_description
      ).run();

      return true;
    } catch (error) {
      console.error('Error updating site config:', error);
      return false;
    }
  }
} 