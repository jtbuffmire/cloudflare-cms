import { Env } from '../types';

interface SiteConfig {
  title: string;
  description: string;
  nav_links: Record<string, number>;
  lottie_animation: string | null;
  about_description: string | null;
  about_sections: Array<{
    title: string;
    visible: number | boolean;
    content: string; // <-- plain string
  }>;
  contact_description: string | null;
  contact_email: string | null;
  contact_email_visible: number;
  contact_discord_handle: string | null;
  contact_discord_url: string | null;
  contact_discord_visible: number;
  contact_instagram_handle: string | null;
  contact_instagram_url: string | null;
  contact_instagram_visible: number;
  pics_description: string | null;
}

// Helper functions for boolean conversions
function numbersToBooleans(obj: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, !!v])
  );
}

function booleansToNumbers(obj: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v ? 1 : 0])
  );
}

export async function getSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM site_config WHERE id = 1
    `).first();

    if (!result) {
      return new Response(JSON.stringify({ error: 'Site config not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse JSON fields and convert numbers to booleans
    const nav_links_raw = result?.nav_links ? JSON.parse(result.nav_links) : {};
    const nav_links = numbersToBooleans(nav_links_raw);
    
    const headers = JSON.parse(result?.about_section_headers ?? '[]');
    const contents = JSON.parse(result?.about_section_contents ?? '[]');
    
    // Create unified about_sections array
    const about_sections = headers.map((header, i) => ({
      title: header.title,
      visible: Boolean(header.visible),
      content: contents[i]?.text ?? ''
    }));

    // Build final config object with boolean values for visibility flags
    const finalConfig = {
      title: result?.title || '',
      description: result?.description || '',
      nav_links,  // Now contains boolean values
      lottie_animation: result?.lottie_animation || null,
      about_description: result?.about_description || null,
      about_sections,
      contact_description: result?.contact_description || null,
      contact_email: result?.contact_email || null,
      contact_email_visible: Boolean(result?.contact_email_visible),
      contact_discord_handle: result?.contact_discord_handle || null,
      contact_discord_url: result?.contact_discord_url || null,
      contact_discord_visible: Boolean(result?.contact_discord_visible),
      contact_instagram_handle: result?.contact_instagram_handle || null,
      contact_instagram_url: result?.contact_instagram_url || null,
      contact_instagram_visible: Boolean(result?.contact_instagram_visible),
      pics_description: result?.pics_description || null
    };

    return new Response(JSON.stringify(finalConfig), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('❌ Error getting site config:', error);
    return new Response(JSON.stringify({ error: 'Failed to get site config' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function updateSiteConfig(request: Request, env: Env): Promise<Response> {
  try {
    const incoming = await request.json();

    // 1) Convert incoming boolean nav_links to numeric
    const numericNavLinks = incoming.nav_links 
      ? booleansToNumbers(incoming.nav_links)
      : {};

    // 2) Fetch the existing row
    const oldRow = await env.DB.prepare(`
      SELECT * FROM site_config 
      WHERE id = 1
    `).first();

    if (!oldRow) {
      return new Response(JSON.stringify({ error: 'Site config not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3) Parse fields from oldRow (not "result")
    const nav_links = oldRow?.nav_links ? JSON.parse(oldRow.nav_links) : {};
    const headers = JSON.parse(oldRow?.about_section_headers ?? '[]');
    const contents = JSON.parse(oldRow?.about_section_contents ?? '[]');

    // 4) Build a "currentConfig" from oldRow
    const currentConfig = {
      title: oldRow.title || '',
      description: oldRow.description || '',
      nav_links,
      lottie_animation: oldRow.lottie_animation || null,
      about_description: oldRow.about_description || null,
      about_sections: headers.map((header, i) => ({
        title: header.title,
        visible: Boolean(header.visible),
        content: contents[i]?.text ?? ''
      })),
      contact_description: oldRow.contact_description || null,
      contact_email: oldRow.contact_email || null,
      contact_email_visible: Number(oldRow.contact_email_visible || 0),
      contact_discord_handle: oldRow.contact_discord_handle || null,
      contact_discord_url: oldRow.contact_discord_url || null,
      contact_discord_visible: Number(oldRow.contact_discord_visible || 0),
      contact_instagram_handle: oldRow.contact_instagram_handle || null,
      contact_instagram_url: oldRow.contact_instagram_url || null,
      contact_instagram_visible: Number(oldRow.contact_instagram_visible || 0),
      pics_description: oldRow.pics_description || null
    };

    // 5) Merge incoming changes into "currentConfig"
    const mergedConfig = {
      ...currentConfig,
      ...(incoming.title !== undefined ? { title: incoming.title } : {}),
      ...(incoming.description !== undefined ? { description: incoming.description } : {}),
      ...(incoming.nav_links !== undefined ? { nav_links: incoming.nav_links } : {}),
      ...(incoming.lottie_animation !== undefined ? {
        lottie_animation: incoming.lottie_animation,
        lottie_animation_r2_key: incoming.lottie_animation 
          ? `animations/${incoming.lottie_animation}.json` 
          : null
      } : {}),
      ...(incoming.about_description !== undefined ? { about_description: incoming.about_description } : {}),
      ...(incoming.pics_description !== undefined ? { pics_description: incoming.pics_description } : {}),
      ...(incoming.contact_description !== undefined ? { contact_description: incoming.contact_description } : {}),
      ...(incoming.contact_email !== undefined ? { contact_email: incoming.contact_email } : {}),
      ...(incoming.contact_email_visible !== undefined ? { contact_email_visible: incoming.contact_email_visible } : {}),
      ...(incoming.contact_discord_handle !== undefined ? { contact_discord_handle: incoming.contact_discord_handle } : {}),
      ...(incoming.contact_discord_url !== undefined ? { contact_discord_url: incoming.contact_discord_url } : {}),
      ...(incoming.contact_discord_visible !== undefined ? { contact_discord_visible: incoming.contact_discord_visible } : {}),
      ...(incoming.contact_instagram_handle !== undefined ? { contact_instagram_handle: incoming.contact_instagram_handle } : {}),
      ...(incoming.contact_instagram_url !== undefined ? { contact_instagram_url: incoming.contact_instagram_url } : {}),
      ...(incoming.contact_instagram_visible !== undefined ? { contact_instagram_visible: incoming.contact_instagram_visible } : {})
    };

    // If about_sections were updated, build new about_section_headers / contents
    if (incoming.about_sections !== undefined) {
      const about_section_headers = incoming.about_sections.map(section => ({
        title: section.title,
        visible: section.visible
      }));

      const about_section_contents = incoming.about_sections.map(section => ({
        text: section.content
      }));

      mergedConfig.about_section_headers = about_section_headers;
      mergedConfig.about_section_contents = about_section_contents;
    }

    // 6) Convert nav_links back to numeric for storage
    if (mergedConfig.nav_links) {
      mergedConfig.nav_links = booleansToNumbers(mergedConfig.nav_links);
    }

    // 7) Update DB
    const stmt = env.DB.prepare(`
      UPDATE site_config 
      SET title = ?,
          description = ?,
          nav_links = ?,
          lottie_animation = ?,
          lottie_animation_r2_key = ?,
          about_description = ?,
          about_section_headers = ?,
          about_section_contents = ?,
          contact_description = ?,
          contact_email = ?,
          contact_email_visible = ?,
          contact_discord_handle = ?,
          contact_discord_url = ?,
          contact_discord_visible = ?,
          contact_instagram_handle = ?,
          contact_instagram_url = ?,
          contact_instagram_visible = ?,
          pics_description = ?
      WHERE id = 1
    `).bind(
      mergedConfig.title,
      mergedConfig.description,
      JSON.stringify(mergedConfig.nav_links),
      mergedConfig.lottie_animation,
      mergedConfig.lottie_animation_r2_key,
      mergedConfig.about_description,
      JSON.stringify(mergedConfig.about_section_headers),
      JSON.stringify(mergedConfig.about_section_contents),
      mergedConfig.contact_description,
      mergedConfig.contact_email,
      mergedConfig.contact_email_visible,
      mergedConfig.contact_discord_handle,
      mergedConfig.contact_discord_url,
      mergedConfig.contact_discord_visible,
      mergedConfig.contact_instagram_handle,
      mergedConfig.contact_instagram_url,
      mergedConfig.contact_instagram_visible,
      mergedConfig.pics_description
    );

    await stmt.run();

    // 8) Re-fetch updated row from DB
    const updatedRow = await env.DB
      .prepare(`SELECT * FROM site_config WHERE id = 1`)
      .first();

    if (!updatedRow) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch updated config' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9) Parse the final updated row
    const finalNavLinks = updatedRow.nav_links ? JSON.parse(updatedRow.nav_links) : {};
    const finalHeaders  = JSON.parse(updatedRow.about_section_headers ?? '[]');
    const finalContents = JSON.parse(updatedRow.about_section_contents ?? '[]');

    // You build `finalConfig` here:
    const finalConfig = {
      title: updatedRow.title || '',
      description: updatedRow.description || '',
      nav_links: finalNavLinks,
      lottie_animation: updatedRow.lottie_animation || null,
      // example for about_description
      about_description: updatedRow.about_description || null,
      // about_sections, etc.

      // You must also explicitly include ALL fields you want:
      contact_description: updatedRow.contact_description || null,
      contact_email: updatedRow.contact_email || null,
      contact_email_visible: Boolean(updatedRow.contact_email_visible),
      contact_discord_handle: updatedRow.contact_discord_handle || null,
      contact_discord_url: updatedRow.contact_discord_url || null,
      contact_discord_visible: Boolean(updatedRow.contact_discord_visible),
      contact_instagram_handle: updatedRow.contact_instagram_handle || null,
      contact_instagram_url: updatedRow.contact_instagram_url || null,
      contact_instagram_visible: Boolean(updatedRow.contact_instagram_visible),
      pics_description: updatedRow.pics_description || null,

      about_sections: finalHeaders.map((header, i) => ({
        title: header.title,
        visible: Boolean(header.visible),
        content: finalContents[i]?.text ?? ''
      }))
    };

    // Broadcast to the DO
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const doStub = env.WEBSOCKET_HANDLER.get(doId);

    await doStub.fetch(`https://internal/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SITE_CONFIG_UPDATE',
        data: finalConfig
      })
    });

    return new Response(JSON.stringify({
      success: true,
      config: finalConfig
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Failed to update site config:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update site config',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


