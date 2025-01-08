import { nanoid } from 'nanoid';
import { Env } from '../types';

interface FileMetadata {
  filename: string;
  size: number;
  type: string;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  original_url: string | null;
}

interface UpdateMediaRequest {
  filename?: string;
  published?: boolean;
  show_in_blog?: boolean;
  show_in_pics?: boolean;
  text_description?: string | null;
  text_description_visible?: boolean;
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

export async function getMedia(request: Request, env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM media
      ORDER BY created_at DESC
    `).all();

    console.log('📤 Raw DB results:', results);

    // Format the files before sending
    const files = results.map(file => ({
      id: file.id,
      name: file.filename,
      url: `http://localhost:8787/api/media/${file.r2_key}`,
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
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to get media',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
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

    // Get file metadata including dimensions
    const metadata: FileMetadata = {
      filename: file.name,
      size: file.size,
      type: file.type,
      width: null,
      height: null,
      aspect_ratio: null,
      original_url: null
    };

    // Get the array buffer once and reuse it
    const arrayBuffer = await file.arrayBuffer();

    // Compute file hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // If it's an image, get dimensions
    if (file.type.startsWith('image/')) {
      try {
        const blob = new Blob([arrayBuffer], { type: file.type });
        const imageBitmap = await createImageBitmap(blob);
        
        metadata.width = imageBitmap.width;
        metadata.height = imageBitmap.height;
        metadata.aspect_ratio = imageBitmap.width / imageBitmap.height;
      } catch (error) {
        console.warn('Failed to get image dimensions:', error);
      }
    }

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
        size,
        original_url,
        width,
        height,
        aspect_ratio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sanitizedFileName,
      r2Key,
      file.type,
      hash,
      file.type,
      file.size,
      `http://localhost:8787/api/media/${r2Key}`,
      null, // width - to be populated later
      null, // height - to be populated later
      null  // aspect_ratio - to be populated later
    ).first();

    if (!result) {
      throw new Error('Failed to insert media record');
    }

    console.log('✅ Database insert complete:', result);

    // Format response data
    const responseData = {
      id: result.id,
      name: result.filename,
      url: `http://localhost:8787/api/media/${result.r2_key}`,
      type: result.mime_type,
      size: result.size,
      uploadedAt: result.created_at,
      published: Boolean(result.published),
      hash: result.hash
    };

    // Broadcast creation via WebSocket
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_CREATE',
        data: responseData
      })
    });

    return new Response(JSON.stringify(responseData), {
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

    // Broadcast deletion via WebSocket
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_DELETE',
        data: { id: file.id }
      })
    });

    return new Response(JSON.stringify({
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
    
    // Broadcast cleanup via WebSocket
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_CLEANUP',
        data: {
          deletedKeys: orphanedFiles.map(f => f.key)
        }
      })
    });

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
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add the ID to values array
        values.push(Number(fileId));

        const query = `
            UPDATE media 
            SET ${updates.join(', ')}
            WHERE id = ?
            RETURNING *
        `;
        
        console.log('📝 Executing SQL:', query);
        console.log('📝 With values:', values);
        
        const stmt = env.DB.prepare(query);
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
            text_description: result.text_description,
            text_description_visible: Boolean(result.text_description_visible),
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

export async function updateMediaMetadata(request: Request, env: Env, mediaId: string): Promise<Response> {
  try {
    const data = await request.json() as MediaMetadata;
    
    await env.DB.prepare(`
      INSERT OR REPLACE INTO media_metadata (
        media_id, description, show_description
      ) VALUES (?, ?, ?)
    `).bind(
      mediaId,
      data.description,
      data.show_description
    ).run();

    // Broadcast metadata update
    const doId = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(doId);
    await handler.fetch('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'MEDIA_METADATA_UPDATE',
        data: {
          id: mediaId,
          ...data
        }
      })
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to update media metadata',
      details: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
  }
}


