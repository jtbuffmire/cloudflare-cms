import type { ExecutionContext, Headers as CFHeaders, Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';
import { verify } from '@tsndr/cloudflare-worker-jwt';
import type { Env } from '../types';
import { API_VSN } from '../lib/api';

interface PicsFileMetadata {
  filename: string;
  size: number;
  type: string;
  original_url: string | null;
}

interface UpdatePicsRequest {
  filename?: string;
  published?: boolean;
  show_in_blog?: boolean;
  show_in_pics?: boolean;
  text_description?: string | null;
  text_description_visible?: boolean;
}

interface PicsFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  published: boolean;
  hash?: string;
}

interface PicsMetadata {
  description: string;
  show_description: boolean;
}

interface DBPicsFile {
  id: string;
  filename: string;
  r2_key: string;
  mime_type: string;
  size: number;
  created_at: string;
  published: number;
  show_in_blog: number;
  show_in_pics: number;
  text_description: string | null;
  text_description_visible: number;
  hash: string;
}

interface R2Object {
  key: string;
  size: number;
}

export async function getPics(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM pics
      ORDER BY created_at DESC
    `).all<DBPicsFile>();

    // console.log('📤 Raw DB results:', results);

    // Format the files before sending
    const files = results.map((file: DBPicsFile) => ({
      id: file.id,
      name: file.filename,
      url: `/pics/${file.r2_key}`,
      type: file.mime_type,
      size: file.size,
      uploadedAt: file.created_at,
      published: Boolean(file.published),
      show_in_blog: Boolean(file.show_in_blog),
      show_in_pics: Boolean(file.show_in_pics),
      text_description: file.text_description,
      text_description_visible: Boolean(file.text_description_visible)
    }));

    console.log('📤 Formatted files:', files);

    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to get pics',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
}

export async function uploadPics(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  console.log('📦 Starting upload process...');

  try {
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return new Response('Missing domain header', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    const formData = await request.formData();
    const file = formData.get('file') as unknown as File;
    
    if (!file) {
      return new Response('No file provided', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Get file metadata
    const metadata: PicsFileMetadata = {
      filename: file.name,
      size: file.size,
      type: file.type,
      original_url: null
    };

    // Get the array buffer once and reuse it
    const arrayBuffer = await file.arrayBuffer();

    // Compute file hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('📝 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      hash: hash,
      domain: domain
    });

    // Check for existing file with same hash
    const existingFile = await env.DB.prepare(
      'SELECT * FROM pics WHERE hash = ? AND domain = ?'
    ).bind(hash, domain).first();

    if (existingFile) {
      console.log('🔍 Found existing file with same hash:', existingFile);
      
      // Verify the file still exists in R2
      const r2Object = await env.BUCKET.get(existingFile.r2_key as string);
      if (!r2Object) {
        console.log('⚠️ Existing file not found in R2, cleaning up DB entry');
        await env.DB.prepare('DELETE FROM pics WHERE hash = ? AND domain = ?').bind(hash, domain).run();
      } else {
        console.log('✅ Existing file found in both DB and R2');
        return new Response(JSON.stringify({
          duplicate: true,
          file: {
            id: existingFile.id,
            name: existingFile.filename,
            url: `${API_VSN}/pics/${existingFile.r2_key}`,
            type: existingFile.mime_type,
            size: existingFile.size,
            uploadedAt: existingFile.created_at,
            published: Boolean(existingFile.published),
            show_in_blog: Boolean(existingFile.show_in_blog),
            show_in_pics: Boolean(existingFile.show_in_pics),
            text_description: existingFile.text_description,
            text_description_visible: Boolean(existingFile.text_description_visible),
            hash: existingFile.hash
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      }
    }

    // Generate unique key for R2
    const uniqueKey = crypto.randomUUID();
    // Remove spaces and special characters from filename
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `${uniqueKey}-${sanitizedFileName}`;
    
    console.log('⬆️ Starting R2 upload...', { r2Key });

    // Upload to R2
    await env.BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      }
    });
    
    console.log('✅ R2 upload complete');

    // Insert into database
    const result = await env.DB.prepare(`
      INSERT INTO pics (
        filename,
        r2_key,
        content_type,
        hash,
        mime_type,
        size,
        original_url,
        domain
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sanitizedFileName,
      r2Key,
      file.type,
      hash,
      file.type,
      file.size,
      `/pics/${r2Key}`,
      domain
    ).first();

    if (!result) {
      throw new Error('Failed to insert pics record');
    }

    console.log('✅ Database insert complete:', result);

    // Format response data
    const responseData = {
      id: result.id,
      name: result.filename,
      url: `/pics/${result.r2_key}`,
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

    // Broadcast creation via WebSocket
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Domain': domain
      },
      body: JSON.stringify({
        type: 'PICS_CREATE',
        domain,
        data: {
          ...responseData,
          domain
        }
      })
    }));

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;

  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
}

