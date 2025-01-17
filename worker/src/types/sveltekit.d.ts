declare module '../.svelte-kit/cloudflare/_worker' {
  import type { ExecutionContext } from '@cloudflare/workers-types';
  
  interface WorkerHandler {
    fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>;
  }
  
  const handler: WorkerHandler;
  export default handler;
} 