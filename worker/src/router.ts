import { Env } from './types';
import { getMedia, uploadMedia, getMediaFile, deleteMedia, updateMedia, cleanupOrphanedFiles } from './handlers/media';
import { login } from './handlers/auth';
import { createPost, getPost, getPosts, updatePost, deletePost } from './handlers/posts';
import { getSiteConfig, updateSiteConfig, debugDatabase, debugSiteConfig } from './handlers/site';

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
  router.get('/api/debug/db', debugDatabase);
  router.get('/api/debug/site-config', debugSiteConfig);

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

  // Debug line
  // console.log('Added site config routes:', Array.from(router.routes.get('GET')?.keys() || []));

  return router;
}

export const router = createRouter();