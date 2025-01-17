import type { Response as CFResponse } from '@cloudflare/workers-types';
import type { Request } from '@cloudflare/workers-types';

// Helper to check if a request is a preflight request
const isPreflightRequest = (request: Request): boolean => {
  return (
    request.method === 'OPTIONS' &&
    request.headers.has('Origin') &&
    request.headers.has('Access-Control-Request-Method')
  );
};

// Helper to get root domain from origin
const getRootDomain = (origin: string): string | null => {
  try {
    const url = new URL(origin);
    const parts = url.hostname.split('.');
    if (parts.length > 2) {
      // Get the last two parts for the root domain (e.g., buffmire.com from admin.buffmire.com)
      return parts.slice(-2).join('.');
    }
    return url.hostname;
  } catch {
    return null;
  }
};

// Helper to get allowed origins based on environment
const getAllowedOrigins = (env: any): string[] => {
  // Use ALLOWED_ORIGINS environment variable if available
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim());
  }

  // Fallback for development
  if (env.ENVIRONMENT === 'development') {
    return [
      'http://localhost:5173',    // Admin panel dev server
      'http://localhost:4173',    // Blog dev server
      'http://localhost:3000',    // Alternative dev port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173'
    ];
  }
  
  return [];
};

// CORS middleware
export const corsMiddleware = async (
  request: Request,
  env: any,
  next: () => Promise<CFResponse>
): Promise<CFResponse> => {
  // Get the origin from the request
  const requestOrigin = request.headers.get('Origin');
  
  // Get allowed origins based on environment
  const allowedOrigins = getAllowedOrigins(env);
  
  // Check if the request origin is allowed
  const isAllowedOrigin = requestOrigin && (
    allowedOrigins.includes(requestOrigin) ||
    requestOrigin.endsWith('.pages.dev') ||  // Allow Cloudflare Pages domains
    requestOrigin.endsWith('.buffmire.com') || // Allow all subdomains
    requestOrigin.endsWith('.amealzonwheels.com') || // Allow all subdomains
    requestOrigin.endsWith('.signalset.com') || // Allow all subdomains
    (getRootDomain(requestOrigin) === getRootDomain(request.url)) || // Allow same root domain
    env.ENVIRONMENT === 'development'
  );

  // Common headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Site-Domain, x-domain',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Origin': isAllowedOrigin ? requestOrigin! : '*'
  };

  // Handle preflight requests
  if (isPreflightRequest(request)) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    }) as unknown as CFResponse;
  }

  // For actual requests, get the response first
  const response = await next();
  
  // Only add CORS headers if they don't exist
  const headers = Object.fromEntries(response.headers.entries());
  if (!headers['access-control-allow-origin']) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers[key.toLowerCase()] = value;
    });
  }

  return new Response(response.body as unknown as BodyInit, {
    status: response.status,
    statusText: response.statusText,
    headers
  }) as unknown as CFResponse;
}; 