import { sign } from '@tsndr/cloudflare-worker-jwt';
import { Env } from '../types';

export async function login(request: Request, env: Env): Promise<Response> {
  try {
    const { username, password } = await request.json();
    
    console.log('🔐 Login attempt:', { 
      username,
      providedPassword: '****',
      expectedUsername: env.ADMIN_USERNAME,
      matches: {
        username: username === env.ADMIN_USERNAME,
        password: password === env.ADMIN_PASSWORD
      }
    });

    if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ 
        error: 'Invalid credentials' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create JWT token
    const token = await createJWT(username, env.JWT_SECRET);

    return new Response(JSON.stringify({ 
      token,
      username 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: 'Login failed' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createJWT(username: string, secret: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'HS256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: username,
    exp: now + (24 * 60 * 60), // 24 hours
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function createSignature(input: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(input)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}