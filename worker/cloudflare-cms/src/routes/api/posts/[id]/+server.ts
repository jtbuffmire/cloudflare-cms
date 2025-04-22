import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET({ params, locals }: RequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Post ID is required');
    }

    // TODO: Implement actual post fetching from database
    const post: Post = {
      id,
      title: 'Sample Post',
      slug: 'sample-post',
      content: 'This is a sample post.',
      excerpt: 'Sample excerpt',
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function PUT({ params, request, locals }: RequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Post ID is required');
    }

    const postData = await request.json() as Post;
    // TODO: Implement actual post update in database
    const updatedPost: Post = {
      ...postData,
      id,
      updated_at: new Date().toISOString()
    };
    return json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE({ params, locals }: RequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Post ID is required');
    }

    // TODO: Implement actual post deletion from database
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting post:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 