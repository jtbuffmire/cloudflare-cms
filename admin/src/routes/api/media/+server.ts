import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

interface PicsItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export const GET = async ({ locals }: RequestEvent) => {
  try {
    // TODO: Implement actual pic fetching from R2/database
    const picsItems: PicsItem[] = [];
    return json(picsItems);
  } catch (error) {
    console.error('Error fetching pic:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const POST = async ({ request, locals }: RequestEvent) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response('No file uploaded', { status: 400 });
    }

    // TODO: Implement actual file upload to R2
    // For now, return a mock response
    const picsItem: PicsItem = {
      id: 'mock-id',
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      url: '/mock-url',
      created_at: new Date().toISOString()
    };
    return json(picsItem);
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const DELETE = async ({ params, locals }: RequestEvent) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response('Pic ID is required', { status: 400 });
    }

    // TODO: Implement actual file deletion from R2
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pic:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}; 