import type { CFRequest, CFResponse, Env } from '../types';
import { ExecutionContext } from '@cloudflare/workers-types';

// Utility function to get domain from headers
function getDomainFromHeaders(request: CFRequest): string | null {
  const domain = request.headers.get('X-Site-Domain');
  if (!domain) return null;
  // Strip port number from domain if present
  return domain.split(':')[0];
}

interface SiteConfig {
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

interface MergedConfig extends SiteConfig {
  lottie_animation_r2_key?: string | null;
}

// Database row type
interface SiteConfigRow {
  id: number;
  domain: string;
  site_domain: string;
  title: string | null;
  description: string | null;
  nav_links: string | null;
  lottie_animation: string | null;
  lottie_animation_r2_key: string | null;
  scale_factor: number | null;
  about_description: string | null;
  about_section_headers: string | null;
  about_section_contents: string | null;
  contact_description: string | null;
  contact_email: string | null;
  contact_email_visible: number | null;
  contact_discord_handle: string | null;
  contact_discord_url: string | null;
  contact_discord_visible: number | null;
  contact_instagram_handle: string | null;
  contact_instagram_url: string | null;
  contact_instagram_visible: number | null;
  pics_description: string | null;
  web3forms_key: string | null;
}

async function broadcastSiteUpdate(env: Env, domain: string, config: SiteConfig) {
  const doId = env.WEBSOCKET_HANDLER.idFromName('default');
  const doStub = env.WEBSOCKET_HANDLER.get(doId);
  const response = await doStub.fetch('https://internal/broadcast', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Site-Domain': domain
    },
    body: JSON.stringify({
      type: 'SITE_CONFIG_UPDATE',
      data: config,
      domain
    })
  });

  if (!response.ok) {
    console.warn('⚠️ WebSocket broadcast failed:', await response.text());
  }
}

