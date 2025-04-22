import type { Env } from '../../types';
import type { D1Result } from '@cloudflare/workers-types';
import { API_VSN } from '../../lib/config';

interface UpdatePicsRequest {
  filename?: string;
  published?: boolean;
  show_in_blog?: boolean;
  show_in_pics?: boolean;
  text_description?: string | null;
  text_description_visible?: boolean;
}

export async function updatePics(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
    try {
        const fileKey = params.id;
        if (!fileKey) {
            return new Response(JSON.stringify({
                error: 'Missing file key'
            }), { 
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // First verify the file exists
        const existingFile = await env.DB.prepare(
            'SELECT * FROM pics WHERE r2_key = ?'
        ).bind(fileKey).first();

        if (!existingFile) {
            console.error('❌ File not found:', fileKey);
            return new Response(JSON.stringify({
                error: 'File not found',
                key: fileKey
            }), { 
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        const data = await request.json() as UpdatePicsRequest;
        console.log('📝 Update request data:', data);
        
        // Build dynamic update query based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        
        if (data.filename !== undefined) {
            updates.push('filename = ?');
            values.push(data.filename);
        }
        if (data.published !== undefined) {
            updates.push('published = ?');
            values.push(Number(data.published));
        }
        if (data.show_in_blog !== undefined) {
            updates.push('show_in_blog = ?');
            values.push(Number(data.show_in_blog));
        }
        if (data.show_in_pics !== undefined) {
            updates.push('show_in_pics = ?');
            values.push(Number(data.show_in_pics));
        }
        if (data.text_description !== undefined) {
            updates.push('text_description = ?');
            values.push(data.text_description);
        }
        if (data.text_description_visible !== undefined) {
            updates.push('text_description_visible = ?');
            values.push(Number(data.text_description_visible));
        }

        console.log('📝 Updates:', updates);
        console.log('📝 Values:', values);

        // Check if we have any updates
        if (updates.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'No fields to update',
                receivedData: data
            }), { 
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Add the r2_key to values array
        values.push(fileKey);

        const query = `
            UPDATE pics 
            SET ${updates.join(', ')}
            WHERE r2_key = ?
            RETURNING *
        `;
        
        console.log('📝 Executing SQL:', query);
        console.log('📝 With values:', values);
        
        const result = await env.DB.prepare(query).bind(...values).first();
        
        if (!result) {
            console.error('❌ Update failed:', fileKey);
            return new Response(JSON.stringify({
                error: 'Update failed',
                key: fileKey
            }), { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Format response data
        const responseData = {
            id: result.id,
            name: result.filename,
            url: `${API_VSN}/pics/${result.r2_key}`,
            type: result.mime_type,
            size: result.size,
            uploadedAt: result.created_at,
            published: Boolean(result.published),
            show_in_blog: Boolean(result.show_in_blog),
            show_in_pics: Boolean(result.show_in_pics),
            text_description: result.text_description,
            text_description_visible: Boolean(result.text_description_visible),
            hash: result.hash
        };

        // Broadcast update via WebSocket
        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        await handler.fetch('https://internal/broadcast', {
            method: 'POST',
            body: JSON.stringify({
                type: 'PICS_UPDATE',
                data: responseData
            })
        });

        return new Response(JSON.stringify(responseData), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });

    } catch (error) {
        console.error('❌ Update error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update pictures',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
} 