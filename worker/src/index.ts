import { router } from './router';
import { errorHandler } from './middleware/errorHandler';
import { cors } from './middleware/cors';
import { getPosts, getPost, createPost, updatePost, deletePost } from './handlers/posts';
import { requireAuth } from './middleware/auth';
import { login } from './handlers/auth';
import { uploadMedia, getMedia, getMediaFile, updateMedia, deleteMedia } from './handlers/media';
import { WebSocketHandler } from './durable_objects/WebSocketHandler'; 
import { Env } from './types';

export { WebSocketHandler };

// Public endpoints
router.get('/media/:key', getMediaFile);
router.get('/health', async () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
router.get('/posts', getPosts);
router.get('/posts/:id', getPost);

// Admin endpoints (authenticated)
router.post('/auth/login', login);

// upload media (protected)
router.post('/media/upload', async (request, env, ctx) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return uploadMedia(request, env);
});

// create post (protected)
router.post('/posts', async (request, env) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return createPost(request, env);
});

// get media (protected)
router.get('/media', async (request, env) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return getMedia(request, env);
});

// update media (protected)
router.put('/media/:id', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return updateMedia(request, env, params.id);
});

// update post (protected)
router.put('/posts/:id', async (request, env, ctx, params) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return updatePost(request, env, ctx, params);
});

// delete post (protected)
router.delete('/posts/:id', async (request, env, ctx, params) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return deletePost(request, env, ctx, params);
});

// delete media (protected)
router.delete('/media/:id', async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const key = url.pathname.split('/').pop();
  if (!key) return new Response('No key provided', { status: 400 });
  return deleteMedia(request, env, key);
});

// Add WebSocket route
router.get('/ws', async (request: Request, env: Env) => {
  const id = env.WEBSOCKET_HANDLER.idFromName('default');
  const handler = env.WEBSOCKET_HANDLER.get(id);
  return handler.fetch(request);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname !== '/ws') {
      console.log(`${request.method} ${url.pathname}`);
    }
    
    if (request.headers.get('Upgrade') === 'websocket') {
      return router.handle(request, env, ctx);
    }
    
    // Fix: Use proper origin handling
    const allowedOrigins = [env.SITE_URL, env.ADMIN_URL];
    const origin = request.headers.get('Origin');
    
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) 
        ? origin 
        : allowedOrigins[0]
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    try {
      const response = await router.handle(request, env, ctx);
      
      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      return errorHandler(error, corsHeaders);
    }
  },
};