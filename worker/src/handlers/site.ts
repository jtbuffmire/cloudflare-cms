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

interface SiteConfigData {
  title: string;
  description: string;
  nav_links: Record<string, boolean>;
}

function normalizeNavLinks(links: Record<string, boolean | number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(links).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? (value ? 1 : 0) : value
    ])
  );
}

export async function getSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📖 Getting site config...');
    
    const { results } = await env.DB.prepare(`
      SELECT title, description, nav_links
      FROM site_config 
      WHERE id = 1
    `).all();
    const result = results[0];
    
    console.log('📝 Raw database result:', result);

    // Default nav_links if none exist in database
    const defaultNavLinks = {
        projects: 0,
        blog: 1,
        pics: 1,
        about: 1,
        contact: 1
    };

    // Parse nav_links and ensure all values are numbers
    const parsedNavLinks = result?.nav_links ? 
      Object.fromEntries(
        Object.entries(JSON.parse(result.nav_links))
          .map(([key, value]) => [key, Number(value)])
      ) : defaultNavLinks;

    const config = {
      title: result?.title || 'mealz on wheels',
      description: result?.description || "a travelin girl.",
      nav_links: parsedNavLinks
    };

    console.log('✅ Processed config:', config);

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
      details: error instanceof Error ? error.message : String(error)
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
    const data = await request.json() as SiteConfigData;
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
        details: data as Record<string, unknown>
      }), { status: 400 });
    }

    const normalizedLinks = normalizeNavLinks(data.nav_links);
    
    // Update database
    await env.DB.prepare(`
      INSERT OR REPLACE INTO site_config (id, title, description, nav_links, updated_at)
      VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      data.title,
      data.description,
      JSON.stringify(normalizedLinks)
    ).run();

    // Broadcast update via WebSocket
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'SITE_CONFIG_UPDATE',
        data: { config: { ...data, nav_links: normalizedLinks } }
      })
    });

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
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
  }
}

