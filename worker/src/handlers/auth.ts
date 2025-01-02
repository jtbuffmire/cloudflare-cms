import { sign } from '@tsndr/cloudflare-worker-jwt';
import { Env } from '../types';

export const login = async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
  const { username, password } = await request.json() as { username: string; password: string };

  // For initial testing, we'll use a hardcoded admin user
  // TODO: Replace with proper user management
  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = await sign(
    {
      sub: 'admin',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    },
    env.JWT_SECRET
  );

  return new Response(
    JSON.stringify({ token }), 
    { headers: { 'Content-Type': 'application/json' } }
  );
}