export async function getPicsFile(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const key = params.id;
    const url = new URL(request.url);

    if (!key) {
      return new Response('Missing file key', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    console.log('🔍 Attempting to fetch from R2:', key);
    
    // Get domain from header or query parameter
    const domain = request.headers.get('X-Site-Domain') || url.searchParams.get('domain');
    if (!domain) {
      return new Response('Missing domain', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }
    
    // First check if file exists in database
    const dbFile = await env.DB.prepare(
      'SELECT * FROM pics WHERE r2_key = ? AND domain = ?'
    ).bind(key, domain).first<DBPicsFile>();

    if (!dbFile) {
      console.log('❌ File not found in database:', key);
      return new Response('File not found', { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Only check auth for unpublished files
    if (!dbFile.published) {
      // Check authorization from header or query parameter
      let token = null;
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = url.searchParams.get('token');
      }

      if (!token) {
        return new Response('Unauthorized', { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      }

      try {
        // Development bypass for dummy token
        if (env.ENVIRONMENT === 'development' && token === 'dummy-token') {
          // Allow access
        } else {
          // Verify JWT token
          const isValid = await verify(token, env.JWT_SECRET);
          if (!isValid) {
            throw new Error('Invalid token');
          }
        }
      } catch (error) {
        return new Response('Invalid token', { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
      }
    }
    
    const object = await env.BUCKET.get(key);
    
    if (!object) {
      console.log('❌ File not found in R2, removing from database');
      // Clean up the orphaned database entry
      await env.DB.prepare('DELETE FROM pics WHERE r2_key = ?').bind(key).run();
      return new Response('File not found', { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    console.log('✅ File found in R2:', {
      key,
      contentType: object.httpMetadata?.contentType,
      size: object.size
    });

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body as unknown as BodyInit, { headers }) as unknown as CFResponse;
  } catch (error) {
    console.error('❌ Error fetching file:', {
      key: params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response('Error fetching file', { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
}

export async function deletePics(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const key = params.id;
    if (!key) {
      console.error('❌ No file key in params:', params);
      return new Response(JSON.stringify({ error: 'Missing file key' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    console.log('🗑️ Delete request received:', {
      key,
      params,
      headers: Object.fromEntries((request.headers as unknown as CFHeaders).entries())
    });

    // Delete from R2
    await env.BUCKET.delete(key);
    
    // Delete from database
    const result = await env.DB.prepare(`
      DELETE FROM pics 
      WHERE r2_key = ?
      RETURNING *
    `).bind(key).first();

    if (!result) {
      return new Response(JSON.stringify({ error: 'File not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Broadcast deletion via WebSocket
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Missing domain header' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Domain': domain
      },
      body: JSON.stringify({
        type: 'PICS_DELETE',
        domain,
        data: { 
          key,
          domain
        }
      })
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;

  } catch (error) {
    console.error('❌ Delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete pics',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
}

// Add this maintenance function
export async function cleanupOrphanedFiles(env: Env): Promise<CFResponse> {
  try {
    // 1. Get all files from database
    const { results } = await env.DB.prepare(`
      SELECT r2_key FROM pics
    `).all<{ r2_key: string }>();
    
    const dbKeys = new Set(results.map((f: { r2_key: string }) => f.r2_key));
    
    // 2. Get all files from R2
    const r2List = await env.BUCKET.list();
    
    // 3. Find orphaned files
    const orphanedFiles = r2List.objects.filter((obj: R2Object) => !dbKeys.has(obj.key));
    
    // 4. Delete orphaned files
    const deletePromises = orphanedFiles.map((file: R2Object) => 
      env.BUCKET.delete(file.key)
    );
    
    await Promise.all(deletePromises);
    
    // Broadcast cleanup via WebSocket
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'PICS_CLEANUP',
        data: {
          deletedKeys: orphanedFiles.map((f: R2Object) => f.key)
        }
      })
    }));

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${orphanedFiles.length} orphaned files`,
      orphanedFiles: orphanedFiles.map((f: R2Object) => f.key)
    }), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 }) as unknown as CFResponse;
  }
}

export async function updatePics(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
    try {
        const fileKey = params.id;
        if (!fileKey) {
            return new Response(JSON.stringify({
                error: 'Missing file key'
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        const data = await request.json() as UpdatePicsRequest;
        console.log('📝 Update request:', {
            fileKey,
            data,
            params,
            headers: Object.fromEntries((request.headers as unknown as CFHeaders).entries())
        });
        
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
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Build dynamic update query based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        
        if (data.filename !== undefined) {
            updates.push('filename = ?');
            values.push(data.filename);
        }
        if (data.published !== undefined) {
            updates.push('published = ?');
            values.push(data.published ? 1 : 0);
        }
        if (data.show_in_blog !== undefined) {
            updates.push('show_in_blog = ?');
            values.push(data.show_in_blog ? 1 : 0);
        }
        if (data.show_in_pics !== undefined) {
            updates.push('show_in_pics = ?');
            values.push(data.show_in_pics ? 1 : 0);
        }
        if (data.text_description !== undefined) {
            updates.push('text_description = ?');
            values.push(data.text_description);
        }
        if (data.text_description_visible !== undefined) {
            updates.push('text_description_visible = ?');
            values.push(data.text_description_visible ? 1 : 0);
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
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
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
                headers: { 'Content-Type': 'application/json' }
            }) as unknown as CFResponse;
        }

        // Format response data
        const responseData = {
            id: result.id,
            name: result.filename,
            url: `/pics/${result.r2_key}`,
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
        const domain = request.headers.get('X-Site-Domain');
        if (!domain) {
          return new Response(JSON.stringify({ error: 'Missing domain header' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }) as unknown as CFResponse;
        }

        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        await handler.fetch(new Request('https://internal/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Domain': domain
          },
          body: JSON.stringify({
            type: 'PICS_UPDATE',
            domain,
            data: {
              ...responseData,
              domain
            }
          })
        }));

        return new Response(JSON.stringify(responseData), {
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;

    } catch (error) {
        console.error('❌ Update error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update pics',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }
}

export async function updatePicsMetadata(request: CFRequest, env: Env, picsId: string): Promise<CFResponse> {
  try {
    const data = await request.json() as PicsMetadata;
    
    await env.DB.prepare(`
      INSERT OR REPLACE INTO pics_metadata (
        pics_id, description, show_description
      ) VALUES (?, ?, ?)
    `).bind(
      picsId,
      data.description,
      data.show_description
    ).run();

    // Broadcast metadata update
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'PICS_METADATA_UPDATE',
        data: {
          id: picsId,
          ...data
        }
      })
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to update pics metadata',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 }) as unknown as CFResponse;
  }
}


