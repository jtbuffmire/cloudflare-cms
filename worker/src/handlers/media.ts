import { nanoid } from 'nanoid';
import { Env } from '../types';

interface FileMetadata {
  filename: string;
  size: number;
  type: string;
}

interface UpdateMediaRequest {
  filename?: string;
  published?: boolean;
  show_in_blog?: boolean;
  show_in_pics?: boolean;
}

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  published: boolean;
  hash?: string;
}

export async function getMedia(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        id,
        filename,
        r2_key,
        mime_type,
        size,
        created_at,
        published,
        show_in_blog,
        show_in_pics
      FROM media 
      ORDER BY created_at DESC
    `).all();

    const files = results.map(file => ({
      id: String(file.id),
      name: file.filename,
      url: `http://localhost:8787/api/media/${file.r2_key}`,
      type: file.mime_type,
      size: file.size,
      uploadedAt: file.created_at,
      published: Boolean(file.published),
      show_in_blog: Boolean(file.show_in_blog),
      show_in_pics: Boolean(file.show_in_pics)
    }));

    return new Response(JSON.stringify(files), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function uploadMedia(request: Request, env: Env): Promise<Response> {
  console.log('📦 Starting upload process...');

  try {
    const formData = await request.formData();
    const file = formData.get('file') as unknown as File;
    
    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    // Compute file hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('📝 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      hash: hash
    });

    // Check for existing file with same hash
    const existingFile = await env.DB.prepare(
      'SELECT * FROM media WHERE hash = ?'
    ).bind(hash).first();

    if (existingFile) {
      console.log('🔍 Found existing file with same hash:', existingFile);
      
      // Verify the file still exists in R2
      const r2Object = await env.MEDIA_BUCKET.get(existingFile.r2_key);
      if (!r2Object) {
        console.log('⚠️ Existing file not found in R2, cleaning up DB entry');
        await env.DB.prepare('DELETE FROM media WHERE hash = ?').bind(hash).run();
      } else {
        console.log('✅ Existing file found in both DB and R2');
        return new Response(JSON.stringify({
          duplicate: true,
          file: {
            id: existingFile.id,
            name: existingFile.filename,
            url: `http://localhost:8787/api/media/${existingFile.r2_key}`,
            type: existingFile.mime_type,
            size: existingFile.size,
            uploadedAt: existingFile.created_at,
            published: existingFile.published,
            hash: existingFile.hash
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate unique key for R2
    const uniqueKey = crypto.randomUUID();
    // Remove spaces and special characters from filename
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `${uniqueKey}-${sanitizedFileName}`;
    
    console.log('⬆️ Starting R2 upload...', { r2Key });

    // Upload to R2
    await env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      }
    });
    
    console.log('✅ R2 upload complete');

    // Insert into database
    const result = await env.DB.prepare(`
      INSERT INTO media (
        filename,
        r2_key,
        content_type,
        hash,
        mime_type,
        size
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sanitizedFileName,
      r2Key,
      file.type,
      hash,
      file.type,
      file.size
    ).first();

    if (!result) {
      throw new Error('Failed to insert media record');
    }

    console.log('✅ Database insert complete:', result);

    return new Response(JSON.stringify({
      id: result.id,
      name: result.filename,
      url: `http://localhost:8787/api/media/${r2Key}`,
      type: result.mime_type,
      size: result.size,
      uploadedAt: result.created_at,
      published: result.published,
      hash: result.hash
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function getMediaFile(request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<Response> {
  try {
    const key = params.key;
    console.log('🔍 Attempting to fetch from R2:', key);
    
    // First check if file exists in database
    const dbFile = await env.DB.prepare(
      'SELECT * FROM media WHERE r2_key = ?'
    ).bind(key).first();

    if (!dbFile) {
      console.log('❌ File not found in database:', key);
      return new Response('File not found', { status: 404 });
    }
    
    const object = await env.MEDIA_BUCKET.get(key);
    
    if (!object) {
      console.log('❌ File not found in R2, removing from database');
      // Clean up the orphaned database entry
      await env.DB.prepare('DELETE FROM media WHERE r2_key = ?').bind(key).run();
      return new Response('File not found', { status: 404 });
    }

    console.log('✅ File found in R2:', {
      key,
      contentType: object.httpMetadata?.contentType,
      size: object.size
    });

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('❌ Error fetching file:', {
      key: params.key,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response('Error fetching file', { status: 500 });
  }
}

export async function deleteMedia(request: Request, env: Env, key: string): Promise<Response> {
  console.log('🗑️ Delete request for key:', key);
  
  try {
    // First, verify the file exists and get its details
    const file = await env.DB.prepare(`
      SELECT * FROM media WHERE r2_key = ?
    `).bind(key).first();
    
    console.log('🔍 Found file in database:', file);
    
    if (!file) {
      console.log('❌ File not found in database');
      return new Response(JSON.stringify({ 
        error: 'File not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from R2
    console.log('🗑️ Deleting from R2:', key);
    await env.MEDIA_BUCKET.delete(key);
    
    // Delete from database using the r2_key
    console.log('🗑️ Deleting from database');
    const result = await env.DB.prepare('DELETE FROM media WHERE r2_key = ?')
      .bind(key)
      .run();
    
    console.log('📊 Delete result:', result);

    // Broadcast deletion via WebSocket with more details
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_DELETE',
        data: { 
          key,
          id: file.id,  // Include the ID for better client-side handling
          r2_key: file.r2_key
        }
      })
    }));

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Media deleted successfully',
      deletedFile: {
        id: file.id,
        r2_key: file.r2_key
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add this maintenance function
export async function cleanupOrphanedFiles(env: Env): Promise<Response> {
  try {
    // 1. Get all files from database
    const { results: dbFiles } = await env.DB.prepare(`
      SELECT r2_key FROM media
    `).all();
    
    const dbKeys = new Set(dbFiles.map(f => f.r2_key));
    
    // 2. Get all files from R2
    const r2List = await env.MEDIA_BUCKET.list();
    
    // 3. Find orphaned files
    const orphanedFiles = r2List.objects.filter(obj => !dbKeys.has(obj.key));
    
    // 4. Delete orphaned files
    const deletePromises = orphanedFiles.map(file => 
      env.MEDIA_BUCKET.delete(file.key)
    );
    
    await Promise.all(deletePromises);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${orphanedFiles.length} orphaned files`,
      orphanedFiles: orphanedFiles.map(f => f.key)
    }));
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

export async function updateMedia(request: Request, env: Env, fileId: string): Promise<Response> {
  try {
    const data = await request.json() as UpdateMediaRequest;
    
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

    // Add the ID to values array
    values.push(Number(fileId));

    // Execute update
    const stmt = env.DB.prepare(`
      UPDATE media 
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `);
    
    const result = await stmt.bind(...values).first();

    if (!result) {
      return new Response('Media not found', { status: 404 });
    }

    // Format response data
    const responseData = {
      id: result.id,
      name: result.filename,
      url: `http://localhost:8787/api/media/${result.r2_key}`,
      type: result.mime_type,
      size: result.size,
      uploadedAt: result.created_at,
      published: Boolean(result.published),
      show_in_blog: Boolean(result.show_in_blog),
      show_in_pics: Boolean(result.show_in_pics),
      hash: result.hash
    };

    // Broadcast update via WebSocket
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_UPDATE',
        data: responseData
      })
    }));

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


