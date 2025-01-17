import type { D1Database } from '@cloudflare/workers-types';
import type { SiteConfig } from '$lib/types';

export class Database {
  constructor(private db: D1Database) {}

  async getSiteConfig(): Promise<SiteConfig | null> {
    const result = await this.db.prepare('SELECT * FROM site_config LIMIT 1').first();
    if (!result) return null;

    return {
      ...result,
      nav_links: JSON.parse(result.nav_links as string),
      about_sections: JSON.parse(result.about_sections as string)
    } as SiteConfig;
  }

  async updateSiteConfig(config: Omit<SiteConfig, 'id' | 'updated_at'>): Promise<boolean> {
    const {
      title, description, nav_links, about_description, about_sections,
      contact_description, contact_email, contact_discord_handle,
      contact_instagram_handle, show_contact_email, show_contact_discord,
      show_contact_instagram, pics_description
    } = config;

    try {
      await this.db
        .prepare(`
          UPDATE site_config 
          SET title = ?, description = ?, nav_links = ?, about_description = ?,
              about_sections = ?, contact_description = ?, contact_email = ?,
              contact_discord_handle = ?, contact_instagram_handle = ?,
              show_contact_email = ?, show_contact_discord = ?,
              show_contact_instagram = ?, pics_description = ?,
              updated_at = datetime('now')
          WHERE id = 1
        `)
        .bind(
          title, description, JSON.stringify(nav_links), about_description,
          JSON.stringify(about_sections), contact_description, contact_email,
          contact_discord_handle, contact_instagram_handle, show_contact_email,
          show_contact_discord, show_contact_instagram, pics_description
        )
        .run();
      return true;
    } catch (error) {
      console.error('Error updating site config:', error);
      return false;
    }
  }
} 