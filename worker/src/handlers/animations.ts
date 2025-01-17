import { json } from '../utils';
import { Env } from '../types';
import type { Response as CFResponse, Request as CFRequest, ExecutionContext } from '@cloudflare/workers-types';

export async function getAnimations(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
    try {
        // Get domain from header
        const domain = request.headers.get('X-Site-Domain');
        if (!domain) {
            return new Response(JSON.stringify({ 
                error: 'Domain not provided' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Get animations for this domain
        const animations = await env.DB
            .prepare(`
                WITH RankedAnimations AS (
                    SELECT 
                        id,
                        name,
                        r2_key,
                        scale_factor,
                        domain,
                        hash,
                        CASE WHEN domain = ? THEN 0 ELSE 1 END as domain_rank
                    FROM animations
                    WHERE domain = ? OR domain = 'shared'
                )
                SELECT a.id, a.name, a.r2_key, a.scale_factor, a.hash
                FROM RankedAnimations a
                INNER JOIN (
                    SELECT hash, MIN(domain_rank) as min_rank
                    FROM RankedAnimations
                    GROUP BY hash
                ) b ON a.hash = b.hash AND a.domain_rank = b.min_rank
                ORDER BY a.domain_rank, a.name
            `)
            .bind(domain, domain)
            .all();

        console.log('📍 Found animations:', animations.results);

        return new Response(JSON.stringify({ 
            animations: animations.results 
        }), {
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    } catch (error) {
        console.error('❌ Failed to fetch animations:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch animations' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }
}

export async function uploadAnimation(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as unknown as File;
        const name = formData.get('name') as string;
        const domain = formData.get('domain') as string;
        const scaleFactor = formData.get('scale_factor') as string || '100';

        if (!file || !name || !domain) {
            return new Response(JSON.stringify({ 
                error: 'Missing required fields: file, name, or domain' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Validate scale factor is between 100-500
        const scale = parseInt(scaleFactor);
        if (isNaN(scale) || scale < 100 || scale > 500) {
            return new Response(JSON.stringify({
                error: 'Scale factor must be between 100 and 500'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Get file data and create hash for deduplication
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Check if this exact file has already been uploaded
        const existingStmt = env.DB.prepare('SELECT * FROM animations WHERE domain = ? AND hash = ?')
            .bind(domain, hash);
        const existing = await existingStmt.first();
        
        if (existing) {
            // If it exists but with a different name, create a new record pointing to same R2 key
            if (existing.name !== name) {
                const result = await env.DB.prepare(`
                    INSERT INTO animations (name, r2_key, domain, scale_factor, size_bytes, hash)
                    VALUES (?, ?, ?, ?, ?, ?)
                    RETURNING *
                `).bind(name, existing.r2_key, domain, scale, arrayBuffer.byteLength, hash).first();
                
                return new Response(JSON.stringify({ 
                    success: true,
                    animation: result,
                    message: 'Created new reference to existing animation'
                }), {
                    headers: { 'Content-Type': 'application/json' }
                }) as unknown as CFResponse;
            }
            
            // If exact same name and domain, just update the scale factor
            const result = await env.DB.prepare(`
                UPDATE animations 
                SET scale_factor = ?
                WHERE domain = ? AND name = ?
                RETURNING *
            `).bind(scale, domain, name).first();
            
            return new Response(JSON.stringify({ 
                success: true,
                animation: result,
                message: 'Updated existing animation'
            }), {
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // This is a new unique file
        const r2Key = `animations/${hash}.json`;
        
        // Upload to R2
        await env.BUCKET.put(r2Key, arrayBuffer, {
            httpMetadata: { contentType: file.type }
        });

        // Store in DB
        const result = await env.DB.prepare(`
            INSERT INTO animations (name, r2_key, domain, scale_factor, size_bytes, hash)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
        `).bind(name, r2Key, domain, scale, arrayBuffer.byteLength, hash).first();

        return new Response(JSON.stringify({ 
            success: true,
            animation: result 
        }), {
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    } catch (error) {
        console.error('❌ Animation upload error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to upload animation',
            details: error instanceof Error ? error.message : String(error)
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }
}

export async function getAnimationByName(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
    try {
        const domain = request.headers.get('X-Site-Domain');
        if (!domain) {
            return new Response(JSON.stringify({ 
                error: 'Domain not provided' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        console.log('📍 Getting animation:', { params, domain });
        
        // Decode the URL-encoded parameter
        const r2Key = decodeURIComponent(params.name);
        
        // Try to get user-uploaded animation from DB/R2
        const stmt = env.DB.prepare('SELECT name, r2_key FROM animations WHERE domain = ? AND r2_key = ?')
            .bind(domain, r2Key);
        const animation = await stmt.first();
        
        if (animation) {
            console.log('✅ Found animation:', animation);
            const obj = await env.BUCKET.get(animation.r2_key as string);
            if (obj) {
                const headers = new Headers();
                headers.set('Content-Type', 'application/json');
                return new Response(obj.body as unknown as BodyInit, { headers }) as unknown as CFResponse;
            }
        }

        console.log('❌ Animation not found:', { domain, name: params.name });
        // If no custom animation found, return 404 to let the frontend fall back to local assets
        return new Response(JSON.stringify({ 
            error: 'Animation not found',
            message: 'Fallback to local asset'
        }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;

    } catch (error) {
        console.error('❌ Failed to get animation:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to get animation',
            details: error instanceof Error ? error.message : String(error)
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }
}

export async function deleteAnimation(
    request: CFRequest,
    env: Env,
    ctx: ExecutionContext,
    params: Record<string, string>
): Promise<CFResponse> {
    try {
        const domain = request.headers.get('X-Site-Domain');
        if (!domain) {
            return new Response(JSON.stringify({ 
                error: 'Domain not provided' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        const name = params.name;
        if (!name) {
            return new Response(JSON.stringify({ 
                error: 'Animation name not provided' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Get the animation details first
        const getStmt = env.DB.prepare('SELECT r2_key FROM animations WHERE domain = ? AND name = ?')
            .bind(domain, name);
        const animation = await getStmt.first();
        
        if (!animation) {
            return new Response(JSON.stringify({ 
                error: 'Animation not found' 
            }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Delete from R2
        await env.BUCKET.delete(animation.r2_key as string);

        // Delete from DB
        const deleteStmt = env.DB.prepare('DELETE FROM animations WHERE domain = ? AND name = ?')
            .bind(domain, name);
        await deleteStmt.run();

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Animation deleted successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;

    } catch (error) {
        console.error('❌ Failed to delete animation:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to delete animation',
            details: error instanceof Error ? error.message : String(error)
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }
} 