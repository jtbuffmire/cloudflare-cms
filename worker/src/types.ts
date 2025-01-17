import type { Request as CFRequest, Response as CFResponse, ExecutionContext } from '@cloudflare/workers-types';

export type RouteHandler = (
  request: CFRequest,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<CFResponse>;

export type { CFRequest, CFResponse, ExecutionContext };

// API Configuration
export const API_VSN = '/api/v1' as const;

export interface SiteConfig {
  id?: number;
  domain: string;
  site_domain: string;
  title: string;
  description: string;
  nav_links: Record<string, boolean>;
  lottie_animation: string;
  lottie_animation_r2_key?: string | null;
  scale_factor?: number;
  about_description: string;
  about_sections: Array<{
    title: string;
    visible: boolean;
    content: string;
  }>;
  pics_description: string;
  contact_description: string;
  contact_email: string;
  contact_discord_handle: string;
  contact_discord_url: string;
  contact_instagram_url: string;
  contact_instagram_handle: string;
  web3forms_key: string;
  show_email: boolean;
  show_discord: boolean;
  show_instagram: boolean;
}

export interface MergedConfig extends SiteConfig {
  lottie_animation_r2_key?: string | null;
  scale_factor?: number;
}

// Environment interface
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  WEBSOCKET_HANDLER: DurableObjectNamespace;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
} 