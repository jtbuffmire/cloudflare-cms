import { json } from '@sveltejs/kit';
import type { RequestEvent as CFRequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface PicsItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export async function GET({ params, locals }: CFRequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Pic ID is required');
    }

    // TODO: Implement actual pic fetching from R2/database
    const picsItem: PicsItem = {
      id,
      filename: 'sample.jpg',
      size: 1024,
      mime_type: 'image/jpeg',
      url: '/sample.jpg',
      created_at: new Date().toISOString()
    };
    return json(picsItem);
  } catch (error) {
    console.error('Error fetching pic:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE({ params, locals }: CFRequestEvent) {
  try {
    const { id } = params;
    if (!id) {
      throw error(400, 'Pic ID is required');
    }

    // TODO: Implement actual pic deletion from R2/database
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pic:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 