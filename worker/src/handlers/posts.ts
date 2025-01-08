import { nanoid } from 'nanoid';
import { Env } from '../types';
import { marked } from 'marked';

interface PostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published' | 'all';
  sortBy?: 'created_at' | 'published_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface CreatePostBody {
  title: string;
  slug: string;
  content: string;
  markdown_content?: string;
  html_content?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    coverImage?: string;
    [key: string]: any;
  };
  published?: boolean;
}

interface UpdatePostBody {
  title?: string;
  content?: string;
  markdown_content?: string;
  html_content?: string;
  slug?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    coverImage?: string;
    [key: string]: any;
  };
  published?: boolean;
}

// Add new interfaces for image handling
interface PostImageUploadResult {
    success: boolean;
    r2Key?: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    error?: string;
    existing?: boolean;
    hash?: string;
}

export async function getPosts(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Default to only published posts unless explicitly requested otherwise
    const showAll = url.searchParams.get('all') === 'true';
    
    let query = 'SELECT * FROM posts';
    const queryParams: any[] = [];

    // Only show published posts by default
    if (!showAll) {
      query += ' WHERE published = 1';
    }

    // Add sorting
    query += ' ORDER BY created_at DESC';

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    console.log('🔍 Executing query:', query, 'with params:', queryParams);

    // Get paginated results
    const posts = await env.DB.prepare(query)
      .bind(...queryParams)
      .all();

    console.log('📝 Found posts:', posts.results);

    return new Response(JSON.stringify({
      posts: posts.results,
      pagination: {
        total: posts.results.length,
        page,
        limit,
        pages: Math.ceil(posts.results.length / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch posts' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function createPost(request: Request, env: Env): Promise<Response> {
  try {
    const data = await request.json() as {
      title?: string;
      slug?: string;
      markdown_content?: string;
      content?: string;
      html_content?: string;
      metadata?: Record<string, any>;
      published?: boolean;
    };
    console.log('📝 Received post data:', data);

    // Validate required fields
    if (!data.title?.trim() || !data.slug?.trim() || !data.markdown_content?.trim()) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: { 
          title: !data.title?.trim() ? 'Title is required' : null,
          slug: !data.slug?.trim() ? 'Slug is required' : null,
          content: !data.markdown_content?.trim() ? 'Content is required' : null
        }
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { 
      title, 
      slug, 
      content, 
      markdown_content, 
      html_content,
      metadata = {}, 
      published = false 
    } = data;

    // Check if slug already exists
    const existingPost = await env.DB.prepare('SELECT slug FROM posts WHERE slug = ?')
      .bind(slug)
      .first();

    if (existingPost) {
      return new Response(
        JSON.stringify({ 
          error: 'Slug already exists',
          slug
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Log SQL operation
    console.log('🔄 Executing SQL insert with:', {
      title,
      slug,
      contentLength: content?.length,
      markdownLength: markdown_content?.length,
      htmlLength: html_content?.length,
      metadata,
      published
    });

    // Insert with all fields
    const result = await env.DB.prepare(`
      INSERT INTO posts (
        title, 
        slug, 
        content,
        markdown_content,
        html_content,
        metadata,
        published
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      title, 
      slug, 
      content,
      markdown_content || null,
      html_content || null,
      JSON.stringify(metadata),
      published ? 1 : 0
    )
    .run();

    console.log('✅ Insert successful:', result);

    const responseData = { 
      id: result.meta.last_row_id,
      title,
      slug,
      content,
      markdown_content,
      html_content,
      metadata,
      published
    };

    // Broadcast creation
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'POST_CREATE',
        data: responseData
      })
    }));

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Create post error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create post',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function getPost(request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<Response> {
  try {
      const id = params.id;

      const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
          .bind(id)
          .first();

      if (!post) {
          return new Response(JSON.stringify({ error: 'Post not found' }), { 
              status: 404,
              headers: { 'Content-Type': 'application/json' }
          });
      }

      // Parse metadata JSON for response
      const responseData = {
        ...post,
        metadata: post.metadata ? JSON.parse(post.metadata) : {}
      };

      return new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json' }
      });
  } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch post' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      });
  }
}

export async function updatePost(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as UpdatePostBody;
    console.log('🔄 Update request received:', { id: params.id, ...body });

    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(body.content);
    }
    if (body.markdown_content !== undefined) {
      updates.push('markdown_content = ?');
      values.push(body.markdown_content);
    }
    if (body.html_content !== undefined) {
      updates.push('html_content = ?');
      values.push(body.html_content);
    }
    if (body.slug !== undefined) {
      updates.push('slug = ?');
      values.push(body.slug);
    }
    if (body.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(body.metadata));
    }
    if (body.published !== undefined) {
      updates.push('published = ?');
      // Convert boolean to integer for database storage
      values.push(body.published ? 1 : 0);
      
      // Also update published_at when publishing
      if (body.published === 1) {
        updates.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    values.push(params.id);
    await env.DB.prepare(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`
    )
    .bind(...values)
    .run();

    // Get updated post data
    const updatedPost = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(params.id)
      .first();

    // Parse metadata JSON for response
    const responseData = {
      ...updatedPost,
      metadata: updatedPost?.metadata ? JSON.parse(updatedPost.metadata) : {}
    };

    // Get all posts after update
    const allPosts = await env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    console.log('📢 Broadcasting posts update with:', allPosts.results);
    
    // Broadcast update
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    
    const broadcastMessage = {
      type: 'POSTS_UPDATE',
      data: {
        posts: allPosts.results
      }
    };
    
    console.log('📤 Sending WebSocket broadcast:', broadcastMessage);
    
    await handler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcastMessage)
    }));
    
    console.log('✅ Broadcast sent');

    return new Response(JSON.stringify(allPosts.results[0]), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update post' }), 
      { status: 500 }
    );
  }
}

export async function deletePost(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  try {
    // console.log('Deleting post with ID:', params.id);
    const result = await env.DB.prepare('DELETE FROM posts WHERE id = ?')
      .bind(params.id)
      .run();

    // Broadcast deletion
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'POST_DELETE',
        data: { id: params.id }
      })
    }));

    return new Response(JSON.stringify({ id: params.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // console.error('Delete post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function uploadPostImage(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    params: { id: string }
): Promise<Response> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as unknown as File;
        
        if (!file) {
            return new Response('No file provided', { status: 400 });
        }

        // Reuse hash calculation from media handler
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Check for existing image with same hash
        const existingImage = await env.DB.prepare(`
            SELECT * FROM post_images 
            WHERE hash = ? AND post_id = ?
        `).bind(hash, params.id).first();

        if (existingImage) {
            return new Response(JSON.stringify({
                success: true,
                existing: true,
                ...existingImage
            }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate unique key for R2
        const uniqueKey = crypto.randomUUID();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const r2Key = `${uniqueKey}-${sanitizedFileName}`;

        // Upload to R2
        await env.POST_IMAGES.put(r2Key, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            }
        });

        // Insert into database
        const result = await env.DB.prepare(`
            INSERT INTO post_images (
                post_id,
                filename,
                r2_key,
                mime_type,
                size,
                hash
            ) VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
        `).bind(
            parseInt(params.id),
            sanitizedFileName,
            r2Key,
            file.type,
            file.size,
            hash
        ).first();

        if (!result) {
            throw new Error('Failed to insert image record');
        }

        // Broadcast update
        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        await handler.fetch(new Request('http://internal/broadcast', {
            method: 'POST',
            body: JSON.stringify({
                type: 'POST_IMAGE_UPLOAD',
                data: {
                    postId: params.id,
                    image: result
                }
            })
        }));

        return new Response(JSON.stringify({
            success: true,
            ...result
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ 
            error: 'Upload failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function deletePostImage(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    params: Record<string, string>
): Promise<Response> {
    try {
        // Log params for debugging
        console.log('Delete params:', params);

        // Get image details first
        const image = await env.DB.prepare(`
            SELECT * FROM post_images 
            WHERE id = ? AND post_id = ?
        `).bind(
            parseInt(params.imageId),  // Make sure we're using the correct parameter names
            parseInt(params.id)        // And converting them to integers
        ).first();

        if (!image) {
            return new Response(JSON.stringify({ 
                error: 'Image not found',
                params: params  // Include params in error for debugging
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete from R2
        await env.POST_IMAGES.delete(image.r2_key);

        // Delete from database
        await env.DB.prepare(`
            DELETE FROM post_images 
            WHERE id = ? AND post_id = ?
        `).bind(
            parseInt(params.imageId),
            parseInt(params.id)
        ).run();

        // Broadcast deletion
        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        await handler.fetch(new Request('http://internal/broadcast', {
            method: 'POST',
            body: JSON.stringify({
                type: 'POST_IMAGE_DELETE',
                data: {
                    postId: params.id,
                    imageId: params.imageId
                }
            })
        }));

        return new Response(JSON.stringify({ 
            success: true,
            deletedImage: image
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ 
            error: 'Delete failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            params: params  // Include params in error for debugging
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handlePreview(request: Request): Promise<Response> {
  try {
    const data = await request.json();
    console.log('Preview request data:', data);

    // Check for either 'markdown' or 'markdown_content'
    const markdownContent = data.markdown || data.markdown_content;

    if (!markdownContent) {
      return new Response(JSON.stringify({
        error: 'Missing markdown content',
        receivedData: data // Log what we received for debugging
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const html = marked(markdownContent);
    return new Response(JSON.stringify({ html }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Preview error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate preview',
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