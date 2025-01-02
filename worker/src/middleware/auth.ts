import { verify } from '@tsndr/cloudflare-worker-jwt';

export interface JWTPayload {
  sub: string;  // user id
  exp: number;  // expiration time
}

export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid authorization header' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) {
      throw new Error('Invalid token');
    }
    return null; // Authentication successful
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}