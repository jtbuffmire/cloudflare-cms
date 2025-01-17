import { sign } from '@tsndr/cloudflare-worker-jwt';
import type { RouteHandler } from '../types';
import type { Response as CFResponse } from '@cloudflare/workers-types';

export const login: RouteHandler = async (request, env) => {
  try {
    // Log incoming request details
    console.log('Login attempt with headers:', {
      auth: request.headers.get('Authorization'),
      domain: request.headers.get('X-Site-Domain'),
      contentType: request.headers.get('Content-Type')
    });

    // Get auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return new Response(JSON.stringify({ error: 'Invalid credentials format' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Decode base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [email, password] = credentials.split(':');

    console.log('Login attempt:', { 
      email,
      domain: request.headers.get('X-Site-Domain'),
      validEmail: env.ADMIN_EMAIL.includes(email)
    });

    // Verify against env variables
    const adminEmails = env.ADMIN_EMAIL.split(',');
    const adminPasswords = env.ADMIN_PASSWORD.split(',');
    const isValid = adminEmails.some((adminEmail, index) => 
      email === adminEmail.trim() && password === adminPasswords[index].trim()
    );

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }

    // Generate JWT token
    const token = await sign(
      { 
        email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      }, 
      env.JWT_SECRET
    );

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  } catch (err) {
    console.error('Login handler error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }
};