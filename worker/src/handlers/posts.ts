import { marked } from 'marked';
import type { CFRequest, CFResponse, Env, ExecutionContext } from '../types';

interface PostQueryParams {
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
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
  show_date?: boolean;
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
  show_date?: boolean;
}

export async function getPosts(
  request: CFRequest, 
  env: Env, 
  ctx: ExecutionContext, 
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const url = new URL(request.url);
    const domain = request.headers.get('X-Site-Domain');
    
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Missing domain header' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM posts WHERE domain = ?';
    const queryParams: any[] = [domain];

    // Only show published posts if explicitly requested
    if (url.searchParams.get('published') === 'true') {
      query += ' AND published = 1';
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

    // Parse metadata for each post
    const parsedPosts = posts.results.map(post => ({
      ...post,
      published: Boolean(post.published),
      metadata: typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata
    }));

    return new Response(JSON.stringify({
      posts: parsedPosts,
      pagination: {
        total: posts.results.length,
        page,
        limit,
        pages: Math.ceil(posts.results.length / limit)
      }
    })) as unknown as CFResponse;

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
}

export async function createPost(
  request: CFRequest, 
  env: Env, 
  ctx: ExecutionContext, 
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const headerDomain = request.headers.get('X-Site-Domain');
    if (!headerDomain) {
      return new Response(JSON.stringify({ error: 'Missing domain header' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    const data = await request.json() as {
      title?: string;
      slug?: string;
      markdown_content?: string;
      content?: string;
      html_content?: string;
      metadata?: Record<string, any>;
      published?: boolean;
      domain?: string;
      show_date?: boolean;
    };

    // Force the domain from the header
    data.domain = headerDomain;

    console.log('📝 Received post data:', data);

    // Validate required fields
    if (!data.title?.trim() || !data.slug?.trim() || !data.markdown_content?.trim() || !data.domain?.trim()) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: { 
          title: !data.title?.trim() ? 'Title is required' : null,
          slug: !data.slug?.trim() ? 'Slug is required' : null,
          content: !data.markdown_content?.trim() ? 'Content is required' : null,
          domain: !data.domain?.trim() ? 'Domain is required' : null
        }
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Check if slug already exists
    const existingPost = await env.DB.prepare('SELECT slug FROM posts WHERE slug = ?')
      .bind(data.slug)
      .first();

    if (existingPost) {
      return new Response(
        JSON.stringify({ 
          error: 'Slug already exists',
          slug: data.slug
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      ) as unknown as CFResponse;
    }

    // Log SQL operation
    console.log('🔄 Executing SQL insert with:', {
      title: data.title,
      slug: data.slug,
      contentLength: data.content?.length,
      markdownLength: data.markdown_content?.length,
      htmlLength: data.html_content?.length,
      metadata: data.metadata,
      published: data.published
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
        published,
        domain,
        show_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      data.title, 
      data.slug, 
      data.content,
      data.markdown_content || null,
      data.html_content || null,
      JSON.stringify(data.metadata),
      data.published ? 1 : 0,
      data.domain,
      data.show_date === false ? 0 : 1
    )
    .run();

    console.log('✅ Insert successful:', result);

    const responseData = { 
      id: result.meta.last_row_id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      markdown_content: data.markdown_content,
      html_content: data.html_content,
      metadata: data.metadata,
      published: data.published,
      domain: data.domain,
      show_date: data.show_date === false ? false : true
    };

    // Broadcast creation
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'POST_CREATE',
        data: responseData
      })
    });

    return new Response(JSON.stringify(responseData), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;

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
    ) as unknown as CFResponse;
  }
}

export async function getPost(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
      const id = params?.id;
      const domain = request.headers.get('X-Site-Domain');

      const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ? AND domain = ?')
          .bind(id, domain)
          .first();

      if (!post) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
              status: 401,
              headers: { 'Content-Type': 'application/json' }
          }) as unknown as CFResponse;
      }

      // Parse metadata JSON for response
      const responseData = {
        ...post,
        metadata: post.metadata ? JSON.parse(post.metadata as string) : {}
      };

      return new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
  } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch post' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
  }
}

export async function updatePost(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Missing domain header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    const existingPost = await env.DB.prepare('SELECT id FROM posts WHERE id = ? AND domain = ?')
        .bind(params.id, domain)
        .first();

    if (!existingPost) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as CFResponse;
    }

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
      values.push(body.published ? 1 : 0);
      
      if (body.published) {
        updates.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (body.show_date !== undefined) {
      updates.push('show_date = ?');
      values.push(body.show_date ? 1 : 0);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ) as unknown as CFResponse;
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
      metadata: updatedPost?.metadata ? JSON.parse(updatedPost.metadata as string) : {}
    };

    // Get all posts after update
    const allPosts = await env.DB.prepare('SELECT * FROM posts WHERE domain = ? ORDER BY created_at DESC')
      .bind(domain)
      .all();
    console.log('📢 Broadcasting posts update with:', allPosts.results);
    
    // Parse metadata for each post in the broadcast
    const parsedPosts = allPosts.results.map(post => ({
      ...post,
      metadata: typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata
    }));
    
    // Broadcast update
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    
    const broadcastMessage = {
      type: 'POSTS_UPDATE',
      data: {
        posts: parsedPosts,
        domain
      }
    };
    
    // console.log('📤 Sending WebSocket broadcast:', broadcastMessage);
    
    await handler.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcastMessage)
    });
    
    console.log('✅ Broadcast sent');

    return new Response(JSON.stringify(allPosts.results[0]), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;

  } catch (error) {
    console.error('❌ Update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update post' }), 
      { status: 500 }
    ) as unknown as CFResponse;
  }
}

export async function deletePost(
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<CFResponse> {
  try {
    const domain = request.headers.get('X-Site-Domain');
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Missing domain header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // First check if the post exists and belongs to this domain
    const existingPost = await env.DB.prepare('SELECT id FROM posts WHERE id = ? AND domain = ?')
      .bind(params.id, domain)
      .first();

    if (!existingPost) {
      return new Response(JSON.stringify({ error: 'Post not found or unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // If we get here, the post exists and belongs to this domain, so we can delete it
    const result = await env.DB.prepare('DELETE FROM posts WHERE id = ? AND domain = ?')
      .bind(params.id, domain)
      .run();

    // Broadcast deletion
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    await handler.fetch('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'POST_DELETE',
        data: { id: params.id, domain }
      })
    });

    return new Response(JSON.stringify({ id: params.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  } catch (error) {
    // console.error('Delete post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ) as unknown as CFResponse;
  }
}

export async function handlePreview(request: Request): Promise<Response> {
  try {
    const data = await request.json() as { markdown?: string; markdown_content?: string };
    const markdownContent = data.markdown || data.markdown_content;
    console.log('Preview request data:', data);

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
      }) as unknown as Response;
    }

    const html = marked(markdownContent);
    return new Response(JSON.stringify({ html }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }) as unknown as Response;
  } catch (error) {
    console.error('Preview error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate preview',
      details: error instanceof Error ? error.message : String(error)
    })) as unknown as Response;
  }
}