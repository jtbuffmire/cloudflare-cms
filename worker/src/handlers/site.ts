import { Env } from '../types';

interface SocialLink {
  enabled: boolean;
  url: string;
}

interface SiteConfig {
  title: string;
  description: string;
  author: string;
  socialLinks: {
    twitter?: SocialLink;
    github?: SocialLink;
    linkedin?: SocialLink;
    instagram?: SocialLink;
    facebook?: SocialLink;
    youtube?: SocialLink;
    // Add other social platforms as needed
  };
}

export async function getSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📖 Getting site config...');
    
    const result = await env.DB.prepare(`
      SELECT title, description, nav_links
      FROM site_config 
      WHERE id = 1
    `).first();
    
    console.log('📝 Retrieved site config:', result);

    // Default nav_links if none exist in database
    const defaultNavLinks = {
      projects: true,
      blog: true,
      pics: true,
      about: true,
      contact: true
    };

    const config = {
      title: result?.title || 'refact0r',
      description: result?.description || "hey there! i'm a student interested in comp sci, web dev, design, and more.",
      nav_links: result?.nav_links ? JSON.parse(result.nav_links) : defaultNavLinks
    };

    console.log('✅ Returning config:', config);

    return new Response(JSON.stringify(config), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('❌ Error getting site config:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get site config',
      details: error.message 
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function updateSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    const data = await request.json();
    console.log('📝 Updating site config:', data);

    // Validate required fields
    if (!data.title || !data.description || !data.nav_links) {
      console.error('❌ Missing required fields:', { 
        hasTitle: !!data.title, 
        hasDescription: !!data.description, 
        hasNavLinks: !!data.nav_links 
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: data
      }), { status: 400 });
    }

    // First try to insert, if that fails then update
    const result = await env.DB.prepare(`
      INSERT OR REPLACE INTO site_config (id, title, description, nav_links, updated_at)
      VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      data.title,
      data.description,
      JSON.stringify(data.nav_links)
    ).run();

    console.log('📊 Update result:', result);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('❌ Update site config error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update site config',
      details: error.message 
    }), { status: 500 });
  }
}

export async function debugDatabase(request: Request, env: Env): Promise<Response> {
  try {
    // Check if table exists
    const tables = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='site_config';
    `).all();
    console.log('📊 Tables:', tables);

    // Get table schema
    const schema = await env.DB.prepare(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='site_config';
    `).first();
    console.log('📋 Schema:', schema);

    // Count rows
    const count = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM site_config;
    `).first();
    console.log('🔢 Row count:', count);

    // Get all rows
    const data = await env.DB.prepare(`
      SELECT * FROM site_config;
    `).all();
    console.log('📝 Data:', data);

    return new Response(JSON.stringify({
      tables,
      schema,
      count,
      data
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function debugSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    // Get table info
    const schema = await env.DB.prepare(`
      PRAGMA table_info(site_config);
    `).all();
    
    // Get current data
    const data = await env.DB.prepare(`
      SELECT * FROM site_config;
    `).all();

    return new Response(JSON.stringify({
      schema: schema.results,
      data: data.results
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}