import { createRouter } from './router';
import { WebSocketHandler } from './durable_objects/WebSocketHandler';
import { corsMiddleware } from './middleware/cors';
import type { Request as CFRequest, Response as CFResponse } from '@cloudflare/workers-types';
import { API_VSN } from './lib/config';

const router = createRouter();

export { WebSocketHandler };

export default {
  async fetch(request: CFRequest, env: any, ctx: ExecutionContext): Promise<CFResponse> {
    try {
      const url = new URL(request.url);
      console.log('Handling request for:', url.pathname);
      
      // Handle WebSocket connections
      if (url.pathname === '/ws') {
        // Ensure domain parameter is present
        if (!url.searchParams.has('domain')) {
          console.log('No domain specified, defaulting to localhost');
          url.searchParams.set('domain', 'localhost');
        }
        
        const id = env.WEBSOCKET_HANDLER.idFromName('default');
        const handler = env.WEBSOCKET_HANDLER.get(id);
        return handler.fetch(request);
      }

      // Apply CORS middleware to all requests
      return corsMiddleware(request, env, async () => {
        // Handle API routes - support both prefixed and unprefixed paths
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
          return router.handle(request, env, ctx);
        }

        return new Response('Not Found', { status: 404 }) as unknown as CFResponse;
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response('Internal Server Error: ' + (err as Error).message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      }) as unknown as CFResponse;
    }
  }
};