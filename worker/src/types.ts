export interface Env {
    DB: D1Database;
    MEDIA_BUCKET: R2Bucket;
    ENVIRONMENT: string;
    JWT_SECRET: string;
    ADMIN_USERNAME: string;
    ADMIN_PASSWORD: string;
    WEBSOCKET_HANDLER: DurableObjectNamespace;
  }

export type SiteConfigHandler = {
  getSiteConfig(request: Request, env: Env): Promise<Response>;
  updateSiteConfig(request: Request, env: Env): Promise<Response>;
} 