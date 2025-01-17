import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST({ request, locals }: RequestEvent) {
  try {
    const { email, password } = await request.json() as LoginRequest;

    // TODO: Implement actual authentication
    if (email === 'admin@example.com' && password === 'secure-password') {
      // TODO: Set session cookie
      return json({ success: true });
    }

    throw error(401, 'Invalid credentials');
  } catch (error) {
    console.error('Login error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 