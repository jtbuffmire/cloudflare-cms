import type { Env } from './types';
import { API_VSN } from './lib/api';
import type { ExecutionContext, Response as CFResponse, Request as CFRequest } from '@cloudflare/workers-types';
import { getPics, uploadPics, getPicsFile, deletePics, updatePics } from './handlers/pics';
import { login } from './handlers/auth';
import { createPost, getPost, getPosts, updatePost, deletePost } from './handlers/posts';
import { getSiteConfig, updateSiteConfig, updateAnimationScale, updateBasicInfo } from './handlers/site';
import { generatePreview } from './handlers/preview';
import { protected_route } from './middleware/auth';
import { getAnimations, uploadAnimation, getAnimationByName } from './handlers/animations';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { DEVELOPMENT_DOMAINS } from './lib/config';
import { handleGetProjects, handleGetProject, handleCreateProject, handleUpdateProject, handleDeleteProject } from './handlers/projects';
import { verify } from '@tsndr/cloudflare-worker-jwt';

/**
 * Type Casting Strategy for Cloudflare Workers
 * 
 * Due to type incompatibilities between the standard Web API Response type and 
 * Cloudflare's Response type (CFResponse), we use type casting in this codebase.
 * 
 * The main differences are:
 * 1. CFResponse.headers has additional methods (getAll, entries, keys, values)
 * 2. CFResponse.body is a different ReadableStream type
 * 3. Request types have additional properties in Cloudflare Workers
 * 
 * Our approach:
 * - Cast new Response() to unknown first, then to CFResponse using `as unknown as CFResponse`
 * - For KV operations, explicitly type the metadata using generics
 * - For route handlers, ensure they accept CFRequest and return CFResponse
 * - When copying response bodies or headers, use type assertions to handle ReadableStream differences
 * 
 * Common patterns:
 * 1. New Response: 
 *    return new Response(...) as unknown as CFResponse
 * 
 * 2. KV Operations:
 *    const result = await env.ASSETS.getWithMetadata<string, { contentType: string }>(key)
 * 
 * 3. Response with body:
 *    return new Response(response.body as BodyInit, {...}) as unknown as CFResponse
 * 
 * 4. Protected Routes:
 *    router.get('/path', protected_route((request: CFRequest, ...) => Promise<CFResponse>))
 */

type RouteHandler = (request: CFRequest, env: Env, ctx: ExecutionContext, params: Record<string, string>) => Promise<CFResponse>;

export class Router {
  private routes: Map<string, Map<string, RouteHandler>> = new Map();

  public get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler);
  }

  public post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler);
  }

  public put(path: string, handler: RouteHandler): void {
    this.addRoute('PUT', path, handler);
  }

  public delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
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

  public async handle(request: CFRequest, env: Env, ctx: ExecutionContext): Promise<CFResponse> {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle OPTIONS requests for all API routes
    if (method === 'OPTIONS' && path.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Site-Domain',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true'
        }
      }) as unknown as CFResponse;
    }

    // Find matching route
    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) {
      return new Response('Method not allowed', { status: 405 }) as unknown as CFResponse;
    }

    let matchedHandler: RouteHandler | null = null;
    let params: Record<string, string> | null = null;

    for (const [routePath, handler] of methodRoutes.entries()) {
      params = this.matchRoute(path, routePath);
      if (params !== null) {
        matchedHandler = handler;
        break;
      }
    }

    if (!matchedHandler || !params) {
      return new Response('Not found', { status: 404 }) as unknown as CFResponse;
    }

    try {
      const response = await matchedHandler(request, env, ctx, params);
      return response;
    } catch (error) {
      console.error('[ERROR] Route handler error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }) as unknown as CFResponse;
    }
  }
}

