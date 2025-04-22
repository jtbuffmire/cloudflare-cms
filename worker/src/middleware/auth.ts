import { verify } from '@tsndr/cloudflare-worker-jwt';
import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import type { RouteHandler } from '../types';
import { API_URL, API_VSN } from '../lib/api';
import { Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';

interface JWTPayload {
  sub: string;
  email: string;
  domain: string;
  exp: number;
}

export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Development bypass for dummy token
    if (env.ENVIRONMENT === 'development' && token === 'dummy-token') {
      return null; // Auth successful
    }

    // Verify JWT signature and expiration
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) {
      return new Response('Invalid token', { status: 401 });
    }

    // Decode token to get payload
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64)) as JWTPayload;

    // Verify domain matches
    const requestDomain = new URL(request.url).hostname;
    const headerDomain = request.headers.get('X-Site-Domain');
    console.log('🔐 Domain check:', { 
        tokenDomain: payload.domain,
        requestDomain,
        headerDomain,
        url: request.url
    });

    if (payload.domain !== headerDomain) {  // Check against X-Site-Domain header instead
        return new Response('Invalid domain', { status: 401 });
    }

    // Check if user still exists and is active
    const user = await env.DB.prepare(`
      SELECT id, email, domain, role 
      FROM users 
      WHERE id = ? AND domain = ?
      LIMIT 1
    `).bind(payload.sub, payload.domain).first();

    if (!user) {
      return new Response('User not found', { status: 401 });
    }

    return null; // Auth successful
  } catch (error) {
    console.error('Auth error:', error);
    return new Response('Invalid token', { status: 401 });
  }
}

// Check if request is from blog domain
function isBlogRequest(request: CFRequest, env: Env): boolean {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  
  // Allow requests from the main domain
  return origin.includes('http://localhost:4174') || referer.includes('http://localhost:4174');
}

// Check if request has blog token
async function verifyBlogToken(token: string, env: Env): Promise<boolean> {
  try {
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) return false;
    
    // Verify it's a blog token
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.type === 'blog';
  } catch {
    return false;
  }
}

// Helper to wrap protected routes
export function protected_route(handler: RouteHandler): RouteHandler {
  return async (request: CFRequest, env: Env, ctx: ExecutionContext, params: Record<string, string>): Promise<CFResponse> => {
    const isAdminDomain = request.headers.get('Host')?.startsWith('admin.');
    
    // If not admin domain, bypass auth completely
    if (!isAdminDomain) {
      return handler(request, env, ctx, params);
    }

    // Only check auth for admin subdomain
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return new Response('Authentication required', { 
        status: 401,
        headers: new Headers({ 'Content-Type': 'text/plain' })
      }) as unknown as CFResponse;
    }

    try {
      const isValid = await verify(token, env.JWT_SECRET);
      if (!isValid) {
        return new Response('Invalid token', { 
          status: 401,
          headers: new Headers({ 'Content-Type': 'text/plain' })
        }) as unknown as CFResponse;
      }
      return handler(request, env, ctx, params);
    } catch (err) {
      console.error('Auth middleware error:', err);
      return new Response('Invalid token', { 
        status: 401,
        headers: new Headers({ 'Content-Type': 'text/plain' })
      }) as unknown as CFResponse;
    }
  };
}

// Make sure token is being stored after login
export async function login(username: string, password: string) {
    // Remove any trailing slashes from API_URL and leading slashes from API_VSN
    const baseUrl = API_URL.replace(/\/$/, '');
    const versionPath = API_VSN.replace(/^\//, '');
    
    const response = await fetch(`${baseUrl}/${versionPath}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        throw new Error('Login failed');
    }

    const data = await response.json() as { token: string };
    localStorage.setItem('token', data.token);
    return data;
}

// Make sure token is being included in requests
export function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}