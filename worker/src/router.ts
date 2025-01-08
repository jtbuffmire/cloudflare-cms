import { Env } from './types';
import { getMedia, uploadMedia, getMediaFile, deleteMedia, updateMedia, cleanupOrphanedFiles } from './handlers/media';
import { login } from './handlers/auth';
import { createPost, getPost, getPosts, updatePost, deletePost, uploadPostImage, deletePostImage } from './handlers/posts';
import { getSiteConfig, updateSiteConfig } from './handlers/site';
import { generatePreview } from './handlers/preview';
import { getAnimations, uploadAnimation, getAnimationByName } from './handlers/animations';

type RouteHandler<E> = (
  request: Request,
  env: E,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response>;

export class Router<E> {
  private routes: Map<string, Map<string, RouteHandler<E>>> = new Map();

  public get(path: string, handler: RouteHandler<E>) {
    this.addRoute('GET', path, handler);
  }

  public post(path: string, handler: RouteHandler<E>) {
    this.addRoute('POST', path, handler);
  }

  public put(path: string, handler: RouteHandler<E>) {
    this.addRoute('PUT', path, handler);
  }

  public delete(path: string, handler: RouteHandler<E>) {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler<E>) {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  private matchRoute(path: string, routePath: string): Record<string, string> | null {
    const pathParts = path.split('/');
    const routeParts = routePath.split('/');

    if (pathParts.length !== routeParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  public async handle(request: Request, env: E, ctx: ExecutionContext): Promise<Response> {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    // Debug: Print all registered routes
    console.log('📍 Registered routes:', {
        methods: Array.from(this.routes.keys()),
        routes: Object.fromEntries(
            Array.from(this.routes.entries()).map(([method, routes]) => [
                method,
                Array.from(routes.keys())
            ])
        )
    });
  
    console.log('🔍 Request details:', { 
        method, 
        path, 
        headers: Object.fromEntries(request.headers),
        routeKeys: Array.from(this.routes.get(method)?.keys() || [])
    });

    console.log('🔍 Request details:', { 
      method, 
      path, 
      headers: Object.fromEntries(request.headers),
      routeKeys: Array.from(this.routes.get(method)?.keys() || [])
    });

    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) {
      console.log('❌ Method not allowed:', method);
      return new Response('Method not allowed', { status: 405 });
    }

    for (const [routePath, handler] of methodRoutes.entries()) {
      console.log('🔎 Trying to match:', { routePath, path });
      const params = this.matchRoute(path, routePath);
      if (params !== null) {
        console.log('✅ Route matched:', { routePath, params });
        return handler(request, env, ctx, params);
      }
    }

    console.log('❌ No route matched for:', path);
    return new Response('Not found', { status: 404 });
  }
} 

function createRouter(): Router<Env> {
  const router = new Router<Env>();

  // Media routes
  router.post('/api/media/upload', uploadMedia);
  router.get('/api/media', getMedia);
  router.get('/api/media/:key', getMediaFile);
  router.delete('/api/media/:id', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return deleteMedia(request, env, params.id);
  });
  router.put('/api/media/:id', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return updateMedia(request, env, params.id);
  });  

  // Post routes
  router.post('/api/posts', createPost);
  router.get('/api/posts/:id', getPost);
  router.get('/api/posts', getPosts);
  router.put('/api/posts/:id', updatePost); 
  router.delete('/api/posts/:id', deletePost);

  // Auth routes
  router.post('/api/auth/login', login);
  
  // Site config routes
  router.get('/api/site/config', getSiteConfig);
  router.put('/api/site/config', updateSiteConfig);

  // WebSocket route
  router.get('/ws', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    const id = env.WEBSOCKET_HANDLER.idFromName('default');
    const handler = env.WEBSOCKET_HANDLER.get(id);
    const response = await handler.fetch(request);
    return response;
  });

  // Add maintenance routes
  router.post('/api/maintenance/cleanup', async (request: Request, env: Env) => {
    // Check for admin authorization here
    return cleanupOrphanedFiles(env);
  });

  // Add these routes
  router.post('/api/posts/:id/images', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return uploadPostImage(request, env, ctx, params);
  });

  router.delete('/api/posts/:id/images/:imageId', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return deletePostImage(request, env, ctx, params);
  });

  // Add route to serve images
  router.get('/post-images/:key', async (request: Request, env: Env, ctx: ExecutionContext, params: { key: string }) => {
    const obj = await env.POST_IMAGES.get(params.key);
    
    if (!obj) {
        return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000');
    
    return new Response(obj.body, { headers });
  });

  // Debug line
  // console.log('Added site config routes:', Array.from(router.routes.get('GET')?.keys() || []));

  // Add preview route
  router.post('/api/preview', generatePreview);

  // Animation routes
  router.get('/api/animations', getAnimations);
  router.get('/api/animations/:name', async (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => {
    return getAnimationByName(request, env, params);
  });
  router.post('/api/animations', uploadAnimation);
  
  // Add this new route for animation files
  router.get('/api/animations/file/:key', async (request: Request, env: Env, ctx: ExecutionContext, params: { key: string }) => {
    const obj = await env.MEDIA_BUCKET.get(decodeURIComponent(params.key));
    
    if (!obj) {
      return new Response('Animation not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(obj.body, { headers });
  });

  // Add health check route
  router.get('/api/health', async (request: Request, env: Env) => {
    try {
      // Check if animations table exists and has data
      const { results } = await env.DB.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='animations'
      `).all();
      
      console.log('🏥 Health check - Tables:', results);
      
      return new Response(JSON.stringify({ 
        status: 'ok',
        tables: results
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return new Response(JSON.stringify({ 
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Add this temporarily for cleanup
  router.post('/api/debug/cleanup', async (request: Request, env: Env) => {
    try {
      console.log('🧹 Starting cleanup...');
      
      // Get all files from database
      const { results: dbFiles } = await env.DB.prepare(`
        SELECT * FROM media
      `).all();
      
      console.log('📊 Files in database:', dbFiles);
      
      // List all files in R2
      const r2List = await env.MEDIA_BUCKET.list();
      console.log('📦 Files in R2:', r2List.objects);
      
      // Delete the problematic file from both places
      await env.DB.prepare(`
        DELETE FROM media 
        WHERE r2_key LIKE '%c9675786-a03a-4812-8415-fef038877a7c%'
      `).run();
      
      try {
        await env.MEDIA_BUCKET.delete('c9675786-a03a-4812-8415-fef038877a7c-Bouy_4 Transparent.png');
      } catch (e) {
        console.log('R2 delete error (expected if file already gone):', e);
      }
      
      return new Response(JSON.stringify({
        message: 'Cleanup completed',
        dbFiles,
        r2Files: r2List.objects
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Cleanup error:', error);
      return new Response(JSON.stringify({ error: 'Cleanup failed' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  return router;
}

export const router = createRouter();