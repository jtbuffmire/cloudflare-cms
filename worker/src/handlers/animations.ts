import { Env } from '../types';

export async function getAnimations(request: Request, env: Env): Promise<Response> {
    try {
        console.log('📍 Getting animations from database...');
        const stmt = env.DB.prepare('SELECT name, r2_key FROM animations ORDER BY name');
        const { results } = await stmt.all();
        
        console.log('📍 Retrieved animations:', { results });
        
        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('❌ Failed to get animations:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to get animations',
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

export async function uploadAnimation(request: Request, env: Env): Promise<Response> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const name = formData.get('name') as string;

        if (!file || !name) {
            return new Response(JSON.stringify({ error: 'Missing file or name' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate a unique key for R2
        const r2_key = `animations/${Date.now()}-${name}.json`;

        // Upload to R2
        await env.MEDIA_BUCKET.put(r2_key, await file.arrayBuffer(), {
            customMetadata: { name }
        });

        // Save to database
        const stmt = env.DB.prepare(
            'INSERT INTO animations (name, r2_key) VALUES (?, ?)'
        ).bind(name, r2_key);
        await stmt.run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to upload animation:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to upload animation',
            details: error instanceof Error ? error.message : String(error)
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function getAnimationByName(request: Request, env: Env, params: { name: string }): Promise<Response> {
    try {
        console.log('📍 Getting animation:', params.name);
        
        // Try to get user-uploaded animation from DB/R2
        const stmt = env.DB.prepare('SELECT name, r2_key FROM animations WHERE name = ?').bind(params.name);
        const animation = await stmt.first();
        
        if (animation) {
            const obj = await env.MEDIA_BUCKET.get(animation.r2_key);
            if (obj) {
                const headers = new Headers();
                headers.set('Content-Type', 'application/json');
                headers.set('Cache-Control', 'public, max-age=31536000');
                headers.set('Access-Control-Allow-Origin', '*');
                return new Response(obj.body, { headers });
            }
        }

        // If no custom animation found, return 404 to let the frontend fall back to local assets
        return new Response(JSON.stringify({ 
            error: 'Animation not found',
            message: 'Fallback to local asset'
        }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Failed to get animation:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to get animation',
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