export function createRouter() {
  const router = new Router();

  // Basic auth endpoints
  router.post(`${API_VSN}/login`, login as unknown as RouteHandler);

  // Verify token endpoint
  const verifyHandler: RouteHandler = async (request, env, ctx, params) => {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return new Response('Unauthorized', { status: 401 }) as unknown as CFResponse;
    }

    try {
      const isValid = await verify(token, env.JWT_SECRET);
      if (isValid) {
        return new Response('Token valid', { status: 200 }) as unknown as CFResponse;
      } else {
        return new Response('Invalid token', { status: 401 }) as unknown as CFResponse;
      }
    } catch (err) {
      console.error('Token verification error:', err);
      return new Response('Invalid token', { status: 401 }) as unknown as CFResponse;
    }
  };
  router.get(`${API_VSN}/verify`, verifyHandler);

  // Public routes (for blog access)
  router.get(`${API_VSN}/pics`, getPics as unknown as RouteHandler);          // List pics
  router.get(`${API_VSN}/pics/:id`, getPicsFile as unknown as RouteHandler);  // Get single pic
  router.get(`${API_VSN}/projects`, handleGetProjects as unknown as RouteHandler);
  router.get(`${API_VSN}/projects/:id`, handleGetProject as unknown as RouteHandler);
  router.get(`${API_VSN}/animations`, getAnimations as unknown as RouteHandler);
  router.get(`${API_VSN}/animations/file/:name`, getAnimationByName as unknown as RouteHandler);
  router.get(`${API_VSN}/site/config`, getSiteConfig as unknown as RouteHandler);
  
  // Public posts route with published filter
  const postsHandler: RouteHandler = async (request, env, ctx, params) => {
    const url = new URL(request.url);
    const isPublishedOnly = url.searchParams.get('published') === 'true';
    
    if (isPublishedOnly) {
      // Allow public access for published posts
      return getPosts(request as CFRequest, env, ctx, params);
    } else {
      // Require authentication for all posts
      return protected_route(getPosts)(request, env, ctx, params);
    }
  };

  router.get(`${API_VSN}/posts`, postsHandler);

  // Protected routes (require auth)
  router.post(`${API_VSN}/pics`, protected_route(uploadPics) as unknown as RouteHandler);
  router.put(`${API_VSN}/pics/:id`, protected_route(updatePics) as unknown as RouteHandler);
  router.delete(`${API_VSN}/pics/:id`, protected_route(deletePics) as unknown as RouteHandler);

  router.post(`${API_VSN}/posts`, protected_route(createPost) as unknown as RouteHandler);
  router.get(`${API_VSN}/posts/:id`, protected_route(getPost) as unknown as RouteHandler);
  router.put(`${API_VSN}/posts/:id`, protected_route(updatePost) as unknown as RouteHandler);
  router.delete(`${API_VSN}/posts/:id`, protected_route(deletePost) as unknown as RouteHandler);
  
  router.post(`${API_VSN}/preview`, protected_route(generatePreview) as unknown as RouteHandler);

  router.put(`${API_VSN}/site/config`, protected_route(updateSiteConfig) as unknown as RouteHandler);
  router.put(`${API_VSN}/site/basic-info`, protected_route(updateBasicInfo) as unknown as RouteHandler);
  router.put(`${API_VSN}/site/config/animation-scale`, protected_route(updateAnimationScale) as unknown as RouteHandler);

  router.post(`${API_VSN}/animations`, protected_route(uploadAnimation) as unknown as RouteHandler);
  
  router.post(`${API_VSN}/projects`, protected_route(handleCreateProject) as unknown as RouteHandler);
  router.put(`${API_VSN}/projects/:id`, protected_route(handleUpdateProject) as unknown as RouteHandler);
  router.delete(`${API_VSN}/projects/:id`, protected_route(handleDeleteProject) as unknown as RouteHandler);

  // WebSocket handler
  const wsHandler: RouteHandler = async (request, env, ctx, params) => {
    // Only handle WebSocket upgrade requests
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 }) as unknown as CFResponse;
    }

    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    
    if (!domain) {
      return new Response('Missing domain parameter', { status: 400 }) as unknown as CFResponse;
    }

    // Allow development domains
    const isDevelopment = env.ENVIRONMENT === 'development';
    if (!isDevelopment && !domain.includes('.')) {
      return new Response('Invalid domain', { status: 400 }) as unknown as CFResponse;
    }

    try {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();

      server.addEventListener('message', async (event) => {
        try {
          // Handle message
        } catch (err) {
          console.error('[ERROR] WebSocket message error:', err);
        }
      });

      server.addEventListener('close', () => {
        // Clean up on close
      });

      server.addEventListener('error', (err) => {
        console.error('[ERROR] WebSocket error:', err);
      });

      return new Response(null, {
        status: 101,
        webSocket: client
      }) as unknown as CFResponse;

    } catch (err) {
      console.error('[ERROR] WebSocket setup error:', err);
      return new Response('WebSocket setup failed', { status: 500 }) as unknown as CFResponse;
    }
  };

  // WebSocket route
  router.get('/ws', wsHandler);

  return router;
}