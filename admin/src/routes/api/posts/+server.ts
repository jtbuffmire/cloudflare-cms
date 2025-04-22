import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Post } from '$lib/types';

interface CreatePostRequest {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
}

// Temporary mock data until we connect to D1
const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Test Post',
    slug: 'test-post',
    content: 'This is a test post',
    excerpt: 'Test excerpt',
    published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function GET() {
  console.log('GET /api/posts called');
  return json(mockPosts);
}

export async function POST({ request }: RequestEvent) {
  console.log('POST /api/posts called');
  const postData = await request.json() as CreatePostRequest;
  
  const newPost: Post = {
    id: crypto.randomUUID(),
    title: postData.title,
    slug: postData.slug,
    content: postData.content,
    excerpt: postData.excerpt,
    published: postData.published,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockPosts.push(newPost);
  return json(newPost);
} 