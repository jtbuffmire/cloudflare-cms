import { sign } from '@tsndr/cloudflare-worker-jwt';
import type { Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';
import type { Env } from '../types';
import { json } from '../utils';
import { API_URL, API_VSN } from '../lib/api';

export async function login(request: CFRequest, env: Env): Promise<CFResponse> {
  const { email, password, domain } = await request.json() as { 
    email: string; 
    password: string; 
    domain: string; 
  };

  console.log('🔐 Login attempt:', { email, domain });
  console.log('🔑 Environment check:', { 
    hasAdminEmail: !!env.ADMIN_EMAIL,
    hasAdminPassword: !!env.ADMIN_PASSWORD,
    hasJwtSecret: !!env.JWT_SECRET,
    adminEmail: env.ADMIN_EMAIL
  });

  // Check env vars first for admin access
  if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
    console.log('✅ Admin credentials verified');
    const token = await sign({
      sub: 'admin',
      email: email,
      domain: domain,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, env.JWT_SECRET);

    return json({ token });
  }

  console.log('❌ Admin credentials did not match');

  // Get user for this domain
  const user = await env.DB.prepare(`
    SELECT * FROM users 
    WHERE email = ? AND domain = ?
    LIMIT 1
  `).bind(email, domain).first();

  if (!user) {
    return new Response(JSON.stringify({ 
      error: 'Invalid credentials' 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }

  // Verify password (you should use proper password hashing in production)
  if (password !== user.password) {
    return new Response(JSON.stringify({ 
      error: 'Invalid credentials' 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as CFResponse;
  }

  // Generate JWT with domain claim
  const payload = {
    sub: user.id as string,
    email: user.email as string,
    domain: domain,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  const token = await sign(payload, env.JWT_SECRET);

  return json({ 
    token,
    user: {
      id: user.id,
      email: user.email
    }
  });
}

// Client-side login helper
export async function handleClientLogin(username: string, password: string) {
    const response = await fetch(`${API_URL}${API_VSN}/login`, {
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