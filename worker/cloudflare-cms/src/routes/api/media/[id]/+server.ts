import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface picsItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export async function GET({ params, locals }: RequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Picture ID is required');
    }

    // TODO: Implement actual picture fetching from R2/database
    const picsItem: picsItem = {
      id,
      filename: 'sample.jpg',
      size: 1024,
      mime_type: 'image/jpeg',
      url: '/sample.jpg',
      created_at: new Date().toISOString()
    };
    return json(picsItem);
  } catch (error) {
    console.error('Error fetching picture:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE({ params, locals }: RequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Picture ID is required');
    }

    // TODO: Implement actual picture deletion from R2/database
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting picture:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 