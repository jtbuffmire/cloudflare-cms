import { Env } from './types';
import { getMedia, uploadMedia, getMediaFile, deleteMedia } from './handlers/media';
import { login } from './handlers/auth';
import { createPost, getPost, getPosts, updatePost } from './handlers/posts';


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

export function createRouter(): Router<Env> {
  const router = new Router<Env>();

  // Media routes
  router.post('/api/media/upload', uploadMedia);
  router.get('/api/media', getMedia);
  router.get('/api/media/:key', getMediaFile);
  router.delete('/api/media/:id', deleteMedia);

  // Post routes -- not implemented yet
  router.post('/api/posts', createPost);
  router.get('/api/posts/:id', getPost);
  router.get('/api/posts', getPosts);
  router.put('/api/posts/:id', updatePost); 
  // router.delete('/api/posts/:id', deletePost);
  // ... other post routes ...

  // Auth routes
  router.post('/api/auth/login', login);
  // ... other auth routes ...

  return router;
}

export const router = createRouter();