export async function getSiteConfig(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    console.log('🔍 Getting site config');

    // Get domain from X-Site-Domain header and strip port
    const domain = getDomainFromHeaders(request);
    if (!domain) {
      console.log('❌ Missing X-Site-Domain header');
      return new Response(JSON.stringify({ error: 'Missing X-Site-Domain header' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }
    console.log('🌐 Site domain from header (stripped port):', domain);

    // Log all request headers for debugging
    console.log('📨 Request headers:', Object.fromEntries(request.headers.entries()));

    const result = await env.DB.prepare(`
      SELECT * FROM site_config WHERE domain = ?
    `).bind(domain).first();

    console.log('📊 Raw DB Result:', JSON.stringify(result, null, 2));

    if (!result) {
      console.log('❌ No config found in DB for domain:', domain);
      
      // Create default config
      const defaultConfig = {
        domain,
        site_domain: domain,  // Initially set to the same as internal domain
        title: 'My Site',  // Default non-null title
        description: 'Welcome to my site',  // Default non-null description
        nav_links: {
          projects: false,
          blog: true,
          pics: false,
          about: true,
          contact: true
        },
        lottie_animation: 'default-pin',  // Use the shared default animation
        lottie_animation_r2_key: 'animations/default-pin.json',
        about_description: '',
        about_sections: [],
        pics_description: '',
        contact_description: '',
        contact_email: '',
        contact_discord_handle: '',
        contact_discord_url: '',
        contact_instagram_url: '',
        contact_instagram_handle: '',
        web3forms_key: '',
        show_email: false,
        show_discord: false,
        show_instagram: false
      };

      // Insert default config into database
      try {
        const insertResult = await env.DB.prepare(`
          INSERT INTO site_config (
            domain,
            site_domain,
            title,
            description,
            nav_links,
            lottie_animation,
            lottie_animation_r2_key,
            about_description,
            about_section_headers,
            about_section_contents,
            pics_description,
            contact_description,
            contact_email,
            contact_discord_handle,
            contact_discord_url,
            contact_instagram_handle,
            contact_instagram_url,
            contact_email_visible,
            contact_discord_visible,
            contact_instagram_visible,
            web3forms_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          domain,
          domain,  // site_domain initially same as domain
          defaultConfig.title,
          defaultConfig.description,
          JSON.stringify(defaultConfig.nav_links),
          defaultConfig.lottie_animation,  // Use the default animation name
          defaultConfig.lottie_animation_r2_key,  // Use the default animation r2_key
          '',
          JSON.stringify([]),
          JSON.stringify([]),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          0,
          0,
          0,
          ''
        ).run();
        console.log('✅ Created default config:', insertResult);
        return new Response(JSON.stringify(defaultConfig), {
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      } catch (insertError) {
        console.error('❌ Failed to create default config:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to create default config' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      }
    }

    // Keep the important config parsing logic
    const nav_links = result?.nav_links 
      ? JSON.parse(result.nav_links as string) 
      : {
          projects: false,
          blog: true,
          pics: false,
          about: true,
          contact: true
        };
    console.log('🔗 Parsed nav_links:', nav_links);

    const headers = result?.about_section_headers ? JSON.parse(result.about_section_headers as string) : [];
    const contents = result?.about_section_contents ? JSON.parse(result.about_section_contents as string) : [];
    
    console.log('📑 Parsed headers:', headers);
    console.log('📝 Parsed contents:', contents);

    const about_sections = headers.map((header: any, i: number) => ({
      title: header.title,
      visible: Boolean(header.visible),
      content: contents[i]?.content?.text ?? ''
    })) || [];

    console.log('📋 Mapped about_sections:', about_sections);

    // Build final config object
    const finalConfig = {
      id: result?.id || 1,
      domain: domain,
      site_domain: result?.site_domain || domain,
      title: result?.title || '',
      description: result?.description || '',
      nav_links,
      lottie_animation: result?.lottie_animation || '',
      lottie_animation_r2_key: result?.lottie_animation_r2_key || null,
      about_description: result?.about_description || '',
      about_sections,
      pics_description: result?.pics_description || '',
      contact_description: result?.contact_description || '',
      contact_email: result?.contact_email || '',
      contact_discord_handle: result?.contact_discord_handle || '',
      contact_discord_url: result?.contact_discord_url || '',
      contact_instagram_url: result?.contact_instagram_url || '',
      contact_instagram_handle: result?.contact_instagram_handle || '',
      web3forms_key: result?.web3forms_key || '',
      show_email: Boolean(result?.contact_email_visible),
      show_discord: Boolean(result?.contact_discord_visible),
      show_instagram: Boolean(result?.contact_instagram_visible),
      scale_factor: 100  // Initialize with default value
    } as SiteConfig;  // Add type assertion

    // Get the current animation scale from the animations table if there's an animation set
    if (finalConfig.lottie_animation) {
      const animationRow = await env.DB.prepare(
        'SELECT scale_factor FROM animations WHERE domain = ? AND name = ?'
      ).bind(domain, finalConfig.lottie_animation).first();

      if (animationRow && 'scale_factor' in animationRow) {
        finalConfig.scale_factor = (animationRow.scale_factor as number) || 100;
      } else {
        finalConfig.scale_factor = 100;
      }
    } else {
      finalConfig.scale_factor = 100;
    }

    console.log('✅ Sending config:', finalConfig);

    return new Response(JSON.stringify(finalConfig), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  } catch (error) {
    console.error('❌ Error getting site config:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get site config',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 }) as unknown as CFResponse;
  }
}

export async function updateSiteConfig(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const domain = getDomainFromHeaders(request);
    if (!domain) {
      return Response.json({ error: 'Missing domain header' }, { status: 400 }) as unknown as CFResponse;
    }

    const incomingConfig = await request.json() as Partial<SiteConfig>;
    
    // Get existing config first
    const existingRow = await env.DB.prepare('SELECT * FROM site_config WHERE domain = ?')
      .bind(domain)
      .first() as SiteConfigRow;
    
    if (!existingRow) {
      return Response.json({ error: 'Config not found' }, { status: 404 }) as unknown as CFResponse;
    }

    console.log('Existing config:', JSON.stringify(existingRow, null, 2));
    
    // Merge nav_links if provided, otherwise keep existing
    const nav_links = incomingConfig.nav_links 
      ? JSON.stringify(incomingConfig.nav_links)
      : existingRow.nav_links;

    // Merge about sections if provided
    const about_sections = incomingConfig.about_sections
      ? {
          headers: JSON.stringify(incomingConfig.about_sections.map(s => ({ title: s.title, visible: s.visible }))),
          contents: JSON.stringify(incomingConfig.about_sections.map(s => ({ content: { text: s.content, visible: true } })))
        }
      : {
          headers: existingRow.about_section_headers,
          contents: existingRow.about_section_contents
        };

    // Update only the fields that are provided in the incoming config
    const stmt = env.DB.prepare(`
      UPDATE site_config 
      SET 
        title = ?,
        description = ?,
        nav_links = ?,
        lottie_animation = ?,
        lottie_animation_r2_key = ?,
        about_description = ?,
        about_section_headers = ?,
        about_section_contents = ?,
        pics_description = ?,
        contact_description = ?,
        contact_email = ?,
        contact_discord_handle = ?,
        contact_discord_url = ?,
        contact_instagram_handle = ?,
        contact_instagram_url = ?,
        contact_email_visible = ?,
        contact_discord_visible = ?,
        contact_instagram_visible = ?,
        web3forms_key = ?
      WHERE domain = ?
    `).bind(
      incomingConfig.title ?? existingRow.title,
      incomingConfig.description ?? existingRow.description,
      nav_links,
      incomingConfig.lottie_animation ?? existingRow.lottie_animation,
      incomingConfig.lottie_animation_r2_key ?? existingRow.lottie_animation_r2_key,
      incomingConfig.about_description ?? existingRow.about_description,
      about_sections.headers,
      about_sections.contents,
      incomingConfig.pics_description ?? existingRow.pics_description,
      incomingConfig.contact_description ?? existingRow.contact_description,
      incomingConfig.contact_email ?? existingRow.contact_email,
      incomingConfig.contact_discord_handle ?? existingRow.contact_discord_handle,
      incomingConfig.contact_discord_url ?? existingRow.contact_discord_url,
      incomingConfig.contact_instagram_handle ?? existingRow.contact_instagram_handle,
      incomingConfig.contact_instagram_url ?? existingRow.contact_instagram_url,
      incomingConfig.show_email !== undefined ? Number(incomingConfig.show_email) : existingRow.contact_email_visible,
      incomingConfig.show_discord !== undefined ? Number(incomingConfig.show_discord) : existingRow.contact_discord_visible,
      incomingConfig.show_instagram !== undefined ? Number(incomingConfig.show_instagram) : existingRow.contact_instagram_visible,
      incomingConfig.web3forms_key ?? existingRow.web3forms_key,
      domain
    );

    const result = await stmt.run();
    console.log('Update result:', result);

    // Get updated config to return
    const updatedRow = await env.DB.prepare('SELECT * FROM site_config WHERE domain = ?')
      .bind(domain)
      .first() as SiteConfigRow;

    // Convert row to config object
    const updatedConfig = {
      id: updatedRow.id,
      domain: updatedRow.domain,
      site_domain: updatedRow.site_domain,
      title: updatedRow.title || '',
      description: updatedRow.description || '',
      nav_links: JSON.parse(updatedRow.nav_links || '{}'),
      lottie_animation: updatedRow.lottie_animation || '',
      lottie_animation_r2_key: updatedRow.lottie_animation_r2_key,
      about_description: updatedRow.about_description || '',
      about_sections: [],
      pics_description: updatedRow.pics_description || '',
      contact_description: updatedRow.contact_description || '',
      contact_email: updatedRow.contact_email || '',
      contact_discord_handle: updatedRow.contact_discord_handle || '',
      contact_discord_url: updatedRow.contact_discord_url || '',
      contact_instagram_url: updatedRow.contact_instagram_url || '',
      contact_instagram_handle: updatedRow.contact_instagram_handle || '',
      web3forms_key: updatedRow.web3forms_key || '',
      show_email: Boolean(updatedRow.contact_email_visible),
      show_discord: Boolean(updatedRow.contact_discord_visible),
      show_instagram: Boolean(updatedRow.contact_instagram_visible),
      scale_factor: 100  // Initialize with default value
    } as SiteConfig;

    // Get the current animation scale from the animations table
    const animationRow = await env.DB.prepare(
      'SELECT scale_factor FROM animations WHERE domain = ? AND name = ?'
    ).bind(domain, updatedRow.lottie_animation).first();
    
    if (animationRow && 'scale_factor' in animationRow) {
      updatedConfig.scale_factor = (animationRow.scale_factor as number) || 100;
    }

    // Broadcast update to connected clients
    await broadcastSiteUpdate(env, domain, updatedConfig);

    return Response.json({ config: updatedConfig }) as unknown as CFResponse;
  } catch (error) {
    console.error('Error updating site config:', error);
    return Response.json({ 
      error: 'Failed to update site config',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 }) as unknown as CFResponse;
  }
}

export async function updateAnimationScale(request: CFRequest, env: Env): Promise<CFResponse> {
  try {
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return Response.json({ error: 'Missing X-Site-Domain header' }, { status: 400 }) as unknown as CFResponse;
    }

    const { scale_factor } = await request.json() as { scale_factor: number };
    if (typeof scale_factor !== 'number' || scale_factor < 100 || scale_factor > 500) {
      return Response.json({ error: 'Invalid scale factor. Must be between 100 and 500.' }, { status: 400 }) as unknown as CFResponse;
    }

    // Update only the animations table
    const stmt = env.DB.prepare(
      'UPDATE animations SET scale_factor = ? WHERE domain = ? AND name = (SELECT lottie_animation FROM site_config WHERE domain = ?)'
    ).bind(scale_factor, domain, domain);
    
    await stmt.run();

    // Broadcast just the scale update
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const doStub = env.WEBSOCKET_HANDLER.get(doId);
    const broadcastResponse = await doStub.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Site-Domain': domain
      },
      body: JSON.stringify({
        type: 'ANIMATION_SCALE_UPDATE',
        data: { scale_factor },
        domain: domain
      })
    });

    if (!broadcastResponse.ok) {
      console.warn('⚠️ WebSocket broadcast failed:', await broadcastResponse.text());
    }

    return Response.json({ 
      success: true, 
      scale_factor 
    }) as unknown as CFResponse;
  } catch (err) {
    console.error('Error updating animation scale:', err);
    return Response.json({ 
      error: 'Failed to update animation scale',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 }) as unknown as CFResponse;
  }
}

export async function updateBasicInfo(request: CFRequest, env: Env): Promise<CFResponse> {
  try {
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return Response.json({ error: 'Missing X-Site-Domain header' }, { status: 400 }) as unknown as CFResponse;
    }

    const { title, description } = await request.json() as { title: string; description: string };
    
    // Update just the title and description
    const stmt = env.DB.prepare(
      'UPDATE site_config SET title = ?, description = ? WHERE domain = ?'
    ).bind(title, description, domain);
    
    await stmt.run();

    // Get the updated fields to broadcast
    const updatedRow = await env.DB.prepare(
      'SELECT title, description FROM site_config WHERE domain = ?'
    ).bind(domain).first();

    if (!updatedRow) {
      return Response.json({ error: 'Failed to retrieve updated config' }, { status: 500 }) as unknown as CFResponse;
    }

    // Broadcast just the basic info update
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const doStub = env.WEBSOCKET_HANDLER.get(doId);
    const broadcastResponse = await doStub.fetch('https://internal/broadcast', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Site-Domain': domain
      },
      body: JSON.stringify({
        type: 'BASIC_INFO_UPDATE',
        data: {
          title: updatedRow.title || '',
          description: updatedRow.description || ''
        },
        domain
      })
    });

    if (!broadcastResponse.ok) {
      console.warn('⚠️ WebSocket broadcast failed:', await broadcastResponse.text());
    }

    return Response.json({ 
      success: true,
      title: updatedRow.title || '',
      description: updatedRow.description || ''
    }) as unknown as CFResponse;
  } catch (err) {
    console.error('Error updating basic info:', err);
    return Response.json({ 
      error: 'Failed to update basic info',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 }) as unknown as CFResponse;
  }
}


