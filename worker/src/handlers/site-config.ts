import { Env } from '../types';

export async function getSiteConfig(request: Request, env: Env): Promise<Response> {
    try {
        const config = await env.DB.prepare(
            'SELECT * FROM site_config WHERE id = 1'
        ).first();

        return new Response(JSON.stringify(config), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to get site config:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to get site config' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function updateSiteConfig(request: Request, env: Env): Promise<Response> {
    const updates = await request.json() as {
        title: string;
        description: string;
        nav_links: any[];
    };
    console.log('🔍 Received config update:', updates);
    
    // 1. Update the database
    await env.DB.prepare(
        `UPDATE site_config 
            SET title = ?, 
                description = ?, 
                nav_links = ?
            WHERE id = 1`
    ).bind(
        updates.title,
        updates.description,
        JSON.stringify(updates.nav_links)
    ).run();

    // 2. Broadcast the updates we already have
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch(new Request('http://internal/broadcast', {
        method: 'POST',
        body: JSON.stringify({
            type: 'SITE_CONFIG_UPDATE',
            data: { config: updates }  // Use the updates directly
        })
    }));

    // 3. Return the same updates
    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
