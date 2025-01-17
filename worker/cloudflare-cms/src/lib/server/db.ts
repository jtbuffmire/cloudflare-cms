import type { D1Database } from '@cloudflare/workers-types';
import type { Post, PicsItem, SiteConfig, CreatePostData, CreatePicData, UpdateSiteConfigData } from '$lib/types';

interface D1Result {
  [key: string]: string | number | boolean | null;
}

export class Database {
  constructor(private db: D1Database) {}

  // Posts
  async getPosts(): Promise<Post[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM posts ORDER BY created_at DESC')
      .all();
    return (results as D1Result[]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      content: String(row.content),
      excerpt: String(row.excerpt),
      published: Boolean(row.published),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at)
    }));
  }

  async getPost(id: string): Promise<Post | null> {
    const result = await this.db
      .prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();
    return result as Post | null;
  }

  async createPost(post: CreatePostData): Promise<Post> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO posts (id, title, slug, content, excerpt, published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, post.title, post.slug, post.content, post.excerpt, post.published, now, now)
      .run();

    const newPost = await this.getPost(id);
    if (!newPost) throw new Error('Failed to create post');
    return newPost;
  }

  async updatePost(id: string, post: Partial<CreatePostData>): Promise<Post> {
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(post).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    });

    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updatedPost = await this.getPost(id);
    if (!updatedPost) throw new Error('Post not found');
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM posts WHERE id = ?')
      .bind(id)
      .run();
  }

  // Pictures
  async getPicsItems(): Promise<PicsItem[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM picture ORDER BY created_at DESC')
      .all();
    return (results as D1Result[]).map((row) => ({
      id: String(row.id),
      filename: String(row.filename),
      size: Number(row.size),
      mime_type: String(row.mime_type),
      url: String(row.url),
      created_at: String(row.created_at)
    }));
  }

  async getPicsItem(id: string): Promise<PicsItem | null> {
    const result = await this.db
      .prepare('SELECT * FROM pics WHERE id = ?')
      .bind(id)
      .first();
    return result as PicsItem | null;
  }

  async createPicsItem(pics: CreatePicData): Promise<PicsItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO pics (id, filename, size, mime_type, url, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, pics.filename, pics.size, pics.mime_type, pics.url, now)
      .run();

    const newPics = await this.getPicsItem(id);
    if (!newPics) throw new Error('Failed to create picture');
    return newPics;
  }

  async deletePicsItem(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM pics WHERE id = ?')
      .bind(id)
      .run();
  }

  // Site Configuration
  async getSiteConfig(): Promise<SiteConfig> {
    const config = await this.db
      .prepare('SELECT * FROM site_config WHERE id = 1')
      .first();

    if (!config) {
      // Create default config if it doesn't exist
      await this.db
        .prepare(
          `INSERT INTO site_config (id, title, description, navigation)
           VALUES (1, 'My Site', 'A simple CMS powered by Cloudflare', '[]')`
        )
        .run();
      return this.getSiteConfig();
    }

    return {
      ...config,
      navigation: JSON.parse(config.navigation as string)
    } as SiteConfig;
  }

  async updateSiteConfig(config: UpdateSiteConfigData): Promise<SiteConfig> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE site_config
         SET title = ?, description = ?, navigation = ?, updated_at = ?
         WHERE id = 1`
      )
      .bind(
        config.title, 
        config.description,
        JSON.stringify(config.navigation),
        now
      )
      .run();

    return this.getSiteConfig();
  }
} 