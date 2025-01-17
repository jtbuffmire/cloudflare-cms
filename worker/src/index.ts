import { createRouter } from './router';
import { WebSocketHandler } from './durable_objects/WebSocketHandler';
import { corsMiddleware } from './middleware/cors';
import type { Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';
import { API_VSN } from './lib/config';
import { verify } from '@tsndr/cloudflare-worker-jwt';

const router = createRouter();

export { WebSocketHandler };

interface Env {
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  WEBSOCKET_HANDLER: DurableObjectNamespace;
  JWT_SECRET: string;
  // Add other env variables you're using
}

async function verifyAuth(token: string | undefined, env: Env) {
  if (!token) return false;
  
  try {
    // First try JWT verification
    const jwtValid = await verify(token, env.JWT_SECRET);
    if (jwtValid) return true;

    // If JWT fails, try basic auth
    const decoded = atob(token);
    const [email, password] = decoded.split(':');
    
    // Split multiple credentials
    const adminEmails = env.ADMIN_EMAIL.split(',');
    const adminPasswords = env.ADMIN_PASSWORD.split(',');
    
    // Check if any credential pair matches
    return adminEmails.some((adminEmail, index) => 
      email === adminEmail.trim() && password === adminPasswords[index].trim()
    );
  } catch {
    return false;
  }
}

// Add security headers to responses
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request: CFRequest, env: Env, ctx: ExecutionContext): Promise<CFResponse> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const domain = request.headers.get('host') || url.hostname;
    
    try {
      console.log('Handling request for:', url.pathname, 'from domain:', domain);
      
      // Handle WebSocket connections
      if (url.pathname === '/ws') {
        // Ensure domain parameter is present
        if (!url.searchParams.has('domain')) {
          console.log('No domain specified, defaulting to localhost');
          url.searchParams.set('domain', 'localhost');
        }
        
        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        return handler.fetch(request as unknown as Request) as unknown as CFResponse;
      }

      // Apply CORS middleware to all requests
      return (corsMiddleware(request, env, async () => {
        // Skip auth check for login endpoint and OPTIONS requests
        const isLoginEndpoint = url.pathname === `${API_VSN}/login`;
        const needsAuth = !isLoginEndpoint && request.method !== 'GET' && request.method !== 'OPTIONS';
        
        if (needsAuth) {
          console.log(`Auth attempt for ${request.method} ${url.pathname} from ${domain}`);
          const authHeader = request.headers.get('Authorization');
          if (!authHeader) {
            console.log('No Authorization header present');
            return new Response('Unauthorized', { status: 401 }) as unknown as CFResponse;
          }
          
          const token = authHeader.replace('Bearer ', '');
          console.log('Attempting to verify token:', token.substring(0, 10) + '...');
          
          const isValid = await verifyAuth(token, env);
          console.log('Token verification result:', isValid);
          
          if (!isValid) {
            return new Response('Invalid token', { status: 403 });
          }
        }

        const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
        if (!ALLOWED_METHODS.includes(request.method)) {
          return new Response('Method Not Allowed', { status: 405 });
        }

        // Handle API routes
        if (url.pathname.startsWith('/api/') || 
            url.pathname.startsWith('/site/') || 
            url.pathname.startsWith('/pics/') || 
            url.pathname.startsWith('/posts/') || 
            url.pathname.startsWith('/animations/')) {
          // If the path doesn't start with /api/v1, prepend it
          if (!url.pathname.startsWith(`${API_VSN}`)) {
            const newUrl = new URL(request.url);
            newUrl.pathname = `${API_VSN}${url.pathname.startsWith('/') ? '' : '/'}${url.pathname}`;
            
            // For GET/HEAD requests, we can create a new request without body
            if (['GET', 'HEAD'].includes(request.method)) {
              request = new Request(newUrl.toString(), {
                method: request.method,
                headers: Object.fromEntries(request.headers.entries())
              }) as unknown as CFRequest;
            } else {
              // For POST/PUT requests, we need to clone the request and read its body
              const clonedRequest = request.clone();
              const arrayBuffer = await clonedRequest.arrayBuffer();
              request = new Request(newUrl.toString(), {
                method: clonedRequest.method,
                headers: Object.fromEntries(clonedRequest.headers.entries()),
                body: arrayBuffer
              }) as unknown as CFRequest;
            }
          }
          return addSecurityHeaders(await router.handle(request, env, ctx));
        }

        return new Response('Not Found', { status: 404 }) as unknown as CFResponse;
      })) as unknown as CFResponse;
    } catch (err) {
      console.error('Worker error:', err, 'Domain:', request.headers.get('host'));
      return new Response('Internal Server Error: ' + (err as Error).message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      }) as unknown as CFResponse;
    } finally {
      console.log(`Request to ${url.pathname} from ${domain} took ${Date.now() - startTime}ms`);
    }
  }
};