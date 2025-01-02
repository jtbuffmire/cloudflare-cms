import { nanoid } from 'nanoid';
import { Env } from '../types';

interface FileMetadata {
  filename: string;
  size: number;
  type: string;
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
        created_at 
      FROM media 
      ORDER BY created_at DESC
    `).all();

    // console.log('Raw DB results:', results);

    const files = results.map(file => ({
      id: String(file.id),  // Use the actual id column, convert to string
      name: file.filename,
      url: `http://localhost:8787/api/media/${file.r2_key}`,
      type: file.mime_type,
      size: file.size,
      uploadedAt: file.created_at
    }));

    // console.log('Mapped files:', files);

    return new Response(JSON.stringify(files), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    // console.error('Get media error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function uploadMedia(
  request: Request, 
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // console.log("📤 Upload attempt received"); 
  try {
    const formData = await request.formData();
    const file = formData.get('file') as unknown as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const extension = file.name.split('.').pop();
    const key = `${nanoid()}.${extension}`;
    
    await env.MEDIA_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      }
    });

    // Store metadata in D1
    await env.DB.prepare(
      'INSERT INTO media (filename, r2_key, mime_type, size) VALUES (?, ?, ?, ?)'
    )
    .bind(file.name, key, file.type, file.size)
    .run();

    return new Response(
      JSON.stringify({ 
        key,
        name: file.name,
        url: `http://localhost:8787/api/media/${key}`,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }), 
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    // console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function getMediaFile(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params?: Record<string, string>
): Promise<Response> {
  try {
    const key = params?.key;
    if (!key) {
    return new Response(JSON.stringify({ error: 'Key is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
    });
  }
    const object = await env.MEDIA_BUCKET.get(key);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch file' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function deleteMedia(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    // console.log('Attempting to delete media with r2_key:', params.id);

    // Find media by r2_key instead of id
    const mediaRecord = await env.DB.prepare('SELECT * FROM media WHERE r2_key = ?')
      .bind(params.id)
      .first();

    if (!mediaRecord) {
      // console.log('Media record not found for r2_key:', params.id);
      return new Response(
        JSON.stringify({ error: 'Media not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete from R2 bucket
    await env.MEDIA_BUCKET.delete(params.id);
    
    // Delete from database using r2_key
    const result = await env.DB.prepare('DELETE FROM media WHERE r2_key = ?')
      .bind(params.id)
      .run();

    return new Response(null, { status: 204 });
  } catch (error) {
    // console.error('Delete media error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete media' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}