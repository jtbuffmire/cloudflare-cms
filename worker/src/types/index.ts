import { Request, Response } from '@cloudflare/workers-types';
import type { 
  D1Database, 
  R2Bucket, 
  DurableObjectNamespace, 
  WebSocket as CFWebSocket,
  ExecutionContext,
} from '@cloudflare/workers-types';

export type CFRequest = Request;
export type CFResponse = Response;

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_DOMAIN: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  ADMIN_ORIGINS: string;
  WEBSOCKET_HANDLER: DurableObjectNamespace;
  ENVIRONMENT: string;
  ADMIN_USER: string;
  ADMIN_PASS: string;
  PICS_BUCKET: R2Bucket;
  SITE_CONFIG: DurableObjectNamespace;
  SITE_CONFIG_ID: string;
  BLOG_URL: string;
  ADMIN_URL: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  domain?: string;
}

export interface WebSocketResponse extends Omit<CFResponse, 'webSocket'> {
  webSocket: CFWebSocket | null;
}

export interface WebSocketInit {
  webSocket?: CFWebSocket | null;
  headers?: HeadersInit;
  status?: number;
  statusText?: string;
}

export type RouteHandler = (
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<CFResponse>;
