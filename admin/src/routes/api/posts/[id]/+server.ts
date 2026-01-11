import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Post } from '$lib/types';

// Reference to the mock posts array from the parent endpoint
// In a real app, this would be a database query
declare const mockPosts: Post[];

export async function GET({ params }: RequestEvent) {
  const post = mockPosts.find(p => p.id === params.id);
  
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }
  
  return json(post);
}

interface UpdatePostRequest {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  published?: boolean;
}

export async function PUT({ params, request }: RequestEvent) {
  const postIndex = mockPosts.findIndex(p => p.id === params.id);
  
  if (postIndex === -1) {
    return new Response('Post not found', { status: 404 });
  }
  
  const updates = await request.json() as UpdatePostRequest;
  const updatedPost: Post = {
    ...mockPosts[postIndex],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  mockPosts[postIndex] = updatedPost;
  return json(updatedPost);
}

export async function DELETE({ params }: RequestEvent) {
  const postIndex = mockPosts.findIndex(p => p.id === params.id);
  
  if (postIndex === -1) {
    return new Response('Post not found', { status: 404 });
  }
  
  mockPosts.splice(postIndex, 1);
  return new Response(null, { status: 204 });
} 