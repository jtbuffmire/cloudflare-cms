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
    try {
        const config = await request.json();
        console.log('🔍 Received config update:', config);
        
        // Update the database
        await env.DB.prepare(
            `UPDATE site_config 
             SET title = ?, 
                 description = ?, 
                 nav_links = ?
             WHERE id = 1`
        ).bind(
            config.title,
            config.description,
            JSON.stringify(config.nav_links)
        ).run();

        // Broadcast the change
        try {
            console.log('🔍 Getting WebSocket handler...');
            const id = env.WEBSOCKET_HANDLER.idFromName('default');
            console.log('🔍 WebSocket handler ID:', id);
            
            const handler = env.WEBSOCKET_HANDLER.get(id);
            console.log('🔍 Got WebSocket handler:', handler);
            
            if (!handler) {
                throw new Error('No WebSocket handler found');
            }

            const broadcastMessage = {
                type: 'SITE_CONFIG_UPDATE',
                data: { config }
            };
            
            console.log('📢 Broadcasting message:', JSON.stringify(broadcastMessage));
            
            const broadcastResponse = await handler.fetch(new Request('http://internal/broadcast', {
                method: 'POST',
                body: JSON.stringify(broadcastMessage)
            }));
            
            const responseText = await broadcastResponse.text();
            console.log('📢 Broadcast response:', responseText);
            
            if (!broadcastResponse.ok) {
                throw new Error(`Broadcast failed: ${responseText}`);
            }
        } catch (broadcastError) {
            console.error('❌ Broadcast error:', broadcastError);
            // Continue execution even if broadcast fails
        }

        return new Response(JSON.stringify(config), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('❌ Failed to update site config:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to update site config' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}