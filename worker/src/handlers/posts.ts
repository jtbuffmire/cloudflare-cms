import { nanoid } from 'nanoid';
import { Env } from '../types';

interface PostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published' | 'all';
  sortBy?: 'created_at' | 'published_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export async function getPosts(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM posts';
    const queryParams: any[] = [];

    // Add filters if present
    const published = url.searchParams.get('published');
    if (published !== null) {
      query += ' WHERE published = ?';
      queryParams.push(published === 'true' ? 1 : 0);
    }

    // Add sorting
    query += ' ORDER BY created_at DESC';

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    // Get total count for pagination
    const countQuery = published !== null 
      ? await env.DB.prepare('SELECT COUNT(*) as total FROM posts WHERE published = ?').bind(published === 'true' ? 1 : 0).first()
      : await env.DB.prepare('SELECT COUNT(*) as total FROM posts').first();
    
    const total = countQuery?.total || 0;

    // Get paginated results
    const posts = await env.DB.prepare(query)
      .bind(...queryParams)
      .all();

    return new Response(JSON.stringify({
      posts: posts.results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // console.error('Error fetching posts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch posts' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function createPost(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    // console.log('Received request:', {
    //   headers: Object.fromEntries(request.headers),
    //   method: request.method
    // });

    const body = await request.json();
    // console.log('Received payload:', body);

    const { title, slug, content, published = false } = body;

    // Validate required fields
    if (!title || !slug || !content) {
      // console.log('Validation failed:', { title, slug, content });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['title', 'slug', 'content'],
          received: { title, slug, content }
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // console.log('Attempting DB insert with:', { title, slug, content, published });

    const result = await env.DB.prepare(
      'INSERT INTO posts (title, slug, content, published) VALUES (?, ?, ?, ?)'
    )
    .bind(title, slug, content, published ? 1 : 0)
    .run();

    // console.log('DB insert successful:', result);

    return new Response(JSON.stringify({ id: result.lastRowId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // console.error('Create post error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create post',
        details: error instanceof Error ? error.message : String(error)
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
      // console.log('Fetching post with ID:', id); // Debug log

      const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
          .bind(id)
          .first();

      // console.log('Found post:', post); // Debug log

      if (!post) {
          return new Response(JSON.stringify({ error: 'Post not found' }), { 
              status: 404,
              headers: { 'Content-Type': 'application/json' }
          });
      }

      return new Response(JSON.stringify(post), {
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
      const { title, content, slug, published } = await request.json();
      // console.log('Update payload:', { title, content, slug, published });
      // console.log('Post ID:', params.id);
      
      // Verify post exists
      const existing = await env.DB.prepare(
          'SELECT id FROM posts WHERE id = ?'
      )
      .bind(params.id)
      .first();

      if (!existing) {
          return new Response(
              JSON.stringify({ error: 'Post not found' }), 
              { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
      }

      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      
      if (title !== undefined) {
          updates.push('title = ?');
          values.push(title);
      }
      if (content !== undefined) {
          updates.push('content = ?');
          values.push(content);
      }
      if (slug !== undefined) {
          updates.push('slug = ?');
          values.push(slug);
      }
      if (published !== undefined) {
          updates.push('published = ?');
          updates.push('published_at = ?');
          values.push(published);
          values.push(published ? new Date().toISOString() : null);
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

      return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
      });
  } catch (error) {
      // console.error('Update error:', error);
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          return new Response(
              JSON.stringify({ error: 'Slug must be unique' }), 
              { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }
      return new Response(
          JSON.stringify({ error: 'Failed to update post' }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } }
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

    return new Response(JSON.stringify({ id: result.meta.last_row_id }), {
      status: 201,
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