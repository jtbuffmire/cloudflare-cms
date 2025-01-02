import { Router } from './router';
import { errorHandler } from './middleware/errorHandler';
import { cors } from './middleware/cors';
import { getPosts, getPost, createPost, updatePost, deletePost } from './handlers/posts';
import { requireAuth } from './middleware/auth';
import { login } from './handlers/auth';
import { uploadMedia, getMedia, getMediaFile, deleteMedia } from './handlers/media';

export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string; 
}

const router = new Router<Env>();

// Public endpoints
router.get('/api/media/:key', getMediaFile);
router.get('/api/health', async () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
router.get('/api/posts', getPosts);
router.get('/api/posts/:id', getPost);

// Admin endpoints (authenticated)
router.post('/api/auth/login', login);

// upload media (protected)
router.post('/api/media/upload', async (request, env, ctx) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return uploadMedia(request, env, ctx);
});

// create post (protected)
router.post('/api/posts', async (request, env, ctx) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return createPost(request, env, ctx);
});

// get media (protected)
router.get('/api/media', async (request, env, ctx) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return getMedia(request, env, ctx);
});

// update post (protected)
router.put('/api/posts/:id', async (request, env, ctx, params) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return updatePost(request, env, ctx, params);
});

// delete post (protected)
router.delete('/api/posts/:id', async (request, env, ctx, params) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return deletePost(request, env, ctx, params);
});

// delete media (protected)
router.delete('/api/media/:id', async (request, env, ctx, params) => {
  const authResponse = await requireAuth(request, env);
  if (authResponse) return authResponse;
  return deleteMedia(request, env, ctx, params);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log("🚀 Incoming request:", request.method, request.url);
    
    // Apply CORS middleware
    const corsHeaders = cors(request);

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    
    try {
      // Handle the request through our router
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